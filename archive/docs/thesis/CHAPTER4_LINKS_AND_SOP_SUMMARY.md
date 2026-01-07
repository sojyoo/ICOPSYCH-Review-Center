# Chapter 4: Links and SOP Summary

## 📁 Chapter 4 Section Files

### Main Master Document
- **`CHAPTER4_COMPLETE.md`** - Master document with table of contents and links to all sections

### Individual Sections

1. **Section 1: Presentation of Data and Exploratory Data Analysis**
   - File: `CHAPTER4_SECTION1_DRAFT.md`
   - Content: Dataset overview, class distributions, sample data examples, EDA visualizations
   - Key Figures: Student records, recommendations, score distributions, improvement patterns

2. **Section 2: Model Comparison and Performance Evaluation**
   - File: `CHAPTER4_MODEL_COMPARISON_DRAFT.md`
   - Content: Individual model performance, overall comparison, SOP answers
   - Key Figures: Classification reports, confusion matrices, ROC curves, performance comparisons

3. **Section 3: System Implementation and Deployment**
   - File: `CHAPTER4_SECTION3_SYSTEM_IMPLEMENTATION.md`
   - Content: System architecture, ML service, web app integration, deployment, testing
   - Key Figures: System architecture diagram, model validation results

4. **Section 4: Discussion of Results**
   - File: `CHAPTER4_SECTION4_DISCUSSION.md`
   - Content: Model performance discussion, feature importance, limitations, future work

5. **Section 5: Summary and Conclusions**
   - File: `CHAPTER4_SECTION5_SUMMARY.md`
   - Content: Chapter summary, final SOP answers, conclusions, recommendations

---

## 📊 Statement of the Problem (SOP) - Summarized Answers

### **Research Question 1: Features for Adaptive Review Plan**

**What features should be included in terms of:**
- **a. Study habits**: Study hours per week; survey-based habits (planning, discipline, active learning) used for cold-start personalization
- **b. Academic attendance and performance**: Subject-specific scores (4 psychology subjects), overall average score, score consistency, improvement rate, total tests taken, average tests per subject
- **c. Class Schedule**: Not explicitly included (data unavailable), but test_type feature captures temporal aspects
- **d. Enrolled units and subjects**: All 4 core psychology subjects explicitly included; avg_tests_per_subject captures effort distribution

**Feature Importance Ranking:**
1. Subject-specific scores (Abnormal, Developmental, Industrial, Assessment)
2. Overall average score
3. Score consistency and improvement rate
4. Test-taking patterns (total_tests_taken, avg_tests_per_subject)
5. Study hours per week

**Answer**: Academic performance metrics (subject scores, overall performance, consistency, improvement) are most effective, followed by test-taking patterns and study time investment.

---

### **Research Question 2: Machine Learning Techniques**

**Which techniques are most appropriate:**
- **a. Reinforcement Learning**: 54.84% accuracy (lowest) - faces fundamental challenges with static classification due to feature discretization
- **b. Deep Learning**: 90.32% accuracy (strong) - properly regularized neural networks achieve good results (ROC AUC: 0.8081)
- **c. Bayesian Optimization**: 96.77% accuracy (top-tier) - regularized Logistic Regression with excellent generalization (ROC AUC: 0.9381)
- **d. Curriculum Learning**: 96.77% accuracy (top-tier) - enhanced progressive training strategy highly effective
- **e. Multi-Armed Bandits**: 77.42% accuracy (moderate) - shows potential for online learning scenarios

**Answer**: **Bayesian Optimization and Curriculum Learning** are the most appropriate techniques, both achieving 96.77% accuracy with superior performance across all metrics.

---

### **Research Question 3: Evaluation Metrics**

**Which metrics should be used:**
- **a. Accuracy**: Overall proportion of correct predictions - Top models: 96.77%
- **b. Precision**: Reliability of predictions - Top models: 97.04-97.07%
- **c. Recall**: Completeness of identification - Top models: 96.77% (Random Forest: 100% for high-risk)
- **d. F1-Score**: Balanced metric (harmonic mean) - Top models: 96.77%

**Answer**: **All four metrics (Accuracy, Precision, Recall, F1-Score) should be used collectively**, as each provides unique insights. Additionally, per-class metrics are essential to ensure balanced performance across all risk categories.

---

### **Research Question 4: Best Machine Learning Model**

**What is the best model for Psychometrician Licensure Exam review?**

**Answer**: **Bayesian Optimization and Curriculum Learning** are the best-performing models, both achieving:
- **Accuracy**: 96.77%
- **Precision**: 97.04-97.07%
- **Recall**: 96.77%
- **F1-Score**: 96.77%
- **AUC**: 0.9381 (Bayesian Optimization)

**Why they are optimal:**
1. Superior classification performance across all risk categories
2. Balanced precision and recall (no bias)
3. Excellent generalization capability (realistic metrics, no overfitting)
4. Practical utility (interpretability, computational efficiency, real-time capability)

**Performance Comparison:**
| Model | Accuracy | Precision | Recall | F1-Score | AUC |
|-------|----------|-----------|--------|----------|-----|
| **Bayesian Optimization** | **96.77%** | **97.04%** | **96.77%** | **96.77%** | **0.9381** |
| **Curriculum Learning** | **96.77%** | **97.07%** | **96.77%** | **96.77%** | - |
| Deep Learning | 90.32% | 92.40% | 90.32% | 90.05% | 0.8081 |
| Random Forest | 80.65% | 85.70% | 80.65% | 80.41% | 0.9456 |
| Multi-Armed Bandits | 77.42% | 78.76% | 77.42% | 77.58% | - |
| Reinforcement Learning | 54.84% | 56.92% | 54.84% | 55.56% | - |

---

## 🎯 Quick Summary

### Top Findings:
1. **Best Models**: Bayesian Optimization (96.77%) and Curriculum Learning (96.77%)
2. **Most Important Features**: Academic performance metrics (subject scores, overall performance, consistency)
3. **Essential Metrics**: All four (Accuracy, Precision, Recall, F1-Score) + per-class metrics
4. **Key Achievement**: Realistic performance metrics with proper regularization (no overfitting)

### Model Performance Tiers:
- **Tier 1** (96.77%): Bayesian Optimization, Curriculum Learning
- **Tier 2** (90.32%): Deep Learning
- **Tier 3** (80.65%): Random Forest
- **Tier 4** (77.42%): Multi-Armed Bandits
- **Tier 5** (54.84%): Reinforcement Learning

---

## 📂 File Locations

All Chapter 4 files are in the root directory:
```
C:\Users\User\Desktop\MACALALAY-upd\
├── CHAPTER4_COMPLETE.md
├── CHAPTER4_SECTION1_DRAFT.md
├── CHAPTER4_MODEL_COMPARISON_DRAFT.md
├── CHAPTER4_SECTION3_SYSTEM_IMPLEMENTATION.md
├── CHAPTER4_SECTION4_DISCUSSION.md
└── CHAPTER4_SECTION5_SUMMARY.md
```

Supporting figures are in:
```
C:\Users\User\Desktop\MACALALAY-upd\figures\chapter4\
├── model_comparison\ (all model performance figures)
└── [other EDA figures]
```







