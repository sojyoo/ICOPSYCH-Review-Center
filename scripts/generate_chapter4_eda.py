"""
Generate comprehensive EDA visualizations and tables for Chapter 4
Following the template structure but adapted for tabular data
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
import json
from collections import Counter

# Set style
plt.style.use('seaborn-v0_8')
sns.set_palette("husl")

OUTPUT_DIR = Path("figures/chapter4")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Load all data
print("Loading data files...")
student_features = pd.read_csv("enhanced_student_features.csv")
survey_features = pd.read_csv("survey_features_processed.csv")
recommendations = pd.read_csv("adaptive_review_recommendations_clean.csv")
topic_recommendations = pd.read_csv("personalized_topic_recommendations.csv")

# Load model performance if available
try:
    with open("training_logs/survey_personalization_metrics.json", "r") as f:
        survey_metrics = json.load(f)
except:
    survey_metrics = {}

print(f"Loaded {len(student_features)} student records")
print(f"Loaded {len(survey_features)} survey responses")
print(f"Loaded {len(recommendations)} recommendations")
print(f"Loaded {len(topic_recommendations)} topic-level recommendations")

# ============================================================================
# 1. CLASS DISTRIBUTION TABLES
# ============================================================================

def create_class_distribution_tables():
    """Create Table 4.1 equivalent - Class Distribution"""
    
    # Risk Level Distribution
    risk_dist = student_features['board_exam_risk'].value_counts().sort_index()
    
    # Subject Distribution (from recommendations)
    subject_dist = recommendations['subject'].value_counts()
    
    # Performance Tier Distribution
    def categorize_performance(score):
        if pd.isna(score):
            return "Unknown"
        if score < 60:
            return "<60% (Needs Help)"
        elif score < 75:
            return "60-75% (Moderate)"
        elif score < 85:
            return "75-85% (Good)"
        else:
            return "≥85% (Excellent)"
    
    student_features['performance_tier'] = student_features['overall_avg_score'].apply(categorize_performance)
    tier_dist = student_features['performance_tier'].value_counts()
    
    # Test Type Distribution (from recommendations - inferred)
    # We'll use test_count to infer
    test_type_dist = pd.Series({
        'Pre-test': len(recommendations[recommendations['test_count'] <= 3]),
        'Post-test': len(recommendations[recommendations['test_count'] > 3]),
        'Pre-Board': 0  # Can be updated if we have this data
    })
    
    # Create comprehensive table
    class_dist_df = pd.DataFrame({
        'Category': ['Risk Levels', 'Subjects', 'Performance Tiers', 'Test Types'],
        'Classes': [
            f"{len(risk_dist)} classes",
            f"{len(subject_dist)} subjects",
            f"{len(tier_dist)} tiers",
            f"{len(test_type_dist)} types"
        ],
        'Total Samples': [
            len(student_features),
            len(recommendations),
            len(student_features),
            len(recommendations)
        ]
    })
    
    # Save detailed distributions
    risk_dist.to_csv(OUTPUT_DIR / "class_distribution_risk_levels.csv")
    subject_dist.to_csv(OUTPUT_DIR / "class_distribution_subjects.csv")
    tier_dist.to_csv(OUTPUT_DIR / "class_distribution_performance_tiers.csv")
    
    return class_dist_df, risk_dist, subject_dist, tier_dist

# ============================================================================
# 2. DATASET DESCRIPTION TABLE
# ============================================================================

def create_dataset_description():
    """Create Table 4.2 equivalent - Dataset Description"""
    
    # Calculate train/val/test splits (approximate based on our 80/20 split)
    total_students = len(student_features)
    train_size = int(total_students * 0.8)
    test_size = total_students - train_size
    
    dataset_desc = pd.DataFrame({
        'Dataset': [
            'Student Features (Enhanced)',
            'Survey Responses',
            'Subject Recommendations',
            'Topic Recommendations',
            'Pre-Test Excel Files',
            'Post-Test Excel Files'
        ],
        'Samples': [
            len(student_features),
            len(survey_features),
            len(recommendations),
            len(topic_recommendations),
            '11 files',
            '18 files'
        ],
        'Features': [
            len(student_features.columns),
            len(survey_features.columns),
            len(recommendations.columns),
            len(topic_recommendations.columns),
            'Variable',
            'Variable'
        ],
        'Train/Val/Test Split': [
            f"{train_size}/{0}/{test_size}",
            'N/A (Survey)',
            'N/A (Derived)',
            'N/A (Derived)',
            'N/A (Raw)',
            'N/A (Raw)'
        ]
    })
    
    dataset_desc.to_csv(OUTPUT_DIR / "dataset_description.csv", index=False)
    return dataset_desc

# ============================================================================
# 3. SAMPLE DATA EXAMPLES (Figures 4.1-4.10 equivalent)
# ============================================================================

def create_sample_data_visualizations():
    """Create sample data examples - anonymized student records"""
    
    # Figure 4.1-4.3: Sample student records (anonymized)
    sample_students = student_features.head(3)[
        ['overall_avg_score', 'abnormal_psych_score', 'developmental_psych_score', 
         'industrial_psych_score', 'psychological_assessment_score', 'board_exam_risk']
    ]
    
    fig, axes = plt.subplots(1, 3, figsize=(18, 5))
    for idx, (_, student) in enumerate(sample_students.iterrows()):
        subjects = ['Abnormal', 'Developmental', 'Industrial', 'Assessment']
        scores = [
            student['abnormal_psych_score'],
            student['developmental_psych_score'],
            student['industrial_psych_score'],
            student['psychological_assessment_score']
        ]
        
        axes[idx].bar(subjects, scores, color=['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A'])
        axes[idx].axhline(y=student['overall_avg_score'], color='r', linestyle='--', 
                         label=f'Overall: {student["overall_avg_score"]:.1f}')
        axes[idx].set_title(f'Student {idx+1} Performance\nRisk: {student["board_exam_risk"]}', 
                           fontsize=12, fontweight='bold')
        axes[idx].set_ylabel('Score')
        axes[idx].set_ylim(0, 30)
        axes[idx].legend()
        axes[idx].grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / "sample_student_records.png", dpi=300, bbox_inches='tight')
    plt.close()
    
    # Figure 4.4-4.6: Example recommendations generated
    sample_recs = recommendations.head(6)
    
    fig, axes = plt.subplots(2, 3, figsize=(18, 10))
    axes = axes.flatten()
    
    for idx, (_, rec) in enumerate(sample_recs.iterrows()):
        ax = axes[idx]
        # Create a simple visualization of recommendation
        categories = ['Current', 'Target']
        values = [rec['current_performance'], rec.get('target_score', rec['current_performance'] + 5)]
        
        bars = ax.bar(categories, values, color=['#FF6B6B', '#4ECDC4'])
        ax.set_title(f"{rec['subject']}\n{rec['recommended_action']}", 
                    fontsize=10, fontweight='bold')
        ax.set_ylabel('Score')
        ax.set_ylim(0, 35)
        
        # Add value labels
        for bar in bars:
            height = bar.get_height()
            ax.text(bar.get_x() + bar.get_width()/2., height,
                   f'{height:.1f}', ha='center', va='bottom')
        
        ax.grid(True, alpha=0.3, axis='y')
    
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / "sample_recommendations.png", dpi=300, bbox_inches='tight')
    plt.close()
    
    # Figure 4.7-4.9: Pre-test vs Post-test improvements
    # Group by student and subject to find improvements
    student_subjects = recommendations.groupby(['student_id', 'subject']).agg({
        'current_performance': ['first', 'last'],
        'score_improvement': 'sum'
    }).reset_index()
    student_subjects.columns = ['student_id', 'subject', 'first_score', 'last_score', 'total_improvement']
    
    # Get top 3 improvements
    top_improvements = student_subjects.nlargest(3, 'total_improvement')
    
    fig, axes = plt.subplots(1, 3, figsize=(18, 5))
    for idx, (_, row) in enumerate(top_improvements.iterrows()):
        categories = ['Pre-Test', 'Post-Test']
        values = [row['first_score'], row['last_score']]
        
        bars = axes[idx].bar(categories, values, color=['#FF6B6B', '#4ECDC4'])
        axes[idx].set_title(f"{row['subject']}\nImprovement: +{row['total_improvement']:.1f}", 
                           fontsize=12, fontweight='bold')
        axes[idx].set_ylabel('Score')
        axes[idx].set_ylim(0, 35)
        
        for bar in bars:
            height = bar.get_height()
            axes[idx].text(bar.get_x() + bar.get_width()/2., height,
                          f'{height:.1f}', ha='center', va='bottom')
        
        axes[idx].grid(True, alpha=0.3, axis='y')
    
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / "pre_post_improvements.png", dpi=300, bbox_inches='tight')
    plt.close()
    
    # Figure 4.10: Survey response mapping to features
    sample_survey = survey_features.head(5)[
        ['planning_score', 'discipline_score', 'active_learning_score', 
         'confidence_score', 'gwa_developmental_psych_num']
    ].fillna(0)
    
    fig, ax = plt.subplots(figsize=(12, 6))
    x = np.arange(len(sample_survey))
    width = 0.2
    
    ax.bar(x - 1.5*width, sample_survey['planning_score'], width, label='Planning', color='#FF6B6B')
    ax.bar(x - 0.5*width, sample_survey['discipline_score'], width, label='Discipline', color='#4ECDC4')
    ax.bar(x + 0.5*width, sample_survey['active_learning_score'], width, label='Active Learning', color='#45B7D1')
    ax.bar(x + 1.5*width, sample_survey['confidence_score'], width, label='Confidence', color='#FFA07A')
    
    ax.set_xlabel('Survey Respondent')
    ax.set_ylabel('Normalized Score (0-1)')
    ax.set_title('Survey Features Mapping\n(First 5 Respondents)', fontsize=14, fontweight='bold')
    ax.set_xticks(x)
    ax.set_xticklabels([f'Respondent {i+1}' for i in range(len(sample_survey))])
    ax.legend()
    ax.grid(True, alpha=0.3, axis='y')
    
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / "survey_feature_mapping.png", dpi=300, bbox_inches='tight')
    plt.close()

# ============================================================================
# 4. EDA WITH FEATURE ANALYSIS (Figures 4.11-4.16 equivalent)
# ============================================================================

def create_eda_visualizations():
    """Create comprehensive EDA visualizations"""
    
    # Figure 4.11: Student Performance Distribution by Subject
    fig, axes = plt.subplots(2, 2, figsize=(16, 12))
    subjects = ['abnormal_psych_score', 'developmental_psych_score', 
                'industrial_psych_score', 'psychological_assessment_score']
    subject_names = ['Abnormal Psychology', 'Developmental Psychology', 
                     'Industrial Psychology', 'Psychological Assessment']
    
    for idx, (subject, name) in enumerate(zip(subjects, subject_names)):
        ax = axes[idx // 2, idx % 2]
        data = student_features[subject].dropna()
        
        ax.hist(data, bins=20, color='#4ECDC4', edgecolor='black', alpha=0.7)
        ax.axvline(data.mean(), color='r', linestyle='--', linewidth=2, 
                   label=f'Mean: {data.mean():.2f}')
        ax.axvline(data.median(), color='g', linestyle='--', linewidth=2, 
                   label=f'Median: {data.median():.2f}')
        ax.set_title(f'{name}\nDistribution', fontsize=12, fontweight='bold')
        ax.set_xlabel('Score')
        ax.set_ylabel('Frequency')
        ax.legend()
        ax.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / "performance_distribution_by_subject.png", dpi=300, bbox_inches='tight')
    plt.close()
    
    # Figure 4.12: Study Habit Patterns from Survey
    habit_cols = ['planning_score', 'discipline_score', 'active_learning_score', 
                  'environment_score', 'collaboration_score', 'feedback_score']
    habit_data = survey_features[habit_cols].fillna(0)
    
    fig, ax = plt.subplots(figsize=(14, 8))
    habit_means = habit_data.mean().sort_values(ascending=True)
    
    bars = ax.barh(habit_means.index.str.replace('_score', '').str.replace('_', ' ').str.title(), 
                   habit_means.values, color='#45B7D1')
    ax.set_xlabel('Average Normalized Score (0-1)', fontsize=12)
    ax.set_title('Study Habit Patterns\n(Average Scores from Survey)', 
                fontsize=14, fontweight='bold')
    ax.set_xlim(0, 1)
    
    # Add value labels
    for i, (idx, val) in enumerate(habit_means.items()):
        ax.text(val + 0.02, i, f'{val:.3f}', va='center', fontweight='bold')
    
    ax.grid(True, alpha=0.3, axis='x')
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / "study_habit_patterns.png", dpi=300, bbox_inches='tight')
    plt.close()
    
    # Figure 4.13: Feature Importance from Random Forest (already generated, but create summary)
    # This references the existing feature_importance_leak_free.png
    
    # Figure 4.14: Score Distribution Across Cohorts (BSP4A vs BSP4B)
    # We'll infer cohort from student_id patterns or use a proxy
    # For now, create a distribution comparison
    fig, ax = plt.subplots(figsize=(12, 6))
    
    overall_scores = student_features['overall_avg_score'].dropna()
    ax.hist(overall_scores, bins=25, color='#FF6B6B', edgecolor='black', alpha=0.7)
    ax.axvline(overall_scores.mean(), color='r', linestyle='--', linewidth=2, 
               label=f'Mean: {overall_scores.mean():.2f}')
    ax.axvline(overall_scores.median(), color='g', linestyle='--', linewidth=2, 
               label=f'Median: {overall_scores.median():.2f}')
    ax.set_title('Overall Score Distribution\n(All Students)', fontsize=14, fontweight='bold')
    ax.set_xlabel('Overall Average Score')
    ax.set_ylabel('Frequency')
    ax.legend()
    ax.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / "overall_score_distribution.png", dpi=300, bbox_inches='tight')
    plt.close()
    
    # Figure 4.15: Pre-test vs Post-test Improvement Patterns
    improvements = recommendations['score_improvement'].dropna()
    
    fig, axes = plt.subplots(1, 2, figsize=(16, 6))
    
    # Histogram of improvements
    axes[0].hist(improvements, bins=30, color='#4ECDC4', edgecolor='black', alpha=0.7)
    axes[0].axvline(improvements.mean(), color='r', linestyle='--', linewidth=2, 
                    label=f'Mean: {improvements.mean():.2f}')
    axes[0].set_title('Score Improvement Distribution', fontsize=12, fontweight='bold')
    axes[0].set_xlabel('Improvement (points)')
    axes[0].set_ylabel('Frequency')
    axes[0].legend()
    axes[0].grid(True, alpha=0.3)
    
    # Improvement by subject
    subject_improvements = recommendations.groupby('subject')['score_improvement'].mean().sort_values()
    axes[1].barh(subject_improvements.index, subject_improvements.values, color='#45B7D1')
    axes[1].set_title('Average Improvement by Subject', fontsize=12, fontweight='bold')
    axes[1].set_xlabel('Average Improvement (points)')
    axes[1].grid(True, alpha=0.3, axis='x')
    
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / "improvement_patterns.png", dpi=300, bbox_inches='tight')
    plt.close()
    
    # Figure 4.16: Risk Level vs Performance Correlation
    risk_mapping = {'low_risk': 0, 'medium_risk': 1, 'high_risk': 2}
    student_features['risk_numeric'] = student_features['board_exam_risk'].map(risk_mapping)
    
    fig, ax = plt.subplots(figsize=(12, 8))
    
    risk_levels = ['Low Risk', 'Medium Risk', 'High Risk']
    risk_data = [student_features[student_features['risk_numeric'] == i]['overall_avg_score'].dropna() 
                 for i in range(3)]
    
    bp = ax.boxplot(risk_data, labels=risk_levels, patch_artist=True)
    colors = ['#4ECDC4', '#FFA07A', '#FF6B6B']
    for patch, color in zip(bp['boxes'], colors):
        patch.set_facecolor(color)
        patch.set_alpha(0.7)
    
    ax.set_title('Performance Distribution by Risk Level', fontsize=14, fontweight='bold')
    ax.set_xlabel('Risk Level')
    ax.set_ylabel('Overall Average Score')
    ax.grid(True, alpha=0.3, axis='y')
    
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / "risk_performance_correlation.png", dpi=300, bbox_inches='tight')
    plt.close()

# ============================================================================
# MAIN EXECUTION
# ============================================================================

if __name__ == "__main__":
    print("\n" + "="*60)
    print("GENERATING CHAPTER 4 EDA VISUALIZATIONS")
    print("="*60 + "\n")
    
    # 1. Class Distribution Tables
    print("1. Creating class distribution tables...")
    class_dist_df, risk_dist, subject_dist, tier_dist = create_class_distribution_tables()
    print(f"   [OK] Risk levels: {len(risk_dist)} classes")
    print(f"   [OK] Subjects: {len(subject_dist)} classes")
    print(f"   [OK] Performance tiers: {len(tier_dist)} classes")
    
    # 2. Dataset Description
    print("\n2. Creating dataset description table...")
    dataset_desc = create_dataset_description()
    print(f"   [OK] Dataset description saved")
    
    # 3. Sample Data Examples
    print("\n3. Generating sample data visualizations...")
    create_sample_data_visualizations()
    print("   [OK] Sample student records (3 figures)")
    print("   [OK] Sample recommendations (6 figures)")
    print("   [OK] Pre-post improvements (3 figures)")
    print("   [OK] Survey feature mapping (1 figure)")
    
    # 4. EDA Visualizations
    print("\n4. Generating EDA visualizations...")
    create_eda_visualizations()
    print("   [OK] Performance distributions by subject")
    print("   [OK] Study habit patterns")
    print("   [OK] Overall score distribution")
    print("   [OK] Improvement patterns")
    print("   [OK] Risk-performance correlation")
    
    print("\n" + "="*60)
    print("ALL VISUALIZATIONS SAVED TO:", OUTPUT_DIR)
    print("="*60 + "\n")
    
    # Print summary statistics
    print("SUMMARY STATISTICS:")
    print(f"Total Students: {len(student_features)}")
    print(f"Total Survey Responses: {len(survey_features)}")
    print(f"Total Recommendations: {len(recommendations)}")
    print(f"Total Topic Recommendations: {len(topic_recommendations)}")
    print(f"\nRisk Level Distribution:")
    print(risk_dist)
    print(f"\nSubject Distribution:")
    print(subject_dist)
    print(f"\nPerformance Tier Distribution:")
    print(tier_dist)

