'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2 } from 'lucide-react'

interface Cohort {
  id: string
  name: string
  description: string | null
  startDate: string | null
  endDate: string | null
  stats: {
    totalUsers: number
    usersWithTests: number
    averageScore: number
  }
}

export default function CohortsTab() {
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCohort, setEditingCohort] = useState<Cohort | null>(null)

  useEffect(() => {
    loadCohorts()
  }, [])

  const loadCohorts = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/cohorts')
      if (response.ok) {
        const data = await response.json()
        setCohorts(data.cohorts || [])
      }
    } catch (error) {
      console.error('Error loading cohorts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this cohort?')) return

    try {
      const response = await fetch(`/api/admin/cohorts/${id}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        loadCohorts()
      } else {
        alert('Failed to delete cohort')
      }
    } catch (error) {
      console.error('Error deleting cohort:', error)
      alert('Error deleting cohort')
    }
  }

  const handleEdit = (cohort: Cohort) => {
    setEditingCohort(cohort)
    setShowModal(true)
  }

  const handleCreate = () => {
    setEditingCohort(null)
    setShowModal(true)
  }

  const handleSave = async (cohortData: any) => {
    try {
      const url = editingCohort
        ? `/api/admin/cohorts/${editingCohort.id}`
        : '/api/admin/cohorts'
      const method = editingCohort ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cohortData)
      })

      if (response.ok) {
        setShowModal(false)
        setEditingCohort(null)
        loadCohorts()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to save cohort')
      }
    } catch (error) {
      console.error('Error saving cohort:', error)
      alert('Error saving cohort')
    }
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Cohort Management</h2>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Cohort
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading cohorts...</p>
        </div>
      ) : cohorts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">No cohorts found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cohorts.map((cohort) => (
            <div key={cohort.id} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{cohort.name}</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(cohort)}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(cohort.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {cohort.description && (
                <p className="text-sm text-gray-600 mb-4">{cohort.description}</p>
              )}

              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Users:</span> {cohort.stats.totalUsers}
                </div>
                <div>
                  <span className="font-medium">Active:</span> {cohort.stats.usersWithTests}
                </div>
                <div>
                  <span className="font-medium">Avg Score:</span> {cohort.stats.averageScore}%
                </div>
                {cohort.startDate && (
                  <div>
                    <span className="font-medium">Start:</span> {new Date(cohort.startDate).toLocaleDateString()}
                  </div>
                )}
                {cohort.endDate && (
                  <div>
                    <span className="font-medium">End:</span> {new Date(cohort.endDate).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cohort Modal */}
      {showModal && (
        <CohortModal
          cohort={editingCohort}
          onClose={() => {
            setShowModal(false)
            setEditingCohort(null)
          }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}

function CohortModal({ cohort, onClose, onSave }: {
  cohort: Cohort | null
  onClose: () => void
  onSave: (data: any) => void
}) {
  const [formData, setFormData] = useState({
    name: cohort?.name || '',
    description: cohort?.description || '',
    startDate: cohort?.startDate ? new Date(cohort.startDate).toISOString().split('T')[0] : '',
    endDate: cohort?.endDate ? new Date(cohort.endDate).toISOString().split('T')[0] : ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-xl font-semibold mb-4">
          {cohort ? 'Edit Cohort' : 'Create Cohort'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
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
              {cohort ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}





