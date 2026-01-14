# Data Export Analysis & Implementation

## Current State Analysis

### ✅ Data Storage Capabilities

The system **CAN** store all required data:

1. **Student Account Data** (User model):
   - `id`, `email`, `studentNumber`, `name`, `cohort`, `role`
   - Stored in `users` table

2. **Test Attempts** (TestAttempt model):
   - `id`, `userId`, `testType` (pre-test, post-test, mock-exam)
   - `weekNumber`, `lecture`, `subjects` (JSON array)
   - `score`, `totalQuestions`, `timeSpent`
   - `subjectScores` (JSON object with per-subject scores)
   - `completedAt` (timestamp)
   - Stored in `test_attempts` table

3. **Question Attempts** (QuestionAttempt model):
   - `id`, `testAttemptId`, `questionId`
   - `selectedOption` (0-3 for A-D)
   - `isCorrect` (boolean)
   - `timeSpent` (seconds per question)
   - Stored in `question_attempts` table

4. **Questions** (Question model):
   - `id`, `question` (text), `options` (JSON array)
   - `correctIndex` (0-3)
   - `subject` (Developmental Psychology, Industrial Psychology, etc.)
   - `difficulty`, `week`, `lecture`
   - Stored in `questions` table

### ❌ Missing: CSV Export Functionality

**Current Status**: No CSV export feature exists.

**What's Needed**:
- API endpoint to export pre-test and post-test results
- CSV format with:
  - Student information (email, studentNumber, name, cohort)
  - Test attempt metadata (testType, completedAt, weekNumber, lecture)
  - Question-level data (question text, subject, selected answer, correct answer, isCorrect)
  - Subject categorization

## Implementation Roadmap

### Phase 1: Create Export API Endpoint
**File**: `web-app/src/app/api/admin/export/route.ts`

**Features**:
- Admin-only access
- Filter by test type (pre-test, post-test, or both)
- Filter by cohort (optional)
- Export to CSV format
- Include all question attempts with subject categorization

**CSV Structure**:
```
Student Email, Student Number, Name, Cohort, Test Type, Test ID, Completed At, Week, Lecture, 
Question ID, Question Text, Subject, Selected Option, Correct Option, Is Correct, Time Spent (s)
```

### Phase 2: Create Admin UI Component (Optional)
**File**: `web-app/src/app/admin/export/page.tsx`

**Features**:
- Dropdown to select test type (pre-test, post-test, all)
- Dropdown to select cohort
- "Export CSV" button
- Download file with timestamp

### Phase 3: Alternative Access Methods
- Direct API call with authentication
- Command-line script for database export
- Admin dashboard integration

## Data Access Points

### Where to View Current Data:

1. **Database Direct Access**:
   - PostgreSQL database via Prisma Studio: `npx prisma studio`
   - Or connect via database client

2. **API Endpoints** (JSON only):
   - `/api/admin/users` - List all users with test stats
   - `/api/admin/analytics` - Overall analytics
   - `/api/test/results?attemptId={id}` - Individual test results (user-specific)

3. **Admin Dashboard** (if exists):
   - Check for admin pages in `web-app/src/app/admin/`

## CSV Export Format Specification

### Row Structure (One row per question attempt):

| Column | Description | Example |
|--------|-------------|---------|
| `student_email` | User's email | `student@example.com` |
| `student_number` | Student ID | `2024-00123M` |
| `student_name` | Full name | `Juan Dela Cruz` |
| `cohort` | Cohort identifier | `ICOPSYCH-2025` |
| `test_type` | pre-test or post-test | `pre-test` |
| `test_attempt_id` | Unique test attempt ID | `clx123abc456` |
| `completed_at` | Test completion timestamp | `2025-01-15T10:30:00Z` |
| `week_number` | Week number (if applicable) | `1` |
| `lecture` | Lecture number (1, 2, 3) | `1` |
| `subjects` | Subjects covered (JSON) | `["Developmental Psychology"]` |
| `question_id` | Unique question ID | `clx789def012` |
| `question_text` | Full question text | `What is Piaget's first stage?` |
| `question_subject` | Question subject | `Developmental Psychology` |
| `question_difficulty` | easy, medium, hard | `medium` |
| `selected_option` | 0=A, 1=B, 2=C, 3=D | `2` |
| `selected_option_text` | Actual selected answer | `Concrete Operational` |
| `correct_option` | 0=A, 1=B, 2=C, 3=D | `0` |
| `correct_option_text` | Actual correct answer | `Sensorimotor` |
| `is_correct` | true/false | `false` |
| `time_spent_seconds` | Time on question | `45` |
| `overall_score` | Test score (X/Y) | `15/20` |
| `overall_percentage` | Test percentage | `75.0` |

### Subject Categories:
- Developmental Psychology
- Industrial Psychology
- Abnormal Psychology
- Psychological Assessment

## Implementation Priority

**HIGH PRIORITY** - This is essential for:
- Thesis data analysis
- Performance tracking
- Research validation
- Defense preparation

**Estimated Time**: 2-3 hours

## Implementation Status

### ✅ Completed

1. ✅ **Export API Endpoint** (`/api/admin/export`)
   - Admin-only access
   - Filter by test type (pre-test, post-test, all)
   - Filter by cohort (optional)
   - CSV and JSON format support
   - Proper CSV escaping for special characters

2. ✅ **Admin UI Component** (`/admin` → Export Data tab)
   - User-friendly interface
   - Test type selection dropdown
   - Cohort filter input
   - Download button with loading state
   - Status messages (success/error)
   - Format documentation

3. ✅ **CSV Format**
   - One row per question attempt
   - All required columns included
   - Subject categorization
   - Proper data escaping

### 📍 How to Access

#### Method 1: Admin Dashboard (Recommended)
1. Log in as admin user
2. Navigate to `/admin`
3. Click on "Export Data" tab
4. Select test type (pre-test, post-test, or all)
5. Optionally enter cohort filter
6. Click "Export to CSV"
7. File will download automatically

#### Method 2: Direct API Call
```
GET /api/admin/export?testType=pre-test&format=csv
GET /api/admin/export?testType=post-test&cohort=ICOPSYCH-2025&format=csv
GET /api/admin/export?format=json
```

**Authentication Required**: Admin role only

#### Method 3: Database Direct Access
- Use Prisma Studio: `npx prisma studio`
- Or connect via PostgreSQL client
- Query `test_attempts`, `question_attempts`, `users`, `questions` tables

### 📊 CSV Export Format

The exported CSV includes:

**Student Information:**
- Student Email
- Student Number
- Student Name
- Cohort

**Test Metadata:**
- Test Type (pre-test/post-test)
- Test Attempt ID
- Completed At (timestamp)
- Week Number
- Lecture
- Subjects (semicolon-separated)
- Overall Score (X/Y format)
- Overall Percentage

**Question-Level Data:**
- Question ID
- Question Text
- Question Subject (categorized)
- Question Difficulty
- Selected Option (index and text)
- Correct Option (index and text)
- Is Correct (Yes/No)
- Time Spent (seconds)

### 🔍 Subject Categories

All questions are categorized by one of these subjects:
- Developmental Psychology
- Industrial Psychology
- Abnormal Psychology
- Psychological Assessment

### 📝 Next Steps (Optional Enhancements)

1. ⏳ Add date range filtering
2. ⏳ Add export progress indicator for large datasets
3. ⏳ Add export history/logging
4. ⏳ Add scheduled exports
5. ⏳ Add Excel format support (.xlsx)
