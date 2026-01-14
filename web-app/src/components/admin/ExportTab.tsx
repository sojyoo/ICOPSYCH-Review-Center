'use client'

import { useState } from 'react'
import { Download, FileDown, Loader2 } from 'lucide-react'

export default function ExportTab() {
  const [testType, setTestType] = useState<string>('all')
  const [cohort, setCohort] = useState<string>('')
  const [isExporting, setIsExporting] = useState(false)
  const [exportStatus, setExportStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  const handleExport = async () => {
    setIsExporting(true)
    setExportStatus(null)

    try {
      const params = new URLSearchParams()
      if (testType !== 'all') {
        params.append('testType', testType)
      }
      if (cohort) {
        params.append('cohort', cohort)
      }
      params.append('format', 'csv')

      const response = await fetch(`/api/admin/export?${params.toString()}`)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Export failed')
      }

      // Get the CSV content
      const csvContent = await response.text()
      
      // Create a blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      
      // Get filename from Content-Disposition header or generate one
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = `test-results-export-${testType || 'all'}-${new Date().toISOString().split('T')[0]}.csv`
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }
      
      link.setAttribute('href', url)
      link.setAttribute('download', filename)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      setExportStatus({ type: 'success', message: `Successfully exported ${filename}` })
    } catch (error: any) {
      console.error('Export error:', error)
      setExportStatus({ type: 'error', message: error.message || 'Failed to export data' })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Export Test Results</h2>
        <p className="text-gray-600">
          Export student test results to CSV format. The export includes student information, 
          test attempts, and detailed question-level responses with subject categorization.
        </p>
      </div>

      <div className="space-y-6">
        {/* Export Options */}
        <div className="bg-gray-50 rounded-lg p-6 space-y-4">
          <div>
            <label htmlFor="testType" className="block text-sm font-medium text-gray-700 mb-2">
              Test Type
            </label>
            <select
              id="testType"
              value={testType}
              onChange={(e) => setTestType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">All Tests</option>
              <option value="pre-test">Pre-Tests Only</option>
              <option value="post-test">Post-Tests Only</option>
            </select>
            <p className="mt-1 text-sm text-gray-500">
              Select which test types to include in the export
            </p>
          </div>

          <div>
            <label htmlFor="cohort" className="block text-sm font-medium text-gray-700 mb-2">
              Cohort (Optional)
            </label>
            <input
              id="cohort"
              type="text"
              value={cohort}
              onChange={(e) => setCohort(e.target.value)}
              placeholder="e.g., ICOPSYCH-2025"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
            <p className="mt-1 text-sm text-gray-500">
              Leave empty to export all cohorts
            </p>
          </div>
        </div>

        {/* Export Button */}
        <div className="flex items-center space-x-4">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className={`flex items-center px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              isExporting ? 'cursor-wait' : ''
            }`}
          >
            {isExporting ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-5 w-5 mr-2" />
                Export to CSV
              </>
            )}
          </button>
        </div>

        {/* Status Message */}
        {exportStatus && (
          <div
            className={`p-4 rounded-md ${
              exportStatus.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            <div className="flex items-center">
              {exportStatus.type === 'success' ? (
                <FileDown className="h-5 w-5 mr-2" />
              ) : (
                <Loader2 className="h-5 w-5 mr-2" />
              )}
              <span className="font-medium">{exportStatus.message}</span>
            </div>
          </div>
        )}

        {/* CSV Format Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">CSV Export Format</h3>
          <p className="text-sm text-blue-800 mb-2">
            The exported CSV file contains one row per question attempt with the following columns:
          </p>
          <ul className="text-sm text-blue-800 list-disc list-inside space-y-1">
            <li>Student information (email, student number, name, cohort)</li>
            <li>Test metadata (test type, completion date, week, lecture, subjects)</li>
            <li>Overall scores (score, percentage)</li>
            <li>Question details (ID, text, subject, difficulty)</li>
            <li>Answer information (selected option, correct option, correctness)</li>
            <li>Time spent per question</li>
          </ul>
          <p className="text-sm text-blue-800 mt-2">
            <strong>Subject Categories:</strong> Developmental Psychology, Industrial Psychology, 
            Abnormal Psychology, Psychological Assessment
          </p>
        </div>

        {/* Access Information */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Alternative Access Methods</h3>
          <p className="text-sm text-gray-700 mb-2">
            You can also access the export API directly:
          </p>
          <code className="block text-xs bg-white p-2 rounded border border-gray-300 text-gray-800 break-all">
            GET /api/admin/export?testType=pre-test&format=csv
          </code>
          <p className="text-xs text-gray-600 mt-2">
            Requires admin authentication. Add <code className="bg-gray-100 px-1 rounded">?format=json</code> for JSON format.
          </p>
        </div>
      </div>
    </div>
  )
}
