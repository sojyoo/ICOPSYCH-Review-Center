"""
Survey feature extractor for adaptive review personalization.

Reads the survey CSV:
  Adaptive Review Planning for Psychometrician Licensure Examination Preparation Using Machine Learning.csv
Encodes Likert, GWA, motivation, challenges, and saves a processed CSV that can
be used for downstream modeling or cohort priors.
"""

import json
import pandas as pd
from pathlib import Path
from typing import Dict, List

RAW_SURVEY_PATH = Path("Adaptive Review Planning for Psychometrician Licensure Examination Preparation Using Machine Learning.csv")
OUTPUT_CSV = Path("survey_features_processed.csv")
OUTPUT_STATS = Path("survey_feature_aggregates.json")

# Maps for GWA categorical values to numeric (approximate midpoints)
GWA_MAP = {
    "High (1.00-1.50)": 1.25,
    "Medium (1.75-2.25)": 2.0,
    "Low (2.50-3.00)": 2.75,
    "N/A": None,
    "N/A ": None,
}

LIKERT_MAP = {
    "1 - Never": 1,
    "2 - Sometimes": 2,
    "3 - Often": 3,
    "4 - Always": 4,
    "1 - Strongly Disagree": 1,
    "2 - Disagree": 2,
    "3 - Agree": 3,
    "4 - Strongly Agree": 4,
}

MOTIVATION_OPTIONS = [
    "Professional advancement",
    "Family expectations",
    "Personal fulfillment",
    "Peer influence",
]

CHALLENGE_BUCKETS: Dict[str, List[str]] = {
    "time": ["time", "schedule", "management", "work schedule"],
    "financial": ["financial", "money", "finance"],
    "resources": ["resources", "materials", "books"],
    "burnout": ["burnout", "pressure", "stress", "overwhelm"],
    "focus": ["focus", "concentrate"],
}


def normalize_likert(value: str) -> float:
    if value in LIKERT_MAP:
        # scale 1-4 to 0-1
        return (LIKERT_MAP[value] - 1) / 3
    return None


def parse_int(value: str):
    if not isinstance(value, str):
        return None
    value = value.strip().lower()
    if "more than 5" in value:
        return 6
    if "3-4" in value:
        return 3.5
    if "1-2" in value or "1- 2" in value:
        return 1.5
    if value.isdigit():
        return int(value)
    return None


def multi_hot(cell: str, options: List[str]) -> Dict[str, int]:
    result = {opt: 0 for opt in options}
    if not isinstance(cell, str):
        return result
    for opt in options:
        if opt.lower() in cell.lower():
            result[opt] = 1
    return result


def bucket_challenges(cell: str) -> Dict[str, int]:
    result = {bucket: 0 for bucket in CHALLENGE_BUCKETS.keys()}
    if not isinstance(cell, str):
        return result
    lower = cell.lower()
    for bucket, keywords in CHALLENGE_BUCKETS.items():
        if any(k in lower for k in keywords):
            result[bucket] = 1
    return result


def load_and_process():
    if not RAW_SURVEY_PATH.exists():
        raise FileNotFoundError(f"Survey file not found: {RAW_SURVEY_PATH}")

    df = pd.read_csv(RAW_SURVEY_PATH)

    # Rename columns for easier access
    df = df.rename(
        columns={
            "Year Level": "year_level",
            "Age": "age",
            "Gender": "gender",
            "General Weighted Average (Last Sem) for the ff. subject: [Psychology Assessment]": "gwa_psych_assessment",
            "General Weighted Average (Last Sem) for the ff. subject: [Industrial Psychology]": "gwa_industrial_psych",
            "General Weighted Average (Last Sem) for the ff. subject: [Developmental Psychology]": "gwa_developmental_psych",
            "General Weighted Average (Last Sem) for the ff. subject: [Abnormal Psychology]": "gwa_abnormal_psych",
            " [I create a daily schedule for study and reviewing]": "habit_schedule",
            " [I review my notes immediately after class lectures]": "habit_immediate_review",
            " [I set specific goals for what I plan to accomplish in each study session]": "habit_goal_setting",
            " [I avoid putting off assigned readings and homework until the last minute.]": "habit_avoid_cram",
            " [I use active techniques such as summarizing, highlighting, or making concept maps]": "habit_active_techniques",
            " [I prefer to study in a quiet environment without distractions]": "habit_quiet_env",
            " [I participate in group study or discussion sessions with classmates]": "habit_group_study",
            " [I seek feedback from my teachers or mentors regarding my academic performance]": "habit_feedback",
            "How many review classes or sessions have you attended in the past month?": "sessions_attended",
            "Which do you prefer? ": "preference",
            "Do you regularly attend scheduled review sessions provided by the college? ": "attends_college_sessions",
            " [I feel confident in my ability to pass the Psychometrician Licensure Examination.]": "confident_pass",
            " [I believe my current study methods will help me succeed in the board exam.]": "belief_methods",
            " [I am aware of the topics and competencies required for the licensure examination.]": "aware_topics",
            " [I am comfortable using new review tools or adaptive methods to prepare]": "comfortable_tools",
            "What motivates you the most to study for the board exam?": "motivation",
            "What challenges do you currently face in preparing for the board examination? ": "challenges",
            "What recommendations can you share for improving your review experience? ": "recommendations_text",
        }
    )

    # Encode GWA
    for col in [
        "gwa_psych_assessment",
        "gwa_industrial_psych",
        "gwa_developmental_psych",
        "gwa_abnormal_psych",
    ]:
        df[f"{col}_num"] = df[col].map(GWA_MAP)

    # Encode Likert habits
    likert_cols = [
        "habit_schedule",
        "habit_immediate_review",
        "habit_goal_setting",
        "habit_avoid_cram",
        "habit_active_techniques",
        "habit_quiet_env",
        "habit_group_study",
        "habit_feedback",
        "confident_pass",
        "belief_methods",
        "aware_topics",
        "comfortable_tools",
    ]
    for col in likert_cols:
        df[f"{col}_score"] = df[col].apply(normalize_likert)

    # Composite scores
    df["planning_score"] = df[["habit_schedule_score", "habit_goal_setting_score"]].mean(axis=1)
    df["discipline_score"] = df[["habit_avoid_cram_score", "habit_immediate_review_score"]].mean(axis=1)
    df["active_learning_score"] = df["habit_active_techniques_score"]
    df["environment_score"] = df["habit_quiet_env_score"]
    df["collaboration_score"] = df["habit_group_study_score"]
    df["feedback_score"] = df["habit_feedback_score"]
    df["confidence_score"] = df[["confident_pass_score", "belief_methods_score", "aware_topics_score", "comfortable_tools_score"]].mean(axis=1)

    # Sessions attended
    df["sessions_attended_num"] = df["sessions_attended"].apply(parse_int)

    # Preferences
    df["pref_self_study"] = df["preference"].str.contains("Self-study", case=False, na=False).astype(int)
    df["pref_group"] = df["preference"].str.contains("Group review", case=False, na=False).astype(int)
    df["pref_formal"] = df["preference"].str.contains("Formal review", case=False, na=False).astype(int)

    # Attendance boolean
    df["attends_schedule_bool"] = df["attends_college_sessions"].str.contains("Yes", case=False, na=False).astype(int)

    # Motivation multi-hot
    for opt in MOTIVATION_OPTIONS:
        df[f"motivation_{opt.replace(' ', '_').lower()}"] = df["motivation"].apply(lambda x, o=opt: 1 if isinstance(x, str) and o.lower() in x.lower() else 0)

    # Challenges buckets
    for bucket in CHALLENGE_BUCKETS.keys():
        df[f"challenge_{bucket}"] = df["challenges"].apply(lambda x, b=bucket: bucket_challenges(x)[b])

    # Keep a tidy feature set
    feature_cols = [
        "year_level",
        "age",
        "gender",
        "sessions_attended_num",
        "pref_self_study",
        "pref_group",
        "pref_formal",
        "attends_schedule_bool",
        "planning_score",
        "discipline_score",
        "active_learning_score",
        "environment_score",
        "collaboration_score",
        "feedback_score",
        "confidence_score",
    ]

    feature_cols += [f"{col}_num" for col in [
        "gwa_psych_assessment",
        "gwa_industrial_psych",
        "gwa_developmental_psych",
        "gwa_abnormal_psych",
    ]]

    feature_cols += [f"motivation_{opt.replace(' ', '_').lower()}" for opt in MOTIVATION_OPTIONS]
    feature_cols += [f"challenge_{bucket}" for bucket in CHALLENGE_BUCKETS.keys()]

    features = df[feature_cols].copy()

    # Basic cleanup
    if "age" in features.columns:
        features["age"] = pd.to_numeric(features["age"], errors="coerce")

    # Save processed features
    OUTPUT_CSV.write_text(features.to_csv(index=False))

    # Aggregate stats for quick priors
    aggregates = features.describe(include="all").to_dict()
    OUTPUT_STATS.write_text(json.dumps(aggregates, indent=2, default=lambda x: None))

    print(f"Saved processed survey features to {OUTPUT_CSV}")
    print(f"Saved aggregate stats to {OUTPUT_STATS}")


if __name__ == "__main__":
    load_and_process()














