'use client'

import { useState, useEffect, useRef } from 'react'
import { X, ArrowRight, Clock, BookOpen, Settings, CheckCircle } from 'lucide-react'
import UserPreferences from './UserPreferences'

interface OnboardingModalProps {
  onComplete: () => void
  onSkip: () => void
}

export default function OnboardingModal({ onComplete, onSkip }: OnboardingModalProps) {
  const [step, setStep] = useState(1)
  const [availabilityComplete, setAvailabilityComplete] = useState(false)
  const [habitsComplete, setHabitsComplete] = useState(false)
  const currentPreferencesRef = useRef<any>(null)

  const totalSteps = 4

  const handleAvailabilitySave = async () => {
    setAvailabilityComplete(true)
    // Trigger initial risk level assessment after first save
    try {
      await fetch('/api/ml/predict', { method: 'GET' })
    } catch (error) {
      console.error('Error triggering initial risk assessment:', error)
      // Don't show error to user, this is background operation
    }
  }

  const handleHabitsSave = async () => {
    setHabitsComplete(true)
    // Trigger initial risk level assessment after habits are saved
    try {
      await fetch('/api/ml/predict', { method: 'GET' })
    } catch (error) {
      console.error('Error triggering initial risk assessment:', error)
      // Don't show error to user, this is background operation
    }
  }

  const handleNext = async () => {
    // Auto-save preferences before moving to next step
    if (step === 2 || step === 3) {
      // Longer delay to ensure any pending state updates (especially composite score calculations) are flushed
      await new Promise(resolve => setTimeout(resolve, 200))
      
      if (currentPreferencesRef.current) {
        try {
          console.log('💾 Auto-saving preferences on Next:', currentPreferencesRef.current)
          console.log('💾 Composite scores in auto-save:', {
            habitActiveLearning: currentPreferencesRef.current.habitActiveLearning,
            habitPlanning: currentPreferencesRef.current.habitPlanning,
            habitDiscipline: currentPreferencesRef.current.habitDiscipline,
            habitConfidence: currentPreferencesRef.current.habitConfidence
          })
          // Save the current preferences from the component
          const response = await fetch('/api/user/preferences', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentPreferencesRef.current)
          })
          
          if (response.ok) {
            console.log('✅ Auto-save successful')
            if (step === 2) {
              setAvailabilityComplete(true)
              // Trigger initial risk level assessment (don't wait)
              fetch('/api/ml/predict', { method: 'GET' }).catch(err => console.error('Error triggering risk assessment:', err))
            } else if (step === 3) {
              setHabitsComplete(true)
              // Trigger initial risk level assessment (don't wait)
              fetch('/api/ml/predict', { method: 'GET' }).catch(err => console.error('Error triggering risk assessment:', err))
            }
            // Advance step after successful save
            if (step < totalSteps) {
              setStep(step + 1)
            } else {
              onComplete()
            }
            return // Exit early after successful save
          } else {
            console.error('❌ Auto-save failed:', response.status)
          }
        } catch (error) {
          console.error('Error auto-saving preferences:', error)
          // Continue anyway - don't block the user
        }
      } else {
        console.warn('⚠️ No preferences to save')
      }
    }
    
    // Advance step if we haven't already (in case save failed or wasn't needed)
    if (step < totalSteps) {
      setStep(step + 1)
    } else {
      onComplete()
    }
  }

  const handleSkip = () => {
    onSkip()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6 rounded-t-lg">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-2xl font-bold">Welcome to ICOPSYCH Review Center!</h2>
              <p className="text-indigo-100 mt-1">Let's personalize your study experience</p>
            </div>
            <button
              onClick={handleSkip}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
              aria-label="Skip onboarding"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          {/* Progress Steps */}
          <div className="flex items-center space-x-2">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full font-semibold ${
                    s <= step
                      ? 'bg-white text-indigo-600'
                      : 'bg-white/30 text-white'
                  }`}
                >
                  {s < step ? <CheckCircle className="h-5 w-5" /> : s}
                </div>
                {s < totalSteps && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      s < step ? 'bg-white' : 'bg-white/30'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Welcome */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center py-8">
                <div className="mx-auto h-20 w-20 bg-indigo-100 rounded-full flex items-center justify-center mb-6">
                  <BookOpen className="h-10 w-10 text-indigo-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  Get Started with Personalized Learning
                </h3>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  We'll help you create a study plan tailored to your schedule, habits, and learning preferences. 
                  This takes just a few minutes and will make your review experience much more effective.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                <div className="p-4 border-2 border-indigo-100 rounded-lg">
                  <Clock className="h-8 w-8 text-indigo-600 mb-3" />
                  <h4 className="font-semibold text-gray-900 mb-2">Set Your Availability</h4>
                  <p className="text-sm text-gray-600">
                    Tell us when you can study each day so we can create a realistic schedule
                  </p>
                </div>
                <div className="p-4 border-2 border-indigo-100 rounded-lg">
                  <BookOpen className="h-8 w-8 text-indigo-600 mb-3" />
                  <h4 className="font-semibold text-gray-900 mb-2">Share Your Study Habits</h4>
                  <p className="text-sm text-gray-600">
                    Help us understand how you learn best to personalize recommendations
                  </p>
                </div>
                <div className="p-4 border-2 border-indigo-100 rounded-lg">
                  <Settings className="h-8 w-8 text-indigo-600 mb-3" />
                  <h4 className="font-semibold text-gray-900 mb-2">Choose Preferences</h4>
                  <p className="text-sm text-gray-600">
                    Select your preferred study methods and environment
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Availability Setup */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Set Your Daily Availability</h3>
                <p className="text-gray-600">
                  Tell us when you can study each day. This helps us create a realistic schedule that fits your life.
                </p>
              </div>
              
              <div className="border rounded-lg p-4 max-h-[60vh] overflow-y-auto">
                <UserPreferences 
                  onSave={handleAvailabilitySave}
                  onPreferencesChange={(prefs) => { 
                    currentPreferencesRef.current = prefs
                    console.log('🔄 Availability ref updated:', prefs)
                  }}
                  compact={true}
                  showOnlyTab="availability"
                />
                {availabilityComplete && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Availability saved! Click Next to continue.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Study Habits Setup */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Share Your Study Habits</h3>
                <p className="text-gray-600">
                  Help us understand your learning style. This personalizes your study plan with techniques that work best for you.
                </p>
              </div>
              
              <div className="border rounded-lg p-4 max-h-[60vh] overflow-y-auto">
                <UserPreferences 
                  key={`habits-${step}`} // Force remount when step changes
                  onSave={handleHabitsSave}
                  onPreferencesChange={(prefs) => { 
                    currentPreferencesRef.current = prefs
                    console.log('🔄 Habits ref updated:', prefs)
                  }}
                  compact={true}
                  showOnlyTab="habits"
                />
                {habitsComplete && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Study habits saved! Click Next to continue.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Complete */}
          {step === 4 && (
            <div className="text-center py-12">
              <div className="mx-auto h-20 w-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                You're All Set!
              </h3>
              <p className="text-gray-600 max-w-2xl mx-auto mb-8">
                Your personalized study plan is ready. We'll use your preferences to create daily study tasks 
                that fit your schedule and learning style.
              </p>
              <div className="bg-indigo-50 rounded-lg p-6 max-w-md mx-auto">
                <h4 className="font-semibold text-gray-900 mb-3">What's Next?</h4>
                <ul className="text-left space-y-2 text-sm text-gray-600">
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-indigo-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Check your "Today's Plan" for personalized study tasks</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-indigo-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Take a pre-test to assess your current knowledge</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-indigo-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Update your preferences anytime from the Dashboard</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t p-6 rounded-b-lg">
          <div className="flex justify-between items-center">
            <button
              onClick={handleSkip}
              className="px-6 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              Skip for Now
            </button>
            <div className="flex space-x-3">
              {step > 1 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                >
                  Back
                </button>
              )}
              <button
                onClick={handleNext}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 flex items-center transition-colors"
              >
                {step === totalSteps ? 'Get Started' : 'Next'}
                {step < totalSteps && <ArrowRight className="h-5 w-5 ml-2" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

