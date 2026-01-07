"""Check actual statistics for risk levels"""

import pandas as pd

df = pd.read_csv('enhanced_student_features.csv')

print("Risk Level Statistics:\n")
for risk in ['low_risk', 'medium_risk', 'high_risk']:
    subset = df[df['board_exam_risk'] == risk]['overall_avg_score']
    print(f"{risk.upper()}:")
    print(f"  Count: {len(subset)}")
    print(f"  Median: {subset.median():.2f} points ({subset.median()/30*100:.1f}%)")
    print(f"  Q1: {subset.quantile(0.25):.2f} points")
    print(f"  Q3: {subset.quantile(0.75):.2f} points")
    print(f"  IQR: {subset.quantile(0.75) - subset.quantile(0.25):.2f} points")
    print(f"  Mean: {subset.mean():.2f} points")
    print()








