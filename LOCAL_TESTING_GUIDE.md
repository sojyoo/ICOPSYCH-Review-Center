# Local Testing Guide - New Features

## ✅ Deployment Status Confirmed

Based on your screenshots:
- **Vercel**: ✅ Deployed at `icopsych-review-center.vercel.app`
- **Render**: ✅ Deployed at `ml-recommendations-api.onrender.com`
- **GitHub**: ✅ Connected (auto-deploy enabled)

**Note:** Changes will reflect automatically when you push to GitHub, but you can test locally first without deploying.

---

## 🧪 Local Testing Setup

### Step 1: Start the ML API (Render service)

The ML API is already deployed on Render, but for local testing, you can run it locally:

```bash
# In the root directory
python ml_recommendations_api.py
```

Or if you prefer to use the deployed version:
- **ML API URL**: `https://ml-recommendations-api.onrender.com/recommendations`
- Already configured in your code (uses `process.env.ML_API_URL`)

### Step 2: Start the Next.js App

```bash
# Navigate to web-app directory
cd web-app

# Install dependencies (if not already done)
npm install

# Start the development server
npm run dev
```

The app will run at: `http://localhost:3000`

### Step 3: Set Up Environment Variables (if needed)

Create `web-app/.env.local`:

```env
# Database (use local SQLite for testing)
DATABASE_URL="file:./prisma/dev.db"

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-local-secret-key-here

# ML API (use local or Render)
ML_API_URL=http://localhost:5000/recommendations
# OR use deployed version:
# ML_API_URL=https://ml-recommendations-api.onrender.com/recommendations
```

---

## 🎯 Testing New Features

### 1. Admin Panel

**URL:** `http://localhost:3000/admin`

**Test Credentials:**
- Email: `admin@reviewcenter.com`
- Password: `admin123`

**What to Test:**
- [ ] Questions tab - Create, edit, delete questions
- [ ] Users tab - View users, edit details, filter by risk level
- [ ] Cohorts tab - Create/edit cohorts
- [ ] Analytics tab - View statistics, export CSV

### 2. Weekly Study Plan

**URL:** `http://localhost:3000/study-plan` → "Weekly Plan" tab

**What to Test:**
- [ ] Plan generates for current week
- [ ] Daily tasks show correct times and topics
- [ ] Navigation between weeks works
- [ ] Performance stats display correctly
- [ ] Upcoming tests are shown

### 3. Calendar/Time Blocking

**URL:** `http://localhost:3000/calendar`

**What to Test:**
- [ ] Week view shows study plan events
- [ ] Month view displays correctly
- [ ] Events are color-coded
- [ ] Can navigate between weeks/months
- [ ] ICOPSYCH schedule events appear

### 4. Daily Study Dashboard

**Component Location:** Can be added to dashboard or accessed via API

**What to Test:**
- [ ] Today's tasks load correctly
- [ ] Progress stats calculate properly
- [ ] Can mark tasks as complete
- [ ] Quick actions work

**To Add to Dashboard:**
Add this to `web-app/src/app/dashboard/page.tsx`:
```tsx
import DailyStudyDashboard from '@/components/DailyStudyDashboard'

// In the dashboard content, add:
{activeTab === 'daily' && <DailyStudyDashboard />}
```

### 5. Study Session Tracking

**Component Location:** Can be added anywhere or accessed via API

**What to Test:**
- [ ] Can log a study session
- [ ] Sessions appear in history
- [ ] Statistics calculate correctly
- [ ] Study streak works

**To Add to Dashboard:**
Add this to `web-app/src/app/dashboard/page.tsx`:
```tsx
import StudySessionTracker from '@/components/StudySessionTracker'

// In the dashboard content, add:
{activeTab === 'sessions' && <StudySessionTracker />}
```

---

## 🚀 Quick Test Checklist

### Admin Features
- [ ] Login as admin
- [ ] Create a new question
- [ ] Edit a question
- [ ] Delete a question
- [ ] View user list
- [ ] Filter users by risk level
- [ ] View analytics

### Student Features
- [ ] Login as student
- [ ] View weekly study plan
- [ ] See daily tasks with times
- [ ] View calendar with study events
- [ ] Log a study session
- [ ] View study statistics

---

## 🔧 Troubleshooting

### ML API Not Working Locally

**Option 1:** Use the deployed Render version
```env
ML_API_URL=https://ml-recommendations-api.onrender.com/recommendations
```

**Option 2:** Run locally
```bash
python ml_recommendations_api.py
# Runs on http://localhost:5000
```

### Database Issues

If you get database errors:
```bash
cd web-app
npx prisma generate
npx prisma db push
```

### Port Already in Use

If port 3000 is taken:
```bash
npm run dev -- -p 3001
# Then access http://localhost:3001
```

---

## 📝 Testing Workflow

1. **Make changes** to code locally
2. **Test locally** using `npm run dev`
3. **Verify** all features work
4. **Commit and push** to GitHub when ready
5. **Auto-deploy** will happen on Vercel/Render

**Important:** Local testing doesn't affect your deployed versions until you push to GitHub.

---

## 🎯 Quick Start Commands

```bash
# Terminal 1: Start ML API (if testing locally)
python ml_recommendations_api.py

# Terminal 2: Start Next.js app
cd web-app
npm run dev

# Open browser
# http://localhost:3000
```

---

## 🔗 Feature URLs

- **Admin Panel**: `http://localhost:3000/admin`
- **Study Plan**: `http://localhost:3000/study-plan`
- **Calendar**: `http://localhost:3000/calendar`
- **Dashboard**: `http://localhost:3000/dashboard`

---

**Note:** All changes are local until you commit and push to GitHub. Your deployed versions on Vercel and Render won't change until you push.




