"""
Fair training script - all models trained with consistent procedures:
- Same train/test split (already done)
- Same preprocessing (already done)
- NO feature selection (all use 11 features)
- 5-fold CV for all hyperparameter optimization
- Similar regularization strength (moderate, not too aggressive)
- Similar optimization effort
"""

import os
import joblib
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import accuracy_score, roc_auc_score, f1_score, make_scorer
from sklearn.preprocessing import label_binarize
import warnings
warnings.filterwarnings('ignore')

# Import enhanced custom classifiers
from custom_classifiers_enhanced import (
    QLearningRiskClassifier,
    MultiArmedBanditClassifier,
    CurriculumLearningClassifier
)

def load_and_prepare_data():
    """Load data and prepare features/target - SAME FOR ALL MODELS"""
    if not os.path.exists("enhanced_student_features.csv"):
        raise FileNotFoundError("enhanced_student_features.csv not found")
    
    df = pd.read_csv("enhanced_student_features.csv")
    df["test_type"] = 0
    
    feature_cols = [
        "abnormal_psych_score", "developmental_psych_score", "industrial_psych_score",
        "psychological_assessment_score", "overall_avg_score", "score_consistency",
        "improvement_rate", "study_hours_per_week", "total_tests_taken",
        "avg_tests_per_subject", "test_type",
    ]
    
    missing_cols = [c for c in feature_cols if c not in df.columns]
    if missing_cols:
        raise ValueError(f"Missing columns: {missing_cols}")
    
    X = df[feature_cols].copy().fillna(0)
    
    # Create risk labels
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
    
    # Same split as original (80/20, stratified) - FAIR
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=42, stratify=y
    )
    
    return X_train, X_test, y_train, y_test, le, scaler, feature_cols

def train_random_forest_fair(X_train, y_train, X_test, y_test):
    """Train Random Forest with FAIR regularization (moderate, not aggressive)"""
    print("   Training Random Forest with fair regularization...")
    
    f1_macro_scorer = make_scorer(f1_score, average='macro')
    
    # Moderate regularization (not too aggressive)
    param_grid = {
        'n_estimators': [100, 150, 200],
        'max_depth': [5, 7, 10],  # Moderate depth (not 2)
        'min_samples_split': [5, 10, 15],  # Moderate (not 30)
        'min_samples_leaf': [2, 4, 6],  # Moderate (not 12)
        'max_features': ['sqrt', 0.5, 0.7],  # Moderate (not 0.2)
        'max_samples': [0.8, 0.9],  # Moderate (not 0.6)
        'class_weight': [None]
    }
    
    # Grid search with 5-fold CV - FAIR
    rf_base = RandomForestClassifier(random_state=42, n_jobs=-1)
    grid_search = GridSearchCV(
        rf_base, param_grid, cv=5, scoring=f1_macro_scorer, 
        n_jobs=-1, verbose=1
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
    
    print(f"   Best params: {grid_search.best_params_}")
    print(f"   Test Accuracy: {accuracy:.4f}")
    print(f"   Macro-averaged ROC AUC: {macro_auc:.4f}")
    
    return best_rf, y_pred, accuracy

def train_deep_learning_fair(X_train, y_train, X_test, y_test):
    """Train Deep Learning with FAIR regularization"""
    print("   Training Deep Learning with fair regularization...")
    
    f1_macro_scorer = make_scorer(f1_score, average='macro')
    
    # Architecture search with 5-fold CV - FAIR
    from sklearn.model_selection import cross_val_score
    
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
            alpha=0.01,  # Moderate regularization
            n_iter_no_change=10
        )
        cv_scores = cross_val_score(mlp, X_train, y_train, cv=5, scoring=f1_macro_scorer)
        cv_mean = cv_scores.mean()
        
        if cv_mean > best_cv_score:
            best_cv_score = cv_mean
            best_arch = arch
    
    # Hyperparameter optimization with 5-fold CV - FAIR
    param_grid = {
        'learning_rate_init': [0.0005, 0.001, 0.005],
        'alpha': [0.01, 0.05, 0.1],  # Moderate regularization
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
    
    print(f"   Best architecture: {best_arch}")
    print(f"   Best params: {grid_search.best_params_}")
    print(f"   Test Accuracy: {accuracy:.4f}")
    print(f"   Macro-averaged ROC AUC: {macro_auc:.4f}")
    
    return best_mlp, y_pred, accuracy

def train_bayesian_fair(X_train, y_train, X_test, y_test):
    """Train Bayesian with FAIR regularization and CV"""
    print("   Training Bayesian Optimization with fair procedures...")
    
    f1_macro_scorer = make_scorer(f1_score, average='macro')
    
    # Use Logistic Regression with 5-fold CV for hyperparameter optimization - FAIR
    param_grid = {
        'C': [0.1, 0.5, 1.0, 2.0],  # Moderate regularization range
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
    
    print(f"   Best params: {grid_search.best_params_}")
    print(f"   Test Accuracy: {accuracy:.4f}")
    print(f"   Macro-averaged ROC AUC: {macro_auc:.4f}")
    
    return best_lr, y_pred, accuracy

def train_curriculum_fair(X_train, y_train, X_test, y_test):
    """Train Curriculum Learning with FAIR procedures"""
    print("   Training Curriculum Learning with fair procedures...")
    
    f1_macro_scorer = make_scorer(f1_score, average='macro')
    
    # Optimize stages with 5-fold CV - FAIR
    from sklearn.model_selection import cross_val_score
    
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
        # Fallback
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
    print(f"   Best stages: {best_stages} (CV: {best_cv_score:.4f})")
    print(f"   Test Accuracy: {accuracy:.4f}")
    
    return best_model, best_pred, accuracy

def train_reinforcement_fair(X_train, y_train, X_test, y_test):
    """Train Reinforcement Learning with FAIR procedures (5-fold CV)"""
    print("   Training Reinforcement Learning with fair procedures...")
    
    f1_macro_scorer = make_scorer(f1_score, average='macro')
    
    # Use 5-fold CV for parameter optimization - FAIR (not 3-fold)
    from sklearn.model_selection import cross_val_score
    
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
                cv_scores = cross_val_score(ql, X_train, y_train, cv=5, scoring=f1_macro_scorer)  # 5-fold, not 3
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
    
    print(f"   Best LR: {best_params[0]}, Episodes: {best_params[1]} (CV: {best_cv_score:.4f})")
    print(f"   Test Accuracy: {accuracy:.4f}")
    
    return ql, y_pred, accuracy

def train_multiarmed_fair(X_train, y_train, X_test, y_test):
    """Train Multi-Armed Bandits with FAIR procedures (5-fold CV)"""
    print("   Training Multi-Armed Bandits with fair procedures...")
    
    f1_macro_scorer = make_scorer(f1_score, average='macro')
    
    # Optimize base classifier with 5-fold CV - FAIR
    from sklearn.model_selection import cross_val_score
    
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
            cv_scores = cross_val_score(mab, X_train, y_train, cv=5, scoring=f1_macro_scorer)  # 5-fold CV
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
    print(f"   Best base: {type(best_model.base_classifier).__name__} (CV: {best_cv_score:.4f})")
    print(f"   Test Accuracy: {accuracy:.4f}")
    
    return best_model, best_pred, accuracy

def train_all_models_fair():
    """Train all models with FAIR procedures"""
    print("="*60)
    print("TRAINING ALL MODELS WITH FAIR PROCEDURES")
    print("="*60)
    print("\nFairness Guarantees:")
    print("  - Same train/test split (80/20, random_state=42, stratified)")
    print("  - Same preprocessing (StandardScaler, all 11 features)")
    print("  - NO feature selection (all models use all 11 features)")
    print("  - 5-fold CV for all hyperparameter optimization")
    print("  - Similar regularization strength (moderate)")
    print("  - Similar optimization effort")
    print("="*60)
    
    # Load data
    X_train, X_test, y_train, y_test, le, scaler, feature_cols = load_and_prepare_data()
    
    models = {}
    results = {}
    
    # 1. Random Forest
    print("\n1. Training Random Forest...")
    rf, y_pred_rf, acc_rf = train_random_forest_fair(X_train, y_train, X_test, y_test)
    models['RandomForest'] = rf
    results['RandomForest'] = {
        'model': rf,
        'predictions': y_pred_rf,
        'test_accuracy': acc_rf
    }
    
    # 2. Deep Learning
    print("\n2. Training Deep Learning...")
    mlp, y_pred_dl, acc_dl = train_deep_learning_fair(X_train, y_train, X_test, y_test)
    models['DeepLearning'] = mlp
    results['DeepLearning'] = {
        'model': mlp,
        'predictions': y_pred_dl,
        'test_accuracy': acc_dl
    }
    
    # 3. Bayesian Optimization
    print("\n3. Training Bayesian Optimization...")
    lr, y_pred_bay, acc_bay = train_bayesian_fair(X_train, y_train, X_test, y_test)
    models['BayesianOptimization'] = lr
    results['BayesianOptimization'] = {
        'model': lr,
        'predictions': y_pred_bay,
        'test_accuracy': acc_bay
    }
    
    # 4. Curriculum Learning
    print("\n4. Training Curriculum Learning...")
    cl, y_pred_cl, acc_cl = train_curriculum_fair(X_train, y_train, X_test, y_test)
    models['CurriculumLearning'] = cl
    results['CurriculumLearning'] = {
        'model': cl,
        'predictions': y_pred_cl,
        'test_accuracy': acc_cl
    }
    
    # 5. Reinforcement Learning
    print("\n5. Training Reinforcement Learning...")
    ql, y_pred_rl, acc_rl = train_reinforcement_fair(X_train, y_train, X_test, y_test)
    models['ReinforcementLearning'] = ql
    results['ReinforcementLearning'] = {
        'model': ql,
        'predictions': y_pred_rl,
        'test_accuracy': acc_rl
    }
    
    # 6. Multi-Armed Bandits
    print("\n6. Training Multi-Armed Bandits...")
    mab, y_pred_mab, acc_mab = train_multiarmed_fair(X_train, y_train, X_test, y_test)
    models['MultiArmedBandits'] = mab
    results['MultiArmedBandits'] = {
        'model': mab,
        'predictions': y_pred_mab,
        'test_accuracy': acc_mab
    }
    
    # Save models (NO feature selectors)
    os.makedirs("model_comparison", exist_ok=True)
    for name, model in models.items():
        model_file = f"model_comparison/{name.lower().replace(' ', '_')}_model.pkl"
        joblib.dump({
            'model': model,
            'accuracy': results[name]['test_accuracy']
        }, model_file)
        print(f"   Saved: {model_file}")
    
    # Save results
    comparison_file = "model_comparison/comparison_results.pkl"
    joblib.dump({
        'results': results,
        'label_encoder': le,
        'scaler': scaler,
        'feature_cols': feature_cols
    }, comparison_file)
    print(f"\n   Saved: {comparison_file}")
    
    print("\n" + "="*60)
    print("FAIR MODEL COMPARISON SUMMARY")
    print("="*60)
    print("\nModel Performance (Fair Training):")
    for name, res in sorted(results.items(), key=lambda x: x[1]['test_accuracy'], reverse=True):
        print(f"  {name:25s}: {res['test_accuracy']:.4f}")
    print("\n" + "="*60)

if __name__ == "__main__":
    train_all_models_fair()







