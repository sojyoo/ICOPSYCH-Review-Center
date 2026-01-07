'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { useState, useEffect } from 'react'
import { 
  Settings, 
  BookOpen, 
  Users, 
  BarChart3,
  Shield,
  LogOut
} from 'lucide-react'
import QuestionsTab from '@/components/admin/QuestionsTab'
import UsersTab from '@/components/admin/UsersTab'
import CohortsTab from '@/components/admin/CohortsTab'
import AnalyticsTab from '@/components/admin/AnalyticsTab'
import TestSettingsTab from '@/components/admin/TestSettingsTab'

export default function AdminPage() {
  const { data: session, status } = useSession()
  const [activeTab, setActiveTab] = useState('questions')

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      redirect('/login')
      return
    }
    if (session.user?.role !== 'admin') {
      redirect('/dashboard')
      return
    }
  }, [session, status])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session || session.user?.role !== 'admin') {
    return null
  }

  const tabs = [
    { id: 'questions', label: 'Questions', icon: BookOpen },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'cohorts', label: 'Cohorts', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'test-settings', label: 'Test Settings', icon: Settings }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Shield className="h-6 w-6 text-indigo-600 mr-2" />
              <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
            </div>
            <div className="flex items-center space-x-4">
              <a
                href="/dashboard"
                className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center px-3 py-1.5 border border-indigo-300 rounded-md hover:bg-indigo-50"
                title="View student dashboard (for testing)"
              >
                <Users className="h-4 w-4 mr-1" />
                Student View
              </a>
              <span className="text-sm text-gray-600">Welcome, {session.user?.name}</span>
              <a
                href="/api/auth/signout"
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Sign out
              </a>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-2" />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow">
          {activeTab === 'questions' && <QuestionsTab />}
          {activeTab === 'users' && <UsersTab />}
          {activeTab === 'cohorts' && <CohortsTab />}
          {activeTab === 'analytics' && <AnalyticsTab />}
          {activeTab === 'test-settings' && <TestSettingsTab />}
        </div>
      </div>
    </div>
  )
}


