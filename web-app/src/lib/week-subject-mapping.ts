// Mapping of weeks to their primary subjects based on ICOPSYCH schedule
export const WEEK_SUBJECT_MAP: Record<number, string[]> = {
  1: ['Developmental Psychology'],
  2: ['Industrial Psychology'],
  3: ['Abnormal Psychology'],
  4: ['Psychological Assessment'],
  5: ['Personality Theories'],
  6: ['Learning', 'Cognition'],
  7: ['Clinical Psychology'],
  8: ['Counseling Psychology'],
  9: ['Psychological Statistics', 'Research Methods'],
  10: ['Neuropsychology'],
  11: ['Social Psychology'],
  12: ['Psychological Assessment', 'Integration'],
  13: ['All Subjects'],
  14: ['All Subjects'],
  15: ['Weak Areas'],
  16: ['Combined Subjects'],
  17: ['Combined Subjects'],
  18: ['Combined Subjects']
}

export const WEEK_LECTURE_MAP: Record<number, number> = {
  1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, // Weeks 1-6: Lecture 1
  7: 2, 8: 2, 9: 2, 10: 2, 11: 2, 12: 2, // Weeks 7-12: Lecture 2
  13: 3, 14: 3, 15: 3, 16: 3, 17: 3, 18: 3 // Weeks 13-18: Lecture 3
}

export function getSubjectsForWeek(week: number): string[] {
  return WEEK_SUBJECT_MAP[week] || []
}

export function getLectureForWeek(week: number): number {
  return WEEK_LECTURE_MAP[week] || 1
}

export function getSuggestedSubjectForWeek(week: number): string {
  const subjects = getSubjectsForWeek(week)
  return subjects[0] || ''
}




