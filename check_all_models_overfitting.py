"""
Check all models for overfitting by examining ROC AUC scores
"""

import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import roc_auc_score
from sklearn.preprocessing import label_binarize

# Load data
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

y_test_bin = label_binarize(y_test, classes=range(len(le.classes_)))

models_to_check = ['RandomForest', 'DeepLearning', 'BayesianOptimization', 
                   'CurriculumLearning', 'ReinforcementLearning', 'MultiArmedBandits']

print("="*60)
print("CHECKING ALL MODELS FOR OVERFITTING")
print("="*60)

for name in models_to_check:
    try:
        model_file = f"model_comparison/{name.lower().replace(' ', '_')}_model.pkl"
        model_data = joblib.load(model_file)
        model = model_data['model']
        
        # Get predictions and probabilities
        if hasattr(model, 'predict_proba'):
            y_proba = model.predict_proba(X_test)
            
            # Calculate ROC AUC for each class
            roc_aucs = []
            for i in range(len(le.classes_)):
                try:
                    auc_score = roc_auc_score(y_test_bin[:, i], y_proba[:, i])
                    roc_aucs.append(auc_score)
                except:
                    pass
            
            macro_auc = np.mean(roc_aucs) if roc_aucs else 0
            
            print(f"\n{name}:")
            print(f"  Macro-averaged AUC: {macro_auc:.4f}")
            if macro_auc >= 0.999:
                print(f"  WARNING: Perfect or near-perfect AUC indicates overfitting!")
            elif macro_auc > 0.99:
                print(f"  CAUTION: Very high AUC may indicate overfitting")
            else:
                print(f"  OK: AUC is realistic")
        else:
            print(f"\n{name}: No predict_proba method")
    except Exception as e:
        print(f"\n{name}: Error - {e}")








