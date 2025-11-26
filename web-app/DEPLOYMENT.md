# Deployment Guide

This guide will help you deploy the ICOPSYCH Review Center to Vercel or Netlify.

## Prerequisites

1. **Database**: You'll need a PostgreSQL database (SQLite won't work on serverless platforms)
   - Recommended: [Supabase](https://supabase.com) (free tier available)
   - Alternatives: [Neon](https://neon.tech), [Railway](https://railway.app), [PlanetScale](https://planetscale.com)

2. **ML API**: The Python ML API needs to be deployed separately
   - Recommended: [Render](https://render.com) or [Railway](https://railway.app)
   - Alternative: Deploy as a separate Vercel serverless function

3. **GitHub Account**: For connecting to Vercel/Netlify

## Step 1: Set Up PostgreSQL Database

### Using Supabase (Recommended)

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to Settings → Database
4. Copy the "Connection string" (URI format)
5. It will look like: `postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`

### Update Prisma Schema

1. Open `prisma/schema.prisma`
2. Change the datasource provider from `sqlite` to `postgresql`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

3. Run migrations:
```bash
npx prisma migrate dev --name init
```

## Step 2: Deploy ML API

### Option A: Deploy to Render

1. Create a new account on [render.com](https://render.com)
2. Create a new "Web Service"
3. Connect your GitHub repository
4. Set the root directory to the project root (where `ml_recommendations_api.py` is)
5. Build command: `pip install -r requirements.txt`
6. Start command: `python ml_recommendations_api.py`
7. Add environment variables:
   - `PORT=5000` (Render will set this automatically)
8. Copy the deployed URL (e.g., `https://your-ml-api.onrender.com`)

### Option B: Deploy to Railway

1. Create account on [railway.app](https://railway.app)
2. Create new project → Deploy from GitHub
3. Select your repository
4. Add `requirements.txt` if not present
5. Railway will auto-detect Python and deploy
6. Copy the deployed URL

## Step 3: Deploy Next.js App to Vercel

### Initial Setup

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click "Add New Project"
3. Import your GitHub repository
4. Set the root directory to `web-app`

### Configure Build Settings

- **Framework Preset**: Next.js (auto-detected)
- **Root Directory**: `web-app`
- **Build Command**: `npm run build` (or `prisma generate && next build`)
- **Output Directory**: `.next` (default)
- **Install Command**: `npm install`

### Environment Variables

Add these in Vercel Dashboard → Settings → Environment Variables:

```
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=generate-a-secure-secret-here
DATABASE_URL=postgresql://user:password@host:5432/database
ML_API_URL=https://your-ml-api.onrender.com/recommendations
```

**To generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### Deploy

1. Click "Deploy"
2. Wait for build to complete
3. Your app will be live at `https://your-app.vercel.app`

## Step 4: Deploy to Netlify (Alternative)

### Initial Setup

1. Go to [netlify.com](https://netlify.com) and sign in with GitHub
2. Click "Add new site" → "Import an existing project"
3. Connect your GitHub repository

### Configure Build Settings

- **Base directory**: `web-app`
- **Build command**: `npm run build`
- **Publish directory**: `.next`
- **Node version**: 18.x or 20.x

### Environment Variables

Add in Netlify Dashboard → Site settings → Environment variables:

```
NEXTAUTH_URL=https://your-app.netlify.app
NEXTAUTH_SECRET=your-secret-key
DATABASE_URL=postgresql://user:password@host:5432/database
ML_API_URL=https://your-ml-api.onrender.com/recommendations
```

### Create netlify.toml

Create `web-app/netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

## Step 5: Run Database Migrations

After deployment, you need to run Prisma migrations on your production database:

```bash
# Set DATABASE_URL to your production database
export DATABASE_URL="postgresql://user:password@host:5432/database"

# Run migrations
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate
```

Or use Vercel CLI:

```bash
vercel env pull .env.local
npx prisma migrate deploy
```

## Step 6: Seed Initial Data (Optional)

If you need to seed initial data:

```bash
# Create a seed script in package.json
"prisma": {
  "seed": "tsx scripts/seed.ts"
}

# Run seed
npx prisma db seed
```

## Troubleshooting

### Build Fails with Prisma Errors

- Ensure `postinstall` script runs: `"postinstall": "prisma generate"`
- Check that `DATABASE_URL` is set correctly
- Verify Prisma schema is using `postgresql` not `sqlite`

### ML API Not Working

- Verify `ML_API_URL` environment variable is set
- Check ML API is deployed and accessible
- Test ML API endpoint directly: `curl https://your-ml-api.onrender.com/recommendations`

### Database Connection Issues

- Verify `DATABASE_URL` format is correct
- Check database allows connections from Vercel/Netlify IPs
- Ensure database is not paused (free tiers may pause)

### NextAuth Errors

- Verify `NEXTAUTH_URL` matches your deployed URL exactly
- Ensure `NEXTAUTH_SECRET` is set and secure
- Check that callback URLs are configured correctly

## Environment Variables Summary

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXTAUTH_URL` | Your deployed app URL | `https://your-app.vercel.app` |
| `NEXTAUTH_SECRET` | Secret key for JWT | Generate with `openssl rand -base64 32` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `ML_API_URL` | Deployed ML API endpoint | `https://your-ml-api.onrender.com/recommendations` |

## Post-Deployment Checklist

- [ ] Database migrations run successfully
- [ ] Environment variables set correctly
- [ ] ML API is accessible and responding
- [ ] User registration works
- [ ] User login works
- [ ] Test submission works
- [ ] Recommendations are loading (check ML API)
- [ ] Calendar page loads correctly
- [ ] All pages are accessible

## Support

If you encounter issues:
1. Check Vercel/Netlify build logs
2. Check function logs for API routes
3. Verify all environment variables are set
4. Test database connection separately
5. Test ML API endpoint separately

