#!/usr/bin/env python3
"""
Concept Mastery Tracking System
Uses Bayesian Knowledge Tracing (BKT) to track student mastery of individual concepts
"""

import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
import json

class BayesianKnowledgeTracing:
    """
    Bayesian Knowledge Tracing (BKT) model
    Tracks the probability that a student has mastered a concept
    """
    
    def __init__(self):
        # BKT Parameters (can be learned from data or set empirically)
        self.p_L0 = 0.3  # Prior probability of knowing the concept
        self.p_T = 0.3   # Probability of learning from an attempt
        self.p_G = 0.2   # Probability of guessing correctly
        self.p_S = 0.1   # Probability of slipping (knowing but answering wrong)
    
    def update_mastery(self, current_mastery: float, is_correct: bool) -> float:
        """
        Update mastery probability after a question attempt
        
        Args:
            current_mastery: Current probability of mastery (0-1)
            is_correct: Whether the student answered correctly
        
        Returns:
            Updated mastery probability
        """
        if is_correct:
            # Student got it right
            # Could be: (1) knew it and didn't slip, or (2) didn't know but guessed
            p_correct_given_know = (1 - self.p_S) * current_mastery
            p_correct_given_not_know = self.p_G * (1 - current_mastery)
            p_correct = p_correct_given_know + p_correct_given_not_know
            
            # Update: probability of knowing given correct answer
            if p_correct > 0:
                new_mastery = p_correct_given_know / p_correct
            else:
                new_mastery = current_mastery
        else:
            # Student got it wrong
            # Could be: (1) knew it but slipped, or (2) didn't know and didn't guess
            p_wrong_given_know = self.p_S * current_mastery
            p_wrong_given_not_know = (1 - self.p_G) * (1 - current_mastery)
            p_wrong = p_wrong_given_know + p_wrong_given_not_know
            
            # Update: probability of knowing given wrong answer
            if p_wrong > 0:
                new_mastery = p_wrong_given_know / p_wrong
            else:
                new_mastery = current_mastery
        
        # Apply learning: if student didn't know, they might learn from the attempt
        if not is_correct:
            new_mastery = new_mastery + self.p_T * (1 - new_mastery)
        
        return min(1.0, max(0.0, new_mastery))
    
    def get_mastery_level(self, mastery_prob: float) -> str:
        """Convert mastery probability to human-readable level"""
        if mastery_prob >= 0.9:
            return "mastered"
        elif mastery_prob >= 0.7:
            return "proficient"
        elif mastery_prob >= 0.5:
            return "developing"
        elif mastery_prob >= 0.3:
            return "beginning"
        else:
            return "novice"


class ConceptMasteryTracker:
    """
    Tracks concept mastery for students using BKT
    """
    
    def __init__(self):
        self.bkt = BayesianKnowledgeTracing()
    
    def update_from_question_attempt(
        self, 
        current_mastery: float,
        attempts: int,
        correct_attempts: int,
        is_correct: bool
    ) -> Dict:
        """
        Update concept mastery from a question attempt
        
        Returns:
            Updated mastery data
        """
        new_mastery = self.bkt.update_mastery(current_mastery, is_correct)
        new_attempts = attempts + 1
        new_correct_attempts = correct_attempts + (1 if is_correct else 0)
        
        return {
            'masteryLevel': float(new_mastery),
            'attempts': new_attempts,
            'correctAttempts': new_correct_attempts,
            'masteryLevelLabel': self.bkt.get_mastery_level(new_mastery),
            'lastReviewed': datetime.now().isoformat()
        }
    
    def get_weak_concepts(self, mastery_records: List[Dict], threshold: float = 0.7) -> List[Dict]:
        """
        Get concepts where mastery is below threshold
        
        Args:
            mastery_records: List of concept mastery records
            threshold: Mastery threshold (default 0.7 = 70%)
        
        Returns:
            List of weak concepts sorted by mastery level
        """
        weak = [
            record for record in mastery_records 
            if record.get('masteryLevel', 0) < threshold
        ]
        return sorted(weak, key=lambda x: x.get('masteryLevel', 0))
    
    def get_mastery_summary(self, mastery_records: List[Dict]) -> Dict:
        """
        Get summary statistics of concept mastery
        
        Returns:
            Summary with counts by mastery level
        """
        if not mastery_records:
            return {
                'total': 0,
                'mastered': 0,
                'proficient': 0,
                'developing': 0,
                'beginning': 0,
                'novice': 0,
                'averageMastery': 0.0
            }
        
        levels = {'mastered': 0, 'proficient': 0, 'developing': 0, 'beginning': 0, 'novice': 0}
        total_mastery = 0.0
        
        for record in mastery_records:
            mastery = record.get('masteryLevel', 0)
            level = self.bkt.get_mastery_level(mastery)
            levels[level] = levels.get(level, 0) + 1
            total_mastery += mastery
        
        return {
            'total': len(mastery_records),
            **levels,
            'averageMastery': total_mastery / len(mastery_records) if mastery_records else 0.0
        }


class SpacedRepetitionScheduler:
    """
    Spaced Repetition System using SM-2 algorithm (SuperMemo)
    Determines optimal time to review concepts
    """
    
    def __init__(self):
        # SM-2 parameters
        self.min_interval = 1  # Minimum days between reviews
        self.max_interval = 365  # Maximum days between reviews
    
    def calculate_next_review(
        self,
        current_mastery: float,
        last_review_date: Optional[datetime],
        current_interval: int = 1,
        ease_factor: float = 2.5
    ) -> Dict:
        """
        Calculate next review date based on mastery level
        
        Args:
            current_mastery: Current mastery probability (0-1)
            last_review_date: Date of last review
            current_interval: Current interval in days
            ease_factor: Ease factor (adjusts interval growth)
        
        Returns:
            Next review date and updated interval
        """
        if last_review_date is None:
            last_review_date = datetime.now()
        
        # Determine quality based on mastery level
        if current_mastery >= 0.9:
            quality = 5  # Excellent - large interval increase
        elif current_mastery >= 0.7:
            quality = 4  # Good - moderate increase
        elif current_mastery >= 0.5:
            quality = 3  # Pass - small increase
        elif current_mastery >= 0.3:
            quality = 2  # Fail - reset or small decrease
        else:
            quality = 1  # Poor - reset interval
        
        # SM-2 Algorithm
        if quality < 3:
            # Failed - reset interval
            new_interval = self.min_interval
            ease_factor = max(1.3, ease_factor - 0.2)
        else:
            # Passed - increase interval
            if current_interval == 0:
                new_interval = self.min_interval
            elif current_interval == self.min_interval:
                new_interval = 6
            else:
                new_interval = int(current_interval * ease_factor)
            
            # Adjust ease factor based on quality
            ease_factor = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
            ease_factor = max(1.3, ease_factor)  # Minimum ease factor
        
        # Clamp interval
        new_interval = max(self.min_interval, min(self.max_interval, new_interval))
        
        # Calculate next review date
        next_review = last_review_date + timedelta(days=new_interval)
        
        return {
            'nextReviewDate': next_review.isoformat(),
            'interval': new_interval,
            'easeFactor': ease_factor,
            'quality': quality
        }
    
    def get_due_concepts(
        self,
        mastery_records: List[Dict],
        current_date: Optional[datetime] = None
    ) -> List[Dict]:
        """
        Get concepts that are due for review
        
        Args:
            mastery_records: List of concept mastery records with nextReviewDate
            current_date: Current date (defaults to now)
        
        Returns:
            List of concepts due for review, sorted by how overdue they are
        """
        if current_date is None:
            current_date = datetime.now()
        
        due_concepts = []
        
        for record in mastery_records:
            next_review_str = record.get('nextReviewDate')
            if next_review_str:
                try:
                    next_review = datetime.fromisoformat(next_review_str.replace('Z', '+00:00'))
                    if next_review <= current_date:
                        days_overdue = (current_date - next_review).days
                        due_concepts.append({
                            **record,
                            'daysOverdue': days_overdue
                        })
                except (ValueError, AttributeError):
                    # If nextReviewDate is invalid, consider it due
                    due_concepts.append({
                        **record,
                        'daysOverdue': 999
                    })
        
        # Sort by days overdue (most overdue first)
        return sorted(due_concepts, key=lambda x: x.get('daysOverdue', 0), reverse=True)


class EarlyInterventionDetector:
    """
    Early Intervention System
    Detects at-risk students and predicts future performance
    """
    
    def __init__(self):
        # Risk thresholds
        self.high_risk_threshold = 0.7
        self.medium_risk_threshold = 0.4
        self.passing_score = 75.0  # 75% is passing
    
    def calculate_risk_score(
        self,
        current_scores: Dict[str, float],
        score_trend: List[float],
        consistency: float,
        improvement_rate: float,
        weeks_until_exam: int = 8
    ) -> Dict:
        """
        Calculate risk score for a student
        
        Args:
            current_scores: Current scores by subject
            score_trend: Historical scores (most recent last)
            consistency: Score consistency (0-1, higher = more consistent)
            improvement_rate: Rate of improvement per week
            weeks_until_exam: Weeks until board exam
        
        Returns:
            Risk assessment with score, level, and recommendations
        """
        # Calculate average current score
        avg_score = np.mean(list(current_scores.values())) if current_scores else 0.0
        
        # Calculate trend (slope of scores over time)
        if len(score_trend) >= 2:
            trend_slope = np.polyfit(range(len(score_trend)), score_trend, 1)[0]
        else:
            trend_slope = 0.0
        
        # Predict future score
        predicted_score = avg_score + (improvement_rate * weeks_until_exam)
        
        # Risk factors
        risk_factors = []
        risk_score = 0.0
        
        # Factor 1: Current performance
        if avg_score < 60:
            risk_score += 0.4
            risk_factors.append("Current average score is below 60%")
        elif avg_score < 70:
            risk_score += 0.2
            risk_factors.append("Current average score is below 70%")
        
        # Factor 2: Predicted performance
        if predicted_score < self.passing_score:
            risk_score += 0.3
            risk_factors.append(f"Predicted score ({predicted_score:.1f}%) is below passing threshold")
        
        # Factor 3: Trend (declining performance)
        if trend_slope < -1.0:  # Declining by more than 1% per test
            risk_score += 0.2
            risk_factors.append("Performance is declining")
        elif trend_slope < 0:
            risk_score += 0.1
            risk_factors.append("Performance is slightly declining")
        
        # Factor 4: Consistency
        if consistency < 0.6:
            risk_score += 0.1
            risk_factors.append("Inconsistent performance")
        
        # Factor 5: Improvement rate
        if improvement_rate < 0.5:  # Less than 0.5% improvement per week
            risk_score += 0.1
            risk_factors.append("Low improvement rate")
        
        # Clamp risk score
        risk_score = min(1.0, max(0.0, risk_score))
        
        # Determine risk level
        if risk_score >= self.high_risk_threshold:
            risk_level = "high"
        elif risk_score >= self.medium_risk_threshold:
            risk_level = "medium"
        else:
            risk_level = "low"
        
        # Generate recommendations
        recommendations = self._generate_recommendations(
            risk_score, avg_score, predicted_score, risk_factors
        )
        
        return {
            'riskScore': float(risk_score),
            'riskLevel': risk_level,
            'predictedScore': float(predicted_score),
            'currentAverageScore': float(avg_score),
            'weeksUntilExam': weeks_until_exam,
            'riskFactors': risk_factors,
            'recommendations': recommendations
        }
    
    def _generate_recommendations(
        self,
        risk_score: float,
        avg_score: float,
        predicted_score: float,
        risk_factors: List[str]
    ) -> List[str]:
        """Generate personalized recommendations based on risk assessment"""
        recommendations = []
        
        if risk_score >= 0.7:
            recommendations.append("URGENT: Schedule a meeting with your instructor")
            recommendations.append("Increase study time to at least 3-4 hours per day")
            recommendations.append("Focus on fundamental concepts before advanced topics")
            recommendations.append("Consider joining a study group or seeking tutoring")
        elif risk_score >= 0.4:
            recommendations.append("Increase study time to 2-3 hours per day")
            recommendations.append("Focus on your weakest subjects first")
            recommendations.append("Review past tests and understand mistakes")
            recommendations.append("Set up a consistent study schedule")
        else:
            recommendations.append("Maintain current study habits")
            recommendations.append("Continue focusing on areas for improvement")
            recommendations.append("Take practice tests regularly")
        
        if avg_score < 70:
            recommendations.append("Prioritize review of basic concepts")
        
        if predicted_score < 75:
            recommendations.append(f"Need to improve by {75 - predicted_score:.1f}% to pass")
        
        return recommendations

