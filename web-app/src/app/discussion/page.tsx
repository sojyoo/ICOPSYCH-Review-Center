'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  BookOpen,
  Users,
  MessageCircle,
  ArrowRight,
  Brain,
  Clock,
  Target,
  Award,
  ClipboardCheck
} from 'lucide-react'
import { getLectureContent, LectureContent } from '@/data/lectures'

export default function DiscussionPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [week, setWeek] = useState<number>(0)
  const [lecture, setLecture] = useState<number>(0)
  const [subjects, setSubjects] = useState<string[]>([])
  const [lectureContent, setLectureContent] = useState<LectureContent | null>(null)
  const [attemptSummary, setAttemptSummary] = useState<{
    score: number
    totalQuestions: number
    timeSpent: number
    completedAt?: string
  } | null>(null)
  const [loadingAttempt, setLoadingAttempt] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }

    // Get parameters from URL
    const weekParam = searchParams.get('week')
    const lectureParam = searchParams.get('lecture')
    const subjectsParam = searchParams.get('subjects')

    const weekValue = weekParam ? parseInt(weekParam) : 0
    const lectureValue = lectureParam ? parseInt(lectureParam) : 0
    const subjectList = subjectsParam ? subjectsParam.split(',') : []

    setWeek(weekValue)
    setLecture(lectureValue)
    setSubjects(subjectList)

    setLectureContent(getLectureContent(weekValue, subjectList))

  }, [session, status, searchParams])

  useEffect(() => {
    const attemptId = searchParams.get('attemptId')
    if (!attemptId) return

    const fetchAttempt = async () => {
      try {
        setLoadingAttempt(true)
        const response = await fetch(`/api/test/results?attemptId=${attemptId}`)
        if (response.ok) {
          const data = await response.json()
          setAttemptSummary({
            score: data.score,
            totalQuestions: data.totalQuestions,
            timeSpent: data.timeSpent,
            completedAt: data.completedAt
          })
        }
      } catch (error) {
        console.error('Failed to load pre-test summary:', error)
      } finally {
        setLoadingAttempt(false)
      }
    }

    fetchAttempt()
  }, [searchParams])

  const handleProceedToPostTest = () => {
    router.push(`/test?week=${week}&lecture=${lecture}&subjects=${subjects.join(',')}&type=post-test`)
  }

  const handleBackToDashboard = () => {
    router.push('/dashboard')
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading discussion...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-purple-600 rounded-lg flex items-center justify-center mr-3">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Discussion Session</h1>
                <p className="text-sm text-gray-600">
                  Week {week} • Lecture {lecture} • {subjects.join(', ')}
                </p>
              </div>
            </div>
            <button
              onClick={handleBackToDashboard}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg p-6 text-white mb-8">
          <div className="flex items-center mb-4">
            <MessageCircle className="h-8 w-8 mr-3" />
            <h2 className="text-2xl font-bold">Discussion & Learning</h2>
          </div>
          <p className="text-purple-100">
            Great job completing the pre-test! Now let's dive deeper into the concepts and prepare for the post-test.
          </p>
        </div>

        {/* Discussion Content */}
        <div className="space-y-8 mb-8">
          {attemptSummary && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center mb-4">
                <Award className="h-6 w-6 text-amber-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">Pre-Test Summary</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-amber-50 rounded-lg">
                  <p className="text-sm text-amber-700 font-medium">Score</p>
                  <p className="text-2xl font-bold text-amber-900">
                    {attemptSummary.score} / {attemptSummary.totalQuestions}
                  </p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700 font-medium">Time Spent</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {attemptSummary.timeSpent < 60
                      ? `${attemptSummary.timeSpent} secs`
                      : `${Math.round(attemptSummary.timeSpent / 60)} mins`}
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-700 font-medium">Completion</p>
                  <p className="text-2xl font-bold text-green-900">
                    {attemptSummary.completedAt ? new Date(attemptSummary.completedAt).toLocaleString() : '—'}
                  </p>
                </div>
              </div>
              {loadingAttempt && (
                <p className="text-sm text-gray-500 mt-3">Refreshing summary...</p>
              )}
            </div>
          )}

          {lectureContent ? (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center mb-4">
                  <BookOpen className="h-6 w-6 text-indigo-600 mr-2" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{lectureContent.title}</h3>
                    <p className="text-sm text-gray-600">{lectureContent.overview}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {lectureContent.highlightPoints.map((point, index) => (
                    <div key={index} className="p-4 bg-indigo-50 rounded-lg flex items-start">
                      <ClipboardCheck className="h-4 w-4 text-indigo-600 mr-2 mt-1" />
                      <p className="text-sm text-indigo-900">{point}</p>
                    </div>
                  ))}
                </div>
              </div>

              {lectureContent.sections.map((section, index) => (
                <div key={section.heading} className="bg-white rounded-lg shadow p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">{section.heading}</h4>
                  {section.bullets && (
                    <ul className="list-disc pl-5 space-y-2 text-sm text-gray-700">
                      {section.bullets.map((bullet, bulletIndex) => (
                        <li key={bulletIndex}>{bullet}</li>
                      ))}
                    </ul>
                  )}
                  {section.paragraphs && (
                    <div className="space-y-3 text-sm text-gray-700">
                      {section.paragraphs.map((paragraph, pIndex) => (
                        <p key={pIndex}>{paragraph}</p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Fallback when lecture data is not available */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center mb-4">
                  <BookOpen className="h-6 w-6 text-indigo-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Lecture Materials</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Detailed lecture content for this subject will be available soon.
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center mb-4">
                  <Users className="h-6 w-6 text-green-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Interactive Learning</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Join upcoming live sessions and study groups tailored to this topic.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Subject-Specific Content */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center mb-4">
            <Brain className="h-6 w-6 text-purple-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Subject Focus: {subjects.join(', ') || 'TBD'}</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {subjects.map((subject, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">{subject}</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Target className="h-4 w-4 mr-2 text-indigo-500" />
                    <span>Core concepts and theories</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-indigo-500" />
                    <span>Historical development and current research</span>
                  </div>
                  <div className="flex items-center">
                    <BookOpen className="h-4 w-4 mr-2 text-indigo-500" />
                    <span>Practical applications and case studies</span>
                  </div>
                </div>
              </div>
            ))}
            {subjects.length === 0 && (
              <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
                Select a subject from the dashboard to see tailored content.
              </div>
            )}
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Learning Progress</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-500 rounded-full mr-3"></div>
                <span className="text-sm font-medium text-gray-900">Pre-Test Completed</span>
              </div>
              <span className="text-sm text-green-600">✓ Done</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-blue-500 rounded-full mr-3"></div>
                <span className="text-sm font-medium text-gray-900">Discussion & Learning</span>
              </div>
              <span className="text-sm text-blue-600">In Progress</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-gray-300 rounded-full mr-3"></div>
                <span className="text-sm font-medium text-gray-900">Post-Test</span>
              </div>
              <span className="text-sm text-gray-500">Ready</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleBackToDashboard}
            className="px-6 py-3 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors"
          >
            Back to Dashboard
          </button>
          <button
            onClick={handleProceedToPostTest}
            className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
          >
            Proceed to Post-Test
            <ArrowRight className="h-5 w-5 ml-2" />
          </button>
        </div>

      </div>
    </div>
  )
}




