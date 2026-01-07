'use client'

import { useState, useEffect, useRef } from 'react'
import { Save, Clock, BookOpen, AlertCircle, CheckCircle } from 'lucide-react'

interface UserPreferences {
  dailyAvailability: Record<string, number> | null
  habitActiveLearning: number | null
  habitPlanning: number | null
  habitDiscipline: number | null
  habitConfidence: number | null
  // Legacy fields (for backward compatibility)
  habitActiveTechniques: number | null
  habitQuietEnv: number | null
  weeklyStudyGoal: number
}

const DAYS = [
  { key: '0', label: 'Sunday' },
  { key: '1', label: 'Monday' },
  { key: '2', label: 'Tuesday' },
  { key: '3', label: 'Wednesday' },
  { key: '4', label: 'Thursday' },
  { key: '5', label: 'Friday' },
  { key: '6', label: 'Saturday' }
]

const LIKERT_LABELS = {
  0: 'Never',
  0.33: 'Sometimes',
  0.67: 'Often',
  1: 'Always'
}

interface UserPreferencesProps {
  onSave?: () => void
  compact?: boolean
  showOnlyTab?: 'availability' | 'habits' | null // If set, only show this tab
  onPreferencesChange?: (prefs: UserPreferences | null) => void // Callback to expose current preferences to parent
  reloadTrigger?: number // If this changes, reload preferences
}

export default function UserPreferencesComponent({ onSave, compact = false, showOnlyTab = null, onPreferencesChange, reloadTrigger }: UserPreferencesProps = {}) {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<'availability' | 'habits'>(showOnlyTab || 'availability')
  
  // Individual habit items (for calculating composite scores)
  const [habitItems, setHabitItems] = useState({
    activeLearning: {
      summarizing: 0,
      highlighting: 0,
      conceptMapping: 0
    },
    planning: {
      schedule: 0,
      goals: 0,
      planAhead: 0
    },
    discipline: {
      procrastination: 0,
      immediateReview: 0,
      consistency: 0
    }
  })
  
  // Helper to get label from value
  const getLabelFromValue = (value: number): string => {
    if (value === 0) return 'Never'
    if (value <= 0.33) return 'Sometimes'
    if (value <= 0.67) return 'Often'
    return 'Always'
  }
  
  // Helper to get value from label
  const getValueFromLabel = (label: string): number => {
    switch (label) {
      case 'Never': return 0
      case 'Sometimes': return 0.33
      case 'Often': return 0.67
      case 'Always': return 1
      default: return 0
    }
  }
  
  // Helper to get confidence label from value
  const getConfidenceLabel = (value: number | null): string => {
    if (value === null || value === 0) return 'Not Confident'
    if (value <= 0.33) return 'Somewhat Confident'
    if (value <= 0.67) return 'Confident'
    return 'Very Confident'
  }
  
  // Helper to get confidence value from label
  const getConfidenceValue = (label: string): number => {
    switch (label) {
      case 'Not Confident': return 0
      case 'Somewhat Confident': return 0.33
      case 'Confident': return 0.67
      case 'Very Confident': return 1
      default: return 0
    }
  }
  
  // If showOnlyTab is set, lock the active tab
  useEffect(() => {
    if (showOnlyTab) {
      setActiveTab(showOnlyTab)
    }
  }, [showOnlyTab])
  
  // Calculate composite scores from individual items
  const calculateComposite = (items: number[]) => {
    if (items.length === 0) return 0
    const average = items.reduce((sum, val) => sum + val, 0) / items.length
    // Round to 4 decimal places to handle floating point precision, then check if all items are max
    const rounded = Math.round(average * 10000) / 10000
    // If all items are 1.0 (or very close), return exactly 1.0
    if (items.every(val => val >= 0.999)) return 1.0
    return rounded
  }
  
  // Update individual habit item and recalculate composite
  const updateHabitItem = (category: 'activeLearning' | 'planning' | 'discipline', itemKey: string, value: number) => {
    console.log(`🎚️ Updating ${category}.${itemKey} to ${value} (${Math.round(value * 100)}%)`)
    
    // Mark that user has interacted with sliders
    userHasInteracted.current = true
    
    // Use functional update to ensure we have the latest state
    setHabitItems(prevItems => {
      const newItems = {
        ...prevItems,
        [category]: {
          ...prevItems[category],
          [itemKey]: value
        }
      }
      
      // Calculate and update composite score immediately
      const items = Object.values(newItems[category]) as number[]
      const composite = calculateComposite(items)
      const compositePercent = Math.round(composite * 100)
      console.log(`📊 Calculated composite for ${category}: ${composite} (${compositePercent}%) from items: [${items.map(v => Math.round(v * 100)).join('%, ')}%]`)
      
      // Update preferences immediately with the new composite using setPreferences callback
      setPreferences(prevPrefs => {
        if (!prevPrefs) {
          console.warn(`⚠️ Cannot update ${category} composite: preferences is null`)
          return prevPrefs
        }
        const updated = { ...prevPrefs }
        if (category === 'activeLearning') {
          updated.habitActiveLearning = composite
        } else if (category === 'planning') {
          updated.habitPlanning = composite
        } else if (category === 'discipline') {
          updated.habitDiscipline = composite
        }
        console.log(`✅ Updated preferences.${category === 'activeLearning' ? 'habitActiveLearning' : category === 'planning' ? 'habitPlanning' : 'habitDiscipline'} = ${composite} (${compositePercent}%)`)
        
        // Notify parent immediately with updated preferences (including composite scores)
        // Use setTimeout to ensure state is updated before notifying
        setTimeout(() => {
          if (onPreferencesChange) {
            onPreferencesChange(updated)
            console.log(`📢 Notified parent of ${category} composite update:`, updated)
          }
        }, 0)
        
        return updated
      })
      
      return newItems
    })
  }

  useEffect(() => {
    loadPreferences()
    // Reset the flags when reloadTrigger changes (component remounts)
    if (reloadTrigger !== undefined) {
      hasLoadedOnce.current = false
      // Don't reset userHasInteracted - preserve user's slider positions across tab switches
    }
  }, [reloadTrigger]) // Reload when reloadTrigger changes

  // Track if we've loaded preferences at least once
  const hasLoadedOnce = useRef(false)
  // Track if user has interacted with sliders to prevent resetting them
  const userHasInteracted = useRef(false)
  
  // Only sync habitItems from preferences on initial load
  // This prevents resetting sliders when the user has already set them
  useEffect(() => {
    // Only sync if:
    // 1. Preferences exist
    // 2. We haven't loaded preferences yet (first mount)
    // 3. The habitItems are still at default (all zeros) - meaning user hasn't interacted yet
    // 4. User hasn't interacted with sliders yet
    if (preferences && !hasLoadedOnce.current && !userHasInteracted.current) {
      const allItemsAreZero = 
        Object.values(habitItems.activeLearning).every(v => v === 0) &&
        Object.values(habitItems.planning).every(v => v === 0) &&
        Object.values(habitItems.discipline).every(v => v === 0)
      
      // Only sync if habitItems are still at default (user hasn't touched sliders yet)
      if (allItemsAreZero) {
        const activeLearningValue = preferences.habitActiveLearning ?? 0
        const planningValue = preferences.habitPlanning ?? 0
        const disciplineValue = preferences.habitDiscipline ?? 0
        
        if (activeLearningValue > 0 || planningValue > 0 || disciplineValue > 0) {
          console.log('🔄 Syncing habitItems from preferences (first load, items are zero):', {
            activeLearning: activeLearningValue,
            planning: planningValue,
            discipline: disciplineValue
          })
          setHabitItems({
            activeLearning: {
              summarizing: activeLearningValue,
              highlighting: activeLearningValue,
              conceptMapping: activeLearningValue
            },
            planning: {
              schedule: planningValue,
              goals: planningValue,
              planAhead: planningValue
            },
            discipline: {
              procrastination: disciplineValue,
              immediateReview: disciplineValue,
              consistency: disciplineValue
            }
          })
        }
      }
    }
  }, [preferences]) // Only depend on preferences object, not individual composite scores

  const loadPreferences = async () => {
    try {
      const response = await fetch('/api/user/preferences')
      if (response.ok) {
        const data = await response.json()
        console.log('🔍 Loaded preferences from API:', data)
        // Ensure all required fields are present with defaults
        const prefs = {
          dailyAvailability: data.dailyAvailability ?? null,
          habitActiveLearning: data.habitActiveLearning ?? null,
          habitPlanning: data.habitPlanning ?? null,
          habitDiscipline: data.habitDiscipline ?? null,
          habitConfidence: data.habitConfidence ?? null,
          // Legacy fields
          habitActiveTechniques: data.habitActiveTechniques ?? null,
          habitQuietEnv: data.habitQuietEnv ?? null,
          weeklyStudyGoal: data.weeklyStudyGoal ?? 10.0
        }
        console.log('📥 Loading preferences from API:', prefs)
        console.log('📥 Habit scores:', {
          activeLearning: prefs.habitActiveLearning,
          planning: prefs.habitPlanning,
          discipline: prefs.habitDiscipline,
          confidence: prefs.habitConfidence
        })
        
        // Only initialize habit items from composite scores if user hasn't interacted yet
        // This prevents resetting sliders when user has already set them individually
        if (!userHasInteracted.current) {
          // Initialize habit items from composite scores FIRST
          // If composite exists, use it for all items; otherwise start at 0 (leftmost)
          const activeLearningValue = prefs.habitActiveLearning ?? 0
          const planningValue = prefs.habitPlanning ?? 0
          const disciplineValue = prefs.habitDiscipline ?? 0
          
          const newHabitItems = {
            activeLearning: {
              summarizing: activeLearningValue,
              highlighting: activeLearningValue,
              conceptMapping: activeLearningValue
            },
            planning: {
              schedule: planningValue,
              goals: planningValue,
              planAhead: planningValue
            },
            discipline: {
              procrastination: disciplineValue,
              immediateReview: disciplineValue,
              consistency: disciplineValue
            }
          }
          
          // Set habit items only if user hasn't interacted
          setHabitItems(newHabitItems)
          console.log('📥 Initialized habitItems from composite scores (first load):', newHabitItems)
          console.log('📊 Slider positions initialized to:', {
            activeLearning: `${(activeLearningValue * 100).toFixed(0)}%`,
            planning: `${(planningValue * 100).toFixed(0)}%`,
            discipline: `${(disciplineValue * 100).toFixed(0)}%`
          })
        } else {
          console.log('📥 Skipping habitItems reset - user has already interacted with sliders')
        }
        
        // Always update preferences (for composite scores and other fields)
        setPreferences(prefs)
        hasLoadedOnce.current = true // Mark that we've loaded preferences
        
        console.log('✅ Set preferences state:', prefs)
        
        // Notify parent of preferences change AFTER state is set
        // Use setTimeout to ensure state updates are flushed
        setTimeout(() => {
          if (onPreferencesChange) {
            onPreferencesChange(prefs)
            console.log('📢 Notified parent of loaded preferences:', prefs)
          }
        }, 0)
      } else {
        console.error('Failed to load preferences:', response.status, response.statusText)
        // Set default preferences if API fails
        setPreferences({
          dailyAvailability: null,
          habitActiveLearning: null,
          habitPlanning: null,
          habitDiscipline: null,
          habitConfidence: null,
          habitActiveTechniques: null,
          habitQuietEnv: null,
          weeklyStudyGoal: 10.0
        })
        // Reset habit items to 0 (leftmost position)
        setHabitItems({
          activeLearning: { summarizing: 0, highlighting: 0, conceptMapping: 0 },
          planning: { schedule: 0, goals: 0, planAhead: 0 },
          discipline: { procrastination: 0, immediateReview: 0, consistency: 0 }
        })
      }
    } catch (error) {
      console.error('Error loading preferences:', error)
      // Set default preferences on error
      setPreferences({
        dailyAvailability: null,
        habitActiveLearning: null,
        habitPlanning: null,
        habitDiscipline: null,
        habitConfidence: null,
        habitActiveTechniques: null,
        habitQuietEnv: null,
        weeklyStudyGoal: 10.0
      })
      // Reset habit items to 0 (leftmost position)
      setHabitItems({
        activeLearning: { summarizing: 0, highlighting: 0, conceptMapping: 0 },
        planning: { schedule: 0, goals: 0, planAhead: 0 },
        discipline: { procrastination: 0, immediateReview: 0, consistency: 0 }
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!preferences) return

    setSaving(true)
    setSaved(false)

    // Log the composite scores to verify they're being saved
    console.log('💾 Saving preferences:', preferences)
    console.log('💾 Composite scores being saved:', {
      habitActiveLearning: preferences.habitActiveLearning,
      habitPlanning: preferences.habitPlanning,
      habitDiscipline: preferences.habitDiscipline,
      habitConfidence: preferences.habitConfidence
    })
    console.log('💾 Current habitItems:', habitItems)
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences)
      })

      if (response.ok) {
        // Get the saved data from the response
        const updatedData = await response.json()
        console.log('✅ Save response from server:', updatedData)
        
        // Parse dailyAvailability if it's a string
        const dailyAvailability = typeof updatedData.dailyAvailability === 'string' 
          ? JSON.parse(updatedData.dailyAvailability) 
          : updatedData.dailyAvailability
        
        setPreferences({
          dailyAvailability: dailyAvailability ?? null,
          habitActiveLearning: updatedData.habitActiveLearning ?? null,
          habitPlanning: updatedData.habitPlanning ?? null,
          habitDiscipline: updatedData.habitDiscipline ?? null,
          habitConfidence: updatedData.habitConfidence ?? null,
          habitActiveTechniques: updatedData.habitActiveTechniques ?? null,
          habitQuietEnv: updatedData.habitQuietEnv ?? null,
          weeklyStudyGoal: updatedData.weeklyStudyGoal ?? 10.0
        })
        
        // DON'T reset habitItems - keep the current slider positions
        // The composite scores in preferences are already correct and match the current habitItems
        // Resetting would cause the sliders to jump back to the composite average, losing individual slider positions
        console.log('✅ Preferences updated after save, keeping current habitItems:', habitItems)
        
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
        
        // Trigger initial risk level assessment after save (don't wait)
        fetch('/api/ml/predict', { method: 'GET' }).catch(err => 
          console.error('Error triggering initial risk assessment:', err)
        )
        
        if (onSave) {
          onSave()
        }
      } else {
        alert('Failed to save preferences')
      }
    } catch (error) {
      console.error('Error saving preferences:', error)
      alert('Error saving preferences')
    } finally {
      setSaving(false)
    }
  }

  const updateAvailability = (day: string, hours: number) => {
    if (!preferences) return
    const newAvailability = { ...(preferences.dailyAvailability || {}) }
    if (hours > 0) {
      newAvailability[day] = hours
    } else {
      delete newAvailability[day]
    }
    const updated = {
      ...preferences,
      dailyAvailability: Object.keys(newAvailability).length > 0 ? newAvailability : null
    }
    setPreferences(updated)
    // Notify parent of preferences change immediately
    if (onPreferencesChange) {
      onPreferencesChange(updated)
      console.log('📢 Notified parent of availability change')
    }
  }

  const updateHabit = (habit: keyof UserPreferences, value: number) => {
    if (!preferences) {
      console.warn(`⚠️ Cannot update ${habit}: preferences is null`)
      return
    }
    const updated = { ...preferences, [habit]: value }
    setPreferences(updated)
    // Notify parent of preferences change immediately (synchronously)
    if (onPreferencesChange) {
      onPreferencesChange(updated)
    }
    console.log(`📝 Updated ${habit} to ${value} (${Math.round(value * 100)}%), preferences state updated`)
  }



  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading preferences...</p>
      </div>
    )
  }

  if (!preferences) {
    return <div className="text-center py-12 text-gray-600">Failed to load preferences</div>
  }

  const totalWeeklyHours = Object.values(preferences.dailyAvailability || {}).reduce((sum, h) => sum + h, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      {!compact && (
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold mb-2">Study Preferences & Settings</h2>
            <p className="text-indigo-100">Customize your study plan based on your availability and habits</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-indigo-50 flex items-center transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600 mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-5 w-5 mr-2" />
                Save Preferences
              </>
            )}
          </button>
        </div>
        {saved && (
          <div className="mt-4 bg-green-500 text-white px-4 py-2 rounded-lg flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            Preferences saved successfully!
          </div>
        )}
      </div>
      )}

      {/* Tabs - Only show if not locked to a single tab */}
      {!showOnlyTab && (
        <div className="flex space-x-2 border-b">
          <button
            onClick={() => setActiveTab('availability')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'availability'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Clock className="h-5 w-5 inline mr-2" />
            Availability
          </button>
          <button
            onClick={() => setActiveTab('habits')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'habits'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BookOpen className="h-5 w-5 inline mr-2" />
            Study Habits
          </button>
        </div>
      )}

      {/* Save button for compact mode (onboarding) */}
      {compact && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 flex items-center transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Preferences
              </>
            )}
          </button>
          {saved && (
            <div className="ml-4 flex items-center text-green-600 text-sm">
              <CheckCircle className="h-4 w-4 mr-1" />
              Saved!
            </div>
          )}
        </div>
      )}

      {/* Availability Tab */}
      {activeTab === 'availability' && (
              <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Daily Study Hours</h3>
            <p className="text-sm text-gray-600 mb-4">
              Set how many hours you can study each day. This will be used to personalize your study plan.
            </p>
            <div className="space-y-4">
              {DAYS.map((day) => {
                const hours = preferences.dailyAvailability?.[day.key] || 0
                return (
                  <div key={day.key} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <label className="font-medium text-gray-900">{day.label}</label>
                    </div>
                    <div className="flex items-center space-x-4">
                      <input
                        type="range"
                        min="0"
                        max="8"
                        step="0.5"
                        value={hours}
                        onChange={(e) => updateAvailability(day.key, parseFloat(e.target.value))}
                        className="w-32"
                      />
                      <div className="w-16 text-right">
                        <span className="font-semibold text-indigo-600">{hours.toFixed(1)}h</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-6 p-4 bg-indigo-50 rounded-lg border-2 border-indigo-200">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-medium text-gray-900">Total Weekly Hours Available:</span>
                    <p className="text-xs text-gray-600 mt-0.5">Sum of your daily availability</p>
                  </div>
                  <span className="text-2xl font-bold text-indigo-600">{totalWeeklyHours.toFixed(1)}h</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-indigo-200">
                  <div>
                    <span className="font-medium text-gray-900">Weekly Study Goal:</span>
                    <p className="text-xs text-gray-600 mt-0.5">Target hours you want to study</p>
                  </div>
                  <span className="text-2xl font-bold text-purple-600">{preferences.weeklyStudyGoal.toFixed(1)}h</span>
                </div>
                
                {/* Relationship Indicator */}
                {totalWeeklyHours > 0 && (
                  <div className={`mt-3 p-3 rounded-lg ${
                    totalWeeklyHours >= preferences.weeklyStudyGoal
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-yellow-50 border border-yellow-200'
                  }`}>
                    {totalWeeklyHours >= preferences.weeklyStudyGoal ? (
                      <div className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <p className="font-medium text-green-800">Sufficient time available</p>
                          <p className="text-green-700 mt-1">
                            You have {totalWeeklyHours.toFixed(1)}h available, which meets your goal of {preferences.weeklyStudyGoal.toFixed(1)}h. 
                            The system will allocate up to your goal.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start">
                        <AlertCircle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <p className="font-medium text-yellow-800">Goal exceeds available time</p>
                          <p className="text-yellow-700 mt-1">
                            Your goal is {preferences.weeklyStudyGoal.toFixed(1)}h, but you only have {totalWeeklyHours.toFixed(1)}h available. 
                            Consider increasing your daily availability or adjusting your goal.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Weekly Study Goal</h3>
            <div className="flex items-center space-x-4">
              <input
                type="number"
                min="0"
                max="50"
                step="0.5"
                value={preferences.weeklyStudyGoal}
                onChange={(e) => {
                  const updated = { ...preferences, weeklyStudyGoal: parseFloat(e.target.value) || 0 }
                  setPreferences(updated)
                  if (onPreferencesChange) {
                    onPreferencesChange(updated)
                  }
                }}
                className="px-4 py-2 border rounded-lg w-32"
              />
              <span className="text-gray-600">hours per week</span>
            </div>
          </div>
        </div>
      )}

      {/* Study Habits Tab */}
      {activeTab === 'habits' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Study Habits & Learning Style</h3>
            <p className="text-sm text-gray-600 mb-4">
              Rate how often you engage in these study habits. These composite scores help personalize your study plan with techniques that work best for you.
            </p>
            <div className="space-y-6">
              {/* Active Learning Score */}
              <div className="p-5 border-2 border-indigo-100 rounded-lg bg-indigo-50/30">
                <div className="mb-3">
                  <h4 className="font-semibold text-gray-900 mb-1">Active Learning Techniques</h4>
                  <p className="text-xs text-gray-600">
                    How often do you use summarizing, highlighting, or concept mapping?
                  </p>
                </div>
                <div className="space-y-3">
                  {[
                    { key: 'summarizing', label: 'I summarize key concepts in my own words' },
                    { key: 'highlighting', label: 'I highlight important information when reading' },
                    { key: 'conceptMapping', label: 'I create concept maps or visual diagrams' }
                  ].map((item) => {
                    const value = habitItems.activeLearning[item.key as keyof typeof habitItems.activeLearning] || 0
                    return (
                      <div key={item.key} className="flex items-center justify-between p-3 bg-white rounded border">
                        <label className="text-sm text-gray-700 flex-1">{item.label}</label>
                        <select
                          value={getLabelFromValue(value)}
                          onChange={(e) => {
                            const newValue = getValueFromLabel(e.target.value)
                            updateHabitItem('activeLearning', item.key, newValue)
                          }}
                          className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-indigo-600 focus:ring-indigo-500 focus:border-indigo-500 min-w-[120px]"
                        >
                          <option value="Never">Never</option>
                          <option value="Sometimes">Sometimes</option>
                          <option value="Often">Often</option>
                          <option value="Always">Always</option>
                        </select>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-3 pt-3 border-t border-indigo-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Active Learning Score:</span>
                    <span className="text-lg font-bold text-indigo-600">
                      {Math.round((preferences.habitActiveLearning || 0) * 100)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Planning Score */}
              <div className="p-5 border-2 border-purple-100 rounded-lg bg-purple-50/30">
                <div className="mb-3">
                  <h4 className="font-semibold text-gray-900 mb-1">Planning & Organization</h4>
                  <p className="text-xs text-gray-600">
                    How often do you set schedules, goals, and plan ahead?
                  </p>
                </div>
                <div className="space-y-3">
                  {[
                    { key: 'schedule', label: 'I set a regular study schedule' },
                    { key: 'goals', label: 'I set specific study goals' },
                    { key: 'planAhead', label: 'I plan my study sessions in advance' }
                  ].map((item) => {
                    const value = habitItems.planning[item.key as keyof typeof habitItems.planning] || 0
                    return (
                      <div key={item.key} className="flex items-center justify-between p-3 bg-white rounded border">
                        <label className="text-sm text-gray-700 flex-1">{item.label}</label>
                        <select
                          value={getLabelFromValue(value)}
                          onChange={(e) => {
                            const newValue = getValueFromLabel(e.target.value)
                            updateHabitItem('planning', item.key, newValue)
                          }}
                          className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-purple-600 focus:ring-purple-500 focus:border-purple-500 min-w-[120px]"
                        >
                          <option value="Never">Never</option>
                          <option value="Sometimes">Sometimes</option>
                          <option value="Often">Often</option>
                          <option value="Always">Always</option>
                        </select>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-3 pt-3 border-t border-purple-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Planning Score:</span>
                    <span className="text-lg font-bold text-purple-600">
                      {Math.round((preferences.habitPlanning || 0) * 100)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Discipline Score */}
              <div className="p-5 border-2 border-green-100 rounded-lg bg-green-50/30">
                <div className="mb-3">
                  <h4 className="font-semibold text-gray-900 mb-1">Discipline & Consistency</h4>
                  <p className="text-xs text-gray-600">
                    How often do you avoid procrastination and maintain regular study habits?
                  </p>
                </div>
                <div className="space-y-3">
                  {[
                    { key: 'procrastination', label: 'I avoid procrastination and start studying on time' },
                    { key: 'immediateReview', label: 'I review material immediately after learning it' },
                    { key: 'consistency', label: 'I maintain consistent study habits regularly' }
                  ].map((item) => {
                    const value = habitItems.discipline[item.key as keyof typeof habitItems.discipline] || 0
                    return (
                      <div key={item.key} className="flex items-center justify-between p-3 bg-white rounded border">
                        <label className="text-sm text-gray-700 flex-1">{item.label}</label>
                        <select
                          value={getLabelFromValue(value)}
                          onChange={(e) => {
                            const newValue = getValueFromLabel(e.target.value)
                            updateHabitItem('discipline', item.key, newValue)
                          }}
                          className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-green-600 focus:ring-green-500 focus:border-green-500 min-w-[120px]"
                        >
                          <option value="Never">Never</option>
                          <option value="Sometimes">Sometimes</option>
                          <option value="Often">Often</option>
                          <option value="Always">Always</option>
                        </select>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-3 pt-3 border-t border-green-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Discipline Score:</span>
                    <span className="text-lg font-bold text-green-600">
                      {Math.round((preferences.habitDiscipline || 0) * 100)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Confidence Score */}
              <div className="p-5 border-2 border-yellow-100 rounded-lg bg-yellow-50/30">
                <div className="mb-3">
                  <h4 className="font-semibold text-gray-900 mb-1">Confidence Level</h4>
                  <p className="text-xs text-gray-600">
                    How confident are you in passing the Psychometrician Licensure Examination?
                  </p>
                </div>
                <div className="p-3 bg-white rounded border">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-700 flex-1">
                      I am confident I will pass the licensure examination
                    </label>
                    <select
                      value={getConfidenceLabel(preferences.habitConfidence)}
                      onChange={(e) => {
                        const newValue = getConfidenceValue(e.target.value)
                        updateHabit('habitConfidence', newValue)
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-yellow-600 focus:ring-yellow-500 focus:border-yellow-500 min-w-[150px]"
                    >
                      <option value="Not Confident">Not Confident</option>
                      <option value="Somewhat Confident">Somewhat Confident</option>
                      <option value="Confident">Confident</option>
                      <option value="Very Confident">Very Confident</option>
                    </select>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-yellow-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Confidence Score:</span>
                    <span className="text-lg font-bold text-yellow-600">
                      {Math.round((preferences.habitConfidence || 0) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

