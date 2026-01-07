'use client'

import { useState, useEffect } from 'react'
import { Lock, Unlock, Save, AlertCircle } from 'lucide-react'

interface TestSetting {
  id?: string
  testType: string
  isLocked: boolean
  requirePrerequisite: boolean
  allowRetakes: boolean
  lockedWeeks: number[] | null
}

export default function TestSettingsTab() {
  const [settings, setSettings] = useState<TestSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/test-settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings || [])
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateSetting = (testType: string, field: keyof TestSetting, value: any) => {
    setSettings(prev => prev.map(s => 
      s.testType === testType ? { ...s, [field]: value } : s
    ))
  }

  const toggleWeekLock = (testType: string, week: number) => {
    setSettings(prev => prev.map(s => {
      if (s.testType !== testType) return s
      
      const currentWeeks = s.lockedWeeks || []
      const newWeeks = currentWeeks.includes(week)
        ? currentWeeks.filter(w => w !== week)
        : [...currentWeeks, week].sort((a, b) => a - b)
      
      return { ...s, lockedWeeks: newWeeks.length > 0 ? newWeeks : null }
    }))
  }

  const saveSettings = async () => {
    try {
      setSaving(true)
      setMessage(null)

      for (const setting of settings) {
        const response = await fetch('/api/admin/test-settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(setting)
        })

        if (!response.ok) {
          throw new Error(`Failed to save ${setting.testType} settings`)
        }
      }

      setMessage({ type: 'success', text: 'Test settings saved successfully!' })
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error('Error saving settings:', error)
      setMessage({ type: 'error', text: 'Failed to save settings. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading test settings...</p>
      </div>
    )
  }

  const testTypes = [
    { value: 'pre-test', label: 'Pre-Tests', description: 'Weekly pre-tests before lectures' },
    { value: 'post-test', label: 'Post-Tests', description: 'Weekly post-tests after lectures' },
    { value: 'mock-exam', label: 'Mock Exams', description: 'Comprehensive mock examinations' }
  ]

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Test Settings</h2>
          <p className="text-sm text-gray-600 mt-1">
            Control test access and restrictions for students
          </p>
        </div>
        <button
          onClick={saveSettings}
          disabled={saving}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center disabled:opacity-50"
        >
          <Save className="h-5 w-5 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-md flex items-center ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <AlertCircle className="h-5 w-5 mr-2" />
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        {testTypes.map(({ value, label, description }) => {
          const setting = settings.find(s => s.testType === value) || {
            testType: value,
            isLocked: false,
            requirePrerequisite: false,
            allowRetakes: true,
            lockedWeeks: null
          }

          return (
            <div key={value} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{label}</h3>
                  <p className="text-sm text-gray-600">{description}</p>
                </div>
                <div className={`flex items-center px-3 py-1 rounded-full ${
                  setting.isLocked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                }`}>
                  {setting.isLocked ? (
                    <>
                      <Lock className="h-4 w-4 mr-1" />
                      Locked
                    </>
                  ) : (
                    <>
                      <Unlock className="h-4 w-4 mr-1" />
                      Unlocked
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                {/* Lock/Unlock Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-md">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Lock All {label}
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      When locked, students cannot take these tests
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={setting.isLocked}
                      onChange={(e) => updateSetting(value, 'isLocked', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {/* Require Prerequisites */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-md">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Require Prerequisites
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      {value === 'post-test' && 'Require pre-test before post-test'}
                      {value === 'mock-exam' && 'Require all weeks completed before mock exam'}
                      {value === 'pre-test' && 'Require previous week completion'}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={setting.requirePrerequisite}
                      onChange={(e) => updateSetting(value, 'requirePrerequisite', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {/* Allow Retakes */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-md">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Allow Retakes
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Allow students to retake tests they've already completed
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={setting.allowRetakes}
                      onChange={(e) => updateSetting(value, 'allowRetakes', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {/* Lock Specific Weeks */}
                {setting.isLocked && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                    <label className="text-sm font-medium text-gray-700 block mb-3">
                      Lock Specific Weeks (leave empty to lock all)
                    </label>
                    <div className="grid grid-cols-6 gap-2">
                      {Array.from({ length: 18 }, (_, i) => i + 1).map(week => {
                        const isLocked = (setting.lockedWeeks || []).includes(week)
                        return (
                          <button
                            key={week}
                            type="button"
                            onClick={() => toggleWeekLock(value, week)}
                            className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                              isLocked
                                ? 'bg-red-100 border-red-300 text-red-800 font-medium'
                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            Week {week}
                          </button>
                        )
                      })}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Click weeks to toggle. Locked weeks will be restricted even if test type is unlocked.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> For demo purposes, all tests are currently unlocked by default. 
          Use these settings to restrict access when needed.
        </p>
      </div>
    </div>
  )
}




