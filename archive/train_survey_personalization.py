"""
Train a simple personalization model using survey features.

Target: high_confidence (Likert confidence >= 0.67 normalized) as a proxy for
readiness. Saves a small RandomForest for optional downstream use and logs
metrics to training_logs/survey_personalization_metrics.json.
"""

import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score
from sklearn.model_selection import train_test_split

PROCESSED_CSV = Path("survey_features_processed.csv")
MODEL_PATH = Path("survey_personalization.pkl")
METRICS_PATH = Path("training_logs/survey_personalization_metrics.json")


def main():
    if not PROCESSED_CSV.exists():
        raise FileNotFoundError(
            f"{PROCESSED_CSV} not found. Run survey_features.py first."
        )

    df = pd.read_csv(PROCESSED_CSV)

    # Define target: high confidence (>= ~0.67 normalized, i.e., mostly Agree/Strongly Agree)
    if "confidence_score" not in df.columns:
        raise ValueError("confidence_score not found in processed survey features")

    df = df.copy()
    df["high_confidence"] = (df["confidence_score"] >= 0.67).astype(int)

    # Drop target and any non-numeric columns
    feature_df = df.drop(columns=["high_confidence"])
    feature_df = feature_df.select_dtypes(include=[np.number]).fillna(0)

    X = feature_df.values
    y = df["high_confidence"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = RandomForestClassifier(
        n_estimators=200, max_depth=None, random_state=42, class_weight="balanced"
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    report = classification_report(y_test, y_pred, output_dict=True)

    # Save model
    import joblib

    joblib.dump(model, MODEL_PATH)

    # Save metrics
    METRICS_PATH.parent.mkdir(parents=True, exist_ok=True)
    METRICS_PATH.write_text(
        json.dumps(
            {
                "accuracy": acc,
                "report": report,
                "n_train": int(len(y_train)),
                "n_test": int(len(y_test)),
                "features": feature_df.columns.tolist(),
            },
            indent=2,
        )
    )

    print(f"Saved survey personalization model to {MODEL_PATH}")
    print(f"Accuracy: {acc:.3f}")
    print(f"Metrics written to {METRICS_PATH}")


if __name__ == "__main__":
    main()














