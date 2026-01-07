"""
Retrain a single model with fair procedures.
Usage: python retrain_fair_single.py <model_name>
Model names: randomforest, deeplearning, bayesian, curriculum, reinforcement, multiarmed
"""

import sys
import os
import joblib
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split, GridSearchCV, cross_val_score
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import accuracy_score, roc_auc_score, f1_score, make_scorer
from sklearn.preprocessing import label_binarize
import warnings
warnings.filterwarnings('ignore')

from custom_classifiers_enhanced import (
    QLearningRiskClassifier,
    MultiArmedBanditClassifier,
    CurriculumLearningClassifier
)

def load_data():
    """Load and prepare data - SAME FOR ALL MODELS"""
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
    """Retrain Random Forest with FAIR regularization"""
    print("Retraining Random Forest with fair regularization...")
    print("  - Using all 11 features (NO feature selection)")
    print("  - Moderate regularization (not aggressive)")
    print("  - 5-fold CV for optimization")
    
    f1_macro_scorer = make_scorer(f1_score, average='macro')
    
    # Moderate regularization
    param_grid = {
        'n_estimators': [100, 150, 200],
        'max_depth': [5, 7, 10],
        'min_samples_split': [5, 10, 15],
        'min_samples_leaf': [2, 4, 6],
        'max_features': ['sqrt', 0.5, 0.7],
        'max_samples': [0.8, 0.9],
        'class_weight': [None]
    }
    
    rf_base = RandomForestClassifier(random_state=42, n_jobs=-1)
    grid_search = GridSearchCV(
        rf_base, param_grid, cv=5, scoring=f1_macro_scorer, n_jobs=-1, verbose=1
    )
    grid_search.fit(X_train, y_train)
    
    best_rf = grid_search.best_estimator_
    y_pred = best_rf.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    
    # Check ROC AUC
    y_test_bin = label_binarize(y_test, classes=range(len(np.unique(y_test))))
    y_proba = best_rf.predict_proba(X_test)
    roc_aucs = []
    for i in range(len(np.unique(y_test))):
        try:
            auc_score = roc_auc_score(y_test_bin[:, i], y_proba[:, i])
            roc_aucs.append(auc_score)
        except:
            pass
    macro_auc = np.mean(roc_aucs) if roc_aucs else 0
    
    print(f"  Best params: {grid_search.best_params_}")
    print(f"  Test Accuracy: {accuracy:.4f}")
    print(f"  Macro-averaged ROC AUC: {macro_auc:.4f}")
    
    # Save model (NO feature selector)
    os.makedirs("model_comparison", exist_ok=True)
    joblib.dump({
        'model': best_rf,
        'accuracy': accuracy,
        'auc': macro_auc
    }, "model_comparison/randomforest_model.pkl")
    print("  Model saved!")
    
    return best_rf, y_pred, accuracy

def retrain_deeplearning(X_train, y_train, X_test, y_test):
    """Retrain Deep Learning with FAIR regularization"""
    print("Retraining Deep Learning with fair regularization...")
    print("  - Using all 11 features (NO feature selection)")
    print("  - Moderate regularization")
    print("  - 5-fold CV for optimization")
    
    f1_macro_scorer = make_scorer(f1_score, average='macro')
    
    # Architecture search with 5-fold CV
    architectures = [(64, 32), (100, 50), (128, 64)]
    
    best_cv_score = 0
    best_arch = None
    
    for arch in architectures:
        mlp = MLPClassifier(
            hidden_layer_sizes=arch,
            max_iter=500,
            random_state=42,
            early_stopping=True,
            validation_fraction=0.2,
            learning_rate_init=0.001,
            alpha=0.01,
            n_iter_no_change=10
        )
        cv_scores = cross_val_score(mlp, X_train, y_train, cv=5, scoring=f1_macro_scorer)
        cv_mean = cv_scores.mean()
        
        if cv_mean > best_cv_score:
            best_cv_score = cv_mean
            best_arch = arch
    
    # Hyperparameter optimization with 5-fold CV
    param_grid = {
        'learning_rate_init': [0.0005, 0.001, 0.005],
        'alpha': [0.01, 0.05, 0.1],
        'activation': ['relu', 'tanh']
    }
    
    grid_search = GridSearchCV(
        MLPClassifier(
            hidden_layer_sizes=best_arch,
            max_iter=500,
            random_state=42,
            early_stopping=True,
            validation_fraction=0.2,
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
    
    print(f"  Best architecture: {best_arch}")
    print(f"  Best params: {grid_search.best_params_}")
    print(f"  Test Accuracy: {accuracy:.4f}")
    print(f"  Macro-averaged ROC AUC: {macro_auc:.4f}")
    
    # Save model
    os.makedirs("model_comparison", exist_ok=True)
    joblib.dump({
        'model': best_mlp,
        'accuracy': accuracy,
        'auc': macro_auc
    }, "model_comparison/deeplearning_model.pkl")
    print("  Model saved!")
    
    return best_mlp, y_pred, accuracy

def retrain_bayesian(X_train, y_train, X_test, y_test):
    """Retrain Bayesian with FAIR procedures"""
    print("Retraining Bayesian Optimization with fair procedures...")
    print("  - Using all 11 features (NO feature selection)")
    print("  - 5-fold CV for optimization")
    
    f1_macro_scorer = make_scorer(f1_score, average='macro')
    
    # Use Logistic Regression with 5-fold CV
    param_grid = {
        'C': [0.1, 0.5, 1.0, 2.0],
        'penalty': ['l2'],
        'max_iter': [1000]
    }
    
    grid_search = GridSearchCV(
        LogisticRegression(random_state=42),
        param_grid, cv=5, scoring=f1_macro_scorer, n_jobs=-1, verbose=1
    )
    grid_search.fit(X_train, y_train)
    
    best_lr = grid_search.best_estimator_
    y_pred = best_lr.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    
    # Check ROC AUC
    y_test_bin = label_binarize(y_test, classes=range(len(np.unique(y_test))))
    y_proba = best_lr.predict_proba(X_test)
    roc_aucs = []
    for i in range(len(np.unique(y_test))):
        try:
            auc_score = roc_auc_score(y_test_bin[:, i], y_proba[:, i])
            roc_aucs.append(auc_score)
        except:
            pass
    macro_auc = np.mean(roc_aucs) if roc_aucs else 0
    
    print(f"  Best params: {grid_search.best_params_}")
    print(f"  Test Accuracy: {accuracy:.4f}")
    print(f"  Macro-averaged ROC AUC: {macro_auc:.4f}")
    
    # Save model
    os.makedirs("model_comparison", exist_ok=True)
    joblib.dump({
        'model': best_lr,
        'accuracy': accuracy,
        'auc': macro_auc
    }, "model_comparison/bayesianoptimization_model.pkl")
    print("  Model saved!")
    
    return best_lr, y_pred, accuracy

def retrain_curriculum(X_train, y_train, X_test, y_test):
    """Retrain Curriculum Learning with FAIR procedures"""
    print("Retraining Curriculum Learning with fair procedures...")
    print("  - Using all 11 features (NO feature selection)")
    print("  - 5-fold CV for optimization")
    
    f1_macro_scorer = make_scorer(f1_score, average='macro')
    
    # Optimize stages with 5-fold CV
    best_cv_score = 0
    best_model = None
    best_pred = None
    best_stages = None
    
    for n_stages in [3, 5, 7]:
        base_estimator = GradientBoostingClassifier(
            n_estimators=100, learning_rate=0.1, random_state=42,
            max_depth=5, min_samples_split=10, min_samples_leaf=4, subsample=0.8
        )
        cl = CurriculumLearningClassifier(
            base_estimator=base_estimator,
            n_stages=n_stages,
            difficulty_metric='combined'
        )
        try:
            cv_scores = cross_val_score(cl, X_train, y_train, cv=5, scoring=f1_macro_scorer)
            cv_mean = cv_scores.mean()
            
            if cv_mean > best_cv_score:
                best_cv_score = cv_mean
                best_stages = n_stages
                cl.fit(X_train, y_train)
                best_model = cl
                best_pred = cl.predict(X_test)
        except:
            continue
    
    if best_model is None:
        base_estimator = GradientBoostingClassifier(
            n_estimators=100, learning_rate=0.1, random_state=42,
            max_depth=5, min_samples_split=10, min_samples_leaf=4, subsample=0.8
        )
        best_model = CurriculumLearningClassifier(
            base_estimator=base_estimator,
            n_stages=3,
            difficulty_metric='combined'
        )
        best_model.fit(X_train, y_train)
        best_pred = best_model.predict(X_test)
        best_stages = 3
    
    accuracy = accuracy_score(y_test, best_pred)
    print(f"  Best stages: {best_stages} (CV: {best_cv_score:.4f})")
    print(f"  Test Accuracy: {accuracy:.4f}")
    
    # Save model
    os.makedirs("model_comparison", exist_ok=True)
    joblib.dump({
        'model': best_model,
        'accuracy': accuracy,
        'auc': None
    }, "model_comparison/curriculumlearning_model.pkl")
    print("  Model saved!")
    
    return best_model, best_pred, accuracy

def retrain_reinforcement(X_train, y_train, X_test, y_test):
    """Retrain Reinforcement Learning with FAIR procedures"""
    print("Retraining Reinforcement Learning with fair procedures...")
    print("  - Using all 11 features (NO feature selection)")
    print("  - 5-fold CV for optimization (not 3-fold)")
    
    f1_macro_scorer = make_scorer(f1_score, average='macro')
    
    # Use 5-fold CV for parameter optimization
    learning_rates = [0.1, 0.15, 0.2]
    n_episodes_list = [2000, 2500, 3000]
    
    best_cv_score = 0
    best_params = None
    
    for lr in learning_rates:
        for n_ep in n_episodes_list:
            ql = QLearningRiskClassifier(
                learning_rate=lr,
                n_episodes=n_ep,
                n_bins=4,
                use_feature_selection=False  # FAIR: no feature selection
            )
            try:
                cv_scores = cross_val_score(ql, X_train, y_train, cv=5, scoring=f1_macro_scorer)
                cv_mean = cv_scores.mean()
                
                if cv_mean > best_cv_score:
                    best_cv_score = cv_mean
                    best_params = (lr, n_ep)
            except:
                continue
    
    if best_params is None:
        best_params = (0.15, 2000)
    
    # Train final model
    ql = QLearningRiskClassifier(
        learning_rate=best_params[0],
        n_episodes=best_params[1],
        n_bins=4,
        use_feature_selection=False  # FAIR: no feature selection
    )
    ql.fit(X_train, y_train)
    y_pred = ql.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    
    print(f"  Best LR: {best_params[0]}, Episodes: {best_params[1]} (CV: {best_cv_score:.4f})")
    print(f"  Test Accuracy: {accuracy:.4f}")
    
    # Save model
    os.makedirs("model_comparison", exist_ok=True)
    joblib.dump({
        'model': ql,
        'accuracy': accuracy,
        'auc': None
    }, "model_comparison/reinforcementlearning_model.pkl")
    print("  Model saved!")
    
    return ql, y_pred, accuracy

def retrain_multiarmed(X_train, y_train, X_test, y_test):
    """Retrain Multi-Armed Bandits with FAIR procedures"""
    print("Retraining Multi-Armed Bandits with fair procedures...")
    print("  - Using all 11 features (NO feature selection)")
    print("  - 5-fold CV for optimization")
    
    f1_macro_scorer = make_scorer(f1_score, average='macro')
    
    # Optimize base classifier with 5-fold CV
    base_classifiers = [
        GradientBoostingClassifier(
            n_estimators=100, learning_rate=0.1, random_state=42,
            max_depth=5, min_samples_split=10, min_samples_leaf=4, subsample=0.8
        ),
        LogisticRegression(max_iter=1000, random_state=42, C=1.0),
    ]
    
    best_cv_score = 0
    best_model = None
    best_pred = None
    
    for base_clf in base_classifiers:
        mab = MultiArmedBanditClassifier(
            n_arms=3,
            use_base_classifier=True
        )
        mab.base_classifier = base_clf
        try:
            cv_scores = cross_val_score(mab, X_train, y_train, cv=5, scoring=f1_macro_scorer)
            cv_mean = cv_scores.mean()
            
            if cv_mean > best_cv_score:
                best_cv_score = cv_mean
                mab.fit(X_train, y_train)
                best_model = mab
                best_pred = mab.predict(X_test)
        except:
            continue
    
    if best_model is None:
        base_clf = GradientBoostingClassifier(
            n_estimators=100, learning_rate=0.1, random_state=42,
            max_depth=5, min_samples_split=10, min_samples_leaf=4, subsample=0.8
        )
        best_model = MultiArmedBanditClassifier(n_arms=3, use_base_classifier=True)
        best_model.base_classifier = base_clf
        best_model.fit(X_train, y_train)
        best_pred = best_model.predict(X_test)
    
    accuracy = accuracy_score(y_test, best_pred)
    print(f"  Best base: {type(best_model.base_classifier).__name__} (CV: {best_cv_score:.4f})")
    print(f"  Test Accuracy: {accuracy:.4f}")
    
    # Save model
    os.makedirs("model_comparison", exist_ok=True)
    joblib.dump({
        'model': best_model,
        'accuracy': accuracy,
        'auc': None
    }, "model_comparison/multiarmedbandits_model.pkl")
    print("  Model saved!")
    
    return best_model, best_pred, accuracy

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python retrain_fair_single.py <model_name>")
        print("Model names: randomforest, deeplearning, bayesian, curriculum, reinforcement, multiarmed")
        sys.exit(1)
    
    model_name = sys.argv[1].lower()
    
    # Load data
    X_train, X_test, y_train, y_test, le, scaler = load_data()
    
    print("="*60)
    print(f"FAIR RETRAINING: {model_name.upper()}")
    print("="*60)
    print("Fairness Guarantees:")
    print("  - Same train/test split (80/20, random_state=42, stratified)")
    print("  - Same preprocessing (StandardScaler, all 11 features)")
    print("  - NO feature selection (all models use all 11 features)")
    print("  - 5-fold CV for all hyperparameter optimization")
    print("  - Similar regularization strength (moderate)")
    print("="*60)
    
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
    
    print("\n" + "="*60)
    print("RETRAINING COMPLETE")
    print("="*60)







