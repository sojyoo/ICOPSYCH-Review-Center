"""
Generate training figures for the leak-free model and survey personalization model.

Outputs (created under figures/):
 - feature_importance_leak_free.png
 - confusion_matrix_leak_free.png
 - cv_accuracy_leak_free.png
 - feature_importance_survey.png (if survey model present)
 - confidence_distribution_survey.png (if survey data present)
"""

import os
from copy import deepcopy
from pathlib import Path

import joblib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import ConfusionMatrixDisplay, confusion_matrix
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


FIG_DIR = Path("figures")
FIG_DIR.mkdir(exist_ok=True)


def plot_feature_importance(model, feature_names, path, title):
    if not hasattr(model, "feature_importances_"):
        print(f"Model at {path} does not expose feature_importances_. Skipping.")
        return
    importances = model.feature_importances_
    sorted_idx = np.argsort(importances)[::-1]
    top_idx = sorted_idx[: min(15, len(sorted_idx))]
    plt.figure(figsize=(8, 6))
    plt.barh(
        [feature_names[i] for i in reversed(top_idx)],
        importances[top_idx][::-1],
        color="#4f46e5",
    )
    plt.xlabel("Importance")
    plt.title(title)
    plt.tight_layout()
    plt.savefig(path, dpi=200)
    plt.close()
    print(f"Saved {path}")


def plot_confusion_matrix(y_true, y_pred, labels, path, title):
    cm = confusion_matrix(y_true, y_pred, labels=labels, normalize="true")
    disp = ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=labels)
    fig, ax = plt.subplots(figsize=(6, 5))
    disp.plot(ax=ax, cmap="Blues", colorbar=False, values_format=".2f")
    ax.set_title(title)
    plt.tight_layout()
    plt.savefig(path, dpi=200)
    plt.close()
    print(f"Saved {path}")


def plot_cv_accuracy(scores, path, title):
    plt.figure(figsize=(5, 5))
    plt.boxplot(scores, vert=True, patch_artist=True, boxprops=dict(facecolor="#a5b4fc"))
    plt.ylabel("Accuracy")
    plt.title(title)
    plt.tight_layout()
    plt.savefig(path, dpi=200)
    plt.close()
    print(f"Saved {path}")


def main_leak_free():
    artifact_path = Path("bsp4a_leak_free_model.pkl")
    data_path = Path("enhanced_student_features.csv")
    if not artifact_path.exists() or not data_path.exists():
        print("Leak-free artifact or data missing; skipping leak-free plots.")
        return

    artifact = joblib.load(artifact_path)
    model: RandomForestClassifier = artifact["model"]
    scaler: StandardScaler = artifact["scaler"]
    le = artifact["label_encoder"]
    feature_cols = artifact["feature_cols"]

    df = pd.read_csv(data_path)
    # Ensure synthetic test_type exists (0 default)
    if "test_type" not in df.columns:
        df["test_type"] = 0

    # Recompute risk buckets using the same quantile logic as training
    scores = df["overall_avg_score"].fillna(0)
    q1, q2 = scores.quantile([0.33, 0.66])

    def bucket(score):
        if score <= q1:
            return "high_risk"
        if score <= q2:
            return "medium_risk"
        return "low_risk"

    labels = scores.apply(bucket)
    X = df[feature_cols].fillna(0)
    y = le.transform(labels)

    unique_labels = np.unique(y)
    labels = le.classes_

    # If only one class is present, produce alternative plots and skip supervised metrics
    if len(unique_labels) < 2:
        # Class distribution plot
        plt.figure(figsize=(5, 4))
        counts = df["board_exam_risk"].value_counts(dropna=False)
        counts.plot(kind="bar", color="#4f46e5", edgecolor="white")
        plt.title("Board Exam Risk Distribution (single class)")
        plt.xlabel("Risk label")
        plt.ylabel("Count")
        plt.tight_layout()
        plt.savefig(FIG_DIR / "class_distribution_leak_free.png", dpi=200)
        plt.close()
        print("Saved figures/class_distribution_leak_free.png (single-class dataset)")

        # Feature variance (data-only) as a proxy since importance is undefined for single class
        variances = X.var().sort_values(ascending=False)
        top_vars = variances.head(min(15, len(variances)))
        plt.figure(figsize=(8, 6))
        top_vars[::-1].plot(kind="barh", color="#a5b4fc", edgecolor="white")
        plt.title("Feature Variance (data-only, single-class)")
        plt.xlabel("Variance")
        plt.tight_layout()
        plt.savefig(FIG_DIR / "feature_variance_leak_free.png", dpi=200)
        plt.close()
        print("Saved figures/feature_variance_leak_free.png (single-class dataset)")
        return

    # Train/test split to mirror training script
    X_scaled = scaler.transform(X)
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=42, stratify=y
    )

    y_pred = model.predict(X_test)
    # Plots
    plot_feature_importance(
        model,
        feature_cols,
        FIG_DIR / "feature_importance_leak_free.png",
        "Leak-free Model: Top Feature Importances",
    )
    plot_confusion_matrix(
        y_test,
        y_pred,
        list(range(len(labels))),
        FIG_DIR / "confusion_matrix_leak_free.png",
        "Leak-free Model: Confusion Matrix (Normalized)",
    )

    # Cross-validation (StratifiedKFold)
    base_rf = deepcopy(model)
    cv_pipeline = Pipeline([("scaler", StandardScaler()), ("rf", base_rf)])
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(cv_pipeline, X, y, cv=skf, scoring="accuracy")
    plot_cv_accuracy(
        cv_scores,
        FIG_DIR / "cv_accuracy_leak_free.png",
        "Leak-free Model: 5-fold CV Accuracy",
    )
    print(f"CV accuracy mean={cv_scores.mean():.3f}, std={cv_scores.std():.3f}")


def main_survey():
    model_path = Path("survey_personalization.pkl")
    data_path = Path("survey_features_processed.csv")
    if not model_path.exists() or not data_path.exists():
        print("Survey artifact or data missing; skipping survey plots.")
        return

    model: RandomForestClassifier = joblib.load(model_path)
    df = pd.read_csv(data_path).fillna(0)
    feature_cols = df.columns.tolist()

    # Plot feature importances
    plot_feature_importance(
        model,
        feature_cols,
        FIG_DIR / "feature_importance_survey.png",
        "Survey Personalization: Feature Importances",
    )

    # Confidence score distribution (the target used in training)
    if "confidence_score" in feature_cols:
        plt.figure(figsize=(6, 4))
        plt.hist(df["confidence_score"], bins=10, color="#22c55e", edgecolor="white")
        plt.xlabel("Confidence Score (normalized 0-1)")
        plt.ylabel("Count")
        plt.title("Survey: Confidence Score Distribution")
        plt.tight_layout()
        plt.savefig(FIG_DIR / "confidence_distribution_survey.png", dpi=200)
        plt.close()
        print(f"Saved {FIG_DIR / 'confidence_distribution_survey.png'}")


if __name__ == "__main__":
    main_leak_free()
    main_survey()

