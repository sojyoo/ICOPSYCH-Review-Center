# How to Format Classification Reports in Your Thesis

## Example: Bayesian Optimization Classification Report

Instead of inserting the CSV file directly, convert it to a properly formatted table in your thesis document.

### Current CSV Format (what you have):
```csv
,precision,recall,f1-score,support
high_risk,0.9090909090909091,1.0,0.9523809523809523,10.0
low_risk,0.7333333333333333,1.0,0.8461538461538461,11.0
medium_risk,1.0,0.5,0.6666666666666666,10.0
accuracy,0.8387096774193549,0.8387096774193549,0.8387096774193549,0.8387096774193549
macro avg,0.8808080808080808,0.8333333333333334,0.8217338217338216,31.0
weighted avg,0.8760508308895405,0.8387096774193549,0.8225215644570483,31.0
```

### How It Should Appear in Your Thesis:

**Table 4.X: Classification Report of Bayesian Optimization**

| Risk Level | Precision | Recall | F1-Score | Support |
|------------|-----------|--------|----------|---------|
| High Risk  | 0.91      | 1.00   | 0.95     | 10      |
| Low Risk   | 0.73      | 1.00   | 0.85     | 11      |
| Medium Risk| 1.00      | 0.50   | 0.67     | 10      |
| **Accuracy** | **0.84** | **0.84** | **0.84** | **31** |
| **Macro Average** | **0.88** | **0.83** | **0.82** | **31** |
| **Weighted Average** | **0.88** | **0.84** | **0.82** | **31** |

---

## Formatting Guidelines:

1. **Round decimals appropriately**: 
   - Use 2 decimal places for most metrics (0.91, 0.73, etc.)
   - For accuracy and averages, 2-3 decimal places is standard

2. **Table Structure**:
   - Clear column headers
   - Risk levels in readable format (High Risk, Low Risk, Medium Risk)
   - Bold the summary rows (Accuracy, Macro Average, Weighted Average)

3. **In Your Markdown/Word Document**:
   - Replace `[Insert: figures/chapter4/model_comparison/bayesianoptimization_classification_report.csv]` 
   - With the formatted table above

---

## All Model Classification Reports (Formatted):

### Random Forest

**Table 4.10: Classification Report of Random Forest**

| Risk Level | Precision | Recall | F1-Score | Support |
|------------|-----------|--------|----------|---------|
| High Risk  | 0.90      | 0.90   | 0.90     | 10      |
| Low Risk   | 1.00      | 1.00   | 1.00     | 11      |
| Medium Risk| 0.90      | 0.90   | 0.90     | 10      |
| **Accuracy** | **0.94** | **0.94** | **0.94** | **31** |
| **Macro Average** | **0.93** | **0.93** | **0.93** | **31** |
| **Weighted Average** | **0.94** | **0.94** | **0.94** | **31** |

### Deep Learning

**Table 4.14: Classification Report of Deep Learning**

| Risk Level | Precision | Recall | F1-Score | Support |
|------------|-----------|--------|----------|---------|
| High Risk  | 1.00      | 0.80   | 0.89     | 10      |
| Low Risk   | 0.67      | 0.73   | 0.70     | 11      |
| Medium Risk| 0.55      | 0.60   | 0.57     | 10      |
| **Accuracy** | **0.71** | **0.71** | **0.72** | **31** |
| **Macro Average** | **0.74** | **0.71** | **0.72** | **31** |
| **Weighted Average** | **0.74** | **0.71** | **0.72** | **31** |


### Curriculum Learning

**Table 4.19: Classification Report of Curriculum Learning**

| Risk Level | Precision | Recall | F1-Score | Support |
|------------|-----------|--------|----------|---------|
| High Risk  | 0.90      | 0.90   | 0.90     | 10      |
| Low Risk   | 0.85      | 1.00   | 0.92     | 11      |
| Medium Risk| 0.88      | 0.70   | 0.78     | 10      |
| **Accuracy** | **0.87** | **0.87** | **0.87** | **31** |
| **Macro Average** | **0.87** | **0.87** | **0.86** | **31** |
| **Weighted Average** | **0.87** | **0.87** | **0.87** | **31** |

### Multi-Armed Bandits

**Table 4.23: Classification Report of Multi-Armed Bandits**

| Risk Level | Precision | Recall | F1-Score | Support |
|------------|-----------|--------|----------|---------|
| High Risk  | 0.75      | 0.90   | 0.82     | 10      |
| Low Risk   | 1.00      | 0.91   | 0.95     | 11      |
| Medium Risk| 0.78      | 0.70   | 0.74     | 10      |
| **Accuracy** | **0.84** | **0.84** | **0.84** | **31** |
| **Macro Average** | **0.84** | **0.84** | **0.84** | **31** |
| **Weighted Average** | **0.85** | **0.84** | **0.84** | **31** |

---

## Quick Reference: How to Convert CSV to Table

### Step-by-Step Process:

1. **Open your CSV file** (e.g., `bayesianoptimization_classification_report.csv`)

2. **Extract the data**:
   - Risk levels: high_risk, low_risk, medium_risk
   - Metrics: precision, recall, f1-score, support
   - Summary rows: accuracy, macro avg, weighted avg

3. **Format as table**:
   - Use proper table formatting (Markdown or Word table)
   - Round to 2 decimal places
   - Capitalize risk levels (High Risk, Low Risk, Medium Risk)
   - Bold summary rows

4. **Replace in your thesis**:
   - Find: `[Insert: figures/chapter4/model_comparison/bayesianoptimization_classification_report.csv]`
   - Replace with: The formatted table

### Example Conversion:

**CSV Row:**
```
high_risk,0.9090909090909091,1.0,0.9523809523809523,10.0
```

**Table Row:**
```
| High Risk | 0.91 | 1.00 | 0.95 | 10 |
```

---

## Notes for Your Thesis:

1. **Table Numbering**: Use sequential table numbers (4.10, 4.14, 4.17, etc.) as referenced in your document
2. **Caption Format**: "Classification Report of [Model Name]"
3. **Decimal Places**: Standardize to 2 decimal places for consistency
4. **Bold Summary Rows**: Make Accuracy, Macro Average, and Weighted Average rows bold for emphasis
5. **Support Column**: Shows the number of test samples for each class (total = 31)

---

## Alternative: If You Want to Keep CSV References

If your thesis format requires referencing external files, you can say:

"The detailed classification report is provided in Table 4.X below. The complete numerical data is available in the supplementary materials (bayesianoptimization_classification_report.csv)."

But typically, academic theses include the table directly in the document for better readability.

