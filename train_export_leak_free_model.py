"""
Quick helper script to train a simple leak-free model and export it as
`bsp4a_leak_free_model.pkl` for the ml_recommendations_api.py to load.

This is intentionally lightweight for demo purposes: it uses the
enhanced student features to train a RandomForestClassifier that
predicts board exam risk levels.
"""

import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
import joblib
import os


def main():
  if not os.path.exists("enhanced_student_features.csv"):
    print("enhanced_student_features.csv not found. Please run the enhanced ML pipeline first.")
    return

  df = pd.read_csv("enhanced_student_features.csv")

  # Basic feature set similar to enhanced_ml_model.py
  feature_cols = [
    "overall_avg_score",
    "overall_std",
    "improvement_rate",
    "score_consistency",
    "improvement_consistency",
    "study_hours_per_week",
    "study_consistency",
    "abnormal_psych_score",
    "developmental_psych_score",
    "industrial_psych_score",
    "psychological_assessment_score",
    "total_tests_taken",
    "avg_tests_per_subject",
  ]

  missing_cols = [c for c in feature_cols if c not in df.columns]
  if missing_cols:
    print("Missing expected columns in enhanced_student_features.csv:", missing_cols)
    return

  X = df[feature_cols].copy()
  X = X.fillna(0)

  if "board_exam_risk" not in df.columns:
    print("Column 'board_exam_risk' not found in enhanced_student_features.csv")
    return

  y_raw = df["board_exam_risk"].fillna("high_risk")

  le = LabelEncoder()
  y = le.fit_transform(y_raw)

  scaler = StandardScaler()
  X_scaled = scaler.fit_transform(X)

  X_train, X_test, y_train, y_test = train_test_split(
    X_scaled, y, test_size=0.2, random_state=42, stratify=y
  )

  clf = RandomForestClassifier(n_estimators=150, random_state=42)
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



