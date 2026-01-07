# Local Database Fix

## ✅ Fixed

I've switched the Prisma schema from PostgreSQL to SQLite for local development.

**Changed:** `web-app/prisma/schema.prisma`
- Changed `provider = "postgresql"` → `provider = "sqlite"`

## 🔄 Next Steps

### 1. Restart the Next.js Server

The dev server needs to be restarted to pick up the schema change:

1. **Stop the current server** (Ctrl+C in the terminal)
2. **Regenerate Prisma client:**
   ```bash
   cd web-app
   npx prisma generate
   ```
3. **Restart the server:**
   ```bash
   npm run dev
   ```

### 2. Create .env.local (if not exists)

Create `web-app/.env.local` with:

```env
DATABASE_URL="file:./prisma/dev.db"
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=local-dev-secret-key-change-in-production
ML_API_URL=http://localhost:5000/recommendations
```

### 3. Initialize Database (if needed)

If the database doesn't exist yet:

```bash
cd web-app
npx prisma db push
```

This will create the SQLite database file at `web-app/prisma/dev.db`

## ⚠️ Important Note

**For Production Deployment:**
- You'll need to change `schema.prisma` back to `postgresql` before deploying to Vercel
- Or use `schema.production.prisma` for production

## 🧪 Test Registration Again

After restarting:
1. Go to `http://localhost:3000/register`
2. Try creating an account
3. Should work now!

---

**The error was:** Prisma schema was set to PostgreSQL but no PostgreSQL connection string was provided. SQLite is perfect for local testing.




