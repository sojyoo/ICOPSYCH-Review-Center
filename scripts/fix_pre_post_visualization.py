"""
Fix pre-post improvements visualization to use actual paired data
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import glob
from pathlib import Path

OUTPUT_DIR = Path("figures/chapter4")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def load_and_pair_pre_post():
    """Load Excel files and create actual pre-test/post-test pairs"""
    pretest_files = glob.glob("Pre-Tests/**/*.xlsx", recursive=True)
    posttest_files = glob.glob("Posttests/**/*.xlsx", recursive=True)
    
    paired_data = []
    
    # Extract subject and lecture from filenames
    def extract_subject_lecture(filename):
        filename_upper = filename.upper()
        if 'ABNORMAL' in filename_upper:
            subject = 'Abnormal Psychology'
        elif 'DEVELOPMENTAL' in filename_upper:
            subject = 'Developmental Psychology'
        elif 'INDUSTRIAL' in filename_upper:
            subject = 'Industrial Psychology'
        elif 'PSYCHOLOGICAL ASSESSMENT' in filename_upper or 'PSYCH ASSESSMENT' in filename_upper:
            subject = 'Psychological Assessment'
        else:
            subject = 'Unknown'
        
        # Extract lecture number
        if 'LECTURE 1' in filename_upper or 'PRT1' in filename_upper or 'POT1' in filename_upper:
            lecture = 1
        elif 'LECTURE 2' in filename_upper or 'PRT2' in filename_upper or 'POT2' in filename_upper:
            lecture = 2
        elif 'LECTURE 3' in filename_upper or 'PRT3' in filename_upper or 'POT3' in filename_upper:
            lecture = 3
        else:
            lecture = 1
        
        return subject, lecture
    
    # Load pre-tests
    pretest_data = {}
    for file in pretest_files:
        try:
            df = pd.read_excel(file)
            subject, lecture = extract_subject_lecture(file)
            key = (subject, lecture)
            if key not in pretest_data:
                pretest_data[key] = []
            pretest_data[key].append(df)
        except Exception as e:
            print(f"Error loading {file}: {e}")
    
    # Load post-tests
    posttest_data = {}
    for file in posttest_files:
        try:
            df = pd.read_excel(file)
            subject, lecture = extract_subject_lecture(file)
            key = (subject, lecture)
            if key not in posttest_data:
                posttest_data[key] = []
            posttest_data[key].append(df)
        except Exception as e:
            print(f"Error loading {file}: {e}")
    
    # Pair pre and post tests
    for (subject, lecture) in pretest_data.keys():
        if (subject, lecture) in posttest_data:
            # Combine all pre-test files for this subject-lecture
            pre_dfs = pretest_data[(subject, lecture)]
            post_dfs = posttest_data[(subject, lecture)]
            
            for pre_df in pre_dfs:
                for post_df in post_dfs:
                    # Find common students
                    if 'Email Address' in pre_df.columns and 'Email Address' in post_df.columns:
                        common_emails = set(pre_df['Email Address'].dropna()) & set(post_df['Email Address'].dropna())
                        
                        for email in common_emails:
                            pre_student = pre_df[pre_df['Email Address'] == email]
                            post_student = post_df[post_df['Email Address'] == email]
                            
                            if len(pre_student) > 0 and len(post_student) > 0:
                                pre_score = pd.to_numeric(pre_student.iloc[0]['Score'], errors='coerce')
                                post_score = pd.to_numeric(post_student.iloc[0]['Score'], errors='coerce')
                                
                                if not pd.isna(pre_score) and not pd.isna(post_score):
                                    paired_data.append({
                                        'email': email,
                                        'subject': subject,
                                        'lecture': lecture,
                                        'pre_score': pre_score,
                                        'post_score': post_score,
                                        'improvement': post_score - pre_score
                                    })
    
    return pd.DataFrame(paired_data)

def create_fixed_pre_post_visualization():
    """Create pre-post improvements using actual paired data"""
    print("Loading and pairing pre-test/post-test data...")
    paired_df = load_and_pair_pre_post()
    
    if len(paired_df) == 0:
        print("ERROR: No paired pre-post data found!")
        return
    
    print(f"Found {len(paired_df)} pre-post pairs")
    print(f"Improvement stats: mean={paired_df['improvement'].mean():.2f}, std={paired_df['improvement'].std():.2f}")
    
    # Get top 3 improvements by absolute improvement
    top_improvements = paired_df.nlargest(3, 'improvement')
    
    if len(top_improvements) < 3:
        # If not enough positive improvements, get top by absolute value
        top_improvements = paired_df.reindex(paired_df['improvement'].abs().nlargest(3).index)
    
    fig, axes = plt.subplots(1, 3, figsize=(18, 5))
    
    for idx, (_, row) in enumerate(top_improvements.iterrows()):
        categories = ['Pre-Test', 'Post-Test']
        values = [row['pre_score'], row['post_score']]
        improvement = row['improvement']
        
        bars = axes[idx].bar(categories, values, color=['#FF6B6B', '#4ECDC4'])
        axes[idx].set_title(f"{row['subject']}\nImprovement: {improvement:+.1f} points", 
                           fontsize=12, fontweight='bold')
        axes[idx].set_ylabel('Score (out of 30)')
        axes[idx].set_ylim(0, 35)
        
        # Add value labels
        for bar in bars:
            height = bar.get_height()
            axes[idx].text(bar.get_x() + bar.get_width()/2., height,
                          f'{height:.1f}', ha='center', va='bottom', fontweight='bold')
        
        axes[idx].grid(True, alpha=0.3, axis='y')
    
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / "pre_post_improvements.png", dpi=300, bbox_inches='tight')
    plt.close()
    
    print(f"Saved fixed visualization to {OUTPUT_DIR / 'pre_post_improvements.png'}")
    
    # Also create improvement distribution
    fig, axes = plt.subplots(1, 2, figsize=(16, 6))
    
    # Histogram
    axes[0].hist(paired_df['improvement'], bins=30, color='#4ECDC4', edgecolor='black', alpha=0.7)
    axes[0].axvline(paired_df['improvement'].mean(), color='r', linestyle='--', linewidth=2, 
                    label=f'Mean: {paired_df["improvement"].mean():.2f}')
    axes[0].set_title('Score Improvement Distribution\n(Post-Test - Pre-Test)', fontsize=12, fontweight='bold')
    axes[0].set_xlabel('Improvement (points)')
    axes[0].set_ylabel('Frequency')
    axes[0].legend()
    axes[0].grid(True, alpha=0.3)
    
    # By subject
    subject_improvements = paired_df.groupby('subject')['improvement'].mean().sort_values()
    axes[1].barh(subject_improvements.index, subject_improvements.values, color='#45B7D1')
    axes[1].set_title('Average Improvement by Subject', fontsize=12, fontweight='bold')
    axes[1].set_xlabel('Average Improvement (points)')
    axes[1].axvline(0, color='black', linestyle='-', linewidth=0.5)
    axes[1].grid(True, alpha=0.3, axis='x')
    
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / "improvement_patterns.png", dpi=300, bbox_inches='tight')
    plt.close()
    
    print(f"Saved improvement patterns to {OUTPUT_DIR / 'improvement_patterns.png'}")

if __name__ == "__main__":
    create_fixed_pre_post_visualization()










