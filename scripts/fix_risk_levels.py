"""Fix risk levels in enhanced_student_features.csv using quantile-based approach"""

import pandas as pd
import numpy as np

# Load data
df = pd.read_csv('enhanced_student_features.csv')

# Calculate quantiles
scores = df['overall_avg_score'].fillna(0)
q1, q2 = scores.quantile([0.33, 0.66])

print(f'Quantiles: Q1={q1:.2f}, Q2={q2:.2f}')

# Assign risk levels
def assign_risk(score):
    if score > q2:
        return 'low_risk'
    elif score > q1:
        return 'medium_risk'
    else:
        return 'high_risk'

df['board_exam_risk'] = scores.apply(assign_risk)

# Show distribution
print('\nNew risk distribution:')
print(df['board_exam_risk'].value_counts().sort_index())

# Save
df.to_csv('enhanced_student_features.csv', index=False)
print('\nFile updated with correct risk levels!')








