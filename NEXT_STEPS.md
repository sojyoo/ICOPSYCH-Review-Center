# Next Steps for Deployment

You're ready to deploy! Follow these steps in order:

## Step 1: Set Up PostgreSQL Database ⚠️ CRITICAL

**This is the most important step** - SQLite won't work on Vercel/Netlify.

### Option A: Supabase (Recommended - Free)

1. Go to [supabase.com](https://supabase.com) and sign up
2. Click "New Project"
3. Fill in:
   - **Name**: `icopsych-review-center`
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to you
4. Wait for project to be created (~2 minutes)
5. Go to **Settings** → **Database**
6. Scroll to "Connection string" section
7. Copy the **URI** connection string
   - It looks like: `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres`
   - Replace `[YOUR-PASSWORD]` with your actual password

### Option B: Neon (Alternative - Free)

1. Go to [neon.tech](https://neon.tech) and sign up
2. Create a new project
3. Copy the connection string from the dashboard

## Step 2: Update Prisma Schema

1. Open `web-app/prisma/schema.prisma`
2. Find line 9 that says:
   ```prisma
   datasource db {
     provider = "sqlite"
     url      = env("DATABASE_URL")
   }
   ```
3. Change it to:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
4. Save the file

## Step 3: Test Database Connection Locally (Optional but Recommended)

1. Create a `.env.local` file in `web-app/` folder (if it doesn't exist)
2. Add your PostgreSQL connection string:
   ```
   DATABASE_URL="postgresql://postgres:your-password@db.xxxxx.supabase.co:5432/postgres"
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=dev-secret-key-change-in-production
   ML_API_URL=http://localhost:5000/recommendations
   ```
3. Run migrations:
   ```bash
   cd web-app
   npx prisma migrate dev --name init
   ```
4. If successful, you're ready to deploy!

## Step 4: Deploy ML API

### Using Render.com (Recommended)

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
   - Key: `PORT`
   - Value: `5000`
6. Click "Create Web Service"
7. Wait for deployment (~5-10 minutes)
8. **Copy the URL** (e.g., `https://ml-api.onrender.com`)
9. Test it: Visit `https://your-ml-api.onrender.com/recommendations` (should return an error, but that's OK - it means it's running)

### Important for ML API:
- Make sure these files are in your repository root:
  - `ml_recommendations_api.py`
  - `bsp4a_leak_free_model.pkl`
  - `adaptive_review_recommendations_clean.csv`
  - `personalized_topic_recommendations.csv`
  - `requirements.txt`

## Step 5: Deploy Next.js App to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure:
   - **Root Directory**: Click "Edit" → Set to `web-app`
   - **Framework Preset**: Next.js (auto-detected)
   - **Build Command**: `npm run build` (should be automatic)
   - **Output Directory**: `.next` (should be automatic)
5. **Add Environment Variables** (Click "Environment Variables"):
   
   ```
   NEXTAUTH_URL=https://your-app.vercel.app
   (You'll update this after first deployment)
   
   NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
   (Generate: openssl rand -base64 32)
   
   DATABASE_URL=postgresql://postgres:password@host:5432/postgres
   (Your Supabase/Neon connection string)
   
   ML_API_URL=https://your-ml-api.onrender.com/recommendations
   (Your deployed ML API URL)
   ```
6. Click "Deploy"
7. Wait for build to complete
8. **After first deployment**, update `NEXTAUTH_URL` to your actual Vercel URL
9. Redeploy

## Step 6: Run Database Migrations

After Vercel deployment:

1. Install Vercel CLI (optional but easier):
   ```bash
   npm i -g vercel
   ```

2. Pull environment variables:
   ```bash
   cd web-app
   vercel env pull .env.local
   ```

3. Run migrations:
   ```bash
   npx prisma migrate deploy
   ```

   OR use Vercel's built-in terminal:
   - Go to your project in Vercel
   - Settings → Environment Variables
   - Use the terminal there to run: `npx prisma migrate deploy`

## Step 7: Test Everything

After deployment, test:

- [ ] Homepage loads
- [ ] User registration works
- [ ] User login works
- [ ] Dashboard loads
- [ ] Test page loads questions
- [ ] Test submission works
- [ ] Results page displays
- [ ] Recommendations load (check browser console for ML API calls)
- [ ] Calendar page loads

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Verify all environment variables are set
- Check that Prisma schema uses `postgresql` not `sqlite`

### Database Connection Fails
- Verify `DATABASE_URL` format is correct
- Check database allows external connections
- Ensure database isn't paused (free tiers may pause after inactivity)

### ML API Not Working
- Test ML API URL directly: `curl https://your-ml-api.onrender.com/recommendations`
- Verify `ML_API_URL` environment variable is set correctly
- Check ML API logs in Render dashboard

### NextAuth Errors
- Verify `NEXTAUTH_URL` matches your deployed URL exactly
- Check `NEXTAUTH_SECRET` is set
- Clear browser cookies and try again

## Quick Checklist

Before deploying:
- [ ] PostgreSQL database created
- [ ] Prisma schema updated to `postgresql`
- [ ] ML API files ready in repository
- [ ] GitHub repository is up to date
- [ ] All code is committed

During deployment:
- [ ] ML API deployed and URL copied
- [ ] Next.js app deployed to Vercel
- [ ] All environment variables set
- [ ] Database migrations run

After deployment:
- [ ] Test user registration
- [ ] Test user login
- [ ] Test test submission
- [ ] Test recommendations (ML API)
- [ ] Test on mobile device

## Need Help?

Refer to:
- **Quick start**: `README_DEPLOYMENT.md`
- **Detailed guide**: `web-app/DEPLOYMENT.md`
- **Checklist**: `DEPLOYMENT_CHECKLIST.md`
- **Environment vars**: `web-app/ENV_VARIABLES.md`

## Estimated Time

- Database setup: 5-10 minutes
- ML API deployment: 10-15 minutes
- Next.js deployment: 5-10 minutes
- Testing: 10-15 minutes

**Total: ~30-50 minutes**

Good luck! 🚀

