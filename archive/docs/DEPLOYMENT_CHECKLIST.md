# Pre-Deployment Checklist

Use this checklist before deploying to ensure everything is ready.

## ✅ Code Changes

- [x] Fixed hardcoded localhost URL in ML API calls
- [x] Updated package.json with postinstall script
- [x] Created next.config.js with proper configuration
- [x] Created vercel.json configuration
- [ ] **TODO**: Switch Prisma schema from SQLite to PostgreSQL for production

## 🔧 Environment Variables Setup

Before deploying, prepare these environment variables:

### Required Variables

1. **NEXTAUTH_URL**
   - Development: `http://localhost:3000`
   - Production: `https://your-app.vercel.app` (or your Netlify URL)

2. **NEXTAUTH_SECRET**
   - Generate with: `openssl rand -base64 32`
   - Keep this secret and secure!

3. **DATABASE_URL**
   - Development: `file:./prisma/dev.db` (SQLite)
   - Production: PostgreSQL connection string
     - Format: `postgresql://user:password@host:5432/database?schema=public`
   - Get from Supabase/Neon/Railway dashboard

4. **ML_API_URL**
   - Development: `http://localhost:5000/recommendations`
   - Production: Your deployed ML API URL
     - Example: `https://your-ml-api.onrender.com/recommendations`

## 📋 Pre-Deployment Steps

### 1. Database Migration

**IMPORTANT**: SQLite won't work on Vercel/Netlify. You MUST switch to PostgreSQL.

1. Set up a PostgreSQL database (Supabase recommended)
2. Update `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"  // Change from "sqlite"
     url      = env("DATABASE_URL")
   }
   ```
3. Run migration:
   ```bash
   npx prisma migrate dev --name switch-to-postgresql
   ```

### 2. Test Local Build

```bash
cd web-app
npm run build
```

If build fails, fix errors before deploying.

### 3. Deploy ML API First

1. Deploy Python ML API to Render/Railway
2. Test the endpoint: `curl https://your-ml-api.onrender.com/recommendations`
3. Note the URL for environment variable

### 4. Prepare GitHub Repository

- [ ] All code is committed
- [ ] `.env.local` is in `.gitignore` (should not be committed)
- [ ] No sensitive data in code
- [ ] Repository is public or you have access to connect to Vercel/Netlify

## 🚀 Deployment Steps

### For Vercel:

1. Go to vercel.com
2. Import GitHub repository
3. Set root directory: `web-app`
4. Add environment variables (see above)
5. Deploy

### For Netlify:

1. Go to netlify.com
2. Import GitHub repository
3. Set base directory: `web-app`
4. Build command: `npm run build`
5. Publish directory: `.next`
6. Add environment variables
7. Deploy

## 🔍 Post-Deployment Verification

After deployment, test these:

- [ ] Homepage loads
- [ ] User registration works
- [ ] User login works
- [ ] Dashboard loads
- [ ] Test page loads questions
- [ ] Test submission works
- [ ] Results page displays correctly
- [ ] Recommendations load (check ML API)
- [ ] Calendar page loads
- [ ] No console errors

## 🐛 Common Issues

### Build Fails
- Check build logs in Vercel/Netlify dashboard
- Verify all dependencies are in package.json
- Check for TypeScript errors

### Database Connection Fails
- Verify DATABASE_URL is correct
- Check database allows external connections
- Ensure database is not paused (free tiers)

### ML API Not Working
- Verify ML_API_URL is set correctly
- Test ML API endpoint directly
- Check CORS settings on ML API

### NextAuth Errors
- Verify NEXTAUTH_URL matches deployed URL exactly
- Check NEXTAUTH_SECRET is set
- Clear browser cookies and try again

## 📝 Notes

- Keep your `.env.local` file local - never commit it
- Use different NEXTAUTH_SECRET for production
- Test thoroughly before sharing the production URL
- Monitor Vercel/Netlify logs for errors
- Set up error tracking (Sentry, etc.) if needed

