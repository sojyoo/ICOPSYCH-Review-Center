# Repository Cleanup Guide

## Overview

This guide helps organize your GitHub repository by moving non-essential files into organized folders while keeping all runtime files in their required locations.

## ✅ Files That MUST Stay in Root (For Deployment)

### ML API (Render) Requirements:
- `ml_recommendations_api.py` - Main Flask API
- `bsp4a_leak_free_model.pkl` - Trained model (required)
- `adaptive_review_recommendations_clean.csv` - Recommendation data (required)
- `personalized_topic_recommendations.csv` - Topic recommendations (required)
- `survey_feature_aggregates.json` - Survey aggregates (optional but recommended)
- `concept_mastery_tracker.py` - Required by ML API
- `requirements.txt` or `requirements_ml_api.txt` - Python dependencies
- `render.yaml` - Render deployment config

### Web App (Vercel) Requirements:
- `web-app/` - **Entire folder must stay** (Next.js app)
  - Lecture files in `web-app/src/data/lectures/` are **used by the app** - keep them!
  - Schedule is in `web-app/src/lib/schedule.ts` - hardcoded, not from external files

### Configuration:
- `README.md` - Main readme
- `.gitignore` - Git ignore rules

## 📁 Files to Organize (Safe to Move)

### 1. Documentation → `docs/`
- All `CHAPTER4_*.md` files
- All `*_SUMMARY.md`, `*_GUIDE.md`, `*_STATUS.md` files
- `README_DEPLOYMENT.md`, `HOW_TO_RUN.md`
- `CV_TECHNICAL_SKILLS.txt`

### 2. Raw Data → `data/raw/`
- `Pre-Tests/` folder (not used by app)
- `Posttests/` folder (not used by app)
- `Pre-Board Exam/` folder
- `Mock Board Exam/` folder
- `Adaptive Review Planning...csv` (original raw data)
- `enhanced_student_features.csv` (training data, not runtime)

### 3. Analysis Results → `data/analysis/` or `analysis/results/`
- `dataset_enhancement_summary.csv`
- `performance_analysis_summary.csv`
- `feature_importance_analysis.csv`
- `model_comparison/` folder
- `figures/` folder
- `training_logs/` folder
- All `*.xlsx` analysis files

### 4. Content Materials → `content/`
- `Lecture Materials/` folder (reference, not used by app)
- `Orientation PPTs/` folder
- `Schedule/` folder (if separate from app's schedule.ts)

### 5. Training Scripts → `scripts/training/`
- All `train_*.py` files
- All `check_*.py`, `analyze_*.py`, `evaluate_*.py` files
- `extract_questions.py`
- `visualize_decision_tree.py`
- `bsp4a_*.py` files
- **Note**: `concept_mastery_tracker.py` must stay in root (used by ML API)

### 6. Thesis Files → `thesis/`
- `thesis_datasets/` folder

## 🚀 How to Organize

### Option 1: Use the PowerShell Script (Recommended)
```powershell
cd C:\Users\User\Desktop\MACALALAY-upd
.\organize_repository.ps1
```

### Option 2: Manual Organization
Follow the structure in `REPOSITORY_ORGANIZATION_PLAN.md`

## ⚠️ Important Notes

1. **Lecture Files in web-app**: The files in `web-app/src/data/lectures/` are **actively used** by the app for the discussion page. Do NOT move these.

2. **Schedule**: The schedule is hardcoded in `web-app/src/lib/schedule.ts`, so the `Schedule/` folder in root is just reference material and can be moved.

3. **Model Files**: Keep `bsp4a_leak_free_model.pkl` in root - Render expects it there based on `render.yaml`.

4. **CSV Files**: Keep `adaptive_review_recommendations_clean.csv` and `personalized_topic_recommendations.csv` in root - ML API loads them from root.

## ✅ After Organization

1. Test locally to ensure nothing broke
2. Review git status: `git status`
3. Commit changes: `git add . && git commit -m "Organize repository structure"`
4. Push: `git push origin main`

## 📋 Final Structure Preview

```
MACALALAY-upd/
├── ml_recommendations_api.py          ✅ Runtime
├── bsp4a_leak_free_model.pkl          ✅ Runtime
├── adaptive_review_recommendations_clean.csv  ✅ Runtime
├── personalized_topic_recommendations.csv    ✅ Runtime
├── concept_mastery_tracker.py         ✅ Runtime
├── requirements.txt                   ✅ Runtime
├── render.yaml                        ✅ Runtime
├── README.md                          ✅ Config
├── web-app/                           ✅ Runtime (entire folder)
│
├── docs/                              📁 Documentation
├── data/                              📁 Data files
├── content/                           📁 Reference materials
├── scripts/                           📁 Training scripts
├── analysis/                          📁 Analysis results
└── thesis/                            📁 Thesis files
```

