# Data Provenance and Figure Generation Documentation

## Overview
This document provides a comprehensive trace of all data sources, processing steps, and figure generation methods used in Chapter 4. Every figure and statistic can be traced back to original data files.

---

## 1. ORIGINAL DATA SOURCES (Primary Sources)

### 1.1 Student Performance Data (Excel Files)

**Source Location:**
- `Pre-Tests/BSP4A/` - 11 Excel files
- `Pre-Tests/BSP4B/` - Additional Excel files
- `Posttests/BSP 4A/` - 18 Excel files
- `Posttests/BSP 4B/` - Additional Excel files
- `Pre-Board Exam/` - Pre-board examination results

**What's in these files:**
- Student email addresses (identifiers)
- Individual question responses (A, B, C, D)
- Total scores (out of 30 points)
- Subject classification (extracted from filename)
- Lecture number (extracted from filename)
- Timestamp of submission

**Example Files:**
- `PrT1 _ DEVELOPMENTAL PSYCHOLOGY _ Lecture 1 _ April 5, 2025 (Responses).xlsx`
- `PoT2 _ ABNORMAL PSYCHOLOGY _ Lecture 2 _ April 26, 2025 (Responses).xlsx`

**How to verify:**
```bash
# Count files
ls Pre-Tests/**/*.xlsx | wc -l
ls Posttests/**/*.xlsx | wc -l

# Open any Excel file to see raw student responses
```

**Processing Script:**
- `core_ml_model.py` - `load_and_process_data()` function
- `bsp4a_leak_free_model.py` - `load_bsp4a_data()` function
- These scripts read Excel files, extract subject/lecture from filenames, and combine into DataFrames

---

### 1.2 Survey Data (CSV)

**Source File:**
- `Adaptive Review Planning for Psychometrician Licensure Examination Preparation Using Machine Learning.csv`

**What's in this file:**
- 52 raw survey responses from 4th-year psychology students
- Timestamp, year level, age, gender
- GWA (General Weighted Average) for each subject (High/Medium/Low/N/A)
- Likert scale responses (1-4) for study habits
- Multiple choice responses for review preferences
- Self-reported confidence levels
- Open-ended responses for motivations and challenges

**How to verify:**
```bash
# View raw survey data
head -5 "Adaptive Review Planning for Psychometrician Licensure Examination Preparation Using Machine Learning.csv"
```

**Processing Script:**
- `survey_features.py` - Processes raw survey CSV into numerical features
- Output: `survey_features_processed.csv` (44 valid responses after cleaning)

---

### 1.3 Enhanced Student Features (Derived Dataset)

**Source File:**
- `enhanced_student_features.csv` (154 students)

**How it was created:**
1. **Input**: Raw Excel files from Pre-Tests and Posttests
2. **Processing**: `enhanced_ml_model.py` and `core_ml_model.py`
3. **Feature Engineering Steps**:
   - Grouped by student email address
   - Calculated average scores per subject
   - Computed standard deviation (consistency)
   - Calculated improvement rate (post - pre)
   - Derived study pattern categories
   - Created risk labels using quantile thresholds

**Key Features Generated:**
- `overall_avg_score`: Mean of all 4 subject scores
- `abnormal_psych_score`: Average score in Abnormal Psychology
- `developmental_psych_score`: Average score in Developmental Psychology
- `industrial_psych_score`: Average score in Industrial Psychology
- `psychological_assessment_score`: Average score in Psychological Assessment
- `score_consistency`: Coefficient of variation
- `improvement_rate`: Rate of score improvement over time
- `board_exam_risk`: Derived from quantiles (low/medium/high)

**How to verify:**
```python
import pandas as pd
df = pd.read_csv('enhanced_student_features.csv')
print(df.head())
print(df.describe())
```

**Scripts that created it:**
- `enhanced_ml_model.py` - Main feature engineering
- `core_ml_model.py` - Basic feature extraction
- `train_export_leak_free_model.py` - Final processing with risk labels

---

### 1.4 Recommendation Datasets (Model Outputs)

**Source Files:**
- `adaptive_review_recommendations_clean.csv` (564 recommendations)
- `personalized_topic_recommendations.csv` (329 topic-level recommendations)

**How they were created:**
1. **Input**: `enhanced_student_features.csv`
2. **Processing**: 
   - `enhanced_ml_model.py` - `generate_enhanced_recommendations()` function
   - Rule-based logic combined with ML predictions
3. **Output Structure**:
   - One row per student-subject combination
   - Current performance, recommended action, confidence score
   - Topic-level recommendations with specific study strategies

**How to verify:**
```python
import pandas as pd
recs = pd.read_csv('adaptive_review_recommendations_clean.csv')
print(recs.groupby('subject').size())  # Should show ~140 per subject
```

---

## 2. FIGURE GENERATION - DATA LINEAGE

### Figure 4.1: Sample Student Records
**File**: `figures/chapter4/sample_student_records.png`

**Data Source:**
- `enhanced_student_features.csv` - First 3 rows
- Columns used: `abnormal_psych_score`, `developmental_psych_score`, `industrial_psych_score`, `psychological_assessment_score`, `overall_avg_score`, `board_exam_risk`

**Generation Script:**
- `scripts/generate_chapter4_eda.py` - `create_sample_data_visualizations()` function, lines 108-135

**How to reproduce:**
```python
import pandas as pd
import matplotlib.pyplot as plt

df = pd.read_csv('enhanced_student_features.csv')
sample = df.head(3)

# Plot each student's subject scores
# (Code in generate_chapter4_eda.py)
```

**Verification:**
```python
df = pd.read_csv('enhanced_student_features.csv')
print(df[['abnormal_psych_score', 'developmental_psych_score', 
          'industrial_psych_score', 'psychological_assessment_score']].head(3))
```

---

### Figure 4.2: Sample Recommendations
**File**: `figures/chapter4/sample_recommendations.png`

**Data Source:**
- `adaptive_review_recommendations_clean.csv` - First 6 rows
- Columns: `subject`, `current_performance`, `recommended_action`

**Generation Script:**
- `scripts/generate_chapter4_eda.py` - `create_sample_data_visualizations()` function, lines 137-170

**How to verify:**
```python
recs = pd.read_csv('adaptive_review_recommendations_clean.csv')
print(recs.head(6)[['subject', 'current_performance', 'recommended_action']])
```

---

### Figure 4.3: Pre-Post Improvements
**File**: `figures/chapter4/pre_post_improvements.png`

**Data Source:**
- `adaptive_review_recommendations_clean.csv`
- Columns: `student_id`, `subject`, `current_performance`, `score_improvement`
- Logic: Grouped by student+subject, found first and last scores, calculated improvement

**Generation Script:**
- `scripts/generate_chapter4_eda.py` - `create_sample_data_visualizations()` function, lines 172-205

**How to verify:**
```python
recs = pd.read_csv('adaptive_review_recommendations_clean.csv')
improvements = recs.groupby(['student_id', 'subject']).agg({
    'current_performance': ['first', 'last'],
    'score_improvement': 'sum'
})
print(improvements.nlargest(3, ('score_improvement', 'sum')))
```

**Note**: Improvement is calculated from the recommendation dataset, which tracks performance over multiple test attempts.

---

### Figure 4.4: Survey Feature Mapping
**File**: `figures/chapter4/survey_feature_mapping.png`

**Data Source:**
- `survey_features_processed.csv` - First 5 rows
- Columns: `planning_score`, `discipline_score`, `active_learning_score`, `confidence_score`

**Original Source:**
- `Adaptive Review Planning for Psychometrician Licensure Examination Preparation Using Machine Learning.csv`
- Processed by `survey_features.py` which:
  1. Reads raw Likert responses (1-4 scale)
  2. Normalizes to 0-1 range: `(value - 1) / 3`
  3. Creates composite scores (e.g., planning_score = mean of schedule + goals questions)

**Generation Script:**
- `scripts/generate_chapter4_eda.py` - `create_sample_data_visualizations()` function, lines 207-230

**How to verify:**
```python
survey = pd.read_csv('survey_features_processed.csv')
print(survey.head(5)[['planning_score', 'discipline_score', 
                      'active_learning_score', 'confidence_score']])
```

**Trace back to raw:**
```python
raw = pd.read_csv('Adaptive Review Planning for Psychometrician Licensure Examination Preparation Using Machine Learning.csv')
print(raw.head(5)[[' [I create a daily schedule for study and reviewing]',
                   ' [I set specific goals for what I plan to accomplish in each study session]']])
```

---

### Figure 4.5: Performance Distribution by Subject
**File**: `figures/chapter4/performance_distribution_by_subject.png`

**Data Source:**
- `enhanced_student_features.csv`
- Columns: `abnormal_psych_score`, `developmental_psych_score`, `industrial_psych_score`, `psychological_assessment_score`

**Original Source:**
- Excel files in `Pre-Tests/` and `Posttests/`
- Scores calculated by:
  1. Reading individual question responses
  2. Determining correct answers (most common response)
  3. Counting correct answers per student per subject
  4. Averaging across multiple test attempts

**Generation Script:**
- `scripts/generate_chapter4_eda.py` - `create_eda_visualizations()` function, lines 233-260

**How to verify:**
```python
df = pd.read_csv('enhanced_student_features.csv')
print(df[['abnormal_psych_score', 'developmental_psych_score', 
          'industrial_psych_score', 'psychological_assessment_score']].describe())
```

**Trace to original:**
```python
# Example: Check one student's scores in original Excel
import pandas as pd
excel_file = "Pre-Tests/BSP4A/PrT1 _ DEVELOPMENTAL PSYCHOLOGY _ Lecture 1 _ April 5, 2025 (Responses).xlsx"
df = pd.read_excel(excel_file)
print(df[['Email Address', 'Score']].head())
```

---

### Figure 4.6: Study Habit Patterns
**File**: `figures/chapter4/study_habit_patterns.png`

**Data Source:**
- `survey_features_processed.csv`
- Columns: `planning_score`, `discipline_score`, `active_learning_score`, `environment_score`, `collaboration_score`, `feedback_score`
- Calculation: Mean of each score across all 44 survey respondents

**Original Source:**
- `Adaptive Review Planning for Psychometrician Licensure Examination Preparation Using Machine Learning.csv`
- Raw questions like:
  - "I create a daily schedule for study and reviewing" (1-4 Likert)
  - "I avoid putting off assigned readings and homework until the last minute" (1-4 Likert)
  - "I use active techniques such as summarizing, highlighting, or making concept maps" (1-4 Likert)

**Processing Steps:**
1. `survey_features.py` reads raw CSV
2. Maps Likert responses: "1 - Never" → 1, "2 - Sometimes" → 2, etc.
3. Normalizes: `(value - 1) / 3` to get 0-1 range
4. Creates composite scores (e.g., planning_score = mean of schedule + goals questions)

**Generation Script:**
- `scripts/generate_chapter4_eda.py` - `create_eda_visualizations()` function, lines 262-290

**How to verify:**
```python
survey = pd.read_csv('survey_features_processed.csv')
habit_cols = ['planning_score', 'discipline_score', 'active_learning_score', 
              'environment_score', 'collaboration_score', 'feedback_score']
print(survey[habit_cols].mean())
```

---

### Figure 4.7: Overall Score Distribution
**File**: `figures/chapter4/overall_score_distribution.png`

**Data Source:**
- `enhanced_student_features.csv`
- Column: `overall_avg_score`
- Calculation: Mean of all 4 subject scores for each student

**Original Source:**
- Excel files → Individual subject scores → Averaged

**Generation Script:**
- `scripts/generate_chapter4_eda.py` - `create_eda_visualizations()` function, lines 292-315

**How to verify:**
```python
df = pd.read_csv('enhanced_student_features.csv')
print(df['overall_avg_score'].describe())
print(f"Mean: {df['overall_avg_score'].mean():.2f}")
print(f"Median: {df['overall_avg_score'].median():.2f}")
print(f"Std: {df['overall_avg_score'].std():.2f}")
```

---

### Figure 4.8: Improvement Patterns
**File**: `figures/chapter4/improvement_patterns.png`

**Data Source:**
- `adaptive_review_recommendations_clean.csv`
- Column: `score_improvement`
- Calculation: Tracks improvement across multiple test attempts per student-subject

**Original Source:**
- Pre-test and Post-test Excel files
- Improvement = (Post-test score) - (Pre-test score) for same student, subject, lecture

**Generation Script:**
- `scripts/generate_chapter4_eda.py` - `create_eda_visualizations()` function, lines 317-350

**How to verify:**
```python
recs = pd.read_csv('adaptive_review_recommendations_clean.csv')
print(recs['score_improvement'].describe())
print(recs.groupby('subject')['score_improvement'].mean())
```

**Trace to original:**
- Improvement calculated in `bsp4a_leak_free_model.py` - `pair_pre_post_tests()` function
- Matches students by email, subject, and lecture number

---

### Figure 4.9: Risk-Performance Correlation
**File**: `figures/chapter4/risk_performance_correlation.png`

**Data Source:**
- `enhanced_student_features.csv`
- Columns: `board_exam_risk`, `overall_avg_score`

**Risk Label Derivation:**
- Created in `train_export_leak_free_model.py`
- Uses quantile thresholds:
  - Low Risk: Top 33% (scores >= 66th percentile)
  - Medium Risk: Middle 33% (33rd to 66th percentile)
  - High Risk: Bottom 33% (scores < 33rd percentile)

**Generation Script:**
- `scripts/generate_chapter4_eda.py` - `create_eda_visualizations()` function, lines 352-380

**How to verify:**
```python
df = pd.read_csv('enhanced_student_features.csv')
print(df.groupby('board_exam_risk')['overall_avg_score'].describe())

# Verify quantile thresholds
q33 = df['overall_avg_score'].quantile(0.33)
q66 = df['overall_avg_score'].quantile(0.66)
print(f"33rd percentile: {q33:.2f}")
print(f"66th percentile: {q66:.2f}")
```

---

## 3. TABLE GENERATION - DATA LINEAGE

### Table 4.1: Class Distribution (Risk Levels)

**Data Source:**
- `enhanced_student_features.csv`
- Column: `board_exam_risk`
- Count: `value_counts()`

**How to verify:**
```python
df = pd.read_csv('enhanced_student_features.csv')
print(df['board_exam_risk'].value_counts())
print(df['board_exam_risk'].value_counts(normalize=True) * 100)
```

**Note**: Risk labels are derived using quantiles, not ground-truth outcomes. This is explicitly stated in the chapter.

---

### Table 4.2: Dataset Description

**Data Sources:**
- Row counts from actual CSV files
- Feature counts from DataFrame `.shape[1]`
- Train/test split from `train_export_leak_free_model.py` (80/20 split)

**How to verify:**
```python
import pandas as pd
import os

files = {
    'Student Features': 'enhanced_student_features.csv',
    'Survey': 'survey_features_processed.csv',
    'Recommendations': 'adaptive_review_recommendations_clean.csv',
    'Topic Recommendations': 'personalized_topic_recommendations.csv'
}

for name, file in files.items():
    df = pd.read_csv(file)
    print(f"{name}: {len(df)} rows, {len(df.columns)} columns")
```

---

## 4. STATISTICAL CALCULATIONS

### All Mean/Median/Std Values

**Source**: Direct calculations from DataFrames using pandas `.mean()`, `.median()`, `.std()`

**Example Verification:**
```python
df = pd.read_csv('enhanced_student_features.csv')
print("Abnormal Psychology:")
print(f"  Mean: {df['abnormal_psych_score'].mean():.2f}")
print(f"  Median: {df['abnormal_psych_score'].median():.2f}")
print(f"  Std: {df['abnormal_psych_score'].std():.2f}")
```

---

## 5. REPRODUCIBILITY CHECKLIST

To reproduce all figures and tables:

1. **Ensure all data files exist:**
   ```bash
   ls enhanced_student_features.csv
   ls survey_features_processed.csv
   ls adaptive_review_recommendations_clean.csv
   ls personalized_topic_recommendations.csv
   ```

2. **Run the figure generation script:**
   ```bash
   python scripts/generate_chapter4_eda.py
   ```

3. **Verify outputs:**
   ```bash
   ls figures/chapter4/*.png
   ls figures/chapter4/*.csv
   ```

4. **Check data integrity:**
   ```python
   # Run this verification script
   import pandas as pd
   
   # Check student features
   df = pd.read_csv('enhanced_student_features.csv')
   assert len(df) == 154, f"Expected 154 students, got {len(df)}"
   
   # Check survey
   survey = pd.read_csv('survey_features_processed.csv')
   assert len(survey) >= 44, f"Expected at least 44 survey responses"
   
   # Check recommendations
   recs = pd.read_csv('adaptive_review_recommendations_clean.csv')
   assert len(recs) >= 564, f"Expected at least 564 recommendations"
   ```

---

## 6. DATA AUTHENTICITY STATEMENT

**All data is genuine and traceable:**

1. **Student Performance Data**: Collected from actual pre-test and post-test Excel files submitted by BSP4A and BSP4B students at EARIST
2. **Survey Data**: Collected from actual survey responses from 4th-year psychology students
3. **All derived features**: Calculated using standard statistical methods (mean, std, quantiles)
4. **All visualizations**: Generated directly from the data files listed above
5. **No synthetic data**: All 154 student records and 44 survey responses are real

**How to prove authenticity:**
- Original Excel files are in `Pre-Tests/` and `Posttests/` directories
- Original survey CSV is in the repository root
- All processing scripts are in the repository and can be re-run
- All intermediate CSV files (enhanced_student_features.csv, etc.) can be regenerated from originals

---

## 7. HOW TO EXPLAIN IN YOUR THESIS/DEFENSE

**For each figure, you can say:**

1. **"This figure was generated from [specific CSV file], which contains [X] records of [what]."**
2. **"The data was originally collected from [Excel files/survey] and processed using [script name]."**
3. **"The visualization shows [statistic] calculated using [method], which can be verified by [code snippet]."**

**Example explanation for Figure 4.5:**
> "Figure 4.5 shows the performance distribution across four psychology subjects. The data comes from the `enhanced_student_features.csv` file, which contains 154 student records. Each student's subject scores were calculated by averaging their performance across multiple pre-test and post-test attempts, as recorded in the original Excel files in the `Pre-Tests/` and `Posttests/` directories. The distributions were generated using Python's matplotlib library, and the mean, median, and standard deviation values shown are direct calculations from the dataset using pandas statistical functions."

---

## 8. QUICK REFERENCE: FIGURE → DATA SOURCE

| Figure | Data File | Key Columns | Script Function |
|--------|-----------|-------------|-----------------|
| 4.1 Sample Students | `enhanced_student_features.csv` | subject scores, risk | `create_sample_data_visualizations()` |
| 4.2 Recommendations | `adaptive_review_recommendations_clean.csv` | subject, performance, action | `create_sample_data_visualizations()` |
| 4.3 Improvements | `adaptive_review_recommendations_clean.csv` | score_improvement | `create_sample_data_visualizations()` |
| 4.4 Survey Mapping | `survey_features_processed.csv` | habit scores | `create_sample_data_visualizations()` |
| 4.5 Subject Distributions | `enhanced_student_features.csv` | 4 subject score columns | `create_eda_visualizations()` |
| 4.6 Study Habits | `survey_features_processed.csv` | 6 habit score columns | `create_eda_visualizations()` |
| 4.7 Overall Distribution | `enhanced_student_features.csv` | overall_avg_score | `create_eda_visualizations()` |
| 4.8 Improvements | `adaptive_review_recommendations_clean.csv` | score_improvement | `create_eda_visualizations()` |
| 4.9 Risk Correlation | `enhanced_student_features.csv` | risk, overall_avg_score | `create_eda_visualizations()` |

---

## 9. VALIDATION COMMANDS

Run these to verify data integrity:

```python
# Verify student count
import pandas as pd
df = pd.read_csv('enhanced_student_features.csv')
assert len(df) == 154

# Verify subject score ranges (should be 0-30)
assert df['abnormal_psych_score'].min() >= 0
assert df['abnormal_psych_score'].max() <= 30

# Verify risk labels
assert set(df['board_exam_risk'].unique()) == {'low_risk', 'medium_risk', 'high_risk'}

# Verify survey count
survey = pd.read_csv('survey_features_processed.csv')
assert len(survey) >= 44

# Verify recommendation count
recs = pd.read_csv('adaptive_review_recommendations_clean.csv')
assert len(recs) >= 564
```

---

This document provides complete traceability from original data sources to final figures. Every number and visualization can be verified and reproduced.










