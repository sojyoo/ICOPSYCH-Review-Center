"""
Visualize a decision tree from the Random Forest model for thesis documentation.
"""

import os
import joblib
import numpy as np
import matplotlib.pyplot as plt
from sklearn.tree import plot_tree, export_text
import warnings
warnings.filterwarnings('ignore')

def load_model():
    """Load the saved Random Forest model"""
    model_path = "model_comparison/randomforest_model.pkl"
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model file not found: {model_path}")
    
    data = joblib.load(model_path)
    model = data['model']
    
    # Feature names from the training script
    feature_cols = [
        "abnormal_psych_score", "developmental_psych_score", "industrial_psych_score",
        "psychological_assessment_score", "overall_avg_score", "score_consistency",
        "improvement_rate", "study_hours_per_week", "total_tests_taken",
        "avg_tests_per_subject", "test_type",
    ]
    
    return model, feature_cols

def visualize_decision_tree(rf_model, feature_names, output_path="figures/chapter4/model_comparison/randomforest_decision_tree.png"):
    """
    Visualize a representative decision tree from the Random Forest.
    Selects the tree with median depth for better representation.
    """
    # Create output directory if it doesn't exist
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # Get all tree depths
    tree_depths = [tree.tree_.max_depth for tree in rf_model.estimators_]
    median_depth_idx = np.argsort(tree_depths)[len(tree_depths) // 2]
    
    # Select the tree with median depth
    selected_tree = rf_model.estimators_[median_depth_idx]
    
    print(f"Selected tree {median_depth_idx} with depth {tree_depths[median_depth_idx]}")
    print(f"Total trees in Random Forest: {len(rf_model.estimators_)}")
    
    # Create a large figure for better readability
    fig, ax = plt.subplots(figsize=(20, 12))
    
    # Plot the tree
    plot_tree(
        selected_tree,
        feature_names=feature_names,
        class_names=['high_risk', 'medium_risk', 'low_risk'],
        filled=True,
        rounded=True,
        fontsize=10,
        ax=ax,
        impurity=True,
        node_ids=True
    )
    
    plt.title(
        f'Decision Tree from Random Forest (Tree {median_depth_idx + 1} of {len(rf_model.estimators_)})\n'
        f'Depth: {tree_depths[median_depth_idx]}, Max Depth: {rf_model.max_depth}',
        fontsize=14,
        fontweight='bold',
        pad=20
    )
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    print(f"Decision tree saved to: {output_path}")
    
    # Also export text representation for reference
    tree_text = export_text(
        selected_tree,
        feature_names=feature_names,
        class_names=['high_risk', 'medium_risk', 'low_risk'],
        max_depth=10
    )
    
    text_output_path = output_path.replace('.png', '_text.txt')
    with open(text_output_path, 'w') as f:
        f.write(f"Decision Tree {median_depth_idx + 1} from Random Forest\n")
        f.write(f"Depth: {tree_depths[median_depth_idx]}\n")
        f.write("=" * 80 + "\n\n")
        f.write(tree_text)
    
    print(f"Text representation saved to: {text_output_path}")
    
    return output_path

def create_simplified_tree(rf_model, feature_names, output_path="figures/chapter4/model_comparison/randomforest_decision_tree_simplified.png"):
    """
    Create a simplified version showing a depth-2 tree (most common in this model).
    This is useful for showing the core decision logic in a compact format.
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # Find a tree with depth 2 (most common)
    tree_depths = [tree.tree_.max_depth for tree in rf_model.estimators_]
    depth_2_indices = [i for i, d in enumerate(tree_depths) if d == 2]
    
    if depth_2_indices:
        selected_idx = depth_2_indices[0]
        selected_tree = rf_model.estimators_[selected_idx]
        tree_label = f"Depth-2 Tree (Tree {selected_idx + 1})"
    else:
        # Fallback to first tree
        selected_tree = rf_model.estimators_[0]
        selected_idx = 0
        tree_label = f"Tree {selected_idx + 1}"
    
    # Create figure
    fig, ax = plt.subplots(figsize=(14, 8))
    
    # Plot the full tree (depth 2 is already simple)
    plot_tree(
        selected_tree,
        feature_names=feature_names,
        class_names=['high_risk', 'medium_risk', 'low_risk'],
        filled=True,
        rounded=True,
        fontsize=10,
        ax=ax,
        impurity=True,
        node_ids=True
    )
    
    plt.title(
        f'Decision Tree from Random Forest ({tree_label})\n'
        f'Model: {len(rf_model.estimators_)} trees, Max Depth: {rf_model.max_depth}',
        fontsize=13,
        fontweight='bold',
        pad=20
    )
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    print(f"Simplified decision tree (depth 2) saved to: {output_path}")
    
    return output_path

def main():
    """Main function to generate decision tree visualizations"""
    print("=" * 60)
    print("GENERATING DECISION TREE VISUALIZATIONS")
    print("=" * 60)
    
    # Load model
    print("\n1. Loading Random Forest model...")
    rf_model, feature_names = load_model()
    
    print(f"   Model loaded successfully")
    print(f"   Number of trees: {len(rf_model.estimators_)}")
    print(f"   Max depth: {rf_model.max_depth}")
    print(f"   Features: {len(feature_names)}")
    
    # Generate full tree visualization
    print("\n2. Generating full decision tree visualization...")
    full_tree_path = visualize_decision_tree(
        rf_model,
        feature_names,
        "figures/chapter4/model_comparison/randomforest_decision_tree.png"
    )
    
    # Generate simplified tree visualization
    print("\n3. Generating simplified decision tree visualization...")
    simplified_tree_path = create_simplified_tree(
        rf_model,
        feature_names,
        "figures/chapter4/model_comparison/randomforest_decision_tree_simplified.png"
    )
    
    # Get tree depth statistics
    tree_depths = [tree.tree_.max_depth for tree in rf_model.estimators_]
    depth_dist = dict(zip(*np.unique(tree_depths, return_counts=True)))
    median_depth_idx = np.argsort(tree_depths)[len(tree_depths) // 2]
    
    print("\n" + "=" * 60)
    print("DECISION TREE VISUALIZATIONS COMPLETE")
    print("=" * 60)
    print(f"\nGenerated files:")
    print(f"  - Full tree (depth {tree_depths[median_depth_idx]}): {full_tree_path}")
    print(f"  - Simplified tree (depth 2): {simplified_tree_path}")
    print(f"\nTree depth statistics:")
    print(f"  - Max depth setting: {rf_model.max_depth}")
    print(f"  - Actual tree depths: {depth_dist}")
    print(f"\nRecommendation for thesis:")
    print(f"  - BEST: Use the full tree visualization (already readable at depth 2-3)")
    print(f"  - ALTERNATIVE: Use simplified version for a cleaner, depth-2 example")
    print(f"  - Both are suitable since trees are shallow (max depth 3)")

if __name__ == "__main__":
    main()

