#!/usr/bin/env python3
"""
ML Recommendations API for the adaptive review system
Provides real-time recommendations using the trained Random Forest model
Enhanced with Concept Mastery Tracking, Early Intervention, and Spaced Repetition
"""

import pandas as pd
import numpy as np
import joblib
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from datetime import datetime, timedelta
from concept_mastery_tracker import (
    ConceptMasteryTracker,
    SpacedRepetitionScheduler,
    EarlyInterventionDetector
)

app = Flask(__name__)
CORS(app)

# Load the trained model and data
model = None
scaler = None
label_encoder = None
feature_cols = None
recommendations_data = None
topic_recommendations = None

# Optional survey priors for personalization
survey_aggregates = None

# Initialize new ML components
concept_tracker = ConceptMasteryTracker()
spaced_repetition = SpacedRepetitionScheduler()
early_intervention = EarlyInterventionDetector()

def load_models():
    """Load the trained ML model, recommendation data, and optional survey priors."""
    global model, scaler, label_encoder, feature_cols, recommendations_data, topic_recommendations, survey_aggregates
    
    import traceback
    
    # Check if files exist
    model_file = 'bsp4a_leak_free_model.pkl'
    recs_file = 'adaptive_review_recommendations_clean.csv'
    topics_file = 'personalized_topic_recommendations.csv'
    
    print(f"Current working directory: {os.getcwd()}")
    print(f"Checking for model files...")
    print(f"  {model_file}: {'✅ EXISTS' if os.path.exists(model_file) else '❌ NOT FOUND'}")
    print(f"  {recs_file}: {'✅ EXISTS' if os.path.exists(recs_file) else '❌ NOT FOUND'}")
    print(f"  {topics_file}: {'✅ EXISTS' if os.path.exists(topics_file) else '❌ NOT FOUND'}")
    
    if not os.path.exists(model_file):
        print(f"❌ ERROR: {model_file} not found in {os.getcwd()}")
        print(f"   Files in current directory: {os.listdir('.')}")
        return False
    if not os.path.exists(recs_file):
        print(f"❌ ERROR: {recs_file} not found")
        return False
    if not os.path.exists(topics_file):
        print(f"❌ ERROR: {topics_file} not found")
        return False
    
    try:
        # Load the trained model artifact (dict)
        print(f"Loading model from {model_file}...")
        artifact = joblib.load(model_file)
        model = artifact.get("model")
        scaler = artifact.get("scaler")
        label_encoder = artifact.get("label_encoder")
        feature_cols = artifact.get("feature_cols")
        
        if model is None or scaler is None or label_encoder is None or feature_cols is None:
            print("❌ ERROR: Model artifact is missing required components")
            return False
        
        # Load recommendation data
        print(f"Loading recommendations from {recs_file}...")
        recommendations_data = pd.read_csv(recs_file)
        print(f"Loading topic recommendations from {topics_file}...")
        topic_recommendations = pd.read_csv(topics_file)

        # Optional survey aggregates for cold-start personalization
        survey_agg_path = 'survey_feature_aggregates.json'
        if os.path.exists(survey_agg_path):
            with open(survey_agg_path, 'r') as f:
                survey_aggregates = json.load(f)
            print("✅ Loaded survey aggregates for personalization")
        
        print("✅ Models loaded successfully!")
        return True
    except Exception as e:
        print(f"❌ Error loading models: {e}")
        print(f"❌ Traceback:")
        traceback.print_exc()
        return False

def generate_recommendations(subject_scores, test_type='pre-test'):
    """Generate personalized recommendations based on subject scores"""
    
    if model is None or recommendations_data is None or feature_cols is None:
        return generate_fallback_recommendations(subject_scores)
    
    try:
        # Prepare features aligned with training
        def get_feat(col):
            if col == "abnormal_psych_score":
                return subject_scores.get('Abnormal Psychology', {}).get('percentage', 0)
            if col == "developmental_psych_score":
                return subject_scores.get('Developmental Psychology', {}).get('percentage', 0)
            if col == "industrial_psych_score":
                return subject_scores.get('Industrial Psychology', {}).get('percentage', 0)
            if col == "psychological_assessment_score":
                return subject_scores.get('Psychological Assessment', {}).get('percentage', 0)
            if col == "test_type":
                return 1 if test_type == 'post-test' else 0
            # Defaults for other global features (not supplied by API); keep at 0
            return 0

        features = [get_feat(col) for col in feature_cols]
        features_array = np.array(features, dtype=float).reshape(1, -1)

        if scaler is not None:
            features_array = scaler.transform(features_array)

        prediction = model.predict(features_array)[0]
        
        # Generate recommendations based on prediction
        recommendations = []
        
        # Identify weak subjects (below 70%)
        weak_subjects = [subject for subject, scores in subject_scores.items() 
                        if scores.get('percentage', 0) < 70]
        
        # Generate study plan
        study_plan = []
        total_study_hours = 0
        
        for subject in subjects:
            score = subject_scores.get(subject, {}).get('percentage', 0)
            if score < 70:  # Weak subject
                hours = 8  # 8 hours per week for weak subjects
                study_plan.append({
                    'subject': subject,
                    'hours': hours,
                    'priority': 'high',
                    'focus': f'Review fundamental concepts and practice questions in {subject}'
                })
                total_study_hours += hours
            elif score < 85:  # Moderate subject
                hours = 4  # 4 hours per week for moderate subjects
                study_plan.append({
                    'subject': subject,
                    'hours': hours,
                    'priority': 'medium',
                    'focus': f'Strengthen understanding and practice advanced topics in {subject}'
                })
                total_study_hours += hours
            else:  # Strong subject
                hours = 2  # 2 hours per week for strong subjects
                study_plan.append({
                    'subject': subject,
                    'hours': hours,
                    'priority': 'low',
                    'focus': f'Maintain proficiency and review challenging areas in {subject}'
                })
                total_study_hours += hours
        
        # Generate specific recommendations
        specific_recommendations = []
        
        for subject in weak_subjects:
            if subject in topic_recommendations.columns:
                topics = topic_recommendations[subject].dropna().tolist()
                for topic in topics[:3]:  # Top 3 topics
                    specific_recommendations.append({
                        'subject': subject,
                        'topic': topic,
                        'priority': 'high',
                        'action': f'Focus on {topic} - this is a critical area for improvement'
                    })
        
        # Generate today's focus
        today_focus = []
        if weak_subjects:
            focus_subject = weak_subjects[0]
            if focus_subject in topic_recommendations.columns:
                topics = topic_recommendations[focus_subject].dropna().tolist()
                today_focus = topics[:2]  # Top 2 topics for today
        
        return {
            'totalStudyHours': total_study_hours,
            'studyPlan': study_plan,
            'recommendations': specific_recommendations,
            'todayFocus': today_focus,
            'weakSubjects': weak_subjects,
            'strengths': [subject for subject, scores in subject_scores.items() 
                         if scores.get('percentage', 0) >= 85],
            'nextSteps': [
                f"Focus on {weak_subjects[0]}" if weak_subjects else "Continue maintaining strong performance",
                "Complete practice questions in weak areas",
                "Review lecture materials for identified topics",
                "Take practice tests to track improvement"
            ]
        }
        
    except Exception as e:
        print(f"Error generating recommendations: {e}")
        return generate_fallback_recommendations(subject_scores)


def apply_survey_personalization(recommendations: dict, survey_features: dict):
    """
    Lightly adjust recommendations based on survey-derived preferences/habits.
    Expects survey_features keys consistent with survey_features.py outputs.
    """
    if not survey_features or not isinstance(recommendations, dict):
        return recommendations

    def get(key, default=None):
        return survey_features.get(key, default)

    # Adjust study hours based on planning/discipline
    planning = get("planning_score")
    discipline = get("discipline_score")
    if planning is not None and planning < 0.4:
        recommendations["totalStudyHours"] = recommendations.get("totalStudyHours", 0) + 4
        recommendations.setdefault("nextSteps", []).append("Use a structured weekly schedule based on your survey responses.")
    if discipline is not None and discipline < 0.4:
        recommendations.setdefault("nextSteps", []).append("Keep sessions short (25-40 mins) to build consistency.")

    # Collaboration preference
    if get("pref_group") == 1:
        recommendations.setdefault("nextSteps", []).append("Join or form a small group review session this week.")

    # Environment preference
    env = get("environment_score")
    if env is not None and env > 0.66:
        recommendations.setdefault("nextSteps", []).append("Study in a quiet, low-distraction space for key topics.")

    # Confidence low → encourage quick wins
    conf = get("confidence_score")
    if conf is not None and conf < 0.5:
        recommendations.setdefault("nextSteps", []).append("Start with 2-3 short practice sets to build confidence.")

    # Challenges: time or financial
    if get("challenge_time") == 1:
        recommendations.setdefault("nextSteps", []).append("Use 30-minute blocks; focus on highest-yield weak subjects first.")
    if get("challenge_financial") == 1:
        recommendations.setdefault("nextSteps", []).append("Use free materials first; prioritize provided practice sets.")

    return recommendations

def generate_fallback_recommendations(subject_scores):
    """Generate fallback recommendations when ML model is not available"""
    
    weak_subjects = [subject for subject, scores in subject_scores.items() 
                    if scores.get('percentage', 0) < 70]
    
    study_plan = []
    total_study_hours = 0
    
    for subject, scores in subject_scores.items():
        score = scores.get('percentage', 0)
        if score < 70:
            hours = 8
            priority = 'high'
        elif score < 85:
            hours = 4
            priority = 'medium'
        else:
            hours = 2
            priority = 'low'
        
        study_plan.append({
            'subject': subject,
            'hours': hours,
            'priority': priority,
            'focus': f'Review and practice {subject} concepts'
        })
        total_study_hours += hours
    
    return {
        'totalStudyHours': total_study_hours,
        'studyPlan': study_plan,
        'recommendations': [
            {
                'subject': subject,
                'topic': 'Fundamental Concepts',
                'priority': 'high',
                'action': f'Review basic concepts in {subject}'
            } for subject in weak_subjects
        ],
        'todayFocus': weak_subjects[:2] if weak_subjects else [],
        'weakSubjects': weak_subjects,
        'strengths': [subject for subject, scores in subject_scores.items() 
                     if scores.get('percentage', 0) >= 85],
        'nextSteps': [
            f"Focus on {weak_subjects[0]}" if weak_subjects else "Continue maintaining strong performance",
            "Complete practice questions in weak areas",
            "Review lecture materials",
            "Take practice tests to track improvement"
        ]
    }

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None,
        'recommendations_loaded': recommendations_data is not None
    })

@app.route('/recommendations', methods=['POST'])
def get_recommendations():
    """Generate personalized recommendations based on test scores"""
    try:
        data = request.get_json()
        
        if not data or 'subjectScores' not in data:
            return jsonify({'error': 'Subject scores are required'}), 400
        
        subject_scores = data['subjectScores']
        test_type = data.get('testType', 'pre-test')
        survey_features = data.get('surveyFeatures')  # optional payload from frontend
        
        recommendations = generate_recommendations(subject_scores, test_type)

        # Apply survey-based personalization if provided, else use cohort averages lightly
        if survey_features:
            recommendations = apply_survey_personalization(recommendations, survey_features)
        elif survey_aggregates:
            # Use cohort mean scores as a gentle nudge for cold-start
            mean_planning = survey_aggregates.get('planning_score', {}).get('mean')
            if mean_planning is not None:
                recommendations = apply_survey_personalization(
                    recommendations, {"planning_score": mean_planning}
                )

        return jsonify(recommendations)
        
    except Exception as e:
        print(f"Error in recommendations endpoint: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/predict', methods=['POST'])
def predict_performance():
    """Predict future performance based on current scores"""
    try:
        data = request.get_json()
        
        if not data or 'subjectScores' not in data:
            return jsonify({'error': 'Subject scores are required'}), 400
        
        subject_scores = data['subjectScores']
        test_type = data.get('testType', 'pre-test')
        
        # Prepare features
        features = []
        subjects = ['Abnormal Psychology', 'Developmental Psychology', 'Industrial Psychology', 'Psychological Assessment']
        
        for subject in subjects:
            score = subject_scores.get(subject, {}).get('percentage', 0)
            features.append(score)
        
        test_type_encoded = 1 if test_type == 'post-test' else 0
        features.append(test_type_encoded)
        
        if model is not None:
            features_array = np.array(features).reshape(1, -1)
            prediction = model.predict(features_array)[0]
            confidence = model.predict_proba(features_array)[0].max()
        else:
            # Fallback prediction
            avg_score = np.mean([scores.get('percentage', 0) for scores in subject_scores.values()])
            prediction = 1 if avg_score >= 70 else 0
            confidence = 0.7
        
        return jsonify({
            'prediction': int(prediction),
            'confidence': float(confidence),
            'interpretation': 'Likely to pass' if prediction == 1 else 'Needs improvement'
        })
        
    except Exception as e:
        print(f"Error in predict endpoint: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/concept-mastery/update', methods=['POST'])
def update_concept_mastery():
    """Update concept mastery after a question attempt"""
    try:
        data = request.get_json()
        
        if not data or 'conceptId' not in data or 'isCorrect' not in data:
            return jsonify({'error': 'conceptId and isCorrect are required'}), 400
        
        concept_id = data['conceptId']
        is_correct = data['isCorrect']
        current_mastery = data.get('currentMastery', 0.0)
        attempts = data.get('attempts', 0)
        correct_attempts = data.get('correctAttempts', 0)
        
        # Update mastery using BKT
        updated = concept_tracker.update_from_question_attempt(
            current_mastery=current_mastery,
            attempts=attempts,
            correct_attempts=correct_attempts,
            is_correct=is_correct
        )
        
        # Calculate next review date using spaced repetition
        last_review = datetime.fromisoformat(updated['lastReviewed']) if updated.get('lastReviewed') else datetime.now()
        next_review = spaced_repetition.calculate_next_review(
            current_mastery=updated['masteryLevel'],
            last_review_date=last_review,
            current_interval=data.get('currentInterval', 1),
            ease_factor=data.get('easeFactor', 2.5)
        )
        
        updated['nextReviewDate'] = next_review['nextReviewDate']
        updated['interval'] = next_review['interval']
        updated['easeFactor'] = next_review['easeFactor']
        
        return jsonify(updated)
        
    except Exception as e:
        print(f"Error updating concept mastery: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/concept-mastery/summary', methods=['POST'])
def get_concept_mastery_summary():
    """Get summary of concept mastery for a student"""
    try:
        data = request.get_json()
        
        if not data or 'masteryRecords' not in data:
            return jsonify({'error': 'masteryRecords are required'}), 400
        
        mastery_records = data['masteryRecords']
        threshold = data.get('threshold', 0.7)
        
        summary = concept_tracker.get_mastery_summary(mastery_records)
        weak_concepts = concept_tracker.get_weak_concepts(mastery_records, threshold)
        
        return jsonify({
            'summary': summary,
            'weakConcepts': weak_concepts[:10]  # Top 10 weakest
        })
        
    except Exception as e:
        print(f"Error getting concept mastery summary: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/spaced-repetition/due', methods=['POST'])
def get_due_concepts():
    """Get concepts due for review"""
    try:
        data = request.get_json()
        
        if not data or 'masteryRecords' not in data:
            return jsonify({'error': 'masteryRecords are required'}), 400
        
        mastery_records = data['masteryRecords']
        current_date = data.get('currentDate')
        
        if current_date:
            current_date = datetime.fromisoformat(current_date)
        
        due_concepts = spaced_repetition.get_due_concepts(mastery_records, current_date)
        
        return jsonify({
            'dueConcepts': due_concepts,
            'count': len(due_concepts)
        })
        
    except Exception as e:
        print(f"Error getting due concepts: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/predict', methods=['POST'])
def predict_risk_level():
    """Predict risk level using full 20-feature vector (for Next.js API integration)"""
    try:
        data = request.get_json()
        
        if not data or 'features' not in data:
            return jsonify({'error': 'Features vector is required'}), 400
        
        features_dict = data['features']
        
        # Convert feature dict to array in the correct order
        if feature_cols is None:
            return jsonify({'error': 'Model not loaded'}), 503
        
        features_array = np.array([features_dict.get(col, 0.0) for col in feature_cols], dtype=float).reshape(1, -1)
        
        if model is None or scaler is None or label_encoder is None:
            # Fallback to rule-based risk level
            overall_score = features_dict.get('overall_avg_score', 24.0)
            if overall_score < 20:
                risk_level = 'high'
                risk_probabilities = {'high': 0.7, 'medium': 0.2, 'low': 0.1}
            elif overall_score < 26:
                risk_level = 'medium'
                risk_probabilities = {'high': 0.2, 'medium': 0.7, 'low': 0.1}
            else:
                risk_level = 'low'
                risk_probabilities = {'high': 0.1, 'medium': 0.2, 'low': 0.7}
        else:
            # Scale features
            features_scaled = scaler.transform(features_array)
            
            # Predict risk level
            prediction = model.predict(features_scaled)[0]
            probabilities = model.predict_proba(features_scaled)[0]
            
            # Map prediction to risk level (assuming label_encoder maps: 0=low, 1=medium, 2=high)
            risk_levels = ['low', 'medium', 'high']
            risk_level = risk_levels[prediction]
            
            # Get probabilities for each risk level
            risk_probabilities = {
                'low': float(probabilities[0]),
                'medium': float(probabilities[1]),
                'high': float(probabilities[2])
            }
        
        # Generate subject recommendations based on weakest subjects
        subject_scores = {
            'Abnormal Psychology': features_dict.get('abnormal_psych_score', 24.0),
            'Developmental Psychology': features_dict.get('developmental_psych_score', 24.0),
            'Industrial Psychology': features_dict.get('industrial_psych_score', 24.0),
            'Psychological Assessment': features_dict.get('psychological_assessment_score', 24.0)
        }
        
        # Find weakest subject
        weakest_subject = min(subject_scores.items(), key=lambda x: x[1])[0]
        strongest_subject = max(subject_scores.items(), key=lambda x: x[1])[0]
        
        subject_recommendations = [weakest_subject] if weakest_subject else []
        topic_priorities = []
        
        return jsonify({
            'riskLevel': risk_level,
            'riskProbabilities': risk_probabilities,
            'subjectRecommendations': subject_recommendations,
            'topicPriorities': topic_priorities
        })
        
    except Exception as e:
        print(f"Error in /api/predict endpoint: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/early-intervention/assess', methods=['POST'])
def assess_risk():
    """Assess student risk and generate early intervention recommendations"""
    try:
        data = request.get_json()
        
        if not data or 'currentScores' not in data:
            return jsonify({'error': 'currentScores are required'}), 400
        
        current_scores = data['currentScores']  # Dict of subject: score
        score_trend = data.get('scoreTrend', [])  # List of historical scores
        consistency = data.get('consistency', 0.8)  # Score consistency (0-1)
        improvement_rate = data.get('improvementRate', 1.0)  # % improvement per week
        weeks_until_exam = data.get('weeksUntilExam', 8)
        
        risk_assessment = early_intervention.calculate_risk_score(
            current_scores=current_scores,
            score_trend=score_trend,
            consistency=consistency,
            improvement_rate=improvement_rate,
            weeks_until_exam=weeks_until_exam
        )
        
        return jsonify(risk_assessment)
        
    except Exception as e:
        print(f"Error assessing risk: {e}")
        return jsonify({'error': 'Internal server error'}), 500

# Load models when module is imported (works with both direct execution and gunicorn)
# This ensures models are loaded before the app starts serving requests
print("Loading ML models...")
if load_models():
    print("✅ Models loaded successfully!")
else:
    print("⚠️ Failed to load models. API will run with fallback recommendations.")
    print("⚠️ Check that these files exist in the working directory:")
    print("   - bsp4a_leak_free_model.pkl")
    print("   - adaptive_review_recommendations_clean.csv")
    print("   - personalized_topic_recommendations.csv")

# Use ASCII-only markers to avoid Unicode encode errors on Windows consoles
print("[OK] Concept Mastery Tracking: Enabled")
print("[OK] Spaced Repetition: Enabled")
print("[OK] Early Intervention: Enabled")

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)


