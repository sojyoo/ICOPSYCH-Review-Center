# Quick Deployment Guide

## Overview

This application consists of two parts:
1. **Next.js Web App** (in `web-app/` folder)
2. **Python ML API** (in root directory)

Both need to be deployed separately.

## Quick Start

### Step 1: Deploy ML API (Do this first)

**Option A: Render.com (Recommended)**

1. Go to [render.com](https://render.com) and sign up
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `ml-recommendations-api`
   - **Root Directory**: Leave empty (root of repo)
   - **Environment**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn -w 4 -b 0.0.0.0:$PORT ml_recommendations_api:app`
5. Add environment variable:
   - `PORT=5000` (Render sets this automatically, but good to have)
6. Deploy
7. Copy the URL (e.g., `https://ml-api.onrender.com`)

**Option B: Railway**

1. Go to [railway.app](https://railway.app)
2. New Project → Deploy from GitHub
3. Select your repository
4. Railway auto-detects Python
5. Set start command: `gunicorn -w 4 -b 0.0.0.0:$PORT ml_recommendations_api:app`
6. Deploy and copy URL

### Step 2: Set Up Database

**Using Supabase (Free)**

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Go to Settings → Database
4. Copy connection string (URI format)
5. It looks like: `postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres`

### Step 3: Update Prisma Schema

**IMPORTANT**: You must switch from SQLite to PostgreSQL for production.

1. Open `web-app/prisma/schema.prisma`
2. Change line 9:
   ```prisma
   datasource db {
     provider = "postgresql"  // Change from "sqlite"
     url      = env("DATABASE_URL")
   }
   ```
3. Save the file

### Step 4: Deploy Next.js App

**Vercel (Recommended)**

1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. "Add New Project"
4. Import your repository
5. Configure:
   - **Root Directory**: `web-app`
   - **Framework**: Next.js (auto-detected)
6. Add Environment Variables:
   ```
   NEXTAUTH_URL=https://your-app.vercel.app
   NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
   DATABASE_URL=<your postgresql connection string>
   ML_API_URL=https://your-ml-api.onrender.com/recommendations
   ```
7. Deploy

**Netlify (Alternative)**

1. Go to [netlify.com](https://netlify.com)
2. "Add new site" → "Import an existing project"
3. Connect GitHub
4. Configure:
   - Base directory: `web-app`
   - Build command: `npm run build`
   - Publish directory: `.next`
5. Add same environment variables as above
6. Deploy

### Step 5: Run Database Migrations

After deployment, run migrations on production database:

```bash
# Set your production DATABASE_URL
export DATABASE_URL="postgresql://user:pass@host:5432/db"

# Run migrations
cd web-app
npx prisma migrate deploy
```

Or use Vercel CLI:
```bash
vercel env pull .env.local
npx prisma migrate deploy
```

## Environment Variables Summary

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXTAUTH_URL` | Your app URL | `https://app.vercel.app` |
| `NEXTAUTH_SECRET` | JWT secret | Generate with `openssl rand -base64 32` |
| `DATABASE_URL` | PostgreSQL connection | `postgresql://user:pass@host:5432/db` |
| `ML_API_URL` | ML API endpoint | `https://ml-api.onrender.com/recommendations` |

## Troubleshooting

### Build Fails
- Check build logs
- Verify all environment variables are set
- Ensure Prisma schema uses `postgresql` not `sqlite`

### Database Connection Fails
- Verify DATABASE_URL format is correct
- Check database allows external connections
- Ensure database isn't paused

### ML API Not Working
- Test ML API URL directly in browser/curl
- Verify ML_API_URL environment variable
- Check ML API logs for errors

## Files to Check

- ✅ `web-app/next.config.js` - Next.js configuration
- ✅ `web-app/package.json` - Has postinstall script
- ✅ `web-app/vercel.json` - Vercel configuration
- ✅ `requirements.txt` - Python dependencies (includes Flask)
- ✅ `render.yaml` - Render.com configuration (optional)

## Next Steps

1. Deploy ML API first
2. Set up PostgreSQL database
3. Update Prisma schema
4. Deploy Next.js app
5. Run migrations
6. Test everything!

For detailed instructions, see `web-app/DEPLOYMENT.md`

