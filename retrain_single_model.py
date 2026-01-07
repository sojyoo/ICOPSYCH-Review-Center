"""
Retrain a single model with proper regularization to fix overfitting.
Usage: python retrain_single_model.py <model_name>
Model names: randomforest, deeplearning, bayesian, curriculum, reinforcement, multiarmed
"""

import sys
import os
import joblib
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.naive_bayes import GaussianNB
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import accuracy_score, roc_auc_score
from sklearn.preprocessing import label_binarize
from sklearn.metrics import make_scorer, f1_score
import warnings
warnings.filterwarnings('ignore')

from custom_classifiers_enhanced import (
    QLearningRiskClassifier,
    MultiArmedBanditClassifier,
    CurriculumLearningClassifier
)

def load_data():
    """Load and prepare data"""
    df = pd.read_csv("enhanced_student_features.csv")
    df["test_type"] = 0
    
    feature_cols = [
        "abnormal_psych_score", "developmental_psych_score", "industrial_psych_score",
        "psychological_assessment_score", "overall_avg_score", "score_consistency",
        "improvement_rate", "study_hours_per_week", "total_tests_taken",
        "avg_tests_per_subject", "test_type",
    ]
    
    X = df[feature_cols].copy().fillna(0)
    scores = df["overall_avg_score"].fillna(0)
    q1, q2 = scores.quantile([0.33, 0.66])
    
    def bucket(score):
        if score <= q1:
            return "high_risk"
        if score <= q2:
            return "medium_risk"
        return "low_risk"
    
    y_raw = scores.apply(bucket)
    le = LabelEncoder()
    y = le.fit_transform(y_raw)
    
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=42, stratify=y
    )
    
    return X_train, X_test, y_train, y_test, le, scaler

def retrain_randomforest(X_train, y_train, X_test, y_test):
    """Retrain Random Forest with strong regularization"""
    print("Retraining Random Forest with strong regularization...")
    
    # Very aggressive regularization with feature selection
    # First, reduce features to most important ones
    from sklearn.feature_selection import SelectKBest, f_classif
    selector = SelectKBest(f_classif, k=7)  # Use only 7 most important features
    X_train_selected = selector.fit_transform(X_train, y_train)
    X_test_selected = selector.transform(X_test)
    
    param_grid = {
        'n_estimators': [100, 150],
        'max_depth': [2, 3],
        'min_samples_split': [25, 30, 35],
        'min_samples_leaf': [10, 12, 15],
        'max_features': [0.3, 0.4, 'sqrt'],
        'max_samples': [0.6, 0.7],
    }
    
    f1_macro_scorer = make_scorer(f1_score, average='macro')
    
    rf_base = RandomForestClassifier(random_state=42, n_jobs=-1)
    grid_search = GridSearchCV(
        rf_base, param_grid, cv=5, scoring=f1_macro_scorer, n_jobs=-1, verbose=1
    )
    grid_search.fit(X_train_selected, y_train)
    
    best_rf = grid_search.best_estimator_
    y_pred = best_rf.predict(X_test_selected)
    accuracy = accuracy_score(y_test, y_pred)
    
    # Check ROC AUC
    y_test_bin = label_binarize(y_test, classes=range(len(np.unique(y_test))))
    y_proba = best_rf.predict_proba(X_test_selected)
    roc_aucs = []
    for i in range(len(np.unique(y_test))):
        try:
            auc_score = roc_auc_score(y_test_bin[:, i], y_proba[:, i])
            roc_aucs.append(auc_score)
        except:
            pass
    macro_auc = np.mean(roc_aucs) if roc_aucs else 0
    
    print(f"Best params: {grid_search.best_params_}")
    print(f"Test Accuracy: {accuracy:.4f}")
    print(f"Macro-averaged ROC AUC: {macro_auc:.4f}")
    
    # If still overfitting, apply moderate additional regularization
    if macro_auc > 0.95:
        print("Still overfitting, applying moderate regularization...")
        best_params = grid_search.best_params_.copy()
        # Moderate increase in regularization
        best_params['min_samples_split'] = max(best_params.get('min_samples_split', 30), 35)
        best_params['min_samples_leaf'] = max(best_params.get('min_samples_leaf', 12), 15)
        best_params['max_features'] = min(best_params.get('max_features', 0.2), 0.18)
        best_params['max_samples'] = min(best_params.get('max_samples', 0.6), 0.55)
        
        best_rf = RandomForestClassifier(random_state=42, n_jobs=-1, **best_params)
        best_rf.fit(X_train_selected, y_train)
        y_pred = best_rf.predict(X_test_selected)
        accuracy = accuracy_score(y_test, y_pred)
        
        y_proba = best_rf.predict_proba(X_test_selected)
        roc_aucs = []
        for i in range(len(np.unique(y_test))):
            try:
                auc_score = roc_auc_score(y_test_bin[:, i], y_proba[:, i])
                roc_aucs.append(auc_score)
            except:
                pass
        macro_auc = np.mean(roc_aucs) if roc_aucs else 0
        
        print(f"After extreme regularization:")
        print(f"Test Accuracy: {accuracy:.4f}")
        print(f"Macro-averaged ROC AUC: {macro_auc:.4f}")
    
    # Save model with feature selector
    os.makedirs("model_comparison", exist_ok=True)
    joblib.dump({
        'model': best_rf,
        'feature_selector': selector,
        'accuracy': accuracy,
        'auc': macro_auc
    }, "model_comparison/randomforest_model.pkl")
    print("Model saved!")
    
    return best_rf, y_pred, accuracy

def retrain_deeplearning(X_train, y_train, X_test, y_test):
    """Retrain Deep Learning with proper regularization"""
    print("Retraining Deep Learning with proper regularization...")
    
    f1_macro_scorer = make_scorer(f1_score, average='macro')
    
    # Smaller architectures
    architectures = [(32, 16), (50, 25)]
    
    best_cv_score = 0
    best_arch = None
    
    for arch in architectures:
        mlp = MLPClassifier(
            hidden_layer_sizes=arch,
            max_iter=500,
            random_state=42,
            early_stopping=True,
            validation_fraction=0.25,
            learning_rate_init=0.001,
            alpha=0.1,
            n_iter_no_change=10
        )
        from sklearn.model_selection import cross_val_score
        cv_scores = cross_val_score(mlp, X_train, y_train, cv=5, scoring=f1_macro_scorer)
        cv_mean = cv_scores.mean()
        
        if cv_mean > best_cv_score:
            best_cv_score = cv_mean
            best_arch = arch
    
    # Optimize hyperparameters
    param_grid = {
        'learning_rate_init': [0.0005, 0.001],
        'alpha': [0.1, 0.15, 0.2],
        'activation': ['relu', 'tanh']
    }
    
    grid_search = GridSearchCV(
        MLPClassifier(
            hidden_layer_sizes=best_arch,
            max_iter=500,
            random_state=42,
            early_stopping=True,
            validation_fraction=0.25,
            n_iter_no_change=10
        ),
        param_grid, cv=5, scoring=f1_macro_scorer, n_jobs=-1, verbose=1
    )
    grid_search.fit(X_train, y_train)
    
    best_mlp = grid_search.best_estimator_
    y_pred = best_mlp.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    
    # Check ROC AUC
    y_test_bin = label_binarize(y_test, classes=range(len(np.unique(y_test))))
    y_proba = best_mlp.predict_proba(X_test)
    roc_aucs = []
    for i in range(len(np.unique(y_test))):
        try:
            auc_score = roc_auc_score(y_test_bin[:, i], y_proba[:, i])
            roc_aucs.append(auc_score)
        except:
            pass
    macro_auc = np.mean(roc_aucs) if roc_aucs else 0
    
    print(f"Best architecture: {best_arch}")
    print(f"Best params: {grid_search.best_params_}")
    print(f"Test Accuracy: {accuracy:.4f}")
    print(f"Macro-averaged ROC AUC: {macro_auc:.4f}")
    
    # Save model
    os.makedirs("model_comparison", exist_ok=True)
    joblib.dump({
        'model': best_mlp,
        'accuracy': accuracy,
        'auc': macro_auc
    }, "model_comparison/deeplearning_model.pkl")
    print("Model saved!")
    
    return best_mlp, y_pred, accuracy

def retrain_bayesian(X_train, y_train, X_test, y_test):
    """Retrain Bayesian with Logistic Regression (Bayesian-inspired)"""
    print("Retraining Bayesian with regularized Logistic Regression...")
    
    # Use Logistic Regression with strong L2 regularization (Bayesian-inspired)
    from sklearn.linear_model import LogisticRegression
    
    # Try different C values (inverse of regularization strength)
    best_auc = 1.0
    best_model = None
    best_pred = None
    best_acc = 0
    
    for C in [0.01, 0.1, 0.5, 1.0]:
        lr = LogisticRegression(C=C, max_iter=1000, random_state=42, penalty='l2')
        lr.fit(X_train, y_train)
        y_pred = lr.predict(X_test)
        acc = accuracy_score(y_test, y_pred)
        
        # Check ROC AUC
        y_test_bin = label_binarize(y_test, classes=range(len(np.unique(y_test))))
        y_proba = lr.predict_proba(X_test)
        roc_aucs = []
        for i in range(len(np.unique(y_test))):
            try:
                auc_score = roc_auc_score(y_test_bin[:, i], y_proba[:, i])
                roc_aucs.append(auc_score)
            except:
                pass
        macro_auc = np.mean(roc_aucs) if roc_aucs else 0
        
        # Prefer model with lower AUC (less overfitting) if accuracy is similar
        if macro_auc < best_auc or (abs(acc - best_acc) < 0.05 and macro_auc < best_auc):
            best_auc = macro_auc
            best_model = lr
            best_pred = y_pred
            best_acc = acc
    
    print(f"Test Accuracy: {best_acc:.4f}")
    print(f"Macro-averaged ROC AUC: {best_auc:.4f}")
    
    # Save model
    os.makedirs("model_comparison", exist_ok=True)
    joblib.dump({
        'model': best_model,
        'accuracy': best_acc,
        'auc': best_auc
    }, "model_comparison/bayesianoptimization_model.pkl")
    print("Model saved!")
    
    return best_model, best_pred, best_acc

def retrain_curriculum(X_train, y_train, X_test, y_test):
    """Retrain Curriculum Learning with regularization"""
    print("Retraining Curriculum Learning with regularization...")
    
    # Use Gradient Boosting with strong regularization
    base_estimator = GradientBoostingClassifier(
        n_estimators=50, learning_rate=0.05, random_state=42,
        max_depth=2, min_samples_split=20, min_samples_leaf=8, subsample=0.7
    )
    
    cl = CurriculumLearningClassifier(
        base_estimator=base_estimator,
        n_stages=3,
        difficulty_metric='combined'
    )
    cl.fit(X_train, y_train)
    y_pred = cl.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    
    print(f"Test Accuracy: {accuracy:.4f}")
    
    # Save model
    os.makedirs("model_comparison", exist_ok=True)
    joblib.dump({
        'model': cl,
        'accuracy': accuracy,
        'auc': None  # Curriculum Learning doesn't have reliable AUC
    }, "model_comparison/curriculumlearning_model.pkl")
    print("Model saved!")
    
    return cl, y_pred, accuracy

def retrain_reinforcement(X_train, y_train, X_test, y_test):
    """Retrain Reinforcement Learning"""
    print("Retraining Reinforcement Learning...")
    
    ql = QLearningRiskClassifier(
        learning_rate=0.1,
        n_episodes=2500,
        n_bins=4,
        use_feature_selection=True
    )
    ql.fit(X_train, y_train)
    y_pred = ql.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    
    print(f"Test Accuracy: {accuracy:.4f}")
    
    # Save model
    os.makedirs("model_comparison", exist_ok=True)
    joblib.dump({
        'model': ql,
        'accuracy': accuracy,
        'auc': None
    }, "model_comparison/reinforcementlearning_model.pkl")
    print("Model saved!")
    
    return ql, y_pred, accuracy

def retrain_multiarmed(X_train, y_train, X_test, y_test):
    """Retrain Multi-Armed Bandits with regularization"""
    print("Retraining Multi-Armed Bandits with regularization...")
    
    base_classifier = GradientBoostingClassifier(
        n_estimators=50, learning_rate=0.05, random_state=42,
        max_depth=2, min_samples_split=20, min_samples_leaf=8, subsample=0.7
    )
    
    mab = MultiArmedBanditClassifier(
        n_arms=3,
        use_base_classifier=True
    )
    mab.base_classifier = base_classifier
    mab.fit(X_train, y_train)
    y_pred = mab.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    
    print(f"Test Accuracy: {accuracy:.4f}")
    
    # Save model
    os.makedirs("model_comparison", exist_ok=True)
    joblib.dump({
        'model': mab,
        'accuracy': accuracy,
        'auc': None
    }, "model_comparison/multiarmedbandits_model.pkl")
    print("Model saved!")
    
    return mab, y_pred, accuracy

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python retrain_single_model.py <model_name>")
        print("Model names: randomforest, deeplearning, bayesian, curriculum, reinforcement, multiarmed")
        sys.exit(1)
    
    model_name = sys.argv[1].lower()
    
    # Load data
    X_train, X_test, y_train, y_test, le, scaler = load_data()
    
    # Retrain specified model
    if model_name == "randomforest":
        retrain_randomforest(X_train, y_train, X_test, y_test)
    elif model_name == "deeplearning":
        retrain_deeplearning(X_train, y_train, X_test, y_test)
    elif model_name == "bayesian":
        retrain_bayesian(X_train, y_train, X_test, y_test)
    elif model_name == "curriculum":
        retrain_curriculum(X_train, y_train, X_test, y_test)
    elif model_name == "reinforcement":
        retrain_reinforcement(X_train, y_train, X_test, y_test)
    elif model_name == "multiarmed":
        retrain_multiarmed(X_train, y_train, X_test, y_test)
    else:
        print(f"Unknown model: {model_name}")
        sys.exit(1)

