"""
Train all models for comparison: Random Forest, Deep Learning, Bayesian Optimization,
Curriculum Learning, Reinforcement Learning, and Multi-Armed Bandits.

All models predict the same target: risk level (low/medium/high)
"""

import os
import joblib
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.gaussian_process import GaussianProcessClassifier
from sklearn.gaussian_process.kernels import RBF
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, precision_recall_fscore_support
import warnings
warnings.filterwarnings('ignore')

# Import custom classifiers
from custom_classifiers import (
    QLearningRiskClassifier,
    MultiArmedBanditClassifier,
    CurriculumLearningClassifier
)

def load_and_prepare_data():
    """Load data and prepare features/target"""
    if not os.path.exists("enhanced_student_features.csv"):
        raise FileNotFoundError("enhanced_student_features.csv not found")
    
    df = pd.read_csv("enhanced_student_features.csv")
    df["test_type"] = 0  # Synthetic for alignment
    
    feature_cols = [
        "abnormal_psych_score",
        "developmental_psych_score",
        "industrial_psych_score",
        "psychological_assessment_score",
        "overall_avg_score",
        "score_consistency",
        "improvement_rate",
        "study_hours_per_week",
        "total_tests_taken",
        "avg_tests_per_subject",
        "test_type",
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

def train_all_models():
    """Train all models for comparison"""
    print("="*60)
    print("TRAINING ALL MODELS FOR COMPARISON")
    print("="*60)
    
    # Load data
    X_train, X_test, y_train, y_test, le, scaler, feature_cols = load_and_prepare_data()
    
    models = {}
    results = {}
    
    # 1. Random Forest (Baseline)
    print("\n1. Training Random Forest...")
    rf = RandomForestClassifier(n_estimators=200, random_state=42, class_weight="balanced")
    rf.fit(X_train, y_train)
    models['RandomForest'] = rf
    y_pred_rf = rf.predict(X_test)
    results['RandomForest'] = {
        'model': rf,
        'predictions': y_pred_rf,
        'test_accuracy': accuracy_score(y_test, y_pred_rf)
    }
    print(f"   Test Accuracy: {results['RandomForest']['test_accuracy']:.4f}")
    
    # 2. Deep Learning (Neural Network)
    print("\n2. Training Deep Learning (MLP)...")
    mlp = MLPClassifier(hidden_layer_sizes=(64, 32), max_iter=1000, random_state=42, 
                       early_stopping=True, validation_fraction=0.1)
    mlp.fit(X_train, y_train)
    models['DeepLearning'] = mlp
    y_pred_dl = mlp.predict(X_test)
    results['DeepLearning'] = {
        'model': mlp,
        'predictions': y_pred_dl,
        'test_accuracy': accuracy_score(y_test, y_pred_dl)
    }
    print(f"   Test Accuracy: {results['DeepLearning']['test_accuracy']:.4f}")
    
    # 3. Bayesian Optimization (Gaussian Process)
    print("\n3. Training Bayesian Optimization (Gaussian Process)...")
    try:
        gp = GaussianProcessClassifier(kernel=RBF(length_scale=1.0), random_state=42, max_iter_predict=100)
        gp.fit(X_train, y_train)
        models['BayesianOptimization'] = gp
        y_pred_gp = gp.predict(X_test)
        results['BayesianOptimization'] = {
            'model': gp,
            'predictions': y_pred_gp,
            'test_accuracy': accuracy_score(y_test, y_pred_gp)
        }
        print(f"   Test Accuracy: {results['BayesianOptimization']['test_accuracy']:.4f}")
    except Exception as e:
        print(f"   Warning: GP failed ({e}), using fallback")
        from sklearn.naive_bayes import GaussianNB
        nb = GaussianNB()
        nb.fit(X_train, y_train)
        models['BayesianOptimization'] = nb
        y_pred_nb = nb.predict(X_test)
        results['BayesianOptimization'] = {
            'model': nb,
            'predictions': y_pred_nb,
            'test_accuracy': accuracy_score(y_test, y_pred_nb)
        }
        print(f"   Test Accuracy (Naive Bayes fallback): {results['BayesianOptimization']['test_accuracy']:.4f}")
    
    # 4. Curriculum Learning
    print("\n4. Training Curriculum Learning...")
    cl = CurriculumLearningClassifier(n_stages=3)
    cl.fit(X_train, y_train)
    models['CurriculumLearning'] = cl
    y_pred_cl = cl.predict(X_test)
    results['CurriculumLearning'] = {
        'model': cl,
        'predictions': y_pred_cl,
        'test_accuracy': accuracy_score(y_test, y_pred_cl)
    }
    print(f"   Test Accuracy: {results['CurriculumLearning']['test_accuracy']:.4f}")
    
    # 5. Reinforcement Learning (Q-Learning)
    print("\n5. Training Reinforcement Learning (Q-Learning)...")
    ql = QLearningRiskClassifier(learning_rate=0.1, n_iterations=500)
    ql.fit(X_train, y_train)
    models['ReinforcementLearning'] = ql
    y_pred_ql = ql.predict(X_test)
    results['ReinforcementLearning'] = {
        'model': ql,
        'predictions': y_pred_ql,
        'test_accuracy': accuracy_score(y_test, y_pred_ql)
    }
    print(f"   Test Accuracy: {results['ReinforcementLearning']['test_accuracy']:.4f}")
    
    # 6. Multi-Armed Bandits
    print("\n6. Training Multi-Armed Bandits...")
    mab = MultiArmedBanditClassifier(n_arms=3, exploration_param=2.0)
    mab.fit(X_train, y_train)
    models['MultiArmedBandits'] = mab
    y_pred_mab = mab.predict(X_test)
    results['MultiArmedBandits'] = {
        'model': mab,
        'predictions': y_pred_mab,
        'test_accuracy': accuracy_score(y_test, y_pred_mab)
    }
    print(f"   Test Accuracy: {results['MultiArmedBandits']['test_accuracy']:.4f}")
    
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
    print("MODEL COMPARISON SUMMARY:")
    print("-" * 60)
    for name, res in sorted(results.items(), key=lambda x: x[1]['test_accuracy'], reverse=True):
        print(f"{name:25s}: {res['test_accuracy']:.4f}")
    
    return models, results, X_test, y_test, le

if __name__ == "__main__":
    train_all_models()

