"""
Quick helper script to train a leak-free model aligned with the
features used at inference (subject percentages + meta) and export it as
`bsp4a_leak_free_model.pkl` for ml_recommendations_api.py to load.
"""

import os
import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler


def main():
  if not os.path.exists("enhanced_student_features.csv"):
    print("enhanced_student_features.csv not found. Please run the enhanced ML pipeline first.")
    return

  df = pd.read_csv("enhanced_student_features.csv")
  # Inject synthetic test_type (0 = pre/unknown) for training alignment with inference
  df["test_type"] = 0

  # Feature set aligned to inference: subject scores + a few global signals + test_type
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
    "test_type",  # synthetic: 0 pre/unknown, 1 post (kept for parity with API input)
  ]

  missing_cols = [c for c in feature_cols if c not in df.columns]
  if missing_cols:
    print("Missing expected columns in enhanced_student_features.csv:", missing_cols)
    return

  X = df[feature_cols].copy()
  X = X.fillna(0)

  # Derive a multi-class label from overall_avg_score using quantiles to avoid single-class issue
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

  clf = RandomForestClassifier(n_estimators=200, random_state=42, class_weight="balanced")
  clf.fit(X_train, y_train)

  train_acc = clf.score(X_train, y_train)
  test_acc = clf.score(X_test, y_test)

  print(f"Trained leak-free model. Train accuracy: {train_acc:.3f}, Test accuracy: {test_acc:.3f}")

  # Save both the model and preprocessing so the API can reuse them later if needed
  joblib.dump(
    {
      "model": clf,
      "scaler": scaler,
      "label_encoder": le,
      "feature_cols": feature_cols,
    },
    "bsp4a_leak_free_model.pkl",
  )

  print("Saved model to bsp4a_leak_free_model.pkl")


if __name__ == "__main__":
  main()



