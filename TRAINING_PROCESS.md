# Training Process Notes

This file summarizes how models are (re)trained and where outputs land. Use it as a quick reference for documentation and audit.

## Current Models
- **Leak-free recommendations model** (`bsp4a_leak_free_model.pkl`): loaded by `ml_recommendations_api.py` for study plan generation.
- **Survey personalization model** (`survey_personalization.pkl`): optional cold-start helper trained on the new survey.

## Historical Context (from prior run/conversation)
- The Python ML stack (Random Forest on 4A/4B data) lived in `bsp4a_leak_free_model.py` / `train_export_leak_free_model.py` and was exposed via the Flask service `ml_recommendations_api.py` (`/recommendations`, `/predict`).
- The Next.js app originally used a TypeScript rule-based recommender and **did not** call the Python API; the pickle sometimes wasn’t present, so `ml_recommendations_api.py` would fail until regenerated.
- Integration plan that remains valid:
  - Run `python ml_recommendations_api.py` (port 5000).
  - In Next.js `/api/recommendations`, call `http://localhost:5000/recommendations` with `subjectScores` (% per subject) and `testType`; on failure, fall back to TS logic.
  - Keep TS recommendations as backup so the UI never breaks if the ML service is down.

## Data Sources
- Pre/Post/Pre-Board Excel files under `Pre-Tests/`, `Posttests/`, `Pre-Board Exam/`.
- Topic and enhanced features: `enhanced_student_features.csv`, `topic_level_scores.csv`, `personalized_topic_recommendations.csv`.
- New survey: `Adaptive Review Planning for Psychometrician Licensure Examination Preparation Using Machine Learning.csv`.

## Commands (from repo root)
1) Process survey features
```bash
python survey_features.py
```
Outputs:
- `survey_features_processed.csv`
- `survey_feature_aggregates.json`

2) Train survey personalization model
```bash
python train_survey_personalization.py
```
Outputs:
- `survey_personalization.pkl`
- `training_logs/survey_personalization_metrics.json`

3) Train main leak-free model (existing flow)
```bash
python train_export_leak_free_model.py
# or
python bsp4a_leak_free_model.py
```
Outputs:
- `bsp4a_leak_free_model.pkl`
- supporting CSVs (if applicable)

## What to capture for documentation
- Command used and timestamp
- Input dataset versions (file hashes/sizes optional)
- Metrics summary:
  - Leak-free model: cross-val scores from script output
  - Survey model: `accuracy` and `classification_report` from `training_logs/survey_personalization_metrics.json`
- Output artifact paths

## Next Steps (optional)
- Wire `survey_personalization.pkl` into `ml_recommendations_api.py` for cold-start users.
- Surface training run logs in the dashboard (read from `training_logs/`).

