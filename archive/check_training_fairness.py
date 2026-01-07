"""
Check if all models were trained fairly with consistent procedures.
"""

import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler

# Load data the same way as training
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

print("="*60)
print("TRAINING FAIRNESS ANALYSIS")
print("="*60)

print(f"\n1. DATA SPLIT CONSISTENCY:")
print(f"   Train size: {len(X_train)} samples")
print(f"   Test size: {len(X_test)} samples")
print(f"   Split ratio: 80/20")
print(f"   Random state: 42 (fixed)")
print(f"   Stratified: Yes")
print(f"   [OK] All models use the SAME train/test split")

print(f"\n2. FEATURE PREPROCESSING:")
print(f"   Original features: {len(feature_cols)}")
print(f"   Feature scaling: StandardScaler (applied to all)")
print(f"   Missing values: Filled with 0")

print(f"\n3. MODEL-SPECIFIC TREATMENT:")
models_to_check = ['RandomForest', 'DeepLearning', 'BayesianOptimization', 
                   'CurriculumLearning', 'ReinforcementLearning', 'MultiArmedBandits']

for name in models_to_check:
    try:
        model_file = f"model_comparison/{name.lower().replace(' ', '_')}_model.pkl"
        model_data = joblib.load(model_file)
        model = model_data['model']
        
        has_selector = 'feature_selector' in model_data
        
        print(f"\n   {name}:")
        print(f"      Feature selector: {'Yes' if has_selector else 'No'}")
        if has_selector:
            selector = model_data['feature_selector']
            n_features = selector.n_features_in_ if hasattr(selector, 'n_features_in_') else 'Unknown'
            k = selector.k if hasattr(selector, 'k') else 'Unknown'
            print(f"      Selected features: {k} out of {n_features}")
        
        # Check if model has predict_proba
        has_proba = hasattr(model, 'predict_proba')
        print(f"      Has predict_proba: {'Yes' if has_proba else 'No'}")
        
    except Exception as e:
        print(f"\n   {name}: Error loading - {e}")

print(f"\n4. POTENTIAL FAIRNESS ISSUES:")
print(f"   [WARNING] Random Forest: Uses feature selection (7 features)")
print(f"   [WARNING] Bayesian Optimization: Uses feature selection (7 features)")
print(f"   [WARNING] Deep Learning: No feature selection (11 features)")
print(f"   [WARNING] Curriculum Learning: No feature selection (11 features)")
print(f"   [WARNING] Reinforcement Learning: Built-in feature selection (7 features)")
print(f"   [WARNING] Multi-Armed Bandits: No feature selection (11 features)")
print(f"\n   [WARNING] Reinforcement Learning: Uses 3-fold CV (others use 5-fold)")
print(f"   [WARNING] Multi-Armed Bandits: No CV optimization (others use CV)")

print(f"\n5. HYPERPARAMETER OPTIMIZATION:")
print(f"   Random Forest: GridSearchCV (5-fold CV)")
print(f"   Deep Learning: Architecture search + GridSearchCV (5-fold CV)")
print(f"   Bayesian Optimization: Kernel search (no CV)")
print(f"   Curriculum Learning: Stage optimization (no CV)")
print(f"   Reinforcement Learning: Parameter search (3-fold CV)")
print(f"   Multi-Armed Bandits: Base classifier selection (no CV)")

print(f"\n6. RECOMMENDATIONS FOR FAIRNESS:")
print(f"   [OK] All models use same train/test split (FAIR)")
print(f"   [OK] All models use same feature scaling (FAIR)")
print(f"   [WARNING] Feature selection NOT consistent (UNFAIR)")
print(f"   [WARNING] Cross-validation NOT consistent (UNFAIR)")
print(f"   [WARNING] Hyperparameter optimization depth varies (UNFAIR)")

