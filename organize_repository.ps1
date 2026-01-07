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
    if (-not (Test-Path $folder)) {
        New-Item -ItemType Directory -Path $folder -Force | Out-Null
        Write-Host "  ✓ Created: $folder" -ForegroundColor Green
    }
}

Write-Host "`n📄 Moving files..." -ForegroundColor Cyan

# Move documentation files to docs/
$docPatterns = @(
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
    "DATA_RELEVANCE_CRITICAL_ANALYSIS.md",
    "ADMIN_PANEL_COMPLETE.md",
    "PUSH_CHECKLIST.md",
    "REPOSITORY_*.md"
)

foreach ($pattern in $docPatterns) {
    Get-ChildItem -Path . -Filter $pattern -File -ErrorAction SilentlyContinue | ForEach-Object {
        $dest = "docs/"
        if ($_.Name -like "CHAPTER4*") {
            $dest = "docs/thesis/"
        } elseif ($_.Name -like "*DEPLOYMENT*") {
            $dest = "docs/deployment/"
        }
        Move-Item $_.FullName -Destination $dest -Force -ErrorAction SilentlyContinue
        Write-Host "  ✓ Moved: $($_.Name) -> $dest" -ForegroundColor Yellow
    }
}

# Move raw data folders
$rawDataFolders = @("Pre-Tests", "Posttests", "Pre-Board Exam", "Mock Board Exam")
foreach ($folder in $rawDataFolders) {
    if (Test-Path $folder) {
        Move-Item $folder -Destination "data/raw/" -Force -ErrorAction SilentlyContinue
        Write-Host "  ✓ Moved folder: $folder -> data/raw/" -ForegroundColor Yellow
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
        Write-Host "  ✓ Moved: $file -> data/raw/" -ForegroundColor Yellow
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
        Write-Host "  ✓ Moved: $file -> data/analysis/" -ForegroundColor Yellow
    }
}

# Move content folders
if (Test-Path "Lecture Materials") {
    Move-Item "Lecture Materials" -Destination "content/lectures/" -Force -ErrorAction SilentlyContinue
    Write-Host "  ✓ Moved folder: Lecture Materials -> content/lectures/" -ForegroundColor Yellow
}
if (Test-Path "Schedule") {
    Move-Item "Schedule" -Destination "content/schedules/" -Force -ErrorAction SilentlyContinue
    Write-Host "  ✓ Moved folder: Schedule -> content/schedules/" -ForegroundColor Yellow
}
if (Test-Path "Orientation PPTs") {
    Move-Item "Orientation PPTs" -Destination "content/presentations/" -Force -ErrorAction SilentlyContinue
    Write-Host "  ✓ Moved folder: Orientation PPTs -> content/presentations/" -ForegroundColor Yellow
}
if (Test-Path "ReviewCenter_Portable") {
    Move-Item "ReviewCenter_Portable" -Destination "content/" -Force -ErrorAction SilentlyContinue
    Write-Host "  ✓ Moved folder: ReviewCenter_Portable -> content/" -ForegroundColor Yellow
}

# Move training scripts
$trainingPatterns = @(
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

foreach ($pattern in $trainingPatterns) {
    Get-ChildItem -Path . -Filter $pattern -File -ErrorAction SilentlyContinue | ForEach-Object {
        if ($_.Name -ne "concept_mastery_tracker.py") {
            Move-Item $_.FullName -Destination "scripts/training/" -Force -ErrorAction SilentlyContinue
            Write-Host "  ✓ Moved: $($_.Name) -> scripts/training/" -ForegroundColor Yellow
        }
    }
}

# Move analysis results
if (Test-Path "model_comparison") {
    Move-Item "model_comparison" -Destination "analysis/results/" -Force -ErrorAction SilentlyContinue
    Write-Host "  ✓ Moved folder: model_comparison -> analysis/results/" -ForegroundColor Yellow
}

if (Test-Path "figures") {
    Move-Item "figures" -Destination "analysis/results/" -Force -ErrorAction SilentlyContinue
    Write-Host "  ✓ Moved folder: figures -> analysis/results/" -ForegroundColor Yellow
}

if (Test-Path "training_logs") {
    Move-Item "training_logs" -Destination "analysis/results/" -Force -ErrorAction SilentlyContinue
    Write-Host "  ✓ Moved folder: training_logs -> analysis/results/" -ForegroundColor Yellow
}

# Move Excel analysis files
Get-ChildItem -Path . -Filter "*.xlsx" -File -ErrorAction SilentlyContinue | ForEach-Object {
    Move-Item $_.FullName -Destination "analysis/results/" -Force -ErrorAction SilentlyContinue
    Write-Host "  ✓ Moved: $($_.Name) -> analysis/results/" -ForegroundColor Yellow
}

# Move thesis folder
if (Test-Path "thesis_datasets") {
    Move-Item "thesis_datasets" -Destination "thesis/" -Force -ErrorAction SilentlyContinue
    Write-Host "  ✓ Moved folder: thesis_datasets -> thesis/" -ForegroundColor Yellow
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
