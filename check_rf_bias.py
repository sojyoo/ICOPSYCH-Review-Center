"""
Check Random Forest for bias and analyze ROC curves
"""

import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import roc_curve, auc, roc_auc_score
from sklearn.preprocessing import label_binarize
import matplotlib.pyplot as plt

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

# Load model
model_data = joblib.load("model_comparison/randomforest_model.pkl")
model = model_data['model']

# Check class distribution
print("Class distribution in training set:")
unique, counts = np.unique(y_train, return_counts=True)
for cls, count in zip(le.classes_[unique], counts):
    print(f"  {cls}: {count} ({count/len(y_train)*100:.1f}%)")

print("\nClass distribution in test set:")
unique, counts = np.unique(y_test, return_counts=True)
for cls, count in zip(le.classes_[unique], counts):
    print(f"  {cls}: {count} ({count/len(y_test)*100:.1f}%)")

# Get predictions and probabilities
y_pred = model.predict(X_test)
y_proba = model.predict_proba(X_test)

print("\nPrediction distribution:")
unique, counts = np.unique(y_pred, return_counts=True)
for cls, count in zip(le.classes_[unique], counts):
    print(f"  {cls}: {count} ({count/len(y_pred)*100:.1f}%)")

# Check ROC curves
n_classes = len(le.classes_)
y_test_bin = label_binarize(y_test, classes=range(n_classes))

print("\nROC AUC Scores (One-vs-Rest):")
for i, class_name in enumerate(le.classes_):
    try:
        auc_score = roc_auc_score(y_test_bin[:, i], y_proba[:, i])
        print(f"  {class_name}: {auc_score:.4f}")
    except:
        print(f"  {class_name}: Could not compute")

# Check macro-averaged AUC
try:
    macro_auc = roc_auc_score(y_test_bin, y_proba, average='macro', multi_class='ovr')
    print(f"\nMacro-averaged AUC: {macro_auc:.4f}")
except:
    print("\nCould not compute macro-averaged AUC")

# Check if probabilities are well-calibrated
print("\nProbability statistics per class:")
for i, class_name in enumerate(le.classes_):
    true_mask = y_test == i
    if true_mask.sum() > 0:
        mean_prob = y_proba[true_mask, i].mean()
        std_prob = y_proba[true_mask, i].std()
        print(f"  {class_name} (true positives): mean={mean_prob:.3f}, std={std_prob:.3f}")
    
    pred_mask = y_pred == i
    if pred_mask.sum() > 0:
        mean_prob = y_proba[pred_mask, i].mean()
        std_prob = y_proba[pred_mask, i].std()
        print(f"  {class_name} (predicted): mean={mean_prob:.3f}, std={std_prob:.3f}")








