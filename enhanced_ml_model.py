"""
Enhanced ML Model for ICOPSYCH Adaptive Review System
Provides topic-level recommendations and advanced analytics
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import classification_report, mean_squared_error, r2_score
import matplotlib.pyplot as plt
import seaborn as sns
from typing import Dict, List, Tuple
import warnings
warnings.filterwarnings('ignore')

class EnhancedICOPSYCHModel:
    def __init__(self):
        self.topic_classifier = None
        self.recommendation_generator = None
        self.risk_assessor = None
        self.scalers = {}
        self.encoders = {}
        
        # Topic importance weights based on syllabus
        self.topic_weights = {
            'Abnormal Psychology': {
                'Manifestations_of_Behavior': 0.3,
                'Theoretical_Approaches': 0.4,
                'Socio_Cultural_Factors': 0.3
            },
            'Industrial Psychology': {
                'Organization_Theory': 0.35,
                'Human_Resources': 0.35,
                'Organizational_Change': 0.3
            },
            'Psychological Assessment': {
                'Psychometric_Properties': 0.35,
                'Assessment_Tools': 0.3,
                'Test_Administration': 0.35
            },
            'Developmental Psychology': {
                'Nature_Nurture': 0.25,
                'Developmental_Theories': 0.5,
                'Developmental_Stages': 0.25
            }
        }
        
        # Board exam benchmarks
        self.board_benchmarks = {
            'passing_score': 75.0,
            'excellent_score': 85.0,
            'outstanding_score': 90.0
        }

    def load_data(self):
        """Load enhanced datasets"""
        print("Loading enhanced datasets...")
        
        self.student_features = pd.read_csv('enhanced_student_features.csv')
        self.topic_scores = pd.read_csv('topic_level_scores.csv')
        self.recommendations = pd.read_csv('personalized_topic_recommendations.csv')
        
        print(f"Loaded {len(self.student_features)} student profiles")
        print(f"Loaded {len(self.topic_scores)} topic-level scores")
        print(f"Loaded {len(self.recommendations)} recommendations")

    def prepare_features(self):
        """Prepare features for ML models"""
        print("Preparing features for ML models...")
        
        # Prepare student features
        feature_cols = [
            'overall_avg_score', 'overall_std', 'improvement_rate',
            'score_consistency', 'improvement_consistency', 'study_hours_per_week',
            'study_consistency', 'abnormal_psych_score', 'developmental_psych_score',
            'industrial_psych_score', 'psychological_assessment_score',
            'total_tests_taken', 'avg_tests_per_subject'
        ]
        
        self.X_features = self.student_features[feature_cols].copy()
        
        # Encode categorical variables
        categorical_cols = ['study_pattern', 'preferred_study_time', 'learning_style', 'board_exam_risk']
        for col in categorical_cols:
            if col not in self.encoders:
                self.encoders[col] = LabelEncoder()
            self.student_features[f'{col}_encoded'] = self.encoders[col].fit_transform(self.student_features[col])
        
        # Add encoded categorical features
        encoded_cols = [f'{col}_encoded' for col in categorical_cols]
        self.X_features = pd.concat([self.X_features, self.student_features[encoded_cols]], axis=1)
        
        # Scale features
        self.scaler = StandardScaler()
        self.X_features_scaled = self.scaler.fit_transform(self.X_features)
        
        print(f"Prepared {self.X_features_scaled.shape[1]} features for {self.X_features_scaled.shape[0]} students")

    def train_risk_assessment_model(self):
        """Train model to assess board exam risk"""
        print("Training board exam risk assessment model...")
        
        # Create risk labels
        risk_labels = self.student_features['board_exam_risk'].values
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            self.X_features_scaled, risk_labels, test_size=0.2, random_state=42, stratify=risk_labels
        )
        
        # Train model
        self.risk_assessor = RandomForestClassifier(n_estimators=100, random_state=42)
        self.risk_assessor.fit(X_train, y_train)
        
        # Evaluate
        train_score = self.risk_assessor.score(X_train, y_train)
        test_score = self.risk_assessor.score(X_test, y_test)
        
        print(f"Risk Assessment Model - Train Score: {train_score:.3f}, Test Score: {test_score:.3f}")
        
        # Feature importance
        feature_names = self.X_features.columns
        importance_df = pd.DataFrame({
            'feature': feature_names,
            'importance': self.risk_assessor.feature_importances_
        }).sort_values('importance', ascending=False)
        
        print("\nTop 10 Most Important Features for Risk Assessment:")
        print(importance_df.head(10))
        
        return importance_df

    def train_topic_performance_model(self):
        """Train model to predict topic-level performance"""
        print("Training topic-level performance prediction model...")
        
        # Prepare topic-level features
        topic_features = []
        topic_targets = []
        
        for _, topic in self.topic_scores.iterrows():
            student_id = topic['student_id']
            student_data = self.student_features[self.student_features['student_id'] == student_id]
            
            if not student_data.empty:
                # Get student features
                student_row = student_data.iloc[0]
                
                # Create topic-specific features
                topic_feature = [
                    student_row['overall_avg_score'],
                    student_row['score_consistency'],
                    student_row['improvement_rate'],
                    student_row['study_hours_per_week'],
                    student_row['study_consistency'],
                    topic['topic_weight'],
                    topic['week_covered']
                ]
                
                topic_features.append(topic_feature)
                topic_targets.append(topic['topic_score'])
        
        # Convert to arrays and handle NaN values
        X_topic = np.array(topic_features)
        y_topic = np.array(topic_targets)
        
        # Remove rows with NaN values
        nan_mask = np.isnan(X_topic).any(axis=1)
        X_topic = X_topic[~nan_mask]
        y_topic = y_topic[~nan_mask]
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X_topic, y_topic, test_size=0.2, random_state=42
        )
        
        # Train model
        self.topic_classifier = GradientBoostingRegressor(n_estimators=100, random_state=42)
        self.topic_classifier.fit(X_train, y_train)
        
        # Evaluate
        train_pred = self.topic_classifier.predict(X_train)
        test_pred = self.topic_classifier.predict(X_test)
        
        train_r2 = r2_score(y_train, train_pred)
        test_r2 = r2_score(y_test, test_pred)
        train_rmse = np.sqrt(mean_squared_error(y_train, train_pred))
        test_rmse = np.sqrt(mean_squared_error(y_test, test_pred))
        
        print(f"Topic Performance Model - Train R²: {train_r2:.3f}, Test R²: {test_r2:.3f}")
        print(f"Topic Performance Model - Train RMSE: {train_rmse:.3f}, Test RMSE: {test_rmse:.3f}")
        
        return train_r2, test_r2

    def generate_enhanced_recommendations(self, student_id: str) -> Dict:
        """Generate enhanced recommendations for a specific student"""
        print(f"Generating enhanced recommendations for {student_id}...")
        
        # Get student data
        student_data = self.student_features[self.student_features['student_id'] == student_id]
        if student_data.empty:
            return {"error": "Student not found"}
        
        student_row = student_data.iloc[0]
        student_topics = self.topic_scores[self.topic_scores['student_id'] == student_id]
        student_recommendations = self.recommendations[self.recommendations['student_id'] == student_id]
        
        # Calculate overall performance metrics
        overall_score = student_row['overall_avg_score']
        risk_level = student_row['board_exam_risk']
        study_pattern = student_row['study_pattern']
        
        # Identify critical weaknesses
        critical_topics = student_topics[student_topics['topic_score'] < overall_score - 10]
        high_priority_recommendations = student_recommendations[student_recommendations['priority_level'] == 'high']
        
        # Generate personalized study plan
        study_plan = self._create_study_plan(student_row, critical_topics, high_priority_recommendations)
        
        # Generate subject-specific insights
        subject_insights = self._analyze_subject_performance(student_topics)
        
        # Generate timeline recommendations
        timeline = self._create_review_timeline(student_row, critical_topics)
        
        return {
            'student_id': student_id,
            'overall_performance': {
                'current_score': overall_score,
                'risk_level': risk_level,
                'study_pattern': study_pattern,
                'board_exam_readiness': self._assess_board_readiness(overall_score, risk_level)
            },
            'critical_weaknesses': critical_topics[['subject', 'topic_area', 'topic', 'topic_score']].to_dict('records'),
            'high_priority_recommendations': high_priority_recommendations[['subject', 'specific_topic', 'study_strategy', 'estimated_hours']].to_dict('records'),
            'personalized_study_plan': study_plan,
            'subject_insights': subject_insights,
            'review_timeline': timeline,
            'confidence_score': self._calculate_recommendation_confidence(student_row, critical_topics)
        }

    def _create_study_plan(self, student_row, critical_topics, high_priority_recs) -> Dict:
        """Create personalized study plan"""
        study_hours = student_row['study_hours_per_week']
        learning_style = student_row['learning_style']
        
        # Prioritize topics by importance and weakness
        topic_priorities = []
        for _, topic in critical_topics.iterrows():
            subject = topic['subject']
            topic_area = topic['topic_area']
            weight = self.topic_weights.get(subject, {}).get(topic_area, 0.1)
            priority_score = weight * (100 - topic['topic_score'])
            topic_priorities.append((topic, priority_score))
        
        # Sort by priority
        topic_priorities.sort(key=lambda x: x[1], reverse=True)
        
        # Allocate study hours
        weekly_plan = {}
        remaining_hours = study_hours
        
        for i, (topic, priority) in enumerate(topic_priorities[:5]):  # Top 5 priorities
            hours_allocation = min(remaining_hours * 0.3, 3)  # Max 3 hours per topic
            weekly_plan[f"Week_{i+1}"] = {
                'subject': topic['subject'],
                'topic_area': topic['topic_area'],
                'specific_topic': topic['topic'],
                'hours': hours_allocation,
                'strategy': self._get_study_strategy(topic['subject'], topic['topic_area'], learning_style)
            }
            remaining_hours -= hours_allocation
        
        return {
            'total_weekly_hours': study_hours,
            'learning_style': learning_style,
            'weekly_focus': weekly_plan,
            'recommended_schedule': self._create_daily_schedule(study_hours, student_row['preferred_study_time'])
        }

    def _analyze_subject_performance(self, student_topics) -> Dict:
        """Analyze performance by subject"""
        subject_analysis = {}
        
        for subject in ['Abnormal Psychology', 'Developmental Psychology', 'Industrial Psychology', 'Psychological Assessment']:
            subject_topics = student_topics[student_topics['subject'] == subject]
            if not subject_topics.empty:
                avg_score = subject_topics['topic_score'].mean()
                weakest_topic = subject_topics.loc[subject_topics['topic_score'].idxmin()]
                strongest_topic = subject_topics.loc[subject_topics['topic_score'].idxmax()]
                
                subject_analysis[subject] = {
                    'average_score': avg_score,
                    'performance_level': self._categorize_performance(avg_score),
                    'weakest_area': weakest_topic['topic_area'],
                    'weakest_score': weakest_topic['topic_score'],
                    'strongest_area': strongest_topic['topic_area'],
                    'strongest_score': strongest_topic['topic_score'],
                    'improvement_potential': strongest_topic['topic_score'] - weakest_topic['topic_score']
                }
        
        return subject_analysis

    def _create_review_timeline(self, student_row, critical_topics) -> Dict:
        """Create review timeline based on course schedule"""
        weeks_remaining = 18 - 3  # Assuming we're in week 3
        timeline = {}
        
        # Group critical topics by week
        for week in range(4, 18):
            week_topics = critical_topics[critical_topics['week_covered'] == week]
            if not week_topics.empty:
                timeline[f"Week_{week}"] = {
                    'focus_subjects': week_topics['subject'].unique().tolist(),
                    'critical_topics': week_topics[['topic_area', 'topic']].to_dict('records'),
                    'recommended_hours': min(8, len(week_topics) * 2)
                }
        
        return timeline

    def _assess_board_readiness(self, overall_score, risk_level) -> str:
        """Assess board exam readiness"""
        if overall_score >= 80 and risk_level == 'low_risk':
            return 'highly_ready'
        elif overall_score >= 70 and risk_level in ['low_risk', 'medium_risk']:
            return 'moderately_ready'
        else:
            return 'needs_improvement'

    def _calculate_recommendation_confidence(self, student_row, critical_topics) -> float:
        """Calculate confidence in recommendations"""
        base_confidence = 85.0
        
        # Adjust based on data quality
        if student_row['total_tests_taken'] >= 12:
            base_confidence += 5
        if student_row['score_consistency'] >= 0.8:
            base_confidence += 3
        if len(critical_topics) <= 5:
            base_confidence += 2
        
        return min(95, base_confidence)

    def _get_study_strategy(self, subject, topic_area, learning_style) -> str:
        """Get study strategy based on subject and learning style"""
        strategies = {
            'Abnormal Psychology': {
                'Manifestations_of_Behavior': 'Focus on DSM-5 criteria and case studies',
                'Theoretical_Approaches': 'Study etiology models and treatment approaches',
                'Socio_Cultural_Factors': 'Review cultural considerations and global health impacts'
            },
            'Industrial Psychology': {
                'Organization_Theory': 'Practice organizational structure analysis',
                'Human_Resources': 'Focus on HR processes and team dynamics',
                'Organizational_Change': 'Study change management strategies'
            },
            'Psychological Assessment': {
                'Psychometric_Properties': 'Master reliability, validity, and standardization',
                'Assessment_Tools': 'Practice tool selection and administration',
                'Test_Administration': 'Focus on scoring, interpretation, and ethics'
            },
            'Developmental Psychology': {
                'Nature_Nurture': 'Study heredity vs environment influences',
                'Developmental_Theories': 'Master major theorists and their stages',
                'Developmental_Stages': 'Focus on milestones and developmental tasks'
            }
        }
        
        base_strategy = strategies.get(subject, {}).get(topic_area, 'General review and practice')
        
        # Adapt to learning style
        if learning_style == 'conceptual_learner':
            return f"{base_strategy} - Focus on theoretical frameworks and concepts"
        elif learning_style == 'practical_learner':
            return f"{base_strategy} - Emphasize real-world applications and examples"
        else:
            return base_strategy

    def _create_daily_schedule(self, weekly_hours, preferred_time) -> Dict:
        """Create daily study schedule"""
        daily_hours = weekly_hours / 7
        
        schedule = {
            'monday': {'hours': daily_hours, 'time': preferred_time},
            'tuesday': {'hours': daily_hours, 'time': preferred_time},
            'wednesday': {'hours': daily_hours, 'time': preferred_time},
            'thursday': {'hours': daily_hours, 'time': preferred_time},
            'friday': {'hours': daily_hours, 'time': preferred_time},
            'saturday': {'hours': daily_hours * 1.5, 'time': preferred_time},
            'sunday': {'hours': daily_hours * 0.5, 'time': preferred_time}
        }
        
        return schedule

    def _categorize_performance(self, score: float) -> str:
        """Categorize performance level"""
        if score >= 85:
            return 'excellent'
        elif score >= 75:
            return 'good'
        elif score >= 65:
            return 'fair'
        else:
            return 'needs_improvement'

    def generate_summary_report(self) -> Dict:
        """Generate comprehensive summary report"""
        print("Generating comprehensive summary report...")
        
        # Overall statistics
        total_students = len(self.student_features)
        high_risk = len(self.student_features[self.student_features['board_exam_risk'] == 'high_risk'])
        medium_risk = len(self.student_features[self.student_features['board_exam_risk'] == 'medium_risk'])
        low_risk = len(self.student_features[self.student_features['board_exam_risk'] == 'low_risk'])
        
        # Subject performance analysis
        subject_performance = {}
        for subject in ['Abnormal Psychology', 'Developmental Psychology', 'Industrial Psychology', 'Psychological Assessment']:
            col_name = f'{subject.lower().replace(" ", "_")}_score'
            if col_name in self.student_features.columns:
                scores = self.student_features[col_name]
                subject_performance[subject] = {
                    'average': scores.mean(),
                    'std': scores.std(),
                    'students_above_75': len(scores[scores >= 75]),
                    'students_below_65': len(scores[scores < 65])
                }
        
        # Topic-level insights
        topic_insights = {}
        for subject in self.topic_weights.keys():
            subject_topics = self.topic_scores[self.topic_scores['subject'] == subject]
            if not subject_topics.empty:
                topic_insights[subject] = {
                    'average_score': subject_topics['topic_score'].mean(),
                    'most_difficult_topic': subject_topics.loc[subject_topics['topic_score'].idxmin()]['topic'],
                    'easiest_topic': subject_topics.loc[subject_topics['topic_score'].idxmax()]['topic']
                }
        
        return {
            'overall_statistics': {
                'total_students': total_students,
                'high_risk_students': high_risk,
                'medium_risk_students': medium_risk,
                'low_risk_students': low_risk,
                'risk_distribution': {
                    'high_risk_percentage': (high_risk / total_students) * 100,
                    'medium_risk_percentage': (medium_risk / total_students) * 100,
                    'low_risk_percentage': (low_risk / total_students) * 100
                }
            },
            'subject_performance': subject_performance,
            'topic_insights': topic_insights,
            'recommendations_summary': {
                'total_recommendations': len(self.recommendations),
                'high_priority_recommendations': len(self.recommendations[self.recommendations['priority_level'] == 'high']),
                'average_confidence': self.recommendations['confidence_score'].mean()
            }
        }

def main():
    """Main function to run enhanced ML model"""
    model = EnhancedICOPSYCHModel()
    
    # Load and prepare data
    model.load_data()
    model.prepare_features()
    
    # Train models
    importance_df = model.train_risk_assessment_model()
    train_r2, test_r2 = model.train_topic_performance_model()
    
    # Generate summary report
    summary = model.generate_summary_report()
    
    # Save results
    importance_df.to_csv('feature_importance_analysis.csv', index=False)
    
    # Example: Generate recommendations for a specific student
    sample_student = model.student_features['student_id'].iloc[0]
    recommendations = model.generate_enhanced_recommendations(sample_student)
    
    print(f"\nExample recommendations for {sample_student}:")
    print(f"Overall Performance: {recommendations['overall_performance']['current_score']:.1f}")
    print(f"Risk Level: {recommendations['overall_performance']['risk_level']}")
    print(f"Board Readiness: {recommendations['overall_performance']['board_exam_readiness']}")
    print(f"Critical Weaknesses: {len(recommendations['critical_weaknesses'])} topics")
    print(f"High Priority Recommendations: {len(recommendations['high_priority_recommendations'])} items")
    
    return model, summary

if __name__ == "__main__":
    model, summary = main()
