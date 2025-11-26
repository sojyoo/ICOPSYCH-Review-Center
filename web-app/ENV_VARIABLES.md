# Environment Variables Reference

This file documents all environment variables needed for the application.

## Required Environment Variables

### NextAuth Configuration

```bash
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
```

**NEXTAUTH_URL**
- Development: `http://localhost:3000`
- Production: Your deployed URL (e.g., `https://your-app.vercel.app`)
- Must match exactly (no trailing slash)

**NEXTAUTH_SECRET**
- Generate with: `openssl rand -base64 32`
- Keep this secret! Never commit to git.
- Use different secrets for development and production

### Database Configuration

```bash
DATABASE_URL=file:./prisma/dev.db
```

**Development (SQLite)**
```
DATABASE_URL="file:./prisma/dev.db"
```

**Production (PostgreSQL)**
```
DATABASE_URL="postgresql://user:password@host:5432/database?schema=public"
```

**Getting PostgreSQL URL:**
- **Supabase**: Settings → Database → Connection string
- **Neon**: Dashboard → Connection string
- **Railway**: Database → Connect → Connection URL

### ML API Configuration

```bash
ML_API_URL=http://localhost:5000/recommendations
```

**Development**
```
ML_API_URL=http://localhost:5000/recommendations
```

**Production**
```
ML_API_URL=https://your-ml-api.onrender.com/recommendations
```

Replace with your actual deployed ML API URL.

## Setting Environment Variables

### Local Development (.env.local)

Create `web-app/.env.local`:

```bash
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=dev-secret-key-change-in-production
DATABASE_URL="file:./prisma/dev.db"
ML_API_URL=http://localhost:5000/recommendations
```

### Vercel

1. Go to your project in Vercel dashboard
2. Settings → Environment Variables
3. Add each variable
4. Select environments (Production, Preview, Development)
5. Redeploy after adding variables

### Netlify

1. Go to your site in Netlify dashboard
2. Site settings → Environment variables
3. Add each variable
4. Save and redeploy

## Security Notes

- Never commit `.env.local` or `.env` files
- Use different secrets for each environment
- Rotate secrets periodically
- Don't share secrets in chat/email
- Use Vercel/Netlify's environment variable UI (more secure than files)

## Verification

After setting environment variables, verify they're loaded:

```bash
# In your Next.js app
console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL)
console.log('ML_API_URL:', process.env.ML_API_URL)
```

Note: Only variables prefixed with `NEXT_PUBLIC_` are available in the browser.
All other variables are server-side only (which is what we want for secrets).

