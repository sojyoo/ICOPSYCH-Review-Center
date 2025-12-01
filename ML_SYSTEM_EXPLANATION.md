# Comprehensive ML System Explanation
## ICOPSYCH Review Center - Machine Learning Pipeline

---

## 📊 1. DATA COLLECTION

### 1.1 Data Sources
The system collects data from multiple sources:

**Primary Data Sources:**
- **Pre-Tests** (`Pre-Tests/BSP4A/` and `Pre-Tests/BSP4B/`)
  - Excel files containing student responses to pre-lecture assessments
  - Format: `.xlsx` files with columns for student info, questions, and scores
  - Contains: Email addresses, student names, scores, individual question responses

- **Post-Tests** (`Posttests/BSP 4A/` and `Posttests/BSP 4B/`)
  - Excel files containing student responses after lectures
  - Same structure as pre-tests
  - Used to measure learning improvement

- **Pre-Board Exams** (`Pre-Board Exam/`)
  - Comprehensive assessments before board exams
  - Higher stakes, more comprehensive coverage

### 1.2 Data Collection Process

**Automated File Loading:**
```python
# From core_ml_model.py and bsp4a_leak_free_model.py
- Uses glob patterns to recursively find all Excel files
- Processes files from multiple directories simultaneously
- Extracts metadata (subject, lecture number) from file paths
- Handles both BSP4A and BSP4B cohorts
```

**Key Data Points Collected:**
1. **Student Identifiers:**
   - Email addresses (primary identifier)
   - Student names (fallback identifier)
   - Student numbers

2. **Performance Metrics:**
   - Test scores (raw and percentage)
   - Individual question responses
   - Subject-specific scores
   - Test timestamps

3. **Test Metadata:**
   - Test type (pre-test, post-test, pre-board)
   - Subject (Abnormal Psychology, Developmental Psychology, Industrial Psychology, Psychological Assessment)
   - Lecture number (1, 2, 3, etc.)
   - Week number

### 1.3 Data Volume
- **Multiple Excel files** across different subjects and lectures
- **Hundreds of student records** per test
- **Thousands of question responses** total
- **Longitudinal data** tracking student progress over time

---

## 🧹 2. DATA CLEANING & PREPROCESSING

### 2.1 Data Loading & Validation

**File Processing:**
```python
# From core_ml_model.py - load_and_process_data()
1. Recursively searches for Excel files using glob patterns
2. Attempts to read each file with error handling
3. Adds metadata columns (source, subject, file_path)
4. Concatenates all dataframes into a single dataset
```

**Subject Extraction:**
- Extracts subject from file path using keyword matching:
  - "ABNORMAL" → Abnormal Psychology
  - "DEVELOPMENTAL" → Developmental Psychology
  - "INDUSTRIAL" → Industrial Psychology
  - "PSYCHOLOGICAL ASSESSMENT" → Psychological Assessment

**Lecture Number Extraction:**
- Extracts lecture number from filename patterns:
  - "Lecture 1", "PrT1", "PoT1" → Lecture 1
  - "Lecture 2", "PrT2", "PoT2" → Lecture 2
  - etc.

### 2.2 Feature Extraction

**Question-Level Features:**
```python
# From bsp4a_leak_free_model.py - create_question_features()
1. Identifies question columns (non-metadata columns)
2. Determines correct answers (most common response)
3. Creates binary correctness features (0/1) for each question
4. Generates features like: q_001_correct, q_002_correct, etc.
```

**Subtopic Performance Features:**
```python
# From bsp4a_leak_free_model.py - create_subtopic_features()
1. Maps questions to subtopics using keyword matching
2. Calculates performance per subtopic area
3. Creates features like:
   - abnormal_psychology_disorders_performance
   - developmental_psychology_theories_performance
   - industrial_psychology_organization_performance
   - psychological_assessment_psychometrics_performance
```

**Student-Level Features:**
```python
# From core_ml_model.py - extract_features()
For each student-subject combination:
- avg_score: Average score across all tests
- score_std: Standard deviation (consistency measure)
- score_improvement: Change from first to last test
- test_count: Number of tests taken
```

**Enhanced Features (from enhanced_ml_model.py):**
```python
- overall_avg_score: Overall average across all subjects
- overall_std: Overall consistency
- improvement_rate: Rate of improvement over time
- score_consistency: How consistent scores are
- improvement_consistency: Consistency of improvement
- study_hours_per_week: Estimated study time
- study_consistency: Regularity of study patterns
- Subject-specific scores (abnormal_psych_score, etc.)
- total_tests_taken: Total number of assessments
- avg_tests_per_subject: Average tests per subject
```

### 2.3 Data Cleaning Steps

**1. Missing Value Handling:**
```python
- Removes rows with missing student identifiers
- Fills NaN values with 0 for numeric features
- Handles missing scores by skipping invalid records
```

**2. Data Type Conversion:**
```python
- Converts scores to numeric (handles text errors)
- Standardizes date formats
- Normalizes text fields (uppercase, trimming)
```

**3. Data Validation:**
```python
- Validates email format
- Checks score ranges (0-30 for tests)
- Verifies subject names match expected values
- Ensures lecture numbers are valid (1-3)
```

**4. Pairing Pre/Post Tests:**
```python
# From bsp4a_leak_free_model.py - pair_pre_post_tests()
- Matches pre-tests and post-tests by:
  * Email address
  * Subject
  * Lecture number
- Calculates improvement metrics:
  * improvement = post_score - pre_score
  * improvement_percentage = (improvement / 30) * 100
  * post_passed = post_score >= 22.5 (75% threshold)
```

**5. Feature Scaling:**
```python
# StandardScaler normalization
- Scales features to mean=0, std=1
- Required for algorithms like Logistic Regression, SVM, KNN
- Applied after feature extraction
```

### 2.4 Data Quality Assurance

**Leak Prevention:**
- **"Leak-free" model** ensures no data leakage:
  - Only uses pre-test data to predict post-test performance
  - Never uses post-test information in training
  - Separates training and validation data properly

**Cross-Validation:**
- Uses K-Fold cross-validation (10 folds)
- Ensures model generalizes to unseen data
- Prevents overfitting

---

## 🔄 3. HOW THE API WORKS

### 3.1 API Architecture

**Technology Stack:**
- **Flask** (Python web framework)
- **Flask-CORS** (Cross-Origin Resource Sharing)
- **Joblib** (Model serialization)
- **Pandas/NumPy** (Data processing)

**API Endpoints:**

#### 1. Health Check (`/health`)
```python
GET /health
Returns:
{
  "status": "healthy",
  "model_loaded": true/false,
  "recommendations_loaded": true/false
}
```

#### 2. Recommendations (`/recommendations`)
```python
POST /recommendations
Request Body:
{
  "subjectScores": {
    "Abnormal Psychology": { "percentage": 65 },
    "Developmental Psychology": { "percentage": 72 },
    "Industrial Psychology": { "percentage": 58 },
    "Psychological Assessment": { "percentage": 80 }
  },
  "testType": "pre-test" or "post-test"
}

Response:
{
  "totalStudyHours": 18,
  "studyPlan": [...],
  "recommendations": [...],
  "todayFocus": [...],
  "weakSubjects": [...],
  "strengths": [...],
  "nextSteps": [...]
}
```

#### 3. Performance Prediction (`/predict`)
```python
POST /predict
Request Body: (same as /recommendations)

Response:
{
  "prediction": 0 or 1,  // 0 = needs improvement, 1 = likely to pass
  "confidence": 0.85,    // Model confidence (0-1)
  "interpretation": "Likely to pass" or "Needs improvement"
}
```

### 3.2 API Workflow

**Step 1: Model Loading (Startup)**
```python
# From ml_recommendations_api.py - load_models()
1. Loads trained Random Forest model (bsp4a_leak_free_model.pkl)
2. Loads recommendation data (adaptive_review_recommendations_clean.csv)
3. Loads topic recommendations (personalized_topic_recommendations.csv)
4. Verifies all files loaded successfully
```

**Step 2: Request Processing**
```python
# From ml_recommendations_api.py - generate_recommendations()
1. Receives subject scores from Next.js frontend
2. Prepares feature vector:
   - 4 subject scores (Abnormal, Developmental, Industrial, Assessment)
   - 1 test type indicator (0=pre-test, 1=post-test)
   - Total: 5 features

3. Makes prediction using Random Forest model
4. Generates personalized recommendations based on:
   - Model prediction
   - Subject performance thresholds
   - Topic-level recommendations
```

**Step 3: Recommendation Generation**

**Study Plan Generation:**
```python
For each subject:
- Score < 70%: 8 hours/week (high priority)
- Score 70-85%: 4 hours/week (medium priority)
- Score > 85%: 2 hours/week (low priority)
```

**Topic Recommendations:**
```python
1. Identifies weak subjects (< 70%)
2. Retrieves top 3 topics from personalized_topic_recommendations.csv
3. Generates specific action items for each topic
```

**Today's Focus:**
```python
- Selects weakest subject
- Recommends top 2 topics for immediate focus
- Provides actionable study items
```

### 3.3 Integration with Next.js

**Frontend API Route:**
```typescript
// web-app/src/app/api/recommendations/route.ts
1. Gets user's test attempts from database
2. Calculates subject scores (percentage correct)
3. Calls ML API (POST to ML_API_URL/recommendations)
4. Maps ML response to frontend format
5. Returns recommendations to dashboard
```

**Fallback System:**
```typescript
If ML API fails:
- Falls back to rule-based recommendations
- Analyzes subject performance locally
- Generates recommendations based on thresholds
- Ensures system always provides recommendations
```

### 3.4 Error Handling

**Graceful Degradation:**
```python
- If model fails to load: Uses fallback recommendations
- If prediction fails: Uses average score threshold
- If data missing: Returns default recommendations
- Always provides some form of recommendation
```

---

## 🤖 4. MACHINE LEARNING TECHNIQUES

### 4.1 Primary Model: Random Forest Classifier

**Algorithm:**
- **Type:** Ensemble Learning (Bagging)
- **Base Learners:** Decision Trees
- **Number of Trees:** 100-150 estimators
- **Random State:** 42 (for reproducibility)

**Why Random Forest?**
1. **Handles Non-Linear Relationships:** Can capture complex patterns in student performance
2. **Feature Importance:** Provides interpretable feature importance scores
3. **Robust to Overfitting:** Multiple trees reduce overfitting risk
4. **Handles Missing Values:** Can work with incomplete data
5. **No Feature Scaling Required:** Works with raw features (though scaling can help)

**Model Training:**
```python
# From train_export_leak_free_model.py
RandomForestClassifier(
    n_estimators=150,
    random_state=42
)
```

**Performance:**
- **Target Accuracy:** ≥ 85% (achieved in most subject-lecture combinations)
- **Cross-Validation:** 10-fold CV for robust evaluation
- **Evaluation Metric:** Classification accuracy

### 4.2 Alternative Models (Compared)

**1. Logistic Regression**
```python
LogisticRegression(random_state=42, max_iter=1000)
- Linear classifier
- Requires feature scaling
- Good baseline model
- Interpretable coefficients
```

**2. Support Vector Machine (SVM)**
```python
SVC(random_state=42, kernel='rbf')
- Non-linear classification with RBF kernel
- Requires feature scaling
- Good for complex decision boundaries
- Can be slow on large datasets
```

**3. K-Nearest Neighbors (KNN)**
```python
KNeighborsClassifier(n_neighbors=5)
- Instance-based learning
- Requires feature scaling
- Simple but effective
- Sensitive to irrelevant features
```

**4. Naive Bayes**
```python
GaussianNB()
- Probabilistic classifier
- Fast training and prediction
- Assumes feature independence
- Good baseline for comparison
```

**5. Gradient Boosting Regressor** (for topic performance prediction)
```python
# From enhanced_ml_model.py
GradientBoostingRegressor(n_estimators=100, random_state=42)
- Used for predicting topic-level scores (regression)
- Sequential ensemble (boosting)
- Good for continuous target variables
- Evaluated with R² and RMSE metrics
```

### 4.3 Model Comparison Results

**From bsp4a_leak_free_model.py - compare_classification_techniques():**
- All 5 models compared using cross-validation
- Random Forest typically performs best
- Results vary by subject-lecture combination
- Target: ≥85% accuracy

### 4.4 Feature Engineering Techniques

**1. Question Correctness Features:**
- Binary encoding (0/1) for each question
- Captures individual question performance
- Creates high-dimensional feature space

**2. Subtopic Performance Features:**
- Aggregates question-level features by subtopic
- Reduces dimensionality
- Captures domain-specific knowledge

**3. Statistical Features:**
- Mean, standard deviation, improvement rate
- Captures performance trends
- Provides summary statistics

**4. Categorical Encoding:**
```python
LabelEncoder() for:
- study_pattern
- preferred_study_time
- learning_style
- board_exam_risk
```

**5. Feature Scaling:**
```python
StandardScaler() for:
- Normalizing features to mean=0, std=1
- Required for distance-based algorithms
- Helps with gradient-based optimization
```

### 4.5 Model Evaluation Techniques

**1. Cross-Validation:**
```python
# 10-Fold Cross-Validation
KFold(n_splits=10, shuffle=True, random_state=42)
- Splits data into 10 folds
- Trains on 9 folds, tests on 1
- Repeats 10 times
- Reports mean and std of accuracy
```

**2. Stratified Sampling:**
```python
StratifiedKFold() or train_test_split(stratify=y)
- Ensures balanced class distribution
- Important for imbalanced datasets
- Maintains class proportions
```

**3. Performance Metrics:**
- **Classification Accuracy:** Primary metric
- **R² Score:** For regression tasks (topic prediction)
- **RMSE:** Root Mean Squared Error (for regression)
- **Classification Report:** Precision, recall, F1-score

### 4.6 Model Persistence

**Model Saving:**
```python
# From train_export_leak_free_model.py
joblib.dump({
    "model": clf,
    "scaler": scaler,
    "label_encoder": le,
    "feature_cols": feature_cols
}, "bsp4a_leak_free_model.pkl")
```

**Model Loading:**
```python
# From ml_recommendations_api.py
model = joblib.load('bsp4a_leak_free_model.pkl')
```

### 4.7 Model Interpretability

**Feature Importance:**
```python
# From enhanced_ml_model.py
feature_importance = model.feature_importances_
- Shows which features most influence predictions
- Helps understand model decisions
- Can guide feature engineering
```

**Top Important Features (typically):**
1. Overall average score
2. Subject-specific scores
3. Score consistency
4. Improvement rate
5. Study hours per week

---

## 📈 5. DATA FLOW SUMMARY

```
1. DATA COLLECTION
   Excel Files → Pandas DataFrames → Combined Dataset

2. DATA CLEANING
   Raw Data → Missing Value Handling → Feature Extraction → Validation

3. FEATURE ENGINEERING
   Question Features → Subtopic Features → Student Features → Scaling

4. MODEL TRAINING
   Training Data → Cross-Validation → Model Selection → Model Export

5. API DEPLOYMENT
   Trained Model → Flask API → Real-time Predictions → Recommendations

6. FRONTEND INTEGRATION
   User Test Scores → Next.js API → ML API Call → Personalized Recommendations
```

---

## 🎯 6. KEY ACHIEVEMENTS

1. **Leak-Free Model:** Ensures no data leakage in predictions
2. **High Accuracy:** Achieves ≥85% accuracy in most cases
3. **Real-Time Recommendations:** Provides instant personalized study plans
4. **Robust Error Handling:** Graceful fallback when ML API unavailable
5. **Comprehensive Coverage:** Handles all 4 psychology subjects
6. **Scalable Architecture:** Can handle growing student data
7. **Interpretable Results:** Feature importance helps understand predictions

---

## 📚 7. FILES REFERENCED

**Core ML Files:**
- `ml_recommendations_api.py` - Flask API server
- `bsp4a_leak_free_model.py` - Main model training script
- `train_export_leak_free_model.py` - Model export script
- `enhanced_ml_model.py` - Advanced ML features
- `core_ml_model.py` - Basic ML pipeline

**Data Files:**
- `bsp4a_leak_free_model.pkl` - Trained model (serialized)
- `adaptive_review_recommendations_clean.csv` - Recommendation data
- `personalized_topic_recommendations.csv` - Topic-level recommendations
- `enhanced_student_features.csv` - Enhanced student features

**Frontend Integration:**
- `web-app/src/app/api/recommendations/route.ts` - Next.js API route

---

## 🔧 8. TECHNICAL SPECIFICATIONS

**Python Libraries:**
- pandas ≥ 1.5.0
- numpy ≥ 1.21.0
- scikit-learn ≥ 1.1.0
- flask ≥ 2.3.0
- flask-cors ≥ 4.0.0
- joblib ≥ 1.3.0

**Model Parameters:**
- Random Forest: 100-150 estimators
- Cross-Validation: 10 folds
- Train/Test Split: 80/20
- Random State: 42 (reproducibility)

**API Configuration:**
- Port: 5000 (development)
- Host: 0.0.0.0 (production)
- CORS: Enabled for frontend access

---

This comprehensive ML system provides personalized, data-driven recommendations to help students improve their performance in the ICOPSYCH Review Center.


