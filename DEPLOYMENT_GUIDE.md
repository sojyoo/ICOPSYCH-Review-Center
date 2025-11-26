# ICOPSYCH Review Center - Live Deployment Guide

## Option 1: Vercel (Recommended - Free & Fast)

### Step 1: Prepare for Deployment
1. Create a GitHub account if you don't have one
2. Upload your project to GitHub:
   - Go to github.com
   - Create new repository: "icopsych-review-center"
   - Upload all files from MACALALAY-upd/web-app folder

### Step 2: Deploy to Vercel
1. Go to vercel.com
2. Sign up with GitHub
3. Click "New Project"
4. Import your GitHub repository
5. Deploy!

### Step 3: Configure Environment Variables
In Vercel dashboard, add these environment variables:
```
NEXTAUTH_SECRET=your-super-secret-key-here-make-it-long-and-random
NEXTAUTH_URL=https://your-app-name.vercel.app
DATABASE_URL=file:./dev.db
```

### Step 4: Database Setup
The SQLite database will be created automatically on first run.

## Option 2: Netlify (Alternative)

1. Go to netlify.com
2. Connect GitHub repository
3. Build command: `npm run build`
4. Publish directory: `.next`

## Option 3: Railway (Easy Database)

1. Go to railway.app
2. Connect GitHub
3. Add PostgreSQL database
4. Update DATABASE_URL to PostgreSQL

## Demo URL
Once deployed, you'll get a live URL like:
- https://icopsych-review-center.vercel.app
- https://your-app-name.netlify.app

## Demo Accounts (Same as Local)
- Admin: admin@reviewcenter.com / password123
- Student: student@reviewcenter.com / password123

## Presentation Benefits of Live Site
✅ No setup required on presentation PC
✅ Works on any device with internet
✅ Looks more professional
✅ Can share URL with audience
✅ No technical issues during presentation
✅ Can demo on mobile/tablet

## Backup Plan
If deployment fails, use the local setup instructions in PRESENTATION_SETUP.md








