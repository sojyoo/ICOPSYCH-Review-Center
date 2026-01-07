# Chapter 4: Results and Discussion (Draft)

## 4.1 Overview
This chapter reports the outcomes of training and integrating the leak-free recommendation model and the survey-based personalization model into the ICOPSYCH adaptive review system. The Python ML service is now invoked by the web app (with a rule-based fallback), demonstrating end-to-end use of the trained model.

## 4.2 Experimental Setup
- **Data sources**: Pre/Post/Pre-Board Excel files (BSP4A/BSP4B), topic-level files, and the survey `Adaptive Review Planning for Psychometrician Licensure Examination Preparation Using Machine Learning.csv`.
- **Models**:
  - Leak-free model (`bsp4a_leak_free_model.pkl`): Random Forest classifier trained via `train_export_leak_free_model.py` on `enhanced_student_features.csv`, with quantile-derived multi-class labels (low/medium/high risk) and a feature set aligned to inference (subject scores + a few globals + test_type).
  - Survey personalization model (`survey_personalization.pkl`): Random Forest classifier trained via `train_survey_personalization.py` on `survey_features_processed.csv`.
- **Serving**: Flask API `ml_recommendations_api.py` on port 5000; Next.js `/api/recommendations` calls the ML API first, falling back to TypeScript rules if the ML service is unreachable.
- **Environment**: Local machine, Python 3.x, scikit-learn; Next.js 14; Prisma DB. Env vars: `ML_API_URL` (default `http://localhost:5000/recommendations`), `ML_API_TIMEOUT_MS` (default 4000 ms).

## 4.3 Performance Metrics and Results (with critical caveats)
- **Leak-free model (now feature-aligned, multi-class labels via quantiles)**
  - Label distribution (quantile buckets on `overall_avg_score`): ~low_risk 53, medium_risk 50, high_risk 51.
  - Training/Test split: Train accuracy 1.000, Test accuracy 0.968.
  - 5-fold CV (accuracy): mean 0.980, std 0.027.
  - Inference alignment: the API now loads `model/scaler/label_encoder/feature_cols` from the pickle and constructs the exact feature vector from subject percentages + test_type (others default to 0), matching training.
- **Survey personalization model (exploratory)**
  - Accuracy: 1.000 on held-out split, but sample is small; target is self-reported confidence. Treat as heuristic for cold-start personalization, not a high-stakes predictor.

## 4.4 Visualizations and Sample Outputs
Use (now valid after retrain/alignment):
- `feature_importance_leak_free.png` — top RF importances on the aligned multi-class model.
- `confusion_matrix_leak_free.png` — normalized confusion matrix on quantile-based labels.
- `cv_accuracy_leak_free.png` — 5-fold CV accuracy boxplot (mean 0.980, std 0.027).
- `feature_importance_survey.png` — exploratory importances for survey model.
- `confidence_distribution_survey.png` — survey confidence distribution.

Sample API/UX:
- `/recommendations` response from the ML API (studyPlan, weakSubjects, nextSteps) rendered in the dashboard; API uses the aligned feature vector and scaler from the artifact.

## 4.5 Comparison With Existing Models (current state)
- **Baseline**: TypeScript rule-based recommender (deterministic).
- **ML-enhanced**: Feature-aligned, multi-class labels; shows strong internal metrics (Test acc 0.968; CV mean 0.980). Still needs external validation and a baseline vs. ML comparison (precision/recall/F1, and ideally user-level impact).

## 4.6 Discussion and Interpretation (updated)
- Leak-free model: Now internally consistent (aligned features, multi-class labels) with promising metrics (Test acc 0.968, CV mean 0.980). However, labels are derived from quantiles (proxy risk, not ground-truth outcomes), and the dataset is modest; treat results as provisional.
- Survey model: Still heuristic; small sample; target is subjective confidence.
- Integration: ML path is aligned; fallback remains. Need external validation, temporal holdouts, and user-level impact measurement.
- Limitations: derived labels (not true outcomes), limited sample size, no temporal validation, no A/B user impact yet.

## 4.7 Summary (state of the union)
- The leak-free model is now trained on multi-class labels (quantile buckets) with aligned features; metrics are meaningful but provisional (Test acc 0.968; CV mean 0.980).
- Updated figures (`feature_importance_leak_free.png`, `confusion_matrix_leak_free.png`, `cv_accuracy_leak_free.png`, plus survey charts) reflect the corrected setup.
- Next actions: obtain true outcome labels, increase sample size, add temporal holdouts, and run a baseline vs. ML comparison (precision/recall/F1 and user impact).

## 4.8 Alignment to the Statement of the Problem
1) Required features for the adaptive review plan  
   - Study habits: captured via survey (planning, discipline, active learning, environment, collaboration, feedback, confidence).  
   - Academic attendance/performance: reflected indirectly through test attempt history and subject scores; attendance-specific fields are not yet captured—data gap.  
   - Class schedule: not yet integrated—data gap; the system uses a static week schedule but does not tailor to individual timetables.  
   - Enrolled units/subjects: covered at subject level (four core subjects) via test scores; detailed unit-level enrollment is not yet ingested.

2) ML techniques applied vs. proposed  
   - Implemented: Supervised learning with Random Forest (classification) for risk/label prediction; rule-based logic as fallback; survey-based heuristic model.  
   - Not implemented (future work): Reinforcement Learning, Deep Learning Tracing, Bayesian Optimization, Curriculum Learning, Multi-Armed Bandits. These are out of scope for the current build and should be considered future enhancements.

3) Evaluation metrics (current and needed)  
   - Current: Accuracy (Test 0.968), 5-fold CV accuracy (mean 0.980, std 0.027).  
   - Needed to fully answer: Precision, Recall, F1-Score per class; temporal validation; and user-level impact metrics. These can be computed once labels are true outcomes (not proxy quantiles) and confusion matrices are stable.

4) Best-performing model (current state)  
   - Current top model: Random Forest with quantile-derived multi-class labels (proxy risk) shows the best internal metrics.  
   - Caveat: Labels are proxies, dataset is modest; a definitive “best” model for the Psychometrician Licensure Exam needs true outcome labels, larger sample, and comparative baselines (e.g., logistic regression, gradient boosting, or future RL/deep approaches) evaluated with precision/recall/F1.

