const fs = require('fs')
const path = require('path')
const xlsx = require('xlsx')

const ROOT = path.join(__dirname, '..', '..')

const PRE_FILE = path.join(
  ROOT,
  'Pre-Tests',
  'BSP4A',
  'Pre-Tests 1',
  'PrT1 _ DEVELOPMENTAL PSYCHOLOGY _ Lecture 1 _ April 5, 2025 (Responses).xlsx'
)

const POST_FILE = path.join(
  ROOT,
  'Posttests',
  'BSP 4B',
  'Posttests 1',
  'SPREADSHEET RESULTS',
  'PoT1 _ DEVELOPMENTAL PSYCHOLOGY _ Lecture 1 _ March 29, 2025 (Responses).xlsx'
)

const OUTPUT_DIR = path.join(__dirname, '..', 'src', 'data')

const META_COLUMNS = 5 // timestamp, email, score, name, section

function readSheet(filePath) {
  const workbook = xlsx.readFile(filePath)
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  return xlsx.utils.sheet_to_json(sheet, { header: 1 })
}

function buildAnswerKey(rows) {
  const headers = rows[0]
  const responses = rows.slice(1).filter((row) => Array.isArray(row) && row.length > META_COLUMNS && typeof row[2] === 'number')
  const questionHeaders = headers.slice(META_COLUMNS)
  const numQuestions = questionHeaders.length
  const answers = responses.map((row) =>
    questionHeaders.map((_, idx) => {
      const value = row[META_COLUMNS + idx]
      return typeof value === 'string' ? value.trim() : ''
    })
  )
  const scores = responses.map((row) => Number(row[2]) || 0)

  const optionEntries = questionHeaders.map((_, questionIndex) => {
    const optionMap = new Map()
    answers.forEach((rowAnswers, responseIndex) => {
      const ans = rowAnswers[questionIndex]
      if (!ans) {
        return
      }
      if (!optionMap.has(ans)) {
        optionMap.set(ans, [])
      }
      optionMap.get(ans).push(responseIndex)
    })

    return Array.from(optionMap.entries()).map(([value, responseIndices]) => ({
      value,
      responseIndices,
    }))
  })

  const questionOrder = optionEntries
    .map((entries, index) => ({ index, size: entries.length }))
    .sort((a, b) => a.size - b.size)
    .map((item) => item.index)

  const solution = new Array(numQuestions)
  const remainingScores = scores.slice()

  function remainingQuestionsForResponse(responseIndex, currentPosition) {
    return numQuestions - currentPosition
  }

  function dfs(position) {
    if (position === numQuestions) {
      return remainingScores.every((score) => score === 0)
    }

    const questionIndex = questionOrder[position]
    const candidates = optionEntries[questionIndex]

    for (const candidate of candidates) {
      const decremented = []
      let valid = true

      for (const responseIndex of candidate.responseIndices) {
        remainingScores[responseIndex] -= 1
        decremented.push(responseIndex)
        if (remainingScores[responseIndex] < 0) {
          valid = false
          break
        }
      }

      if (valid) {
        for (let responseIndex = 0; responseIndex < remainingScores.length; responseIndex++) {
          const remainingSlots = numQuestions - (position + 1)
          if (remainingScores[responseIndex] > remainingSlots) {
            valid = false
            break
          }
        }
      }

      if (valid && dfs(position + 1)) {
        solution[questionIndex] = candidate.value
        return true
      }

      for (const responseIndex of decremented) {
        remainingScores[responseIndex] += 1
      }
    }

    return false
  }

  if (!dfs(0)) {
    throw new Error('Unable to derive answer key for file: ' + rows[0][META_COLUMNS])
  }

  return {
    questionHeaders,
    solution,
    answers,
  }
}

function formatQuestions(questionHeaders, solution, rows) {
  const responses = rows.slice(1)
  const questions = questionHeaders.map((questionText, qIndex) => {
    const optionsSet = new Set()
    responses.forEach((row) => {
      const option = row[META_COLUMNS + qIndex]
      if (typeof option === 'string' && option.trim()) {
        optionsSet.add(option.trim())
      }
    })

    const options = Array.from(optionsSet).sort((a, b) => {
      const getPrefix = (opt) => {
        const match = opt.match(/^[a-z]\./i)
        return match ? match[0] : opt
      }
      return getPrefix(a).localeCompare(getPrefix(b))
    })

    const correctIndex = options.indexOf(solution[qIndex])
    return {
      question: questionText.trim(),
      options,
      correctIndex: correctIndex >= 0 ? correctIndex : 0,
      subject: 'Developmental Psychology',
      week: 1,
      lecture: 1,
    }
  })

  return questions
}

function writeQuestions(filename, questions) {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  const payload = {
    subject: 'Developmental Psychology',
    week: 1,
    lecture: 1,
    questions,
  }

  fs.writeFileSync(path.join(OUTPUT_DIR, filename), JSON.stringify(payload, null, 2))
}

function generate() {
  const preRows = readSheet(PRE_FILE)
  const preKey = buildAnswerKey(preRows)
  const preQuestions = formatQuestions(preKey.questionHeaders, preKey.solution, preRows)
  writeQuestions('dev-psych-pre.json', preQuestions)

  const postRows = readSheet(POST_FILE)
  const postKey = buildAnswerKey(postRows)
  const postQuestions = formatQuestions(postKey.questionHeaders, postKey.solution, postRows)
  writeQuestions('dev-psych-post.json', postQuestions)

  console.log('Generated Developmental Psychology question banks.')
}

generate()

