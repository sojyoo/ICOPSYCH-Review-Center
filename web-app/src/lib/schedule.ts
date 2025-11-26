const PROGRAM_START_DATE = new Date('2025-03-01T00:00:00')
const PROGRAM_WEEKS = 18

type ActivityType = 'pre-test' | 'discussion' | 'post-test' | 'mock-exam'

export interface ScheduleActivity {
  type: ActivityType
  title: string
  subjects: string[]
  time: string
}

export interface ScheduleWeek {
  week: number
  title: string
  date: string
  activities: ScheduleActivity[]
}

const formatWeekRange = (weekOffset: number) => {
  const startDate = new Date(PROGRAM_START_DATE)
  startDate.setDate(startDate.getDate() + weekOffset * 7)
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + 6)

  const formatter: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${startDate.toLocaleDateString(undefined, formatter)} - ${endDate.toLocaleDateString(undefined, formatter)}, 2025`
}

const createCoreWeek = (
  week: number,
  title: string,
  subjects: string[],
  timeSlots = {
    pre: '10:30 AM - 11:00 AM',
    discussion: '11:00 AM - 12:00 PM',
    post: '12:00 PM - 12:30 PM',
  }
): ScheduleWeek => ({
  week,
  title,
  date: formatWeekRange(week - 1),
  activities: [
    {
      type: 'pre-test',
      title: `Pre-Test: ${title}`,
      subjects,
      time: timeSlots.pre,
    },
    {
      type: 'discussion',
      title: `Discussion: ${title}`,
      subjects,
      time: timeSlots.discussion,
    },
    {
      type: 'post-test',
      title: `Post-Test: ${title}`,
      subjects,
      time: timeSlots.post,
    },
  ],
})

const createMockWeek = (week: number, title: string, subjects: string[]): ScheduleWeek => ({
  week,
  title,
  date: formatWeekRange(week - 1),
  activities: [
    {
      type: 'mock-exam',
      title: `Mock Exam: ${title}`,
      subjects,
      time: '9:00 AM - 12:00 PM',
    },
  ],
})

export const ICOPSYCH_SCHEDULE: ScheduleWeek[] = [
  createCoreWeek(1, 'Developmental Psychology', ['Developmental Psychology']),
  createCoreWeek(2, 'Industrial Psychology Foundations', ['Industrial Psychology']),
  createCoreWeek(3, 'Abnormal Psychology Basics', ['Abnormal Psychology']),
  createCoreWeek(4, 'Psychological Assessment', ['Psychological Assessment']),
  createCoreWeek(5, 'Personality Theories', ['Personality Theories']),
  createCoreWeek(6, 'Learning & Cognition', ['Learning', 'Cognition']),
  createCoreWeek(7, 'Clinical Interventions', ['Clinical Psychology']),
  createCoreWeek(8, 'Counseling Techniques', ['Counseling Psychology']),
  createCoreWeek(9, 'Research & Statistics', ['Psychological Statistics', 'Research Methods']),
  createCoreWeek(10, 'Neuropsychology', ['Neuropsychology']),
  createCoreWeek(11, 'Social Psychology', ['Social Psychology']),
  createCoreWeek(12, 'Advanced Assessment & Integration', ['Psychological Assessment', 'Integration']),
  createCoreWeek(13, 'Comprehensive Review I', ['All Subjects']),
  createCoreWeek(14, 'Comprehensive Review II', ['All Subjects']),
  createCoreWeek(15, 'Targeted Remediation', ['Weak Areas']),
  createMockWeek(16, 'Mock Exam A', ['Combined Subjects']),
  createMockWeek(17, 'Mock Exam B', ['Combined Subjects']),
  createMockWeek(18, 'Mock Exam C', ['Combined Subjects']),
]

export const getCurrentWeek = (referenceDate: Date = new Date()): number => {
  const diffMs = referenceDate.getTime() - PROGRAM_START_DATE.getTime()
  const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000))
  const currentWeek = diffWeeks + 1

  if (currentWeek < 1) return 1
  if (currentWeek > PROGRAM_WEEKS) return PROGRAM_WEEKS
  return currentWeek
}

export const getWeekByNumber = (weekNumber: number): ScheduleWeek | undefined =>
  ICOPSYCH_SCHEDULE.find((week) => week.week === weekNumber)



