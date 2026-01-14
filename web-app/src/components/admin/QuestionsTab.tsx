'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Edit, Trash2, Filter, Upload, Loader2 } from 'lucide-react'
import { getSuggestedSubjectForWeek, getLectureForWeek } from '@/lib/week-subject-mapping'

interface Question {
  id: string
  question: string
  options: string[]
  correctIndex: number
  subject: string
  difficulty: string
  lecture: number
  week: number
  explanation?: string
  concepts?: Array<{ id: string; name: string; subject: string }>
  usageStats?: {
    totalAttempts: number
    correctAttempts: number
    successRate: number
  }
}

export default function QuestionsTab() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({
    subject: '',
    difficulty: '',
    lecture: '',
    week: ''
  })
  const [isImporting, setIsImporting] = useState(false)
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  useEffect(() => {
    loadQuestions()
  }, [filters, searchTerm])

  const loadQuestions = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (filters.subject) params.append('subject', filters.subject)
      if (filters.difficulty) params.append('difficulty', filters.difficulty)
      if (filters.lecture) params.append('lecture', filters.lecture)
      if (filters.week) params.append('week', filters.week)

      const response = await fetch(`/api/admin/questions?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setQuestions(data.questions || [])
      }
    } catch (error) {
      console.error('Error loading questions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return

    try {
      const response = await fetch(`/api/admin/questions/${id}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        loadQuestions()
      } else {
        alert('Failed to delete question')
      }
    } catch (error) {
      console.error('Error deleting question:', error)
      alert('Error deleting question')
    }
  }

  const handleEdit = (question: Question) => {
    setEditingQuestion(question)
    setShowModal(true)
  }

  const handleCreate = () => {
    setEditingQuestion(null)
    setShowModal(true)
  }

  const handleImportQuestions = async () => {
    if (!confirm('This will import all questions from questions.json. Existing questions will be updated. Continue?')) {
      return
    }

    setIsImporting(true)
    setImportStatus(null)

    try {
      const response = await fetch('/api/admin/import-questions', {
        method: 'POST'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Import failed')
      }

      const result = await response.json()
      setImportStatus({
        type: 'success',
        message: `Successfully imported ${result.imported} new questions and updated ${result.updated} existing questions. Total: ${result.total} questions.`
      })
      
      // Reload questions list
      loadQuestions()
    } catch (error) {
      console.error('Import error:', error)
      setImportStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to import questions'
      })
    } finally {
      setIsImporting(false)
    }
  }

  const handleSave = async (questionData: any) => {
    try {
      const url = editingQuestion
        ? `/api/admin/questions/${editingQuestion.id}`
        : '/api/admin/questions'
      const method = editingQuestion ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(questionData)
      })

      if (response.ok) {
        setShowModal(false)
        setEditingQuestion(null)
        loadQuestions()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to save question')
      }
    } catch (error) {
      console.error('Error saving question:', error)
      alert('Error saving question')
    }
  }

  // All subjects from ICOPSYCH schedule
  const subjects = [
    'Developmental Psychology',
    'Industrial Psychology',
    'Abnormal Psychology',
    'Psychological Assessment',
    'Personality Theories',
    'Learning',
    'Cognition',
    'Clinical Psychology',
    'Counseling Psychology',
    'Psychological Statistics',
    'Research Methods',
    'Neuropsychology',
    'Social Psychology',
    'Integration',
    'All Subjects',
    'Weak Areas',
    'Combined Subjects'
  ]
  const difficulties = ['easy', 'medium', 'hard']
  const weeks = Array.from({ length: 18 }, (_, i) => i + 1)

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Question Management</h2>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleImportQuestions}
            disabled={isImporting}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isImporting ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-5 w-5 mr-2" />
                Import from JSON
              </>
            )}
          </button>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Question
          </button>
        </div>
      </div>

      {/* Import Status */}
      {importStatus && (
        <div className={`mb-4 p-4 rounded-md ${
          importStatus.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          <p className="text-sm">{importStatus.message}</p>
        </div>
      )}

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search questions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <select
            value={filters.subject}
            onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All Subjects</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            value={filters.difficulty}
            onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All Difficulties</option>
            {difficulties.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <select
            value={filters.lecture}
            onChange={(e) => setFilters({ ...filters, lecture: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All Lectures</option>
            <option value="1">Lecture 1</option>
            <option value="2">Lecture 2</option>
            <option value="3">Lecture 3</option>
          </select>

          <select
            value={filters.week}
            onChange={(e) => setFilters({ ...filters, week: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All Weeks</option>
            {weeks.map(w => <option key={w} value={w}>Week {w}</option>)}
          </select>
        </div>
      </div>

      {/* Questions Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading questions...</p>
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">No questions found</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Question</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Difficulty</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Week</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usage</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {questions.map((q) => (
                <tr key={q.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 max-w-md truncate">{q.question}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{q.subject}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{q.difficulty}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Week {q.week}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {q.usageStats ? (
                      <div>
                        <div>Attempts: {q.usageStats.totalAttempts}</div>
                        <div>Success: {q.usageStats.successRate}%</div>
                      </div>
                    ) : (
                      <span className="text-gray-400">No data</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEdit(q)}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(q.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Question Modal */}
      {showModal && (
        <QuestionModal
          question={editingQuestion}
          onClose={() => {
            setShowModal(false)
            setEditingQuestion(null)
          }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}

// Question Modal Component
function QuestionModal({ question, onClose, onSave }: {
  question: Question | null
  onClose: () => void
  onSave: (data: any) => void
}) {
  const [formData, setFormData] = useState({
    question: question?.question || '',
    options: question?.options || ['', '', '', ''],
    correctIndex: question?.correctIndex || 0,
    subject: question?.subject || '',
    difficulty: question?.difficulty || 'medium',
    lecture: question?.lecture || 1,
    week: question?.week || 1,
    explanation: question?.explanation || ''
  })

  // Auto-suggest subject and lecture when week changes
  const handleWeekChange = (week: number) => {
    const suggestedSubject = getSuggestedSubjectForWeek(week)
    const suggestedLecture = getLectureForWeek(week)
    setFormData({
      ...formData,
      week,
      subject: formData.subject || suggestedSubject, // Only set if not already set
      lecture: suggestedLecture
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  // All subjects from ICOPSYCH schedule
  const subjects = [
    'Developmental Psychology',
    'Industrial Psychology',
    'Abnormal Psychology',
    'Psychological Assessment',
    'Personality Theories',
    'Learning',
    'Cognition',
    'Clinical Psychology',
    'Counseling Psychology',
    'Psychological Statistics',
    'Research Methods',
    'Neuropsychology',
    'Social Psychology',
    'Integration',
    'All Subjects',
    'Weak Areas',
    'Combined Subjects'
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-semibold mb-4">
          {question ? 'Edit Question' : 'Create Question'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
            <textarea
              value={formData.question}
              onChange={(e) => setFormData({ ...formData, question: e.target.value })}
              required
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Options</label>
            {formData.options.map((opt, idx) => (
              <div key={idx} className="flex items-center mb-2">
                <input
                  type="radio"
                  name="correct"
                  checked={formData.correctIndex === idx}
                  onChange={() => setFormData({ ...formData, correctIndex: idx })}
                  className="mr-2"
                />
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => {
                    const newOptions = [...formData.options]
                    newOptions[idx] = e.target.value
                    setFormData({ ...formData, options: newOptions })
                  }}
                  required
                  placeholder={`Option ${idx + 1}`}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <select
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select subject</option>
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lecture</label>
              <input
                type="number"
                min="1"
                max="3"
                value={formData.lecture}
                onChange={(e) => setFormData({ ...formData, lecture: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Week</label>
              <select
                value={formData.week}
                onChange={(e) => handleWeekChange(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              >
                {Array.from({ length: 18 }, (_, i) => i + 1).map(w => (
                  <option key={w} value={w}>Week {w}</option>
                ))}
              </select>
              {formData.week > 0 && (
                <p className="mt-1 text-xs text-gray-500">
                  Suggested: {getSuggestedSubjectForWeek(formData.week)} (Lecture {getLectureForWeek(formData.week)})
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Explanation (optional)</label>
            <textarea
              value={formData.explanation}
              onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              {question ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


