# Pre-Push Checklist

## ✅ Changes Ready to Push

### 1. **ML API (Flask) - `ml_recommendations_api.py`**
   - ✅ Added `/api/predict` endpoint (line ~454)
   - ✅ Accepts full 20-feature vector
   - ✅ Returns risk level predictions with probabilities
   - **File**: `ml_recommendations_api.py`

### 2. **Frontend API Routes - Updated ML API URLs**
   - ✅ `web-app/src/app/api/ml/predict/route.ts` - Updated to use `/api/predict`
   - ✅ `web-app/src/app/api/recommendations/route.ts` - Updated to use `/api/predict`
   - ✅ `web-app/src/app/api/study-plan/weekly/route.ts` - Updated to use `/api/predict`

### 3. **Database Schema - PostgreSQL + New Fields**
   - ✅ Changed from SQLite to PostgreSQL in `schema.prisma`
   - ✅ Added new study habit fields:
     - `habitActiveLearning`
     - `habitPlanning`
     - `habitDiscipline`
     - `habitConfidence`
   - ✅ Migration created: `20260107135507_add_study_habit_fields`

### 4. **UI Components - Study Habits Redesign**
   - ✅ `UserPreferences.tsx` - Redesigned with 4 composite scores
   - ✅ `OnboardingModal.tsx` - Updated for new study habits
   - ✅ `RiskLevelCard.tsx` - Enhanced error messages
   - ✅ `WeeklyStudyPlan.tsx` - Shows ML status

### 5. **Other Updates**
   - ✅ `register/page.tsx` - Updated student number format
   - ✅ `dashboard/page.tsx` - Added study session tracker, ML status
   - ✅ `discussion/page.tsx` - Added topic overviews
   - ✅ Connection test script created

## 📋 Deployment Steps

### Step 1: Apply Migration to Neon (Production Database)
```bash
cd web-app
npx prisma migrate deploy
```
This will add the new study habit columns to your Neon database.

### Step 2: Push to GitHub
```bash
git add .
git commit -m "Add /api/predict endpoint, update study habits UI, switch to PostgreSQL"
git push origin main
```

### Step 3: Verify Deployments

**Render (ML API):**
- Auto-deploys from GitHub
- Check: https://ml-recommendations-api.onrender.com/health
- Verify: https://ml-recommendations-api.onrender.com/api/predict (should work after deploy)

**Vercel (Frontend):**
- Auto-deploys from GitHub
- Check Vercel dashboard for deployment status
- Test on your Vercel URL

### Step 4: Test on Vercel
1. Go to your Vercel deployment URL
2. Sign in/test with existing account
3. Check:
   - ✅ Preferences tab loads correctly
   - ✅ Study habits sliders work
   - ✅ ML Risk Assessment shows (may show "Rule-Based" until Render deploys)
   - ✅ Study plan generation works

## ⚠️ Important Notes

1. **Database Migration**: Must run `npx prisma migrate deploy` on Neon before the new study habit fields will work
2. **ML API**: The `/api/predict` endpoint will return 404 until Render finishes deploying
3. **Environment Variables**: Make sure Vercel has:
   - `DATABASE_URL` (Neon connection string)
   - `ML_API_URL` (optional, defaults to Render URL)
   - `NEXTAUTH_URL` (your Vercel URL)
   - `NEXTAUTH_SECRET`

## 🎯 Expected Results After Deployment

- ✅ Users can set study habits with 4 composite scores
- ✅ ML API `/api/predict` endpoint available
- ✅ Risk level predictions show "ML-Powered" instead of "Rule-Based"
- ✅ Study plans use new study habit scores
- ✅ All features work on Vercel production

