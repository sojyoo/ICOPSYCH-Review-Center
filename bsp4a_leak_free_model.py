"""
BSP 4A Leak-Free Model - Pre/Post Test Analysis
Uses only pre-test question correctness to predict post-test improvement
"""

import pandas as pd
import numpy as np
import os
import glob
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.neighbors import KNeighborsClassifier
from sklearn.naive_bayes import GaussianNB
from sklearn.metrics import accuracy_score, classification_report
import warnings
warnings.filterwarnings('ignore')

class BSP4ALeakFreeModel:
    def __init__(self):
        self.models = {}
        self.scaler = StandardScaler()
        
        # Define all 5 classification models for comparison
        self.classification_models = {
            'Random Forest': RandomForestClassifier(n_estimators=100, random_state=42),
            'Logistic Regression': LogisticRegression(random_state=42, max_iter=1000),
            'Support Vector Machine': SVC(random_state=42, kernel='rbf'),
            'K-Nearest Neighbors': KNeighborsClassifier(n_neighbors=5),
            'Naive Bayes': GaussianNB()
        }
        
        # Expanded subtopic mapping for better coverage
        self.subtopic_mapping = {
            'Abnormal Psychology': {
                'disorders': ['anxiety', 'depression', 'schizophrenia', 'personality', 'disorder', 'mental', 'cognitive', 'psychotic'],
                'diagnosis': ['diagnosis', 'dsm', 'criteria', 'symptoms', 'clinical', 'assessment'],
                'treatment': ['therapy', 'treatment', 'intervention', 'medication', 'therapeutic']
            },
            'Developmental Psychology': {
                'theories': ['freud', 'piaget', 'erikson', 'vygotsky', 'theory', 'development', 'stage'],
                'lifespan': ['childhood', 'adolescence', 'adulthood', 'infancy', 'aging', 'lifespan'],
                'research': ['longitudinal', 'cross-sectional', 'research', 'study', 'method']
            },
            'Industrial Psychology': {
                'organization': ['organization', 'theory', 'structure', 'management', 'leadership'],
                'hr': ['human', 'resource', 'recruitment', 'training', 'development', 'performance'],
                'workplace': ['team', 'motivation', 'dynamics', 'employee', 'work']
            },
            'Psychological Assessment': {
                'psychometrics': ['reliability', 'validity', 'standardization', 'test', 'measurement'],
                'methods': ['assessment', 'testing', 'interview', 'observation', 'evaluation'],
                'ethics': ['ethics', 'confidentiality', 'consent', 'bias', 'fairness']
            }
        }

    def load_bsp4a_data(self):
        """Load BSP 4A pre and post test data"""
        print("Loading BSP 4A pre/post test data...")
        
        # Load pre-tests
        pretest_data = []
        pretest_patterns = [
            "Pre-Tests/BSP4A/**/*.xlsx", "Pre-Tests/BSP4A/*.xlsx",
            "Pre-Tests/BSP4B/**/*.xlsx", "Pre-Tests/BSP4B/*.xlsx"
        ]
        
        for pattern in pretest_patterns:
            files = glob.glob(pattern, recursive=True)
            for file_path in files:
                try:
                    df = pd.read_excel(file_path)
                    df['test_type'] = 'pretest'
                    df['subject'] = self.extract_subject_from_path(file_path)
                    df['lecture'] = self.extract_lecture_from_path(file_path)
                    df['file_path'] = file_path
                    pretest_data.append(df)
                    print(f"Loaded pretest: {os.path.basename(file_path)}")
                except Exception as e:
                    print(f"Error loading pretest {file_path}: {e}")
        
        # Load post-tests
        posttest_data = []
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
                    df['subject'] = self.extract_subject_from_path(file_path)
                    df['lecture'] = self.extract_lecture_from_path(file_path)
                    df['file_path'] = file_path
                    posttest_data.append(df)
                    print(f"Loaded posttest: {os.path.basename(file_path)}")
                except Exception as e:
                    print(f"Error loading posttest {file_path}: {e}")
        
        self.pretest_df = pd.concat(pretest_data, ignore_index=True) if pretest_data else pd.DataFrame()
        self.posttest_df = pd.concat(posttest_data, ignore_index=True) if posttest_data else pd.DataFrame()
        
        print(f"Pretests: {len(self.pretest_df)} records, {self.pretest_df['Email Address'].nunique()} students")
        print(f"Posttests: {len(self.posttest_df)} records, {self.posttest_df['Email Address'].nunique()} students")
        
        return self.pretest_df, self.posttest_df

    def extract_subject_from_path(self, file_path):
        """Extract subject from file path"""
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

    def extract_lecture_from_path(self, file_path):
        """Extract lecture number from file path"""
        if 'Lecture 1' in file_path or 'PrT1' in file_path or 'PoT1' in file_path:
            return 1
        elif 'Lecture 2' in file_path or 'PrT2' in file_path or 'PoT2' in file_path:
            return 2
        elif 'Lecture 3' in file_path or 'PrT3' in file_path or 'PoT3' in file_path:
            return 3
        else:
            return 1  # Default

    def create_question_features(self, df):
        """Create question correctness features from pre-test data"""
        print("Creating question correctness features...")
        
        # Identify question columns
        metadata_cols = ['Timestamp', 'Email Address', 'Score', 'Last Name, First Name, MI',
                        'Section', 'test_type', 'subject', 'lecture', 'file_path']
        question_cols = [col for col in df.columns if col not in metadata_cols]
        
        print(f"Found {len(question_cols)} question columns")
        
        # Create correctness features for each question
        question_features = []
        for col in question_cols:
            if col in df.columns and df[col].notna().any():
                # Get most common answer (likely correct)
                answer_counts = df[col].value_counts()
                if len(answer_counts) > 0:
                    correct_answer = answer_counts.index[0]
                    
                    # Create binary feature
                    feature_name = f"q_{len(question_features):03d}_correct"
                    df[feature_name] = (df[col] == correct_answer).astype(int)
                    question_features.append(feature_name)
        
        print(f"Created {len(question_features)} question correctness features")
        return df, question_features

    def create_subtopic_features(self, df, question_features):
        """Create subtopic performance features"""
        print("Creating subtopic performance features...")
        
        subtopic_features = []
        
        for subject in df['subject'].unique():
            if subject in self.subtopic_mapping:
                subject_data = df[df['subject'] == subject].copy()
                
                # Get question columns for this subject's tests
                question_cols = [col for col in df.columns if col.startswith('q_') and col.endswith('_correct')]
                
                # Map questions to subtopics
                subtopics = self.subtopic_mapping[subject]
                
                for subtopic_name, keywords in subtopics.items():
                    related_questions = []
                    
                    # Find questions related to this subtopic using broader matching
                    for q_col in question_cols:
                        # Get original question text by looking at the data
                        original_cols = [col for col in df.columns if col not in 
                                       ['Timestamp', 'Email Address', 'Score', 'Last Name, First Name, MI',
                                        'Section', 'test_type', 'subject', 'lecture', 'file_path'] + question_features]
                        
                        # Check if any keyword matches in question text
                        for orig_col in original_cols:
                            if any(keyword.lower() in orig_col.lower() for keyword in keywords):
                                related_questions.append(q_col)
                                break
                    
                    if related_questions:
                        # Create subtopic performance feature
                        feature_name = f"{subject.lower().replace(' ', '_')}_{subtopic_name}_performance"
                        if len(subject_data) > 0:
                            subject_data[feature_name] = subject_data[related_questions].mean(axis=1)
                            subtopic_features.append(feature_name)
                            print(f"Created {feature_name} from {len(related_questions)} questions")
                
                # Update main dataframe
                df.update(subject_data)
        
        print(f"Created {len(subtopic_features)} subtopic features")
        return df, subtopic_features

    def pair_pre_post_tests(self):
        """Pair pre and post tests by email, subject, and lecture"""
        print("Pairing pre and post tests...")
        
        paired_data = []
        
        # Group by subject and lecture
        for subject in self.pretest_df['subject'].unique():
            for lecture in self.pretest_df['lecture'].unique():
                pre_subset = self.pretest_df[
                    (self.pretest_df['subject'] == subject) & 
                    (self.pretest_df['lecture'] == lecture)
                ]
                post_subset = self.posttest_df[
                    (self.posttest_df['subject'] == subject) & 
                    (self.posttest_df['lecture'] == lecture)
                ]
                
                if len(pre_subset) > 0 and len(post_subset) > 0:
                    # Find common students
                    common_emails = set(pre_subset['Email Address']) & set(post_subset['Email Address'])
                    
                    if len(common_emails) > 0:
                        print(f"{subject} Lecture {lecture}: {len(common_emails)} paired students")
                        
                        for email in common_emails:
                            pre_row = pre_subset[pre_subset['Email Address'] == email].iloc[0]
                            post_row = post_subset[post_subset['Email Address'] == email].iloc[0]
                            
                            paired_data.append({
                                'email': email,
                                'subject': subject,
                                'lecture': lecture,
                                'pre_score': pre_row['Score'],
                                'post_score': post_row['Score'],
                                'pre_percentage': (pre_row['Score'] / 30) * 100,
                                'post_percentage': (post_row['Score'] / 30) * 100,
                                'improvement': post_row['Score'] - pre_row['Score'],
                                'improvement_percentage': ((post_row['Score'] - pre_row['Score']) / 30) * 100,
                                'post_passed': post_row['Score'] >= 22.5,  # 75% of 30
                                'pre_row_idx': pre_row.name,
                                'post_row_idx': post_row.name
                            })
        
        self.paired_df = pd.DataFrame(paired_data)
        print(f"Created {len(self.paired_df)} paired pre/post records")
        return self.paired_df

    def train_models_by_subject_lecture(self):
        """Train models for each subject-lecture combination"""
        print("Training models by subject-lecture...")
        
        results = []
        cv_scores_list = []
        
        # Get question features from pre-test data
        pretest_with_features, question_features = self.create_question_features(self.pretest_df)
        pretest_with_features, subtopic_features = self.create_subtopic_features(pretest_with_features, question_features)
        
        all_features = question_features + subtopic_features
        
        for subject in self.paired_df['subject'].unique():
            for lecture in self.paired_df['lecture'].unique():
                subset = self.paired_df[
                    (self.paired_df['subject'] == subject) & 
                    (self.paired_df['lecture'] == lecture)
                ]
                
                if len(subset) >= 10:  # Minimum sample size
                    print(f"\nTraining model: {subject} Lecture {lecture} ({len(subset)} students)")
                    
                    # Get features from pre-test data for this subject
                    subject_subtopic_features = [f for f in subtopic_features 
                                               if subject.lower().replace(' ', '_') in f]
                    available_features = question_features + subject_subtopic_features
                    
                    feature_data = []
                    labels = []
                    
                    for _, row in subset.iterrows():
                        pre_idx = row['pre_row_idx']
                        if pre_idx in pretest_with_features.index:
                            # Only use features that exist for this subject
                            existing_features = [f for f in available_features 
                                               if f in pretest_with_features.columns]
                            feature_row = pretest_with_features.loc[pre_idx, existing_features]
                            feature_data.append(feature_row.values)
                            labels.append(row['post_passed'])
                    
                    if len(feature_data) > 0:
                        X = np.array(feature_data)
                        y = np.array(labels)
                        
                        # Handle missing values
                        X = np.nan_to_num(X, nan=0)
                        
                        # Train model if we have both classes
                        if len(np.unique(y)) > 1:
                            # Random Forest
                            rf_model = RandomForestClassifier(n_estimators=100, random_state=42)
                            
                            # 10-fold cross-validation
                            cv_scores = cross_val_score(
                                rf_model, X, y, 
                                cv=min(10, len(X)), 
                                scoring='accuracy'
                            )
                            
                            cv_mean = cv_scores.mean()
                            cv_std = cv_scores.std()
                            
                            # Store results
                            results.append({
                                'Subject': subject,
                                'Lecture': lecture,
                                'Students': len(subset),
                                'Features': len(existing_features),
                                'CV_Mean': cv_mean,
                                'CV_Std': cv_std,
                                'Target_Achieved': 'YES' if cv_mean >= 0.85 else 'NO'
                            })
                            
                            # Store individual CV scores
                            for fold, score in enumerate(cv_scores, 1):
                                cv_scores_list.append({
                                    'Subject': subject,
                                    'Lecture': lecture,
                                    'Fold': fold,
                                    'Accuracy': score
                                })
                            
                            print(f"CV Accuracy: {cv_mean:.3f} (+/- {cv_std:.3f})")
                        else:
                            print("Skipped - only one class in target")
                    else:
                        print("Skipped - no valid feature data")
                else:
                    print(f"Skipped {subject} Lecture {lecture} - insufficient data ({len(subset)} students)")
        
        self.model_results = pd.DataFrame(results)
        self.cv_results = pd.DataFrame(cv_scores_list)
        
        return self.model_results, self.cv_results

    def compare_classification_techniques(self):
        """Compare all 5 classification techniques"""
        print("🤖 Comparing all 5 classification techniques...")
        
        # Get question features from pre-test data
        pretest_with_features, question_features = self.create_question_features(self.pretest_df)
        pretest_with_features, subtopic_features = self.create_subtopic_features(pretest_with_features, question_features)
        
        all_features = question_features + subtopic_features
        comparison_results = []
        
        for subject in self.paired_df['subject'].unique():
            for lecture in self.paired_df['lecture'].unique():
                subset = self.paired_df[
                    (self.paired_df['subject'] == subject) & 
                    (self.paired_df['lecture'] == lecture)
                ]
                
                if len(subset) >= 10:  # Minimum sample size
                    print(f"\n🔬 Comparing models: {subject} Lecture {lecture} ({len(subset)} students)")
                    
                    # Get features from pre-test data for this subject
                    subject_subtopic_features = [f for f in subtopic_features 
                                               if subject.lower().replace(' ', '_') in f]
                    available_features = question_features + subject_subtopic_features
                    
                    feature_data = []
                    labels = []
                    
                    for _, row in subset.iterrows():
                        pre_idx = row['pre_row_idx']
                        if pre_idx in pretest_with_features.index:
                            existing_features = [f for f in available_features 
                                               if f in pretest_with_features.columns]
                            feature_row = pretest_with_features.loc[pre_idx, existing_features]
                            feature_data.append(feature_row.values)
                            labels.append(row['post_passed'])
                    
                    if len(feature_data) > 0 and len(np.unique(labels)) > 1:
                        X = np.array(feature_data)
                        y = np.array(labels)
                        X = np.nan_to_num(X, nan=0)
                        
                        # Scale features for models that need it
                        X_scaled = self.scaler.fit_transform(X)
                        
                        # Compare all models
                        for model_name, model in self.classification_models.items():
                            try:
                                # Choose scaled or unscaled data
                                if model_name in ['Logistic Regression', 'Support Vector Machine', 'K-Nearest Neighbors']:
                                    X_model = X_scaled
                                else:
                                    X_model = X
                                
                                # Cross-validation
                                cv_scores = cross_val_score(
                                    model, X_model, y, 
                                    cv=min(5, len(X)), 
                                    scoring='accuracy'
                                )
                                
                                cv_mean = cv_scores.mean()
                                cv_std = cv_scores.std()
                                
                                comparison_results.append({
                                    'Subject': subject,
                                    'Lecture': lecture,
                                    'Model': model_name,
                                    'Students': len(subset),
                                    'CV_Mean': cv_mean,
                                    'CV_Std': cv_std,
                                    'Target_Achieved': 'YES' if cv_mean >= 0.85 else 'NO'
                                })
                                
                                print(f"   {model_name}: {cv_mean:.3f} (+/- {cv_std:.3f})")
                                
                            except Exception as e:
                                print(f"   {model_name}: Error - {e}")
                                comparison_results.append({
                                    'Subject': subject,
                                    'Lecture': lecture,
                                    'Model': model_name,
                                    'Students': len(subset),
                                    'CV_Mean': 0,
                                    'CV_Std': 0,
                                    'Target_Achieved': 'NO'
                                })
                    else:
                        print(f"   Skipped - insufficient data or single class")
        
        self.comparison_results = pd.DataFrame(comparison_results)
        return self.comparison_results

    def analyze_weaknesses(self):
        """Analyze student weaknesses from pre-test performance"""
        print("Analyzing student weaknesses...")
        
        # Get pre-test features
        pretest_with_features, question_features = self.create_question_features(self.pretest_df)
        pretest_with_features, subtopic_features = self.create_subtopic_features(pretest_with_features, question_features)
        
        weakness_data = []
        
        for _, student in self.paired_df.iterrows():
            email = student['email']
            subject = student['subject']
            pre_idx = student['pre_row_idx']
            
            if pre_idx in pretest_with_features.index:
                student_pre = pretest_with_features.loc[pre_idx]
                
                # Find subtopic performances for this subject
                subject_subtopic_features = [f for f in subtopic_features 
                                           if subject.lower().replace(' ', '_') in f]
                
                for feature in subject_subtopic_features:
                    if feature in student_pre:
                        performance = student_pre[feature]
                        
                        # Consider as weakness if performance < 70%
                        if performance < 0.7:
                            subtopic = feature.replace(f"{subject.lower().replace(' ', '_')}_", "").replace("_performance", "")
                            
                            weakness_data.append({
                                'Email': email,
                                'Subject': subject,
                                'Lecture': student['lecture'],
                                'Subtopic': subtopic,
                                'Performance': performance,
                                'Pre_Score': student['pre_score'],
                                'Post_Score': student['post_score'],
                                'Improvement': student['improvement']
                            })
        
        self.weakness_df = pd.DataFrame(weakness_data)
        print(f"Found {len(self.weakness_df)} weaknesses across {self.weakness_df['Email'].nunique() if len(self.weakness_df) > 0 else 0} students")
        
        return self.weakness_df

    def generate_recommendations(self):
        """Generate personalized recommendations"""
        print("Generating personalized recommendations...")
        
        recommendations = []
        
        if len(self.weakness_df) == 0:
            print("No weaknesses found - generating general recommendations")
            # Generate general recommendations for all students
            for _, student in self.paired_df.iterrows():
                recommendations.append({
                    'Email': student['email'],
                    'Subject': student['subject'],
                    'Lecture': student['lecture'],
                    'Weakest_Subtopic': 'General Review',
                    'Performance': 0.8,  # Assumed good performance
                    'Recommendation': f"Continue practicing {student['subject']} concepts",
                    'Study_Hours': 3,
                    'Priority': 'Low',
                    'Pre_Score': student['pre_score'],
                    'Post_Score': student['post_score'],
                    'Improvement': student['improvement']
                })
        else:
            for email in self.weakness_df['Email'].unique():
                student_weaknesses = self.weakness_df[self.weakness_df['Email'] == email]
                
                # Group by subject and get worst subtopics
                for subject in student_weaknesses['Subject'].unique():
                    subject_weaknesses = student_weaknesses[student_weaknesses['Subject'] == subject]
                worst_subtopic = subject_weaknesses.loc[subject_weaknesses['Performance'].idxmin()]
                
                # Generate recommendation
                rec = self.create_recommendation(subject, worst_subtopic['Subtopic'], 
                                               worst_subtopic['Performance'])
                
                recommendations.append({
                    'Email': email,
                    'Subject': subject,
                    'Lecture': worst_subtopic['Lecture'],
                    'Weakest_Subtopic': worst_subtopic['Subtopic'],
                    'Performance': worst_subtopic['Performance'],
                    'Recommendation': rec['text'],
                    'Study_Hours': rec['hours'],
                    'Priority': rec['priority'],
                    'Pre_Score': worst_subtopic['Pre_Score'],
                    'Post_Score': worst_subtopic['Post_Score'],
                    'Improvement': worst_subtopic['Improvement']
                })
        
        self.recommendations_df = pd.DataFrame(recommendations)
        print(f"Generated {len(self.recommendations_df)} personalized recommendations")
        
        return self.recommendations_df

    def create_recommendation(self, subject, subtopic, performance):
        """Create specific recommendation for subtopic weakness"""
        
        recommendations_map = {
            'Abnormal Psychology': {
                'disorders': "Focus on DSM-5 diagnostic criteria for major mental disorders",
                'diagnosis': "Practice clinical assessment and diagnostic procedures",
                'treatment': "Study evidence-based therapeutic interventions"
            },
            'Developmental Psychology': {
                'theories': "Master key developmental theories and their applications",
                'lifespan': "Review developmental stages and milestones across the lifespan",
                'research': "Practice research methodologies in developmental studies"
            },
            'Industrial Psychology': {
                'organization': "Study organizational theories and workplace structures",
                'hr': "Focus on human resource management and development practices",
                'workplace': "Review team dynamics and employee motivation theories"
            },
            'Psychological Assessment': {
                'psychometrics': "Master test reliability, validity, and standardization concepts",
                'methods': "Practice various psychological assessment techniques",
                'ethics': "Review ethical guidelines in psychological testing"
            }
        }
        
        rec_text = recommendations_map.get(subject, {}).get(subtopic, f"Focus on {subtopic} concepts")
        hours = max(3, int((1 - performance) * 15))  # 3-15 hours based on performance
        priority = 'High' if performance < 0.5 else 'Medium' if performance < 0.7 else 'Low'
        
        return {
            'text': rec_text,
            'hours': hours,
            'priority': priority
        }

    def export_results(self):
        """Export all results to Excel files"""
        print("Exporting results to Excel files...")
        
        # Model performance
        self.model_results.to_excel('bsp4a_model_performance.xlsx', index=False)
        
        # Cross-validation scores
        self.cv_results.to_excel('bsp4a_cross_validation.xlsx', index=False)
        
        # Paired pre/post data
        self.paired_df.to_excel('bsp4a_paired_pre_post.xlsx', index=False)
        
        # Weakness analysis
        self.weakness_df.to_excel('bsp4a_weakness_analysis.xlsx', index=False)
        
        # Recommendations
        self.recommendations_df.to_excel('bsp4a_recommendations.xlsx', index=False)
        
        # Classification comparison results
        if hasattr(self, 'comparison_results'):
            self.comparison_results.to_excel('bsp4a_classification_comparison.xlsx', index=False)
            print("   - bsp4a_classification_comparison.xlsx")
        
        print("✅ Exported all results to Excel files:")
        print("   - bsp4a_model_performance.xlsx")
        print("   - bsp4a_cross_validation.xlsx")
        print("   - bsp4a_paired_pre_post.xlsx")
        print("   - bsp4a_weakness_analysis.xlsx")
        print("   - bsp4a_recommendations.xlsx")

def main():
    """Main function to run BSP 4A leak-free analysis"""
    print("🎯 BSP 4A LEAK-FREE MODEL - Pre/Post Analysis")
    print("=" * 55)
    
    model = BSP4ALeakFreeModel()
    
    # Load data
    print("\n📊 LOADING DATA")
    pretest_df, posttest_df = model.load_bsp4a_data()
    
    # Pair tests
    print("\n🔗 PAIRING PRE/POST TESTS")
    paired_df = model.pair_pre_post_tests()
    
    # Train models
    print("\n🤖 TRAINING MODELS")
    model_results, cv_results = model.train_models_by_subject_lecture()
    
    # Compare classification techniques
    print("\n🔬 COMPARING CLASSIFICATION TECHNIQUES")
    comparison_results = model.compare_classification_techniques()
    
    # Analyze weaknesses
    print("\n📈 ANALYZING WEAKNESSES")
    weakness_df = model.analyze_weaknesses()
    
    # Generate recommendations
    print("\n💡 GENERATING RECOMMENDATIONS")
    recommendations_df = model.generate_recommendations()
    
    # Export results
    print("\n💾 EXPORTING RESULTS")
    model.export_results()
    
    # Summary
    print("\n" + "="*55)
    print("🎉 BSP 4A ANALYSIS COMPLETE!")
    print("="*55)
    
    print(f"📊 RESULTS SUMMARY:")
    print(f"   • Models trained: {len(model_results)}")
    print(f"   • Average CV accuracy: {model_results['CV_Mean'].mean():.3f}")
    print(f"   • Models achieving ≥85%: {len(model_results[model_results['Target_Achieved'] == 'YES'])}")
    print(f"   • Student pairs analyzed: {len(paired_df)}")
    print(f"   • Weaknesses identified: {len(weakness_df)}")
    print(f"   • Recommendations generated: {len(recommendations_df)}")
    
    # Classification comparison summary
    if hasattr(model, 'comparison_results') and len(model.comparison_results) > 0:
        print(f"\n🔬 CLASSIFICATION COMPARISON:")
        model_performance = model.comparison_results.groupby('Model')['CV_Mean'].mean().sort_values(ascending=False)
        print(f"   • Best performing model: {model_performance.index[0]} ({model_performance.iloc[0]:.3f})")
        print(f"   • Random Forest performance: {model_performance.get('Random Forest', 0):.3f}")
        print(f"   • Models compared: {len(model_performance)}")
        print(f"   • Random Forest ranking: {list(model_performance.index).index('Random Forest') + 1} of {len(model_performance)}")
    
    return model

if __name__ == "__main__":
    model = main()
