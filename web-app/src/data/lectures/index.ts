import { LectureContent } from './types'
import { week1DevelopmentalPsychology } from './week1-dev-psych'

const lectureContentMap: Record<string, LectureContent> = {
  [week1DevelopmentalPsychology.key]: week1DevelopmentalPsychology
}

const normalize = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, '_')

export function getLectureContent(week: number, subjects: string[]): LectureContent | null {
  for (const subject of subjects) {
    const key = `${week}-${normalize(subject)}`
    if (lectureContentMap[key]) {
      return lectureContentMap[key]
    }
  }

  return null
}

export type { LectureContent }

