"""
Evaluate and visualize all models for comparison.
Generates classification reports, confusion matrices, ROC curves, and comparison charts.
"""

import os
import joblib
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import (
    classification_report, confusion_matrix, accuracy_score,
    precision_recall_fscore_support, roc_curve, auc,
    roc_auc_score
)
from sklearn.preprocessing import label_binarize
from pathlib import Path

# Import custom classifiers so they can be unpickled
# Try enhanced first, fallback to original
try:
    from custom_classifiers_enhanced import (
        QLearningRiskClassifier,
        MultiArmedBanditClassifier,
        CurriculumLearningClassifier
    )
except ImportError:
    from custom_classifiers import (
        QLearningRiskClassifier,
        MultiArmedBanditClassifier,
        CurriculumLearningClassifier
    )

# Set style
plt.style.use('seaborn-v0_8')
sns.set_palette("husl")

OUTPUT_DIR = Path("figures/chapter4/model_comparison")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def load_data_and_results():
    """Load data and trained models/results"""
    import pandas as pd
    from sklearn.model_selection import train_test_split
    from sklearn.preprocessing import LabelEncoder, StandardScaler
    
    # Load and prepare data (same as training)
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
    
    # Load results (try enhanced first, fallback to original)
    comparison_file = "model_comparison/comparison_results.pkl"
    results = {}
    
    # Try to load from comparison_results, but if not available, generate from models
    # Also exclude ReinforcementLearning if present
    if os.path.exists(comparison_file):
        try:
            data = joblib.load(comparison_file)
            results = data.get('results', {})
            # Remove ReinforcementLearning if present
            if 'ReinforcementLearning' in results:
                del results['ReinforcementLearning']
        except:
            results = {}
    
    # Load models
    models = {}
    feature_selectors = {}  # Store feature selectors if they exist
    model_dir = Path("model_comparison")
    model_names = ['RandomForest', 'DeepLearning', 'BayesianOptimization', 
                   'CurriculumLearning', 'MultiArmedBandits']
    
    for name in model_names:
        model_file = model_dir / f"{name.lower().replace(' ', '_')}_model.pkl"
        if model_file.exists():
            model_data = joblib.load(model_file)
            models[name] = model_data['model']
            # Check if model has a feature selector
            if 'feature_selector' in model_data:
                feature_selectors[name] = model_data['feature_selector']
            
            # Always generate fresh predictions from saved models (don't use old results)
            from sklearn.metrics import accuracy_score
            X_test_processed = X_test
            if name in feature_selectors:
                X_test_processed = feature_selectors[name].transform(X_test)
            y_pred = models[name].predict(X_test_processed)
            acc = accuracy_score(y_test, y_pred)
            results[name] = {
                'model': models[name],
                'predictions': y_pred,
                'test_accuracy': acc
            }
        else:
            # Try loading from results if model file doesn't exist (but skip ReinforcementLearning)
            if name != 'ReinforcementLearning' and name in results and 'model' in results[name]:
                models[name] = results[name]['model']
    
    return models, results, X_test, y_test, le, feature_selectors

def generate_classification_reports(models, results, y_test, le):
    """Generate classification reports for each model"""
    class_names = le.classes_
    
    for name, res in results.items():
        y_pred = res['predictions']
        report = classification_report(y_test, y_pred, target_names=class_names, output_dict=True)
        
        # Save as CSV
        report_df = pd.DataFrame(report).transpose()
        report_df.to_csv(OUTPUT_DIR / f"{name.lower().replace(' ', '_')}_classification_report.csv")
        
        # Print summary
        print(f"\n{name} Classification Report:")
        print(f"Accuracy: {res['test_accuracy']:.4f}")
        print(classification_report(y_test, y_pred, target_names=class_names))

def generate_confusion_matrices(models, results, y_test, le):
    """Generate confusion matrices for each model - both individual and combined"""
    class_names = le.classes_
    n_models = len(results)
    
    # Generate individual confusion matrices
    for name, res in results.items():
        y_pred = res['predictions']
        cm = confusion_matrix(y_test, y_pred, labels=range(len(class_names)))
        cm_normalized = cm.astype('float') / cm.sum(axis=1)[:, np.newaxis]
        
        # Individual figure
        fig, ax = plt.subplots(figsize=(10, 8))
        sns.heatmap(cm_normalized, annot=True, fmt='.2f', cmap='Blues',
                   xticklabels=class_names, yticklabels=class_names,
                   ax=ax, cbar_kws={'label': 'Normalized Count'})
        ax.set_title(f'{name} - Confusion Matrix', fontsize=14, fontweight='bold')
        ax.set_xlabel('Predicted', fontsize=12)
        ax.set_ylabel('Actual', fontsize=12)
        
        plt.tight_layout()
        filename = f"{name.lower().replace(' ', '_')}_confusion_matrix.png"
        plt.savefig(OUTPUT_DIR / filename, dpi=300, bbox_inches='tight')
        plt.close()
        print(f"Saved: {filename}")
    
    # Also generate combined figure for comparison (5 models: 2 rows, 3 cols, last empty)
    n_models = len(results)
    fig, axes = plt.subplots(2, 3, figsize=(18, 12))
    axes = axes.flatten()
    
    for idx, (name, res) in enumerate(results.items()):
        y_pred = res['predictions']
        cm = confusion_matrix(y_test, y_pred, labels=range(len(class_names)))
        cm_normalized = cm.astype('float') / cm.sum(axis=1)[:, np.newaxis]
        
        sns.heatmap(cm_normalized, annot=True, fmt='.2f', cmap='Blues',
                   xticklabels=class_names, yticklabels=class_names,
                   ax=axes[idx], cbar_kws={'label': 'Normalized Count'})
        axes[idx].set_title(f'{name}\nConfusion Matrix', fontsize=12, fontweight='bold')
        axes[idx].set_xlabel('Predicted')
        axes[idx].set_ylabel('Actual')
    
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / "all_confusion_matrices.png", dpi=300, bbox_inches='tight')
    plt.close()
    print("Saved: all_confusion_matrices.png (combined)")

def generate_per_class_performance(models, results, y_test, le):
    """Generate per-class performance charts for each model"""
    class_names = le.classes_
    
    for name, res in results.items():
        y_pred = res['predictions']
        precision, recall, f1, _ = precision_recall_fscore_support(
            y_test, y_pred, labels=range(len(class_names)), average=None
        )
        
        fig, ax = plt.subplots(figsize=(10, 6))
        x = np.arange(len(class_names))
        width = 0.25
        
        ax.bar(x - width, precision, width, label='Precision', color='#4ECDC4')
        ax.bar(x, recall, width, label='Recall', color='#FF6B6B')
        ax.bar(x + width, f1, width, label='F1-Score', color='#45B7D1')
        
        ax.set_xlabel('Risk Level', fontsize=12)
        ax.set_ylabel('Score', fontsize=12)
        ax.set_title(f'{name} - Per-Class Performance', fontsize=14, fontweight='bold')
        ax.set_xticks(x)
        ax.set_xticklabels(class_names)
        ax.legend()
        ax.set_ylim(0, 1.1)
        ax.grid(True, alpha=0.3, axis='y')
        
        plt.tight_layout()
        plt.savefig(OUTPUT_DIR / f"{name.lower().replace(' ', '_')}_per_class_performance.png", 
                   dpi=300, bbox_inches='tight')
        plt.close()
    
    print("Saved: per-class performance charts")

def generate_roc_curves(models, results, X_test, y_test, le, feature_selectors=None):
    """Generate ROC curves for each model"""
    class_names = le.classes_
    n_classes = len(class_names)
    y_test_bin = label_binarize(y_test, classes=range(n_classes))
    
    if feature_selectors is None:
        feature_selectors = {}
    
    for name, model_data in models.items():
        if name not in results:
            continue
            
        try:
            # Apply feature selection if available
            X_test_processed = X_test
            if name in feature_selectors:
                X_test_processed = feature_selectors[name].transform(X_test)
            
            # Get prediction probabilities
            if hasattr(model_data, 'predict_proba'):
                y_score = model_data.predict_proba(X_test_processed)
            else:
                # For models without predict_proba, use one-hot encoding
                y_pred = results[name]['predictions']
                y_score = label_binarize(y_pred, classes=range(n_classes))
            
            # Compute ROC curve and AUC for each class
            fpr = dict()
            tpr = dict()
            roc_auc = dict()
            
            for i in range(n_classes):
                fpr[i], tpr[i], _ = roc_curve(y_test_bin[:, i], y_score[:, i])
                roc_auc[i] = auc(fpr[i], tpr[i])
            
            # Plot ROC curves with more visible colors
            fig, ax = plt.subplots(figsize=(10, 8))
            # Use distinct, high-contrast colors: red, green, blue
            colors = ['red', 'green', 'blue']
            linestyles = ['-', '-', '-']
            
            for i, (color, ls) in enumerate(zip(colors, linestyles)):
                ax.plot(fpr[i], tpr[i], color=color, linestyle=ls, lw=2.5,
                       label=f'{class_names[i]} (AUC = {roc_auc[i]:.2f})', alpha=0.8)
            
            ax.plot([0, 1], [0, 1], 'k--', lw=2, label='Random Classifier', alpha=0.5)
            ax.set_xlim([0.0, 1.0])
            ax.set_ylim([0.0, 1.05])
            ax.set_xlabel('False Positive Rate', fontsize=12, fontweight='bold')
            ax.set_ylabel('True Positive Rate', fontsize=12, fontweight='bold')
            ax.set_title(f'{name} - ROC Curves', fontsize=14, fontweight='bold')
            ax.legend(loc="lower right", fontsize=11)
            ax.grid(True, alpha=0.3)
            
            plt.tight_layout()
            plt.savefig(OUTPUT_DIR / f"{name.lower().replace(' ', '_')}_roc_curves.png", 
                       dpi=300, bbox_inches='tight')
            plt.close()
        except Exception as e:
            print(f"Warning: Could not generate ROC for {name}: {e}")
    
    print("Saved: ROC curves")

def generate_overall_comparison(models, results, y_test, le):
    """Generate overall performance comparison chart"""
    model_names = []
    accuracies = []
    precisions = []
    recalls = []
    f1_scores = []
    
    class_names = le.classes_
    
    for name, res in results.items():
        y_pred = res['predictions']
        model_names.append(name)
        accuracies.append(res['test_accuracy'])
        
        prec, rec, f1, _ = precision_recall_fscore_support(
            y_test, y_pred, labels=range(len(class_names)), average='weighted'
        )
        precisions.append(prec)
        recalls.append(rec)
        f1_scores.append(f1)
    
    # Bar chart
    fig, ax = plt.subplots(figsize=(14, 8))
    x = np.arange(len(model_names))
    width = 0.2
    
    ax.bar(x - 1.5*width, accuracies, width, label='Accuracy', color='#FF6B6B')
    ax.bar(x - 0.5*width, precisions, width, label='Precision', color='#4ECDC4')
    ax.bar(x + 0.5*width, recalls, width, label='Recall', color='#45B7D1')
    ax.bar(x + 1.5*width, f1_scores, width, label='F1-Score', color='#FFA07A')
    
    ax.set_xlabel('Model', fontsize=12)
    ax.set_ylabel('Score', fontsize=12)
    ax.set_title('Overall Performance Comparison of Models', fontsize=14, fontweight='bold')
    ax.set_xticks(x)
    ax.set_xticklabels(model_names, rotation=15, ha='right')
    ax.legend()
    ax.set_ylim(0, 1.1)
    ax.grid(True, alpha=0.3, axis='y')
    
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / "overall_performance_comparison.png", dpi=300, bbox_inches='tight')
    plt.close()
    print("Saved: overall_performance_comparison.png")
    
    # Create comparison table
    comparison_df = pd.DataFrame({
        'Model': model_names,
        'Accuracy': accuracies,
        'Precision': precisions,
        'Recall': recalls,
        'F1-Score': f1_scores
    })
    comparison_df = comparison_df.sort_values('Accuracy', ascending=False)
    comparison_df.to_csv(OUTPUT_DIR / "model_comparison_table.csv", index=False)
    print("\nModel Comparison Table:")
    print(comparison_df.to_string(index=False))

def generate_auc_comparison(models, results, X_test, y_test, le, feature_selectors=None):
    """Generate AUC scores comparison"""
    class_names = le.classes_
    n_classes = len(class_names)
    y_test_bin = label_binarize(y_test, classes=range(n_classes))
    
    if feature_selectors is None:
        feature_selectors = {}
    
    model_aucs = {}
    
    for name, model_data in models.items():
        if name not in results:
            continue
        
        try:
            # Apply feature selection if available
            X_test_processed = X_test
            if name in feature_selectors:
                X_test_processed = feature_selectors[name].transform(X_test)
            
            if hasattr(model_data, 'predict_proba'):
                y_score = model_data.predict_proba(X_test_processed)
            else:
                continue
            
            # Compute macro-averaged AUC
            auc_scores = []
            for i in range(n_classes):
                try:
                    auc_score = roc_auc_score(y_test_bin[:, i], y_score[:, i])
                    auc_scores.append(auc_score)
                except:
                    pass
            
            if auc_scores:
                model_aucs[name] = np.mean(auc_scores)
        except Exception as e:
            print(f"Warning: Could not compute AUC for {name}: {e}")
    
    if model_aucs:
        fig, ax = plt.subplots(figsize=(12, 6))
        models_sorted = sorted(model_aucs.items(), key=lambda x: x[1], reverse=True)
        names = [m[0] for m in models_sorted]
        scores = [m[1] for m in models_sorted]
        
        bars = ax.bar(names, scores, color=['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#95E1D3', '#F38181'])
        ax.set_ylabel('AUC Score', fontsize=12)
        ax.set_title('AUC Scores Comparison Across Models', fontsize=14, fontweight='bold')
        ax.set_xticklabels(names, rotation=15, ha='right')
        ax.set_ylim(0, 1.1)
        ax.grid(True, alpha=0.3, axis='y')
        
        # Add value labels
        for bar, score in zip(bars, scores):
            height = bar.get_height()
            ax.text(bar.get_x() + bar.get_width()/2., height,
                   f'{score:.3f}', ha='center', va='bottom', fontweight='bold')
        
        plt.tight_layout()
        plt.savefig(OUTPUT_DIR / "auc_comparison.png", dpi=300, bbox_inches='tight')
        plt.close()
        print("Saved: auc_comparison.png")

if __name__ == "__main__":
    print("="*60)
    print("EVALUATING MODEL COMPARISON")
    print("="*60)
    
    # Load results and data
    models, results, X_test, y_test, le, feature_selectors = load_data_and_results()
    
    # Generate all visualizations
    print("\n1. Generating classification reports...")
    generate_classification_reports(models, results, y_test, le)
    
    print("\n2. Generating confusion matrices...")
    generate_confusion_matrices(models, results, y_test, le)
    
    print("\n3. Generating per-class performance charts...")
    generate_per_class_performance(models, results, y_test, le)
    
    print("\n4. Generating ROC curves...")
    generate_roc_curves(models, results, X_test, y_test, le, feature_selectors)
    
    print("\n5. Generating overall comparison...")
    generate_overall_comparison(models, results, y_test, le)
    
    print("\n6. Generating AUC comparison...")
    generate_auc_comparison(models, results, X_test, y_test, le, feature_selectors)
    
    print(f"\n{'='*60}")
    print("ALL EVALUATIONS COMPLETE")
    print(f"Figures saved to: {OUTPUT_DIR}")
    print(f"{'='*60}")

