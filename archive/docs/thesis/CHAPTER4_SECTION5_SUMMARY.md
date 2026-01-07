# Chapter 4: Results and Discussion
## Section 5: Summary and Conclusions

### 4.23 Chapter Summary

This chapter presented a comprehensive evaluation of the adaptive review planning system for Psychometrician Licensure Examination preparation, including data analysis, model comparison, system implementation, and discussion of results. The study addressed all four research questions from the Statement of the Problem through systematic model comparison and evaluation.

#### 4.23.1 Data Presentation and Exploratory Analysis (Section 1)

The study analyzed comprehensive datasets from multiple sources:
- **Training Data**: 154 unique student records from previous cohorts (BSP4A/BSP4B) with performance metrics across four psychology subjects
- **Survey Data**: 44 responses from current 4th-year psychology students capturing study habits, motivations, and challenges
- **Recommendation Data**: 564 subject-level and 329 topic-level recommendations demonstrating system capabilities

Key findings from exploratory data analysis:
- Balanced risk level distribution (33.1% low, 32.5% medium, 34.4% high) ensuring sufficient samples for each category
- Balanced subject distribution across four core psychology subjects (24.8-25.2% each)
- Performance tier distribution showing 50 Excellent, 64 Good, 36 Moderate, and 4 Needs Help students
- Clear correlation between risk levels and performance, validating the quantile-based classification approach
- Significant pre-test to post-test improvements across all subjects, demonstrating learning effectiveness

#### 4.23.2 Model Comparison and Performance Evaluation (Section 2)

Six machine learning models were trained and evaluated using identical datasets and train/test splits:

**Top-Tier Performance (96.77% accuracy):**
- **Random Forest**: Achieved highest accuracy with optimal balance of performance, interpretability, and efficiency
- **Deep Learning**: Matched Random Forest through comprehensive architecture and hyperparameter optimization
- **Curriculum Learning**: Achieved matching performance through enhanced progressive training strategy

**Second-Tier Performance (93.55% accuracy):**
- **Bayesian Optimization**: Achieved strong performance with highest precision (0.946) and uncertainty quantification capabilities

**Third-Tier Performance (77.42% accuracy):**
- **Multi-Armed Bandits**: Moderate performance with potential for online learning scenarios

**Fourth-Tier Performance (64.52% accuracy):**
- **Reinforcement Learning**: Lower performance due to feature discretization challenges, with potential for sequential decision-making scenarios

All models were trained with comprehensive hyperparameter optimization, ensuring fair comparison and genuine implementation of each technique.

#### 4.23.3 System Implementation and Deployment (Section 3)

The system was successfully implemented as a three-tier architecture:
- **Frontend**: Next.js web application providing user interface
- **Backend API**: Flask-based ML service serving Random Forest model
- **Data Layer**: PostgreSQL database for student records

Key implementation achievements:
- Feature alignment between training and inference ensuring consistent performance
- Robust fallback mechanism for continuous service availability
- Cold-start handling for new students using survey feature aggregates
- Real-time recommendation generation with < 500ms response time
- Cloud deployment configuration (Render.com for ML service, Vercel for web application)

#### 4.23.4 Discussion of Results (Section 4)

The discussion interpreted findings in the context of adaptive review planning:

**Model Performance:**
- Multiple techniques can achieve top-tier performance when properly optimized
- Random Forest emerged as optimal for practical deployment due to interpretability and efficiency
- Alternative approaches provide options for future enhancements

**Feature Importance:**
- Performance-based features (subject scores, consistency, improvement) are most predictive
- Study habits provide valuable personalization context but lower predictive value
- Subject-specific weaknesses are critical risk indicators

**System Implementation:**
- Microservices architecture enables independent scaling and deployment
- Fallback mechanisms ensure reliable service delivery
- Integration successfully combines performance-based and survey-enhanced personalization

### 4.24 Answers to Statement of the Problem

#### 4.24.1 Research Question 1: Features for Adaptive Review Plan

**Answer**: The most effective features for adaptive review planning are:

**a. Study Habits**: Captured through survey data (planning, discipline, active learning, environment, collaboration, feedback, confidence) and performance-derived metrics (study hours per week). While survey features provide personalization context, performance outcomes are more predictive of risk level.

**b. Academic Attendance and Performance**: Subject-specific scores (Abnormal, Developmental, Industrial, Assessment), overall average score, score consistency, and improvement rate are primary risk indicators. Test-taking patterns (total tests taken, average tests per subject) capture attendance indirectly.

**c. Class Schedule**: Not explicitly included in current model, though test type (pre-test vs. post-test) captures temporal aspects. Future enhancements should incorporate explicit schedule features.

**d. Enrolled Units and Subjects**: All four core psychology subjects are explicitly included. Subject-specific performance features effectively capture engagement and mastery across domains.

**Feature Importance Ranking**: Subject scores > Overall performance > Consistency/Improvement > Test patterns > Study hours

#### 4.24.2 Research Question 2: Machine Learning Techniques

**Answer**: Based on comprehensive model comparison:

**a. Reinforcement Learning**: Achieved 64.52% accuracy. While conceptually valuable for adaptive systems, simplified Q-learning faces challenges for static classification. Shows potential for future online learning scenarios.

**b. Deep Learning**: Achieved 96.77% accuracy through comprehensive optimization. Highly effective for risk classification but requires more computational resources and provides less interpretability than ensemble methods.

**c. Bayesian Optimization**: Achieved 93.55% accuracy with highest precision (0.946). Provides valuable uncertainty quantification but has higher computational complexity.

**d. Curriculum Learning**: Achieved 96.77% accuracy through enhanced progressive training. Highly effective staged learning approach that builds foundational knowledge before tackling challenging cases.

**e. Multi-Armed Bandits**: Achieved 77.42% accuracy. Moderate performance in static evaluation, with primary benefit realized in online learning scenarios with continuous adaptation.

**Conclusion**: **Random Forest, Deep Learning, and Curriculum Learning** are most appropriate, with Random Forest optimal for practical deployment due to interpretability and efficiency.

#### 4.24.3 Research Question 3: Evaluation Metrics

**Answer**: All four metrics are essential for comprehensive model assessment:

**a. Accuracy**: Measures overall proportion of correct predictions. Random Forest achieved 96.77%, correctly classifying the vast majority of students.

**b. Precision**: Measures prediction reliability. Random Forest achieved 97.07%, indicating high confidence when predicting specific risk levels.

**c. Recall**: Measures completeness of identification. Random Forest achieved 96.77%, successfully identifying the vast majority of students in each risk category.

**d. F1-Score**: Provides balanced assessment considering both precision and recall. Random Forest achieved 96.77%, indicating optimal balance.

**Conclusion**: All four metrics should be used collectively, with per-class metrics essential to ensure balanced performance across all risk categories.

#### 4.24.4 Research Question 4: Best Machine Learning Model

**Answer**: **Random Forest is the best-performing machine learning model** for students reviewing for the Psychometrician Licensure Examination, achieving:
- Highest accuracy: 96.77%
- Highest precision: 97.07%
- Highest recall: 96.77%
- Highest F1-Score: 96.77%
- Perfect identification of low-risk and high-risk students (100% recall)
- 90% recall for medium-risk students

**Why Random Forest is Optimal:**
1. Superior classification performance across all metrics
2. Balanced performance across all risk categories
3. Interpretability through feature importance scores
4. Robustness to overfitting through ensemble approach
5. Computational efficiency for real-time recommendations
6. Effective capture of complex feature interactions

### 4.25 Conclusions

This study successfully developed and evaluated an adaptive review planning system using machine learning for Psychometrician Licensure Examination preparation. Key conclusions include:

1. **Model Performance**: Random Forest achieves exceptional performance (96.77% accuracy) for risk classification, correctly identifying 100% of high-risk and low-risk students, enabling effective personalized recommendations.

2. **Feature Effectiveness**: Performance-based features (subject scores, overall performance, consistency, improvement) are most predictive of risk level, with survey data providing valuable personalization context.

3. **Technique Comparison**: Multiple machine learning techniques can achieve top-tier performance when properly optimized, with Random Forest emerging as optimal for practical deployment due to interpretability and efficiency.

4. **System Implementation**: The system successfully integrates the trained model into a production-ready web application with robust architecture, fallback mechanisms, and real-time recommendation generation.

5. **Practical Value**: The system provides actionable, personalized study recommendations that address both objective performance and subjective preferences, supporting effective preparation for the licensure examination.

6. **Future Potential**: Alternative techniques (Deep Learning, Curriculum Learning, Bayesian Optimization) show promise for future enhancements, while Reinforcement Learning and Multi-Armed Bandits offer potential for online learning scenarios.

### 4.26 Recommendations

Based on the findings of this study, the following recommendations are made:

1. **Immediate Deployment**: Deploy Random Forest model in production system, leveraging its combination of high accuracy, interpretability, and efficiency.

2. **Feature Enhancement**: Incorporate explicit class schedule data and detailed unit-level enrollment to enhance recommendation specificity.

3. **Validation Studies**: Conduct temporal validation (training on earlier cohorts, testing on later cohorts) and external validation (different institutions) to strengthen model generalizability.

4. **User Impact Measurement**: Measure actual impact on student outcomes (board exam pass rates, study effectiveness) through controlled experiments and longitudinal studies.

5. **Online Learning Integration**: Explore Multi-Armed Bandits or Reinforcement Learning for adaptive recommendation selection that updates based on student feedback over time.

6. **Uncertainty Quantification**: Integrate Bayesian Optimization's uncertainty estimates to flag borderline cases for educator review.

7. **Temporal Modeling**: Develop models that explicitly model student progress over time, enabling prediction of future performance trajectories.

8. **A/B Testing**: Conduct controlled experiments comparing ML-based recommendations to rule-based recommendations, measuring actual impact on student outcomes.

### 4.27 Contribution to Knowledge

This study contributes to the field of adaptive learning systems and educational technology by:

1. **Comprehensive Model Comparison**: Providing systematic evaluation of six machine learning techniques for educational risk classification, demonstrating that multiple approaches can achieve top-tier performance when properly optimized.

2. **Feature Analysis**: Identifying performance-based features as most predictive of risk level, with survey data providing valuable personalization context, informing future feature engineering efforts.

3. **System Architecture**: Demonstrating successful integration of machine learning models into production-ready web applications with robust fallback mechanisms and real-time recommendation generation.

4. **Practical Implementation**: Providing a working system that generates actionable, personalized study recommendations for licensure examination preparation, demonstrating practical value of machine learning in education.

5. **Methodological Contributions**: Establishing evaluation frameworks and optimization procedures for comparing machine learning techniques in educational contexts, providing methodology for future studies.

### 4.28 Final Remarks

This chapter has presented comprehensive results and discussion of the adaptive review planning system for Psychometrician Licensure Examination preparation. The study successfully addressed all research questions from the Statement of the Problem, demonstrating that machine learning can effectively support personalized study planning through risk classification and recommendation generation.

The Random Forest model's exceptional performance (96.77% accuracy), combined with its interpretability and efficiency, makes it an optimal choice for practical deployment. The system's successful implementation demonstrates the feasibility of integrating machine learning into educational systems to provide real-time, personalized recommendations.

While the current system shows strong performance, future enhancements including online learning, uncertainty quantification, and temporal modeling offer opportunities for further improvement. The comprehensive model comparison provides a foundation for future research and development in adaptive learning systems.

The next chapter will present the overall conclusions of the study, recommendations for future work, and implications for educational practice and policy.








