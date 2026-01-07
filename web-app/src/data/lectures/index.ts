import { LectureContent } from './types'
import { week1DevelopmentalPsychology } from './week1-dev-psych'
import { week2IndustrialPsychology } from './week2-industrial-psychology'
import { week3AbnormalPsychology } from './week3-abnormal-psychology'
import { week4PsychologicalAssessment } from './week4-psychological-assessment'
import { week5PersonalityTheories } from './week5-personality-theories'
import { week6LearningCognition } from './week6-learning-cognition'
import { week7ClinicalPsychology } from './week7-clinical-psychology'
import { week8CounselingPsychology } from './week8-counseling-psychology'
import { week9ResearchStatistics } from './week9-research-statistics'
import { week10Neuropsychology } from './week10-neuropsychology'
import { week11SocialPsychology } from './week11-social-psychology'
import { week12AdvancedAssessment } from './week12-advanced-assessment'
import { week13Review1 } from './week13-review1'
import { week14Review2 } from './week14-review2'
import { week15Remediation } from './week15-remediation'

const lectureContentMap: Record<string, LectureContent> = {
  [week1DevelopmentalPsychology.key]: week1DevelopmentalPsychology,
  [week2IndustrialPsychology.key]: week2IndustrialPsychology,
  [week3AbnormalPsychology.key]: week3AbnormalPsychology,
  [week4PsychologicalAssessment.key]: week4PsychologicalAssessment,
  [week5PersonalityTheories.key]: week5PersonalityTheories,
  [week6LearningCognition.key]: week6LearningCognition,
  [week7ClinicalPsychology.key]: week7ClinicalPsychology,
  [week8CounselingPsychology.key]: week8CounselingPsychology,
  [week9ResearchStatistics.key]: week9ResearchStatistics,
  [week10Neuropsychology.key]: week10Neuropsychology,
  [week11SocialPsychology.key]: week11SocialPsychology,
  [week12AdvancedAssessment.key]: week12AdvancedAssessment,
  [week13Review1.key]: week13Review1,
  [week14Review2.key]: week14Review2,
  [week15Remediation.key]: week15Remediation
}

const normalize = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, '_')

export function getLectureContent(week: number, subjects: string[]): LectureContent | null {
  // First, try exact match with week and subject
  for (const subject of subjects) {
    const key = `${week}-${normalize(subject)}`
    if (lectureContentMap[key]) {
      return lectureContentMap[key]
    }
  }

  // For review weeks (13-15), try to find review lectures
  if (week >= 13 && week <= 15) {
    if (week === 13 && lectureContentMap['13-comprehensive_review_1']) {
      return lectureContentMap['13-comprehensive_review_1']
    }
    if (week === 14 && lectureContentMap['14-comprehensive_review_2']) {
      return lectureContentMap['14-comprehensive_review_2']
    }
    if (week === 15 && lectureContentMap['15-targeted_remediation']) {
      return lectureContentMap['15-targeted_remediation']
    }
  }

  // Try alternative subject names or partial matches
  for (const subject of subjects) {
    const normalizedSubject = normalize(subject)
    // Check for partial matches (e.g., "Developmental" matches "Developmental Psychology")
    for (const key in lectureContentMap) {
      if (key.includes(`${week}-`) && key.includes(normalizedSubject)) {
        return lectureContentMap[key]
      }
    }
  }

  return null
}

export type { LectureContent }

