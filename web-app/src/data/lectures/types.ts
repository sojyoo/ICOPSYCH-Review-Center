export interface LectureSection {
  heading: string
  bullets?: string[]
  paragraphs?: string[]
}

export interface LectureContent {
  key: string
  week: number
  lecture: number
  subject: string
  title: string
  overview: string
  highlightPoints: string[]
  sections: LectureSection[]
}

