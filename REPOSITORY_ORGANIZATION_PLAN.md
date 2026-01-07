# Repository Organization Plan

## Files Required for Deployment (Keep in Root/Current Location)

### ML API (Render) - Required Files:
- `ml_recommendations_api.py` - Main Flask API
- `bsp4a_leak_free_model.pkl` - Trained model
- `adaptive_review_recommendations_clean.csv` - Recommendation data
- `personalized_topic_recommendations.csv` - Topic recommendations
- `survey_feature_aggregates.json` - Survey aggregates (optional)
- `concept_mastery_tracker.py` - Concept tracking module
- `requirements.txt` or `requirements_ml_api.txt` - Python dependencies
- `render.yaml` - Render deployment config

### Web App (Vercel) - Required Files:
- `web-app/` - Entire Next.js application folder
- All files inside `web-app/` are needed

### Configuration Files:
- `README.md` - Main readme
- `.gitignore` - Git ignore rules

## Files to Organize into Folders

### 1. `docs/` - Documentation & Thesis Files
- All `CHAPTER4_*.md` files
- All `*_SUMMARY.md` files
- All `*_GUIDE.md` files
- All `*_STATUS.md` files
- `README_DEPLOYMENT.md`
- `HOW_TO_RUN.md`
- `CV_TECHNICAL_SKILLS.txt`
- `THESIS_TABLE_FORMAT_EXAMPLE.md`

### 2. `data/raw/` - Raw Data Files (Not Needed for Runtime)
- `Pre-Tests/` folder
- `Posttests/` folder
- `Pre-Board Exam/` folder
- `Mock Board Exam/` folder
- `Adaptive Review Planning for Psychometrician Licensure Examination Preparation Using Machine Learning.csv`
- `enhanced_student_features.csv` (training data, not needed for runtime)
- Other raw CSV files

### 3. `data/processed/` - Processed Data (Some Needed, Some Not)
- Keep in root (needed): `adaptive_review_recommendations_clean.csv`, `personalized_topic_recommendations.csv`
- Move here: `dataset_enhancement_summary.csv`, `performance_analysis_summary.csv`, etc.

### 4. `content/` - Lecture Materials & Content
- `Lecture Materials/` folder
- `Orientation PPTs/` folder
- `Schedule/` folder (if not used by app)
- `ReviewCenter_Portable/` folder

### 5. `scripts/training/` - Training & Analysis Scripts
- All `train_*.py` files
- All `check_*.py` files
- All `analyze_*.py` files
- All `evaluate_*.py` files
- All `retrain_*.py` files
- `extract_questions.py`
- `visualize_decision_tree.py`
- `test_system.py`
- `core_ml_model.py`
- `bsp4a_*.py` files (except if needed)
- `custom_classifiers*.py`
- `survey_features.py`
- `concept_mastery_tracker.py` - **KEEP IN ROOT** (needed by ML API)

### 6. `analysis/` - Analysis Results
- `model_comparison/` folder
- `figures/` folder
- `training_logs/` folder
- All `*.xlsx` analysis files
- `bsp4a_*.xlsx` files

### 7. `thesis/` - Thesis-Specific Files
- `thesis_datasets/` folder (already created)
- Any other thesis-related files

## Recommended Structure

```
MACALALAY-upd/
├── ml_recommendations_api.py          # ✅ Keep (ML API)
├── bsp4a_leak_free_model.pkl          # ✅ Keep (Model)
├── adaptive_review_recommendations_clean.csv  # ✅ Keep (Runtime data)
├── personalized_topic_recommendations.csv    # ✅ Keep (Runtime data)
├── survey_feature_aggregates.json     # ✅ Keep (Optional runtime)
├── concept_mastery_tracker.py         # ✅ Keep (ML API dependency)
├── requirements.txt                   # ✅ Keep
├── render.yaml                        # ✅ Keep
├── README.md                          # ✅ Keep
├── .gitignore                         # ✅ Keep
│
├── web-app/                           # ✅ Keep (Entire folder)
│
├── docs/                              # 📁 New: Documentation
│   ├── deployment/
│   ├── thesis/
│   └── guides/
│
├── data/                              # 📁 New: Data files
│   ├── raw/                           # Raw test data
│   ├── processed/                     # Processed data (non-runtime)
│   └── runtime/                       # Runtime data (keep in root instead)
│
├── content/                           # 📁 New: Lecture materials
│   ├── lectures/
│   ├── schedules/
│   └── presentations/
│
├── scripts/                           # 📁 Reorganize
│   ├── training/                      # Training scripts
│   └── utils/                         # Utility scripts
│
├── analysis/                          # 📁 New: Analysis results
│   ├── model_comparison/
│   ├── figures/
│   └── logs/
│
└── thesis/                            # 📁 New: Thesis files
    └── datasets/
```

## Decision: Keep Runtime Files in Root

**Best approach**: Keep files needed for deployment in root, organize everything else.

This ensures:
- ✅ Render can find ML API files easily
- ✅ Vercel can find web-app folder
- ✅ Repository is clean and organized
- ✅ Nothing breaks

