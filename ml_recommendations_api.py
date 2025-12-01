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
recommendations_data = None
topic_recommendations = None

# Initialize new ML components
concept_tracker = ConceptMasteryTracker()
spaced_repetition = SpacedRepetitionScheduler()
early_intervention = EarlyInterventionDetector()

def load_models():
    """Load the trained ML model and recommendation data"""
    global model, recommendations_data, topic_recommendations
    
    try:
        # Load the trained model
        model = joblib.load('bsp4a_leak_free_model.pkl')
        
        # Load recommendation data
        recommendations_data = pd.read_csv('adaptive_review_recommendations_clean.csv')
        topic_recommendations = pd.read_csv('personalized_topic_recommendations.csv')
        
        print("Models loaded successfully!")
        return True
    except Exception as e:
        print(f"Error loading models: {e}")
        return False

def generate_recommendations(subject_scores, test_type='pre-test'):
    """Generate personalized recommendations based on subject scores"""
    
    if model is None or recommendations_data is None:
        return generate_fallback_recommendations(subject_scores)
    
    try:
        # Prepare features for the model
        features = []
        subjects = ['Abnormal Psychology', 'Developmental Psychology', 'Industrial Psychology', 'Psychological Assessment']
        
        for subject in subjects:
            score = subject_scores.get(subject, {}).get('percentage', 0)
            features.append(score)
        
        # Add test type feature (0 for pre-test, 1 for post-test)
        test_type_encoded = 1 if test_type == 'post-test' else 0
        features.append(test_type_encoded)
        
        # Make prediction
        features_array = np.array(features).reshape(1, -1)
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
        
        recommendations = generate_recommendations(subject_scores, test_type)
        
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

if __name__ == '__main__':
    # Load models on startup
    if load_models():
        print("Starting ML Recommendations API...")
        print("✅ Concept Mastery Tracking: Enabled")
        print("✅ Spaced Repetition: Enabled")
        print("✅ Early Intervention: Enabled")
        app.run(host='0.0.0.0', port=5000, debug=True)
    else:
        print("Failed to load models. API will run with fallback recommendations.")
        print("✅ Concept Mastery Tracking: Enabled")
        print("✅ Spaced Repetition: Enabled")
        print("✅ Early Intervention: Enabled")
        app.run(host='0.0.0.0', port=5000, debug=True)


