# CSV Export Feature - Summary

## ✅ Implementation Complete

The system now has full CSV export functionality for pre-test and post-test results.

## Current State

### Data Storage: ✅ YES
The system **CAN** store all required data:
- ✅ Student account information (email, student number, name, cohort)
- ✅ Test attempts (pre-test, post-test, mock-exam)
- ✅ Individual question answers with correctness
- ✅ Subject categorization for all questions
- ✅ Timestamps and metadata

### CSV Export: ✅ YES (NEW)
The system **NOW** has CSV export functionality:
- ✅ Export pre-test results
- ✅ Export post-test results
- ✅ Export all test results
- ✅ Filter by cohort
- ✅ Subject categorization included
- ✅ One row per question attempt
- ✅ All student information included

## Where to View/Export Data

### Option 1: Admin Dashboard (Easiest)
1. **Log in** as an admin user
2. **Navigate** to: `/admin` (or click "Admin Panel" if available)
3. **Click** the "Export Data" tab
4. **Select** test type:
   - "All Tests" - exports everything
   - "Pre-Tests Only" - exports only pre-tests
   - "Post-Tests Only" - exports only post-tests
5. **Optionally** enter a cohort (e.g., "ICOPSYCH-2025")
6. **Click** "Export to CSV"
7. **File downloads** automatically with filename like: `test-results-export-pre-test-2025-01-15.csv`

### Option 2: Direct API Call
If you have admin access, you can call the API directly:

**For Pre-Tests:**
```
GET /api/admin/export?testType=pre-test&format=csv
```

**For Post-Tests:**
```
GET /api/admin/export?testType=post-test&format=csv
```

**For All Tests:**
```
GET /api/admin/export?format=csv
```

**With Cohort Filter:**
```
GET /api/admin/export?testType=pre-test&cohort=ICOPSYCH-2025&format=csv
```

**For JSON Format:**
```
GET /api/admin/export?testType=pre-test&format=json
```

### Option 3: Database Direct Access
- Use **Prisma Studio**: Run `npx prisma studio` in the `web-app` directory
- Or connect via **PostgreSQL client** to your database
- Query tables: `users`, `test_attempts`, `question_attempts`, `questions`

## CSV Format Details

### Columns Included:

1. **Student Information:**
   - Student Email
   - Student Number
   - Student Name
   - Cohort

2. **Test Information:**
   - Test Type (pre-test/post-test)
   - Test Attempt ID
   - Completed At (timestamp)
   - Week Number
   - Lecture
   - Subjects (semicolon-separated list)
   - Overall Score (format: "15/20")
   - Overall Percentage

3. **Question-Level Data:**
   - Question ID
   - Question Text
   - Question Subject (categorized)
   - Question Difficulty
   - Selected Option (index: 0-3)
   - Selected Option (text: actual answer)
   - Correct Option (index: 0-3)
   - Correct Option (text: actual answer)
   - Is Correct (Yes/No)
   - Time Spent (seconds)

### Subject Categories:
All questions are categorized by one of:
- **Developmental Psychology**
- **Industrial Psychology**
- **Abnormal Psychology**
- **Psychological Assessment**

### Example Row:
```
student@example.com,2024-00123M,Juan Dela Cruz,ICOPSYCH-2025,pre-test,clx123abc,2025-01-15T10:30:00Z,1,1,"Developmental Psychology",15/20,75.0,clx789def,"What is Piaget's first stage?",Developmental Psychology,medium,2,"Concrete Operational",0,"Sensorimotor",No,45
```

## Files Created/Modified

1. **`web-app/src/app/api/admin/export/route.ts`** (NEW)
   - API endpoint for CSV/JSON export
   - Admin-only access
   - Filtering by test type and cohort

2. **`web-app/src/components/admin/ExportTab.tsx`** (NEW)
   - Admin UI component for export
   - User-friendly interface with filters

3. **`web-app/src/app/admin/page.tsx`** (MODIFIED)
   - Added "Export Data" tab to admin panel

4. **`DATA_EXPORT_ANALYSIS.md`** (NEW)
   - Detailed analysis and documentation

## Testing the Feature

1. **Ensure you have admin access:**
   - Your user account must have `role: 'admin'` in the database

2. **Ensure you have test data:**
   - Students must have completed pre-tests or post-tests
   - Data should be in `test_attempts` and `question_attempts` tables

3. **Test the export:**
   - Go to `/admin` → "Export Data" tab
   - Select "Pre-Tests Only"
   - Click "Export to CSV"
   - Verify the downloaded file contains expected data

## Troubleshooting

**"Unauthorized" error:**
- Make sure you're logged in as an admin user
- Check your user's `role` field in the database

**Empty export:**
- Verify there are test attempts in the database
- Check that test types match your filter (pre-test/post-test)
- Verify the cohort filter matches actual cohort names

**File not downloading:**
- Check browser console for errors
- Try a different browser
- Check that pop-up blockers aren't preventing download

## Next Steps (Optional)

If you need additional features:
- Date range filtering
- Export progress for large datasets
- Excel format (.xlsx) support
- Scheduled automatic exports
- Export history/logging

---

**Status**: ✅ **READY TO USE**

The CSV export feature is fully implemented and ready for use. You can now export pre-test and post-test results with all student information, question-level answers, and subject categorization.
