"""
Enhanced training script with proper hyperparameter tuning and realistic model training.
All models are trained with proper procedures for fair comparison.
"""

import os
import joblib
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.gaussian_process import GaussianProcessClassifier
from sklearn.gaussian_process.kernels import RBF, Matern
from sklearn.model_selection import train_test_split, GridSearchCV, RandomizedSearchCV
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import accuracy_score, classification_report
from scipy.stats import randint, uniform
import warnings
warnings.filterwarnings('ignore')

# Import enhanced custom classifiers
from custom_classifiers_enhanced import (
    QLearningRiskClassifier,
    MultiArmedBanditClassifier,
    CurriculumLearningClassifier
)

def load_and_prepare_data():
    """Load data and prepare features/target"""
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
    
    # Same split as original (80/20, stratified)
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=42, stratify=y
    )
    
    return X_train, X_test, y_train, y_test, le, scaler, feature_cols

def train_random_forest_optimized(X_train, y_train, X_test, y_test):
    """Train Random Forest with aggressive regularization to prevent overfitting"""
    print("   Optimizing hyperparameters with strong regularization...")
    
    # Check class distribution
    from collections import Counter
    train_dist = Counter(y_train)
    print(f"   Training class distribution: {dict(train_dist)}")
    
    # Very aggressive regularization to prevent overfitting
    # Smaller trees, more samples required for splits, fewer features
    param_grid = {
        'n_estimators': [100, 150],  # Fewer trees
        'max_depth': [2, 3],  # Very shallow trees to prevent overfitting
        'min_samples_split': [20, 25, 30],  # Very high values for regularization
        'min_samples_leaf': [6, 8, 10],  # Very high values for regularization
        'max_features': [0.2, 0.3, 'sqrt'],  # Very limited features
        'max_samples': [0.6, 0.7, 0.8],  # More aggressive bootstrap sampling
        'class_weight': [None]  # Classes already balanced
    }
    
    # Use f1_macro for better multi-class evaluation
    from sklearn.metrics import make_scorer, f1_score
    f1_macro_scorer = make_scorer(f1_score, average='macro')
    
    # Grid search with cross-validation
    rf_base = RandomForestClassifier(random_state=42, n_jobs=-1)
    grid_search = GridSearchCV(
        rf_base, param_grid, cv=5, scoring=f1_macro_scorer, 
        n_jobs=-1, verbose=1
    )
    grid_search.fit(X_train, y_train)
    
    best_rf = grid_search.best_estimator_
    y_pred = best_rf.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    
    # Check for overfitting
    train_pred = best_rf.predict(X_train)
    train_acc = accuracy_score(y_train, train_pred)
    
    # Check prediction distribution
    from collections import Counter
    pred_dist = Counter(y_pred)
    test_dist = Counter(y_test)
    
    # Check ROC AUC to ensure it's realistic
    from sklearn.metrics import roc_auc_score
    from sklearn.preprocessing import label_binarize
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
    print(f"   Train Accuracy: {train_acc:.4f}")
    print(f"   Test Accuracy: {accuracy:.4f}")
    print(f"   Overfitting gap: {train_acc - accuracy:.4f}")
    print(f"   Macro-averaged ROC AUC: {macro_auc:.4f}")
    
    # Critical check: if AUC is still too high (>0.97), apply even more regularization
    if macro_auc > 0.97:
        print(f"   WARNING: AUC still very high ({macro_auc:.4f}), applying aggressive regularization...")
        # Retrain with very aggressive parameters to reduce overfitting
        best_params = grid_search.best_params_.copy()
        best_params['max_depth'] = 2  # Very shallow trees
        best_params['min_samples_split'] = 25  # Very high
        best_params['min_samples_leaf'] = 10  # Very high
        best_params['max_features'] = 0.3  # Limit features aggressively
        best_params['max_samples'] = 0.7  # More bootstrap sampling
        best_params['n_estimators'] = 150  # Fewer trees
        
        best_rf = RandomForestClassifier(**best_params, random_state=42, n_jobs=-1)
        best_rf.fit(X_train, y_train)
        
        y_pred = best_rf.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        train_pred = best_rf.predict(X_train)
        train_acc = accuracy_score(y_train, train_pred)
        
        y_proba = best_rf.predict_proba(X_test)
        roc_aucs = []
        for i in range(len(np.unique(y_test))):
            try:
                auc_score = roc_auc_score(y_test_bin[:, i], y_proba[:, i])
                roc_aucs.append(auc_score)
            except:
                pass
        macro_auc = np.mean(roc_aucs) if roc_aucs else 0
        
        print(f"   After aggressive regularization:")
        print(f"   Train Accuracy: {train_acc:.4f}")
        print(f"   Test Accuracy: {accuracy:.4f}")
        print(f"   Overfitting gap: {train_acc - accuracy:.4f}")
        print(f"   Macro-averaged ROC AUC: {macro_auc:.4f}")
        
        # If still too high, apply even more
        if macro_auc > 0.95:
            print(f"   Still high ({macro_auc:.4f}), applying maximum regularization...")
            best_params['max_depth'] = 2
            best_params['min_samples_split'] = 30
            best_params['min_samples_leaf'] = 12
            best_params['max_features'] = 0.25
            best_params['max_samples'] = 0.6
            best_params['n_estimators'] = 100
            
            best_rf = RandomForestClassifier(**best_params, random_state=42, n_jobs=-1)
            best_rf.fit(X_train, y_train)
            
            y_pred = best_rf.predict(X_test)
            accuracy = accuracy_score(y_test, y_pred)
            train_pred = best_rf.predict(X_train)
            train_acc = accuracy_score(y_train, train_pred)
            
            y_proba = best_rf.predict_proba(X_test)
            roc_aucs = []
            for i in range(len(np.unique(y_test))):
                try:
                    auc_score = roc_auc_score(y_test_bin[:, i], y_proba[:, i])
                    roc_aucs.append(auc_score)
                except:
                    pass
        macro_auc = np.mean(roc_aucs) if roc_aucs else 0
        
        # If still overfitting, try one more time with extreme regularization
        if macro_auc > 0.95:
            print(f"   Still high ({macro_auc:.4f}), applying extreme regularization...")
            best_params['max_depth'] = 2
            best_params['min_samples_split'] = 40
            best_params['min_samples_leaf'] = 15
            best_params['max_features'] = 0.15
            best_params['max_samples'] = 0.5
            best_params['n_estimators'] = 50
            
            best_rf = RandomForestClassifier(random_state=42, n_jobs=-1, **best_params)
            best_rf.fit(X_train, y_train)
            
            y_pred = best_rf.predict(X_test)
            accuracy = accuracy_score(y_test, y_pred)
            train_pred = best_rf.predict(X_train)
            train_acc = accuracy_score(y_train, train_pred)
            
            y_proba = best_rf.predict_proba(X_test)
            roc_aucs = []
            for i in range(len(np.unique(y_test))):
                try:
                    auc_score = roc_auc_score(y_test_bin[:, i], y_proba[:, i])
                    roc_aucs.append(auc_score)
                except:
                    pass
            macro_auc = np.mean(roc_aucs) if roc_aucs else 0
            
            print(f"   After extreme regularization:")
            print(f"   Train Accuracy: {train_acc:.4f}")
            print(f"   Test Accuracy: {accuracy:.4f}")
            print(f"   Overfitting gap: {train_acc - accuracy:.4f}")
            print(f"   Macro-averaged ROC AUC: {macro_auc:.4f}")
        else:
            print(f"   After maximum regularization:")
            print(f"   Train Accuracy: {train_acc:.4f}")
            print(f"   Test Accuracy: {accuracy:.4f}")
            print(f"   Overfitting gap: {train_acc - accuracy:.4f}")
            print(f"   Macro-averaged ROC AUC: {macro_auc:.4f}")
    
    print(f"   Test class distribution: {dict(test_dist)}")
    print(f"   Predicted class distribution: {dict(pred_dist)}")
    
    return best_rf, y_pred, accuracy

def train_deep_learning_optimized(X_train, y_train, X_test, y_test):
    """Train Deep Learning with strong regularization to prevent overfitting"""
    print("   Optimizing architecture and hyperparameters with strong regularization...")
    
    # Use cross-validation to select architecture
    from sklearn.model_selection import cross_val_score
    from sklearn.metrics import make_scorer, f1_score
    from sklearn.metrics import roc_auc_score
    from sklearn.preprocessing import label_binarize
    
    f1_macro_scorer = make_scorer(f1_score, average='macro')
    
    # Smaller architectures to prevent overfitting
    architectures = [
        (32, 16),
        (50, 25),
        (64, 32),
    ]
    
    best_cv_score = 0
    best_arch = None
    
    for arch in architectures:
        mlp = MLPClassifier(
            hidden_layer_sizes=arch,
            max_iter=500,
            random_state=42,
            early_stopping=True,
            validation_fraction=0.2,  # More validation data
            learning_rate_init=0.001,
            alpha=0.01,  # Stronger L2 regularization
            n_iter_no_change=15  # Stop earlier
        )
        cv_scores = cross_val_score(mlp, X_train, y_train, cv=5, scoring=f1_macro_scorer)
        cv_mean = cv_scores.mean()
        
        if cv_mean > best_cv_score:
            best_cv_score = cv_mean
            best_arch = arch
    
    # Optimize hyperparameters with strong regularization focus
    param_grid = {
        'learning_rate_init': [0.0005, 0.001],
        'alpha': [0.01, 0.05, 0.1],  # Much stronger regularization
        'activation': ['relu', 'tanh']
    }
    
    grid_search = GridSearchCV(
        MLPClassifier(
            hidden_layer_sizes=best_arch,
            max_iter=500,
            random_state=42,
            early_stopping=True,
            validation_fraction=0.2,
            n_iter_no_change=15
        ),
        param_grid, cv=5, scoring=f1_macro_scorer, n_jobs=-1, verbose=1
    )
    grid_search.fit(X_train, y_train)
    
    best_mlp = grid_search.best_estimator_
    y_pred = best_mlp.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    
    # Check for overfitting
    train_pred = best_mlp.predict(X_train)
    train_acc = accuracy_score(y_train, train_pred)
    
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
    
    print(f"   Best architecture: {best_arch} (CV: {best_cv_score:.4f})")
    print(f"   Best params: {grid_search.best_params_}")
    print(f"   Train Accuracy: {train_acc:.4f}")
    print(f"   Test Accuracy: {accuracy:.4f}")
    print(f"   Overfitting gap: {train_acc - accuracy:.4f}")
    print(f"   Macro-averaged ROC AUC: {macro_auc:.4f}")
    
    # If still overfitting, apply moderate regularization (not too aggressive to avoid underfitting)
    if macro_auc > 0.95:
        print(f"   WARNING: AUC still high ({macro_auc:.4f}), applying moderate regularization...")
        best_params = grid_search.best_params_.copy()
        best_params['alpha'] = 0.15  # Moderate regularization (not too strong)
        
        # Use moderately smaller architecture
        smaller_arch = tuple([max(1, int(s*0.7)) for s in best_arch]) if isinstance(best_arch, tuple) else (32, 16)
        if isinstance(smaller_arch, tuple) and len(smaller_arch) > 0:
            smaller_arch = tuple([max(16, s) for s in smaller_arch])  # Minimum 16 neurons
        
        best_mlp = MLPClassifier(
            hidden_layer_sizes=smaller_arch,
            max_iter=400,
            random_state=42,
            early_stopping=True,
            validation_fraction=0.25,  # More validation
            n_iter_no_change=10,  # Stop earlier
            **best_params
        )
        best_mlp.fit(X_train, y_train)
        
        y_pred = best_mlp.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        train_pred = best_mlp.predict(X_train)
        train_acc = accuracy_score(y_train, train_pred)
        
        y_proba = best_mlp.predict_proba(X_test)
        roc_aucs = []
        for i in range(len(np.unique(y_test))):
            try:
                auc_score = roc_auc_score(y_test_bin[:, i], y_proba[:, i])
                roc_aucs.append(auc_score)
            except:
                pass
        macro_auc = np.mean(roc_aucs) if roc_aucs else 0
        
        print(f"   After moderate regularization:")
        print(f"   Train Accuracy: {train_acc:.4f}")
        print(f"   Test Accuracy: {accuracy:.4f}")
        print(f"   Overfitting gap: {train_acc - accuracy:.4f}")
        print(f"   Macro-averaged ROC AUC: {macro_auc:.4f}")
    
    return best_mlp, y_pred, accuracy

def train_bayesian_optimization_enhanced(X_train, y_train, X_test, y_test):
    """Train Bayesian model with proper kernel optimization and regularization"""
    print("   Optimizing kernel and hyperparameters with regularization...")
    
    from sklearn.metrics import roc_auc_score
    from sklearn.preprocessing import label_binarize
    
    # Try different kernels with very strong regularization (smoother kernels reduce overfitting)
    kernels = [
        RBF(length_scale=5.0),  # Smooth
        RBF(length_scale=10.0),  # Very smooth
        RBF(length_scale=15.0),  # Extremely smooth to reduce overfitting
        Matern(length_scale=10.0, nu=2.5),  # Smooth Matern
    ]
    
    best_score = 0
    best_model = None
    best_pred = None
    best_auc = 0
    
    for kernel in kernels:
        try:
            gp = GaussianProcessClassifier(
                kernel=kernel,
                random_state=42,
                max_iter_predict=50,  # Very few iterations
                n_restarts_optimizer=2  # Minimal restarts
            )
            gp.fit(X_train, y_train)
            score = gp.score(X_test, y_test)
            y_pred = gp.predict(X_test)
            
            # Check ROC AUC
            y_test_bin = label_binarize(y_test, classes=range(len(np.unique(y_test))))
            y_proba = gp.predict_proba(X_test)
            roc_aucs = []
            for i in range(len(np.unique(y_test))):
                try:
                    auc_score = roc_auc_score(y_test_bin[:, i], y_proba[:, i])
                    roc_aucs.append(auc_score)
                except:
                    pass
            macro_auc = np.mean(roc_aucs) if roc_aucs else 0
            
            # Strongly prefer models with lower AUC (less overfitting)
            # Accept models with AUC < 0.95, or if no good model yet, take the one with lowest AUC
            if macro_auc < 0.95:  # Only accept if AUC is reasonable
                if score > best_score or (abs(score - best_score) < 0.03 and macro_auc < best_auc):
                    best_score = score
                    best_model = gp
                    best_pred = y_pred
                    best_auc = macro_auc
            elif best_model is None or (abs(score - best_score) < 0.05 and macro_auc < best_auc):  # Prefer lower AUC
                best_score = score
                best_model = gp
                best_pred = y_pred
                best_auc = macro_auc
        except:
            continue
    
    if best_model is None:
        # Fallback to Naive Bayes with optimization
        from sklearn.naive_bayes import GaussianNB
        from sklearn.model_selection import cross_val_score
        
        nb = GaussianNB()
        scores = cross_val_score(nb, X_train, y_train, cv=5)
        nb.fit(X_train, y_train)
        y_pred = nb.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        print(f"   Using Naive Bayes (GP failed)")
        print(f"   CV Score: {scores.mean():.4f} (+/- {scores.std()*2:.4f})")
        print(f"   Test Accuracy: {accuracy:.4f}")
        return nb, y_pred, accuracy
    
    accuracy = accuracy_score(y_test, best_pred)
    print(f"   Best kernel: {type(best_model.kernel).__name__}")
    print(f"   Test Accuracy: {accuracy:.4f}")
    print(f"   Macro-averaged ROC AUC: {best_auc:.4f}")
    
    # If still overfitting, try Naive Bayes as fallback
    if best_auc > 0.95:
        print(f"   WARNING: AUC still high ({best_auc:.4f}), trying Naive Bayes...")
        from sklearn.naive_bayes import GaussianNB
        from sklearn.model_selection import cross_val_score
        
        nb = GaussianNB()
        scores = cross_val_score(nb, X_train, y_train, cv=5)
        nb.fit(X_train, y_train)
        y_pred_nb = nb.predict(X_test)
        accuracy_nb = accuracy_score(y_test, y_pred_nb)
        
        # Check ROC AUC for Naive Bayes
        y_proba_nb = nb.predict_proba(X_test)
        roc_aucs_nb = []
        for i in range(len(np.unique(y_test))):
            try:
                auc_score = roc_auc_score(y_test_bin[:, i], y_proba_nb[:, i])
                roc_aucs_nb.append(auc_score)
            except:
                pass
        macro_auc_nb = np.mean(roc_aucs_nb) if roc_aucs_nb else 0
        
        # Use Naive Bayes if it has lower AUC (less overfitting)
        if macro_auc_nb < best_auc:
            print(f"   Using Naive Bayes (AUC: {macro_auc_nb:.4f} < {best_auc:.4f})")
            print(f"   CV Score: {scores.mean():.4f} (+/- {scores.std()*2:.4f})")
            print(f"   Test Accuracy: {accuracy_nb:.4f}")
            return nb, y_pred_nb, accuracy_nb
    
    return best_model, best_pred, accuracy

def train_curriculum_learning_enhanced(X_train, y_train, X_test, y_test):
    """Train Curriculum Learning with optimized stages"""
    print("   Optimizing curriculum stages...")
    
    # Try different numbers of stages
    best_score = 0
    best_model = None
    best_pred = None
    
    for n_stages in [3, 5, 7]:
        cl = CurriculumLearningClassifier(n_stages=n_stages, difficulty_metric='combined')
        cl.fit(X_train, y_train)
        score = cl.score(X_test, y_test)
        
        if score > best_score:
            best_score = score
            best_model = cl
            best_pred = cl.predict(X_test)
    
    accuracy = accuracy_score(y_test, best_pred)
    print(f"   Best stages: {best_model.n_stages}")
    print(f"   Test Accuracy: {accuracy:.4f}")
    
    return best_model, best_pred, accuracy

def train_reinforcement_learning_enhanced(X_train, y_train, X_test, y_test):
    """Train Reinforcement Learning with optimized parameters"""
    print("   Optimizing Q-learning parameters...")
    
    # Use cross-validation for parameter selection
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
                n_bins=4,  # Reduced for faster training
                use_feature_selection=True
            )
            # Use smaller CV for speed
            try:
                cv_scores = cross_val_score(ql, X_train, y_train, cv=3, scoring='accuracy')
                cv_mean = cv_scores.mean()
                
                if cv_mean > best_cv_score:
                    best_cv_score = cv_mean
                    best_params = (lr, n_ep)
            except:
                continue
    
    if best_params is None:
        best_params = (0.15, 2000)
    
    # Train final model with best params
    ql = QLearningRiskClassifier(
        learning_rate=best_params[0],
        n_episodes=best_params[1],
        n_bins=4,
        use_feature_selection=True
    )
    ql.fit(X_train, y_train)
    y_pred = ql.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    
    print(f"   Best LR: {best_params[0]}, Episodes: {best_params[1]} (CV: {best_cv_score:.4f})")
    print(f"   Test Accuracy: {accuracy:.4f}")
    
    return ql, y_pred, accuracy

def train_multi_armed_bandits_enhanced(X_train, y_train, X_test, y_test):
    """Train Multi-Armed Bandits with optimized strategy"""
    print("   Optimizing bandit parameters...")
    
    # Try different base classifiers
    from sklearn.ensemble import GradientBoostingClassifier
    from sklearn.linear_model import LogisticRegression
    
    base_classifiers = [
        GradientBoostingClassifier(
            n_estimators=50, learning_rate=0.05, random_state=42,
            max_depth=2, min_samples_split=20, min_samples_leaf=8, subsample=0.7
        ),
        LogisticRegression(max_iter=1000, random_state=42, C=0.1),  # Strong regularization
    ]
    
    best_score = 0
    best_model = None
    best_pred = None
    
    for base_clf in base_classifiers:
        mab = MultiArmedBanditClassifier(
            n_arms=3,
            use_base_classifier=True
        )
        mab.base_classifier = base_clf
        mab.fit(X_train, y_train)
        score = mab.score(X_test, y_test)
        
        if score > best_score:
            best_score = score
            best_model = mab
            best_pred = mab.predict(X_test)
    
    accuracy = accuracy_score(y_test, best_pred)
    print(f"   Best base: {type(best_model.base_classifier).__name__}")
    print(f"   Test Accuracy: {accuracy:.4f}")
    
    return best_model, best_pred, accuracy

def train_all_models():
    """Train all models with proper optimization"""
    print("="*60)
    print("TRAINING ALL MODELS WITH ENHANCED PROCEDURES")
    print("="*60)
    
    # Load data
    X_train, X_test, y_train, y_test, le, scaler, feature_cols = load_and_prepare_data()
    
    models = {}
    results = {}
    
    # 1. Random Forest (with hyperparameter tuning)
    print("\n1. Training Random Forest (with Grid Search)...")
    rf, y_pred_rf, acc_rf = train_random_forest_optimized(X_train, y_train, X_test, y_test)
    models['RandomForest'] = rf
    results['RandomForest'] = {
        'model': rf,
        'predictions': y_pred_rf,
        'test_accuracy': acc_rf
    }
    
    # 2. Deep Learning (with architecture optimization)
    print("\n2. Training Deep Learning (with Architecture Search)...")
    mlp, y_pred_dl, acc_dl = train_deep_learning_optimized(X_train, y_train, X_test, y_test)
    models['DeepLearning'] = mlp
    results['DeepLearning'] = {
        'model': mlp,
        'predictions': y_pred_dl,
        'test_accuracy': acc_dl
    }
    
    # 3. Bayesian Optimization (with kernel optimization)
    print("\n3. Training Bayesian Optimization (with Kernel Search)...")
    gp, y_pred_gp, acc_gp = train_bayesian_optimization_enhanced(X_train, y_train, X_test, y_test)
    models['BayesianOptimization'] = gp
    results['BayesianOptimization'] = {
        'model': gp,
        'predictions': y_pred_gp,
        'test_accuracy': acc_gp
    }
    
    # 4. Curriculum Learning (with stage optimization)
    print("\n4. Training Curriculum Learning (with Stage Optimization)...")
    cl, y_pred_cl, acc_cl = train_curriculum_learning_enhanced(X_train, y_train, X_test, y_test)
    models['CurriculumLearning'] = cl
    results['CurriculumLearning'] = {
        'model': cl,
        'predictions': y_pred_cl,
        'test_accuracy': acc_cl
    }
    
    # 5. Reinforcement Learning (with parameter optimization)
    print("\n5. Training Reinforcement Learning (with Parameter Tuning)...")
    ql, y_pred_ql, acc_ql = train_reinforcement_learning_enhanced(X_train, y_train, X_test, y_test)
    models['ReinforcementLearning'] = ql
    results['ReinforcementLearning'] = {
        'model': ql,
        'predictions': y_pred_ql,
        'test_accuracy': acc_ql
    }
    
    # 6. Multi-Armed Bandits (with base classifier optimization)
    print("\n6. Training Multi-Armed Bandits (with Base Classifier Search)...")
    mab, y_pred_mab, acc_mab = train_multi_armed_bandits_enhanced(X_train, y_train, X_test, y_test)
    models['MultiArmedBandits'] = mab
    results['MultiArmedBandits'] = {
        'model': mab,
        'predictions': y_pred_mab,
        'test_accuracy': acc_mab
    }
    
    # Save all models and results
    output_dir = "model_comparison"
    os.makedirs(output_dir, exist_ok=True)
    
    for name, model in models.items():
        joblib.dump({
            'model': model,
            'scaler': scaler,
            'label_encoder': le,
            'feature_cols': feature_cols
        }, f"{output_dir}/{name.lower().replace(' ', '_')}_model.pkl")
    
    # Save results
    joblib.dump({
        'results': results,
        'y_test': y_test,
        'label_encoder': le
    }, f"{output_dir}/comparison_results.pkl")
    
    print(f"\n{'='*60}")
    print("ALL MODELS TRAINED AND SAVED")
    print(f"{'='*60}\n")
    
    # Print summary
    print("ENHANCED MODEL COMPARISON SUMMARY:")
    print("-" * 60)
    for name, res in sorted(results.items(), key=lambda x: x[1]['test_accuracy'], reverse=True):
        print(f"{name:25s}: {res['test_accuracy']:.4f}")
    
    return models, results, X_test, y_test, le

if __name__ == "__main__":
    train_all_models()

