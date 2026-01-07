'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signIn, getSession } from 'next-auth/react'
import { Eye, EyeOff } from 'lucide-react'

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    studentNumber: '',
    password: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [validationErrors, setValidationErrors] = useState({
    email: '',
    password: '',
    studentNumber: ''
  })

  // Email format validation
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Password validation: 6 characters, one number, one uppercase, one special character
  const validatePassword = (password: string): { valid: boolean; error: string } => {
    if (password.length < 6) {
      return { valid: false, error: 'Password must be at least 6 characters' }
    }
    if (!/[0-9]/.test(password)) {
      return { valid: false, error: 'Password must contain at least one number' }
    }
    if (!/[A-Z]/.test(password)) {
      return { valid: false, error: 'Password must contain at least one uppercase letter' }
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return { valid: false, error: 'Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)' }
    }
    return { valid: true, error: '' }
  }

  // Student number validation: XXX-XXXXXM format
  const validateStudentNumber = (studentNumber: string): { valid: boolean; error: string } => {
    const studentNumberRegex = /^\d{3}-\d{4}[A-Z]$/
    if (!studentNumberRegex.test(studentNumber)) {
      return { valid: false, error: 'Student number must be in format XXX-XXXXXM (e.g., 225-0123M)' }
    }
    return { valid: true, error: '' }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setValidationErrors({ email: '', password: '', studentNumber: '' })

    // Validate email format
    if (!validateEmail(formData.email)) {
      setValidationErrors(prev => ({ ...prev, email: 'Please enter a valid email address' }))
      setLoading(false)
      return
    }

    // Validate password
    const passwordValidation = validatePassword(formData.password)
    if (!passwordValidation.valid) {
      setValidationErrors(prev => ({ ...prev, password: passwordValidation.error }))
      setLoading(false)
      return
    }

    // Validate student number format
    const studentNumberValidation = validateStudentNumber(formData.studentNumber)
    if (!studentNumberValidation.valid) {
      setValidationErrors(prev => ({ ...prev, studentNumber: studentNumberValidation.error }))
      setLoading(false)
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          studentNumber: formData.studentNumber,
          password: formData.password
        })
      })

      if (response.ok) {
        // Registration successful - auto-login and redirect to dashboard
        try {
          const result = await signIn('credentials', {
            email: formData.email,
            password: formData.password,
            redirect: false,
          })

          if (result?.ok) {
            // Get session to check user role
            const session = await getSession()
            if (session?.user?.role === 'admin') {
              window.location.href = '/admin'
            } else {
              // Auto-login successful, redirect to dashboard (onboarding will show)
              window.location.href = '/dashboard'
            }
          } else {
            // Fallback to login page if auto-login fails
            window.location.href = '/login?registered=true'
          }
        } catch (error) {
          // Fallback to login page
          window.location.href = '/login?registered=true'
        }
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Registration failed')
      }
    } catch (error) {
      setError('Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto h-12 w-12 bg-indigo-600 rounded-full flex items-center justify-center mb-4">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            Join ICOPSYCH Review Center
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Create your account to start your psychology review journey
          </p>
        </div>

        {/* Form */}
        <div className="bg-white py-8 px-6 shadow-xl rounded-lg">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={`w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                  validationErrors.email ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => {
                  setFormData({...formData, email: e.target.value})
                  if (validationErrors.email) {
                    setValidationErrors(prev => ({ ...prev, email: '' }))
                  }
                }}
                onBlur={() => {
                  if (formData.email && !validateEmail(formData.email)) {
                    setValidationErrors(prev => ({ ...prev, email: 'Please enter a valid email address' }))
                  }
                }}
              />
              {validationErrors.email && (
                <p className="mt-1 text-xs text-red-600">{validationErrors.email}</p>
              )}
            </div>

            {/* Student Number */}
            <div>
              <label htmlFor="studentNumber" className="block text-sm font-medium text-gray-700 mb-2">
                Student Number
              </label>
              <input
                id="studentNumber"
                name="studentNumber"
                type="text"
                required
                maxLength={9}
                className={`w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 uppercase ${
                  validationErrors.studentNumber ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="e.g. 225-0123M"
                value={formData.studentNumber}
                onChange={(e) => {
                  // Auto-format: XXX-XXXXXM
                  let value = e.target.value.toUpperCase().replace(/[^0-9A-Z-]/g, '')
                  // Auto-insert dash after 3 digits
                  if (value.length > 3 && value[3] !== '-') {
                    value = value.slice(0, 3) + '-' + value.slice(3)
                  }
                  setFormData({...formData, studentNumber: value})
                  if (validationErrors.studentNumber) {
                    setValidationErrors(prev => ({ ...prev, studentNumber: '' }))
                  }
                }}
                onBlur={() => {
                  if (formData.studentNumber && !validateStudentNumber(formData.studentNumber).valid) {
                    setValidationErrors(prev => ({ ...prev, studentNumber: validateStudentNumber(formData.studentNumber).error }))
                  }
                }}
              />
              {validationErrors.studentNumber ? (
                <p className="mt-1 text-xs text-red-600">{validationErrors.studentNumber}</p>
              ) : (
                <p className="mt-1 text-xs text-gray-500">Format: XXX-XXXXXM (e.g., 225-0123M)</p>
              )}
            </div>
            
            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  className={`w-full px-3 py-2 pr-10 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                    validationErrors.password ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({...formData, password: e.target.value})
                    if (validationErrors.password) {
                      setValidationErrors(prev => ({ ...prev, password: '' }))
                    }
                  }}
                  onBlur={() => {
                    if (formData.password && !validatePassword(formData.password).valid) {
                      setValidationErrors(prev => ({ ...prev, password: validatePassword(formData.password).error }))
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {validationErrors.password && (
                <p className="mt-1 text-xs text-red-600">{validationErrors.password}</p>
              )}
              {formData.password && !validationErrors.password && (
                <p className="mt-1 text-xs text-gray-500">
                  Must be 6+ characters with: one number, one uppercase letter, one special character
                </p>
              )}
            </div>
            
            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="mt-1 text-xs text-red-600">Passwords do not match</p>
              )}
              {formData.password && formData.confirmPassword && formData.password === formData.confirmPassword && (
                <p className="mt-1 text-xs text-green-600">Passwords match</p>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Account...
                  </div>
                ) : (
                  'Create Account'
                )}
              </button>
            </div>

            {/* Login Link */}
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors">
                  Sign in here
                </Link>
              </p>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            By creating an account, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  )
}
