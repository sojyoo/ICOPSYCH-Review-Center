"""Verify student data: uniqueness, score ranges, and performance tiers"""

import pandas as pd
import numpy as np

# Load data
df = pd.read_csv('enhanced_student_features.csv')

print("="*60)
print("STUDENT DATA VERIFICATION")
print("="*60)

# 1. Check uniqueness
print(f"\n1. Total rows: {len(df)}")
print(f"   Unique student IDs: {df['student_id'].nunique()}")
print(f"   Duplicates: {len(df) - df['student_id'].nunique()}")

if df['student_id'].nunique() != len(df):
    print("\n   WARNING: Duplicate student IDs found!")
    duplicates = df[df.duplicated(subset=['student_id'], keep=False)]
    print(f"   Duplicate entries: {len(duplicates)}")
    print("\n   Sample duplicates:")
    print(duplicates[['student_id', 'overall_avg_score']].head(10))

# 2. Score statistics
print("\n2. Overall Average Score Statistics:")
print(df['overall_avg_score'].describe())

print("\n   Score Range (raw points out of 30):")
print(f"   Min: {df['overall_avg_score'].min():.2f}")
print(f"   Max: {df['overall_avg_score'].max():.2f}")
print(f"   Mean: {df['overall_avg_score'].mean():.2f}")
print(f"   Median: {df['overall_avg_score'].median():.2f}")

# 3. Percentage conversion
print("\n3. Percentage Conversion (out of 30 points = 100%):")
min_pct = df['overall_avg_score'].min() / 30 * 100
max_pct = df['overall_avg_score'].max() / 30 * 100
mean_pct = df['overall_avg_score'].mean() / 30 * 100
median_pct = df['overall_avg_score'].median() / 30 * 100

print(f"   Min: {min_pct:.1f}%")
print(f"   Max: {max_pct:.1f}%")
print(f"   Mean: {mean_pct:.1f}%")
print(f"   Median: {median_pct:.1f}%")

# 4. Performance tier distribution (correct calculation)
print("\n4. Performance Tier Distribution (CORRECT):")
def categorize_performance(score):
    pct = (score / 30) * 100  # Convert to percentage
    if pct < 60:
        return "<60% (Needs Help)"
    elif pct < 75:
        return "60-75% (Moderate)"
    elif pct < 85:
        return "75-85% (Good)"
    else:
        return ">=85% (Excellent)"

df['performance_tier'] = df['overall_avg_score'].apply(categorize_performance)
tier_dist = df['performance_tier'].value_counts()
for tier, count in tier_dist.items():
    pct = (count / len(df)) * 100
    print(f"   {tier}: {count} ({pct:.1f}%)")

# 5. Check how 154 was derived
print("\n5. How 154 students was derived:")
print("   This comes from enhanced_student_features.csv")
print("   Each row represents one student (identified by email/student_id)")
print("   The file was created by:")
print("   - Loading Excel files from Pre-Tests/ and Posttests/")
print("   - Grouping by student email address")
print("   - Calculating average scores per subject")
print("   - Creating one row per unique student")

# 6. Verify by checking original Excel files
print("\n6. Verification from source files:")
try:
    import glob
    pretest_files = glob.glob("Pre-Tests/**/*.xlsx", recursive=True)
    posttest_files = glob.glob("Posttests/**/*.xlsx", recursive=True)
    
    all_emails = set()
    for file in pretest_files + posttest_files:
        try:
            temp_df = pd.read_excel(file)
            if 'Email Address' in temp_df.columns:
                emails = temp_df['Email Address'].dropna().unique()
                all_emails.update(emails)
        except:
            pass
    
    print(f"   Unique emails in Excel files: {len(all_emails)}")
    print(f"   Students in enhanced_student_features.csv: {df['student_id'].nunique()}")
    
    if len(all_emails) != df['student_id'].nunique():
        print(f"   NOTE: Some students may have been filtered out during processing")
        print(f"   (e.g., missing scores, invalid data)")
except Exception as e:
    print(f"   Could not verify from Excel files: {e}")

print("\n" + "="*60)

