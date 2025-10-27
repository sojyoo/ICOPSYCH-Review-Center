"""
FOCUSED BSP 4A ML MODEL - Pre/Post Tests Only
Targeting 85%+ accuracy with refined parameters
"""

import pandas as pd
import numpy as np
import os
import glob
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.feature_selection import SelectKBest, f_classif
import warnings
warnings.filterwarnings('ignore')

class BSP4AFocusedModel:
    def __init__(self):
        self.scaler = StandardScaler()
        self.label_encoders = {}
        self.models = {}
        self.feature_importance = {}

        # Refined subtopic mapping for BSP 4A
        self.subtopic_mapping = {
            'Abnormal Psychology': {
                'Disorders': ['anxiety', 'depression', 'schizophrenia', 'personality'],
                'Assessment': ['diagnosis', 'symptoms', 'criteria'],
                'Treatment': ['therapy', 'medication', 'intervention']
            },
            'Developmental Psychology': {
                'Theories': ['freud', 'piaget', 'erikson', 'vygotsky'],
                'Stages': ['childhood', 'adolescence', 'adulthood'],
                'Methods': ['longitudinal', 'cross-sectional', 'research']
            },
            'Industrial Psychology': {
                'Organization': ['theory', 'structure', 'management'],
                'Human Resources': ['recruitment', 'training', 'development'],
                'Team Dynamics': ['leadership', 'motivation', 'performance']
            },
            'Psychological Assessment': {
                'Principles': ['reliability', 'validity', 'standardization'],
                'Methods': ['testing', 'interview', 'observation'],
                'Ethics': ['confidentiality', 'consent', 'fairness']
            }
        }

    def load_bsp4a_data(self):
        """Load only BSP 4A pre-test and post-test data"""
        print("Loading BSP 4A focused data (pre/post tests only)...")

        data_frames = []
        file_count = 0

        # BSP 4A Pre-Tests
        pretest_patterns = [
            "Pre-Tests/BSP4A/**/*.xlsx", "Pre-Tests/BSP4A/*.xlsx",
            "Pre-Tests/BSP4B/**/*.xlsx", "Pre-Tests/BSP4B/*.xlsx"
        ]

        for pattern in pretest_patterns:
            files = glob.glob(pattern, recursive=True)
            for file_path in files:
                if 'BSP4A' in file_path or 'BSP 4A' in file_path:
                    try:
                        df = pd.read_excel(file_path)
                        df['test_type'] = 'pretest'
                        df['file_path'] = file_path
                        df['subject'] = self.extract_subject_from_path(file_path)
                        df['source'] = 'bsp4a_pretest'
                        data_frames.append(df)
                        file_count += 1
                        print(f"Loaded BSP4A pretest: {os.path.basename(file_path)}")
                    except Exception as e:
                        print(f"Error loading {file_path}: {e}")

        # BSP 4A Post-Tests
        posttest_patterns = [
            "Posttests/BSP 4A/**/*.xlsx", "Posttests/BSP 4A/*.xlsx",
            "Posttests/BSP 4B/**/*.xlsx", "Posttests/BSP 4B/*.xlsx"
        ]

        for pattern in posttest_patterns:
            files = glob.glob(pattern, recursive=True)
            for file_path in files:
                try:
                    df = pd.read_excel(file_path)
                    df['test_type'] = 'posttest'
                    df['file_path'] = file_path
                    df['subject'] = self.extract_subject_from_path(file_path)
                    df['source'] = 'bsp4a_posttest'
                    data_frames.append(df)
                    file_count += 1
                    print(f"Loaded BSP4A posttest: {os.path.basename(file_path)}")
                except Exception as e:
                    print(f"Error loading {file_path}: {e}")

        self.raw_data = pd.concat(data_frames, ignore_index=True)
        print(f"Total BSP 4A files loaded: {file_count}")
        print(f"Total BSP 4A records: {len(self.raw_data)}")
        print(f"Unique BSP 4A students: {self.raw_data['Email Address'].nunique()}")

        return self.raw_data

    def extract_subject_from_path(self, file_path):
        """Extract subject from BSP 4A file path"""
        path_upper = file_path.upper()
        if 'ABNORMAL' in path_upper:
            return 'Abnormal Psychology'
        elif 'DEVELOPMENTAL' in path_upper:
            return 'Developmental Psychology'
        elif 'INDUSTRIAL' in path_upper:
            return 'Industrial Psychology'
        elif 'PSYCHOLOGICAL ASSESSMENT' in path_upper or 'PSYCH ASSESSMENT' in path_upper:
            return 'Psychological Assessment'
        else:
            return 'Unknown'

    def create_question_features(self, df):
        """Create features from individual question responses for BSP 4A"""
        print("Creating BSP 4A question-level features...")

        # Identify question columns (exclude metadata columns)
        metadata_cols = ['Timestamp', 'Email Address', 'Score', 'Last Name, First Name, MI',
                        'Section', 'test_type', 'file_path', 'subject', 'source']
        question_cols = [col for col in df.columns if col not in metadata_cols]

        print(f"Found {len(question_cols)} question columns in BSP 4A data")

        # For each question, create features
        question_features = []

        for col in question_cols:
            if col in df.columns and df[col].notna().any():
                # Get most common answer (likely correct)
                answer_counts = df[col].value_counts()
                if len(answer_counts) > 0:
                    correct_answer = answer_counts.index[0]  # Most common = likely correct

                    # Create binary feature: 1 if correct, 0 if wrong
                    feature_name = f"q_{col[:50].replace(' ', '_').replace('?', '').replace(':', '').replace(',', '')}_correct"
                    df[feature_name] = (df[col] == correct_answer).astype(int)
                    question_features.append(feature_name)

        print(f"Created {len(question_features)} question correctness features")
        return df, question_features

    def create_performance_features(self, df):
        """Create performance-based features for BSP 4A"""
        print("Creating BSP 4A performance features...")

        # Score percentage (assuming out of 30 for BSP 4A)
        df['score_percentage'] = (df['Score'] / 30) * 100

        # Performance category for BSP 4A
        df['performance_level'] = pd.cut(df['score_percentage'],
                                       bins=[0, 70, 80, 90, 100],
                                       labels=['needs_improvement', 'fair', 'good', 'excellent'])

        # Subject-specific performance for BSP 4A
        subject_avg_scores = df.groupby('subject')['score_percentage'].transform('mean')
        df['subject_relative_performance'] = df['score_percentage'] - subject_avg_scores

        # Pre/Post improvement tracking for BSP 4A
        df['test_sequence'] = df.groupby(['Email Address', 'subject'])['test_type'].transform(lambda x: x.map({'pretest': 0, 'posttest': 1}))

        return df

    def create_subtopic_features(self, df):
        """Create refined subtopic features for BSP 4A"""
        print("Creating refined BSP 4A subtopic-level features...")

        subtopic_features = []

        # For each subject, analyze question text to identify subtopics
        for subject in df['subject'].unique():
            if subject != 'Unknown':
                subject_data = df[df['subject'] == subject].copy()
                question_cols = [col for col in subject_data.columns
                               if col.startswith('q_') and col.endswith('_correct')]

                # Get subtopics for this subject
                subtopics = self.subtopic_mapping.get(subject, {})

                # For each subtopic, find related questions and aggregate performance
                for subtopic_name, keywords in subtopics.items():
                    related_questions = []

                    # Find questions related to this subtopic
                    for col in question_cols:
                        question_text = col.replace('q_', '').replace('_correct', '').lower()
                        if any(keyword in question_text for keyword in keywords):
                            related_questions.append(col)

                    if related_questions:
                        # Create subtopic performance feature
                        feature_name = f"{subject.lower().replace(' ', '_')}_{subtopic_name.lower().replace(' ', '_')}_performance"
                        subject_data[feature_name] = subject_data[related_questions].mean(axis=1)
                        subtopic_features.append(feature_name)

                # Update the main dataframe
                df.update(subject_data)

        print(f"Created {len(subtopic_features)} refined subtopic performance features")
        return df, subtopic_features

    def prepare_ml_features(self, df):
        """Prepare features for BSP 4A ML model"""
        print("Preparing BSP 4A ML features...")

        # Base features for BSP 4A
        base_features = [
            'score_percentage',
            'subject_relative_performance',
            'test_sequence'
        ]

        # Question correctness features
        question_features = [col for col in df.columns if col.startswith('q_') and col.endswith('_correct')]

        # Subtopic features
        subtopic_features = [col for col in df.columns if '_performance' in col]

        # Combine all features
        feature_cols = base_features + question_features + subtopic_features

        # Ensure all feature columns exist
        feature_cols = [col for col in feature_cols if col in df.columns]

        print(f"Using {len(feature_cols)} features for BSP 4A ML")

        # Prepare X and y
        X = df[feature_cols].copy()

        # Handle missing values
        X = X.fillna(X.mean())

        # Encode categorical target for BSP 4A
        if 'performance_level' in df.columns:
            y = df['performance_level'].copy()
            y = y.fillna(y.mode()[0])  # Fill missing with most common
        else:
            # Fallback: create binary target based on score
            y = (df['score_percentage'] >= 75).astype(int)

        print(f"BSP 4A target distribution: {y.value_counts().to_dict()}")

        return X, y, feature_cols

    def train_models(self, X, y, feature_cols):
        """Train ML models optimized for BSP 4A data"""
        print("Training BSP 4A optimized ML models...")

        # Split data with BSP 4A focus
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )

        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)

        # Models optimized for BSP 4A
        models = {
            'Random Forest BSP4A': RandomForestClassifier(
                n_estimators=150,
                max_depth=8,
                min_samples_split=4,
                min_samples_leaf=2,
                random_state=42
            ),
            'Gradient Boosting BSP4A': GradientBoostingClassifier(
                n_estimators=150,
                learning_rate=0.08,
                max_depth=5,
                min_samples_split=4,
                random_state=42
            )
        }

        results = {}

        for name, model in models.items():
            print(f"\nTraining {name}...")

            # Train model
            model.fit(X_train_scaled, y_train)

            # Predictions
            train_pred = model.predict(X_train_scaled)
            test_pred = model.predict(X_test_scaled)

            # Performance metrics
            train_acc = accuracy_score(y_train, train_pred)
            test_acc = accuracy_score(y_test, test_pred)

            print(f"Train Accuracy: {train_acc:.3f}, Test Accuracy: {test_acc:.3f}")

            # Cross-validation optimized for BSP 4A
            cv_scores = cross_val_score(
                model, X_train_scaled, y_train,
                cv=StratifiedKFold(n_splits=10, shuffle=True, random_state=42),
                scoring='accuracy'
            )

            cv_mean = cv_scores.mean()
            cv_std = cv_scores.std()

            print(f"CV Mean: {cv_mean:.3f} (+/- {cv_std:.3f})")

            # Feature importance for BSP 4A
            if hasattr(model, 'feature_importances_'):
                feature_importance = pd.DataFrame({
                    'feature': feature_cols,
                    'importance': model.feature_importances_
                }).sort_values('importance', ascending=False)

                print("Top 10 BSP 4A important features:")
                print(feature_importance.head(10))

            # Store results
            results[name] = {
                'model': model,
                'train_accuracy': train_acc,
                'test_accuracy': test_acc,
                'cv_mean': cv_mean,
                'cv_std': cv_std,
                'cv_scores': cv_scores
            }

            self.models[name] = model

        return results

    def analyze_weaknesses_bsp4a(self, df):
        """Analyze student weaknesses optimized for BSP 4A"""
        print("Analyzing BSP 4A student weaknesses...")

        weakness_analysis = []

        for email in df['Email Address'].unique():
            student_data = df[df['Email Address'] == email]

            for subject in student_data['subject'].unique():
                subject_data = student_data[student_data['subject'] == subject]

                if len(subject_data) > 0:
                    # Find subtopic performance features for BSP 4A
                    subtopic_cols = [col for col in subject_data.columns
                                   if '_performance' in col and subject.lower().replace(' ', '_') in col]

                    weaknesses = []
                    for col in subtopic_cols:
                        performance = subject_data[col].mean()
                        if performance < 0.75:  # More lenient threshold for BSP 4A
                            subtopic_name = col.replace(f"{subject.lower().replace(' ', '_')}_", "").replace("_performance", "")
                            weaknesses.append({
                                'subtopic': subtopic_name,
                                'performance': performance,
                                'subject': subject
                            })

                    if weaknesses:
                        weakness_analysis.append({
                            'email': email,
                            'subject': subject,
                            'weaknesses': weaknesses,
                            'overall_score': subject_data['score_percentage'].mean(),
                            'test_type': subject_data['test_type'].iloc[0]
                        })

        return weakness_analysis

    def generate_recommendations_bsp4a(self, weakness_analysis):
        """Generate BSP 4A focused recommendations"""
        print("Generating BSP 4A personalized recommendations...")

        recommendations = []

        for student in weakness_analysis:
            email = student['email']
            subject = student['subject']
            weaknesses = student['weaknesses']
            test_type = student['test_type']

            # Sort weaknesses by performance (worst first)
            weaknesses.sort(key=lambda x: x['performance'])

            # Create BSP 4A specific recommendations
            recs = []
            for weakness in weaknesses[:3]:  # Top 3 weaknesses for BSP 4A
                subtopic = weakness['subtopic']
                performance = weakness['performance']

                # Generate specific recommendation for BSP 4A
                recommendation = self.create_bsp4a_recommendation(subject, subtopic, performance, test_type)
                recs.append(recommendation)

            recommendations.append({
                'email': email,
                'subject': subject,
                'test_type': test_type,
                'weaknesses': weaknesses,
                'recommendations': recs,
                'priority_level': 'high' if len(weaknesses) >= 2 else 'medium'
            })

        return recommendations

    def create_bsp4a_recommendation(self, subject, subtopic, performance, test_type):
        """Create BSP 4A specific recommendation"""
        recommendations_db = {
            'Abnormal Psychology': {
                'disorders': "Review DSM-5 criteria for mental disorders and symptom patterns",
                'assessment': "Practice diagnostic assessment techniques and case studies",
                'treatment': "Study therapeutic interventions and treatment approaches"
            },
            'Developmental Psychology': {
                'theories': "Master major developmental theories and their applications",
                'stages': "Focus on developmental milestones across life stages",
                'methods': "Practice research methods used in developmental studies"
            },
            'Industrial Psychology': {
                'organization': "Study organizational theories and workplace structures",
                'human_resources': "Review HR management and employee development",
                'team_dynamics': "Focus on team leadership and workplace motivation"
            },
            'Psychological Assessment': {
                'principles': "Master test reliability, validity, and standardization",
                'methods': "Practice different assessment methods and techniques",
                'ethics': "Review ethical guidelines in psychological assessment"
            }
        }

        # Get recommendation text
        subject_rec = recommendations_db.get(subject, {})
        rec_text = subject_rec.get(subtopic, f"Review {subtopic.replace('_', ' ')} concepts")

        # Calculate study hours based on BSP 4A context
        hours_needed = max(3, int((1 - performance) * 12))  # 3-12 hours for BSP 4A

        return {
            'subtopic': subtopic,
            'recommendation': rec_text,
            'hours_needed': hours_needed,
            'priority': 'high' if performance < 0.6 else 'medium',
            'test_type': test_type
        }

    def export_bsp4a_results(self, results, weakness_analysis, recommendations):
        """Export BSP 4A focused results"""
        print("Exporting BSP 4A focused results...")

        # Model performance results
        model_results = []
        for model_name, result in results.items():
            model_results.append({
                'Model': model_name,
                'Train_Accuracy': result['train_accuracy'],
                'Test_Accuracy': result['test_accuracy'],
                'CV_Mean': result['cv_mean'],
                'CV_Std': result['cv_std'],
                'Target_Achieved': 'YES' if result['cv_mean'] >= 0.85 else 'NO'
            })

        pd.DataFrame(model_results).to_excel('bsp4a_model_performance.xlsx', index=False)

        # Individual CV scores
        cv_scores = []
        for model_name, result in results.items():
            for i, score in enumerate(result['cv_scores']):
                cv_scores.append({
                    'Model': model_name,
                    'Fold': i+1,
                    'Accuracy': score
                })

        pd.DataFrame(cv_scores).to_excel('bsp4a_cross_validation.xlsx', index=False)

        # BSP 4A weakness analysis
        weakness_data = []
        for student in weakness_analysis:
            for weakness in student['weaknesses']:
                weakness_data.append({
                    'Email': student['email'],
                    'Subject': student['subject'],
                    'Test_Type': student['test_type'],
                    'Subtopic': weakness['subtopic'],
                    'Performance': weakness['performance'],
                    'Overall_Score': student['overall_score']
                })

        pd.DataFrame(weakness_data).to_excel('bsp4a_weakness_analysis.xlsx', index=False)

        # BSP 4A recommendations
        rec_data = []
        for student in recommendations:
            for rec in student['recommendations']:
                rec_data.append({
                    'Email': student['email'],
                    'Subject': student['subject'],
                    'Test_Type': student['test_type'],
                    'Subtopic': rec['subtopic'],
                    'Recommendation': rec['recommendation'],
                    'Hours_Needed': rec['hours_needed'],
                    'Priority': rec['priority'],
                    'Overall_Priority': student['priority_level']
                })

        pd.DataFrame(rec_data).to_excel('bsp4a_recommendations.xlsx', index=False)

        print("✅ BSP 4A results exported:")
        print("   - bsp4a_model_performance.xlsx")
        print("   - bsp4a_cross_validation.xlsx")
        print("   - bsp4a_weakness_analysis.xlsx")
        print("   - bsp4a_recommendations.xlsx")

def main():
    """Main function for BSP 4A focused model"""
    print("🎯 BSP 4A FOCUSED ML MODEL - Pre/Post Tests Only")
    print("=" * 55)

    model = BSP4AFocusedModel()

    # Phase 1: Load BSP 4A data only
    print("\n📊 PHASE 1: LOADING BSP 4A DATA")
    df = model.load_bsp4a_data()

    # Phase 2: Create features for BSP 4A
    print("\n🔧 PHASE 2: BSP 4A FEATURE ENGINEERING")
    df, question_features = model.create_question_features(df)
    df = model.create_performance_features(df)
    df, subtopic_features = model.create_subtopic_features(df)

    # Phase 3: Prepare ML features for BSP 4A
    print("\n🤖 PHASE 3: PREPARING BSP 4A ML FEATURES")
    X, y, feature_cols = model.prepare_ml_features(df)

    # Phase 4: Train BSP 4A models
    print("\n🎯 PHASE 4: TRAINING BSP 4A ML MODELS")
    results = model.train_models(X, y, feature_cols)

    # Phase 5: Analyze BSP 4A weaknesses
    print("\n📈 PHASE 5: ANALYZING BSP 4A WEAKNESSES")
    weakness_analysis = model.analyze_weaknesses_bsp4a(df)
    recommendations = model.generate_recommendations_bsp4a(weakness_analysis)

    # Phase 6: Export BSP 4A results
    print("\n💾 PHASE 6: EXPORTING BSP 4A RESULTS")
    model.export_bsp4a_results(results, weakness_analysis, recommendations)

    # Summary
    print("\n" + "="*55)
    print("🎉 BSP 4A MODEL TRAINING COMPLETE!")
    print("="*55)

    best_model = max(results.items(), key=lambda x: x[1]['cv_mean'])
    best_accuracy = best_model[1]['cv_mean'] * 100

    print(f"🏆 BEST BSP 4A MODEL: {best_model[0]} with {best_accuracy:.1f}% CV Accuracy")

    if best_accuracy >= 85:
        print("✅ TARGET ACHIEVED: BSP 4A model accuracy is 85% or higher!")
    else:
        print("⚠️  TARGET NOT MET: Need further BSP 4A optimizations")

    print(f"\n📊 BSP 4A SUMMARY:")
    print(f"   - BSP 4A students analyzed: {len(weakness_analysis)}")
    print(f"   - Students with weaknesses: {len([s for s in weakness_analysis if s['weaknesses']])}")
    print(f"   - BSP 4A recommendations: {len(recommendations)}")
    print(f"   - BSP 4A subtopic analysis: ✅ Enabled")
    print(f"   - BSP 4A 10-fold CV: ✅ Implemented")
    print(f"   - BSP 4A pre/post tracking: ✅ Enabled")

    return model, results, weakness_analysis, recommendations

if __name__ == "__main__":
    model, results, weakness_analysis, recommendations = main()


