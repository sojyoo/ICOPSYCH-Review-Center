import fs from 'fs'
import path from 'path'

const questionsPath = path.join(process.cwd(), '..', 'public', 'questions.json')

try {
  const questionsData = JSON.parse(fs.readFileSync(questionsPath, 'utf8'))
  console.log(`\n📋 Questions in JSON file: ${questionsData.length}\n`)
  
  // Count by subject
  const bySubject: Record<string, number> = {}
  questionsData.forEach((q: any) => {
    bySubject[q.subject] = (bySubject[q.subject] || 0) + 1
  })
  
  console.log('By Subject:')
  Object.entries(bySubject).sort((a, b) => b[1] - a[1]).forEach(([subject, count]) => {
    console.log(`  ${subject}: ${count}`)
  })
  
  // Count by test type
  const byTestType: Record<string, number> = {}
  questionsData.forEach((q: any) => {
    byTestType[q.testType] = (byTestType[q.testType] || 0) + 1
  })
  
  console.log('\nBy Test Type:')
  Object.entries(byTestType).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`)
  })
  
} catch (error) {
  console.error('Error reading questions file:', error)
}




