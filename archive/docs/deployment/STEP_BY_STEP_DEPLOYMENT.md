# Step-by-Step Deployment Guide

## Pre-Deployment Checklist ✅

Before we start, make sure:
- [x] Your code is committed to GitHub
- [x] Model file is small (✅ 0.07 MB - perfect!)
- [x] All files are in the repository
- [ ] You have a GitHub account
- [ ] You're ready to spend 30-60 minutes

---

## STEP 1: Set Up PostgreSQL Database (10 minutes)

### Why This First?
We need the database URL before deploying the app. This is the foundation.

### Option A: Neon (Recommended - Better Free Tier)

1. **Go to** [neon.tech](https://neon.tech)
2. **Click** "Sign Up" (use GitHub for easy setup)
3. **Click** "Create a project"
4. **Fill in**:
   - Project name: `icopsych-review-center`
   - Region: Choose closest to you
   - PostgreSQL version: 15 (default is fine)
5. **Click** "Create project"
6. **Wait** ~30 seconds for setup
7. **Copy the connection string**:
   - You'll see a connection string like:
     ```
     postgresql://username:password@ep-xxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
     ```
   - **SAVE THIS** - you'll need it later!
   - Click the "Copy" button next to it

### Option B: Supabase (Alternative)

1. **Go to** [supabase.com](https://supabase.com)
2. **Sign up** with GitHub
3. **Click** "New Project"
4. **Fill in**:
   - Name: `icopsych-review-center`
   - Database Password: Create a strong password (SAVE IT!)
   - Region: Choose closest
5. **Wait** ~2 minutes for setup
6. **Go to** Settings → Database
7. **Scroll to** "Connection string" section
8. **Copy** the URI connection string
   - Replace `[YOUR-PASSWORD]` with your actual password
   - **SAVE THIS**

### ✅ Checkpoint
You should have:
- [ ] A PostgreSQL database URL
- [ ] It looks like: `postgresql://user:pass@host:5432/db`

---

## STEP 2: Update Prisma Schema (2 minutes)

1. **Open** `web-app/prisma/schema.prisma`
2. **Find** line 8-11:
   ```prisma
   datasource db {
     provider = "sqlite"
     url      = env("DATABASE_URL")
   }
   ```
3. **Change** `sqlite` to `postgresql`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
4. **Save** the file
5. **Commit** to GitHub:
   ```bash
   git add web-app/prisma/schema.prisma
   git commit -m "Switch to PostgreSQL for production"
   git push
   ```

### ✅ Checkpoint
- [ ] Schema updated to `postgresql`
- [ ] Changes committed to GitHub

---

## STEP 3: Deploy ML API to Render (15 minutes)

### Why Render?
- Free tier available
- Easy Python deployment
- Good for Flask apps

### Detailed Steps:

1. **Go to** [render.com](https://render.com)
2. **Sign up** with GitHub
3. **Click** "New" → "Web Service"
4. **Connect** your GitHub repository:
   - Click "Connect account" if needed
   - Select your repository
   - Click "Connect"
5. **Configure** the service:
   - **Name**: `ml-recommendations-api`
   - **Region**: Choose closest to you
   - **Branch**: `main` (or your default branch)
   - **Root Directory**: Leave empty (root of repo)
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn -w 4 -b 0.0.0.0:$PORT ml_recommendations_api:app`
6. **Scroll down** to "Environment Variables"
7. **Add** one variable:
   - Key: `PORT`
   - Value: `5000`
8. **Scroll to bottom**, click "Create Web Service"
9. **Wait** for deployment (~5-10 minutes)
   - You'll see build logs
   - Watch for errors
10. **When done**, copy the URL:
    - It will be: `https://ml-recommendations-api.onrender.com`
    - Or similar
    - **SAVE THIS URL**

### Verify ML API Works:

1. **Wait** for "Live" status (green)
2. **Click** the URL to open it
3. **You should see** an error page (that's OK - it means it's running)
4. **Test** the endpoint:
   - Go to: `https://your-ml-api-url.onrender.com/recommendations`
   - Should return an error (needs POST, not GET) - this confirms it's working!

### ⚠️ Important Notes:
- **First request** may take 30-60 seconds (cold start on free tier)
- **After 15 min inactivity**, it spins down (free tier limitation)
- **For production**, consider $7/month paid tier to avoid cold starts

### ✅ Checkpoint
- [ ] ML API deployed
- [ ] URL copied and saved
- [ ] Status shows "Live"

---

## STEP 4: Deploy Next.js App to Vercel (10 minutes)

### Why Vercel?
- Made by Next.js creators
- Best optimization for Next.js
- Excellent free tier
- Automatic deployments

### Detailed Steps:

1. **Go to** [vercel.com](https://vercel.com)
2. **Sign in** with GitHub
3. **Click** "Add New Project"
4. **Import** your repository:
   - Select your repository
   - Click "Import"
5. **Configure** the project:
   - **Project Name**: `icopsych-review-center` (or leave default)
   - **Root Directory**: Click "Edit" → Type `web-app`
   - **Framework Preset**: Next.js (should auto-detect)
   - **Build Command**: `npm run build` (should be automatic)
   - **Output Directory**: `.next` (should be automatic)
   - **Install Command**: `npm install` (should be automatic)
6. **Environment Variables** - Click "Environment Variables" and add:

   **Variable 1: NEXTAUTH_URL**
   - Key: `NEXTAUTH_URL`
   - Value: `https://your-app-name.vercel.app` (we'll update this after first deploy)
   - Environments: Production, Preview, Development (check all)

   **Variable 2: NEXTAUTH_SECRET**
   - Key: `NEXTAUTH_SECRET`
   - Value: Generate with this command (run in terminal):
     ```bash
     openssl rand -base64 32
     ```
     Copy the output and paste as value
   - Environments: Production, Preview, Development (check all)

   **Variable 3: DATABASE_URL**
   - Key: `DATABASE_URL`
   - Value: Your PostgreSQL connection string from Step 1
   - Environments: Production, Preview, Development (check all)

   **Variable 4: ML_API_URL**
   - Key: `ML_API_URL`
   - Value: `https://your-ml-api-url.onrender.com/recommendations`
   - Replace with your actual Render URL from Step 3
   - Environments: Production, Preview, Development (check all)

7. **Click** "Deploy"
8. **Wait** for build (~3-5 minutes)
   - Watch the build logs
   - Look for errors
9. **When done**, you'll get a URL like: `https://icopsych-review-center.vercel.app`
10. **Update NEXTAUTH_URL**:
    - Go to Settings → Environment Variables
    - Find `NEXTAUTH_URL`
    - Edit it to match your actual Vercel URL
    - Save
    - Redeploy (or it will auto-redeploy)

### ✅ Checkpoint
- [ ] Next.js app deployed
- [ ] All environment variables set
- [ ] Build successful
- [ ] NEXTAUTH_URL updated to actual URL

---

## STEP 5: Run Database Migrations (5 minutes)

After deployment, we need to create the database tables.

### Option A: Using Vercel CLI (Recommended)

1. **Install** Vercel CLI (if not installed):
   ```bash
   npm install -g vercel
   ```

2. **Login** to Vercel:
   ```bash
   vercel login
   ```

3. **Navigate** to your project:
   ```bash
   cd web-app
   ```

4. **Link** to your Vercel project:
   ```bash
   vercel link
   ```
   - Select your project
   - Use default settings

5. **Pull** environment variables:
   ```bash
   vercel env pull .env.local
   ```

6. **Run** migrations:
   ```bash
   npx prisma migrate deploy
   ```

### Option B: Using Vercel Dashboard Terminal

1. **Go to** your project in Vercel dashboard
2. **Click** "Settings" → "Environment Variables"
3. **Scroll down** to find terminal/SSH access (if available)
4. **Or** use Vercel's "Deployments" tab → Click on latest deployment → "Functions" → Find a way to run commands

### Option C: Manual Migration Script

If CLI doesn't work, we can create a migration script that runs on deployment.

### ✅ Checkpoint
- [ ] Database migrations run successfully
- [ ] Tables created in PostgreSQL

---

## STEP 6: Test Everything (10 minutes)

### Test Checklist:

1. **Visit** your Vercel URL
   - [ ] Homepage loads
   - [ ] No errors in browser console

2. **Test Registration**:
   - [ ] Go to `/register`
   - [ ] Create a test account
   - [ ] Registration succeeds

3. **Test Login**:
   - [ ] Log in with test account
   - [ ] Redirects to dashboard

4. **Test Dashboard**:
   - [ ] Dashboard loads
   - [ ] Stats display
   - [ ] Recommendations show (may take 30s first time - ML API cold start)

5. **Test Test Taking**:
   - [ ] Start a pre-test
   - [ ] Questions load
   - [ ] Can answer questions
   - [ ] Can submit test

6. **Test Results**:
   - [ ] Results page displays
   - [ ] Shows correct score
   - [ ] Can navigate to discussion

7. **Test Calendar**:
   - [ ] Calendar page loads
   - [ ] Shows week activities
   - [ ] Can navigate weeks

8. **Test Mobile**:
   - [ ] Open on phone
   - [ ] Menu works
   - [ ] All pages responsive

### ✅ Checkpoint
- [ ] All major features tested
- [ ] No critical errors
- [ ] Mobile works

---

## STEP 7: Troubleshooting Common Issues

### Issue: Build Fails on Vercel

**Check**:
- Build logs in Vercel dashboard
- Verify Prisma schema uses `postgresql` not `sqlite`
- Check all environment variables are set

**Fix**:
- Update schema if needed
- Re-add environment variables
- Redeploy

### Issue: Database Connection Fails

**Check**:
- DATABASE_URL format is correct
- Database allows external connections
- Database isn't paused

**Fix**:
- Verify connection string format
- Check database is active (Neon doesn't pause, Supabase free tier does)
- Test connection string locally

### Issue: ML API Not Working

**Check**:
- ML API URL is correct
- ML API is "Live" on Render
- Test ML API directly

**Fix**:
- Verify ML_API_URL environment variable
- Check Render logs for errors
- Ensure model files are in repository

### Issue: NextAuth Errors

**Check**:
- NEXTAUTH_URL matches deployed URL exactly
- NEXTAUTH_SECRET is set
- No typos in URLs

**Fix**:
- Update NEXTAUTH_URL to exact Vercel URL
- Regenerate NEXTAUTH_SECRET if needed
- Clear browser cookies

---

## 🎉 Success!

If all tests pass, you're live! Share your Vercel URL with users.

---

## 📋 Quick Reference

### Your URLs:
- **App**: `https://your-app.vercel.app`
- **ML API**: `https://your-ml-api.onrender.com`
- **Database**: (connection string saved)

### Environment Variables:
- `NEXTAUTH_URL` = Your Vercel URL
- `NEXTAUTH_SECRET` = Generated secret
- `DATABASE_URL` = PostgreSQL connection string
- `ML_API_URL` = ML API URL + `/recommendations`

### Important Files:
- `web-app/prisma/schema.prisma` - Database schema
- `ml_recommendations_api.py` - ML API
- `requirements.txt` - Python dependencies
- `web-app/package.json` - Node dependencies

---

## 💰 Cost Summary

### Free Tier (For Demo/Presentation):
- Vercel: **FREE** ✅
- Neon: **FREE** ✅
- Render: **FREE** (with cold starts) ✅
- **Total: $0/month**

### Paid Tier (For Production):
- Vercel: **FREE** (still fine) ✅
- Neon Pro: **$19/month** (or Supabase $25/month)
- Render: **$7/month** (no cold starts)
- **Total: ~$26/month**

---

## 🚀 Ready to Start?

Begin with **STEP 1** - Set up the database. Take your time, and don't hesitate to ask if you get stuck!

