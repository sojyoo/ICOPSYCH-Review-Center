# Repository Organization Script
# This script organizes files into folders without affecting runtime functionality

Write-Host "📁 Organizing repository structure..." -ForegroundColor Cyan

# Create organization folders
$folders = @(
    "docs",
    "docs/thesis",
    "docs/deployment", 
    "data/raw",
    "data/analysis",
    "content/lectures",
    "content/schedules",
    "content/presentations",
    "scripts/training",
    "scripts/analysis",
    "analysis/results",
    "thesis"
)

foreach ($folder in $folders) {
    New-Item -ItemType Directory -Path $folder -Force | Out-Null
    Write-Host "  ✓ Created: $folder" -ForegroundColor Green
}

Write-Host "`n📄 Moving files..." -ForegroundColor Cyan

# Move documentation files
$docs = @(
    "CHAPTER4_*.md",
    "*_SUMMARY.md",
    "*_GUIDE.md",
    "*_STATUS.md",
    "*_CHECKLIST.md",
    "README_DEPLOYMENT.md",
    "HOW_TO_RUN.md",
    "CV_TECHNICAL_SKILLS.txt",
    "THESIS_TABLE_FORMAT_EXAMPLE.md",
    "DATA_PROVENANCE.md",
    "DATA_RELEVANCE_CRITICAL_ANALYSIS.md"
)

foreach ($pattern in $docs) {
    Get-ChildItem -Path . -Filter $pattern -File | ForEach-Object {
        if ($_.Name -like "CHAPTER4*") {
            Move-Item $_.FullName -Destination "docs/thesis/" -Force
        } elseif ($_.Name -like "*DEPLOYMENT*" -or $_.Name -like "*DEPLOYMENT*") {
            Move-Item $_.FullName -Destination "docs/deployment/" -Force
        } else {
            Move-Item $_.FullName -Destination "docs/" -Force
        }
        Write-Host "  ✓ Moved: $($_.Name)" -ForegroundColor Yellow
    }
}

# Move raw data folders (if they exist and aren't needed by app)
$rawDataFolders = @("Pre-Tests", "Posttests", "Pre-Board Exam", "Mock Board Exam")
foreach ($folder in $rawDataFolders) {
    if (Test-Path $folder) {
        Move-Item $folder -Destination "data/raw/" -Force -ErrorAction SilentlyContinue
        Write-Host "  ✓ Moved folder: $folder" -ForegroundColor Yellow
    }
}

# Move raw CSV files (training data, not runtime)
$rawCsvs = @(
    "Adaptive Review Planning for Psychometrician Licensure Examination Preparation Using Machine Learning.csv",
    "enhanced_student_features.csv",
    "student_features_processed.csv",
    "survey_features_processed.csv"
)
foreach ($file in $rawCsvs) {
    if (Test-Path $file) {
        Move-Item $file -Destination "data/raw/" -Force -ErrorAction SilentlyContinue
        Write-Host "  ✓ Moved: $file" -ForegroundColor Yellow
    }
}

# Move analysis CSV files
$analysisCsvs = @(
    "dataset_enhancement_summary.csv",
    "performance_analysis_summary.csv",
    "feature_importance_analysis.csv",
    "recommendation_analysis_summary.csv",
    "core_ml_model_results.csv",
    "topic_level_scores.csv"
)
foreach ($file in $analysisCsvs) {
    if (Test-Path $file) {
        Move-Item $file -Destination "data/analysis/" -Force -ErrorAction SilentlyContinue
        Write-Host "  ✓ Moved: $file" -ForegroundColor Yellow
    }
}

# Move content folders
$contentFolders = @("Lecture Materials", "Orientation PPTs", "Schedule")
foreach ($folder in $contentFolders) {
    if (Test-Path $folder) {
        if ($folder -eq "Lecture Materials") {
            Move-Item $folder -Destination "content/lectures/" -Force -ErrorAction SilentlyContinue
        } elseif ($folder -eq "Schedule") {
            Move-Item $folder -Destination "content/schedules/" -Force -ErrorAction SilentlyContinue
        } else {
            Move-Item $folder -Destination "content/presentations/" -Force -ErrorAction SilentlyContinue
        }
        Write-Host "  ✓ Moved folder: $folder" -ForegroundColor Yellow
    }
}

# Move training scripts
$trainingScripts = @(
    "train_*.py",
    "check_*.py",
    "analyze_*.py",
    "evaluate_*.py",
    "retrain_*.py",
    "extract_questions.py",
    "visualize_decision_tree.py",
    "test_system.py",
    "bsp4a_*.py",
    "custom_classifiers*.py",
    "survey_features.py",
    "core_ml_model.py",
    "enhanced_ml_model.py"
)

foreach ($pattern in $trainingScripts) {
    Get-ChildItem -Path . -Filter $pattern -File | ForEach-Object {
        # Skip concept_mastery_tracker.py (needed by ML API)
        if ($_.Name -ne "concept_mastery_tracker.py") {
            Move-Item $_.FullName -Destination "scripts/training/" -Force
            Write-Host "  ✓ Moved: $($_.Name)" -ForegroundColor Yellow
        }
    }
}

# Move analysis results
if (Test-Path "model_comparison") {
    Move-Item "model_comparison" -Destination "analysis/results/" -Force -ErrorAction SilentlyContinue
    Write-Host "  ✓ Moved folder: model_comparison" -ForegroundColor Yellow
}

if (Test-Path "figures") {
    Move-Item "figures" -Destination "analysis/results/" -Force -ErrorAction SilentlyContinue
    Write-Host "  ✓ Moved folder: figures" -ForegroundColor Yellow
}

if (Test-Path "training_logs") {
    Move-Item "training_logs" -Destination "analysis/results/" -Force -ErrorAction SilentlyContinue
    Write-Host "  ✓ Moved folder: training_logs" -ForegroundColor Yellow
}

# Move Excel analysis files
Get-ChildItem -Path . -Filter "*.xlsx" -File | ForEach-Object {
    Move-Item $_.FullName -Destination "analysis/results/" -Force -ErrorAction SilentlyContinue
    Write-Host "  ✓ Moved: $($_.Name)" -ForegroundColor Yellow
}

# Move thesis folder if it exists
if (Test-Path "thesis_datasets") {
    Move-Item "thesis_datasets" -Destination "thesis/" -Force -ErrorAction SilentlyContinue
    Write-Host "  ✓ Moved folder: thesis_datasets" -ForegroundColor Yellow
}

Write-Host "`n✅ Repository organization complete!" -ForegroundColor Green
Write-Host "`n📋 Files kept in root (required for deployment):" -ForegroundColor Cyan
Write-Host "  - ml_recommendations_api.py" -ForegroundColor White
Write-Host "  - bsp4a_leak_free_model.pkl" -ForegroundColor White
Write-Host "  - adaptive_review_recommendations_clean.csv" -ForegroundColor White
Write-Host "  - personalized_topic_recommendations.csv" -ForegroundColor White
Write-Host "  - survey_feature_aggregates.json" -ForegroundColor White
Write-Host "  - concept_mastery_tracker.py" -ForegroundColor White
Write-Host "  - requirements.txt" -ForegroundColor White
Write-Host "  - render.yaml" -ForegroundColor White
Write-Host "  - web-app/ (entire folder)" -ForegroundColor White
Write-Host "  - README.md" -ForegroundColor White

Write-Host "`n⚠️  Review changes before committing!" -ForegroundColor Yellow

