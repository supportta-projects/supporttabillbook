# Vercel Deployment Checklist

## ✅ Pre-Deployment Setup

### 1. Code Preparation
- [x] Project builds successfully (`npm run build`)
- [x] All dependencies are in `package.json`
- [x] Code is committed and pushed to Git repository
- [x] `.gitignore` excludes sensitive files (`.env*`, `.vercel`)

### 2. Supabase Setup
- [ ] Supabase project created
- [ ] Database schema applied (run all migrations)
- [ ] RLS policies enabled
- [ ] API keys ready:
  - [ ] Project URL
  - [ ] Anon Key
  - [ ] Service Role Key

### 3. Files Created
- [x] `vercel.json` - Vercel configuration
- [x] `.vercelignore` - Files to exclude from deployment
- [x] `docs/deployment/vercel.md` - Complete deployment guide

## 🚀 Deployment Steps

### Step 1: Connect Repository to Vercel
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click **"Add New Project"**
3. Import your Git repository
4. Select the repository and click **"Import"**

### Step 2: Configure Project Settings
- **Framework Preset**: Next.js (auto-detected)
- **Root Directory**: `./` (default)
- **Build Command**: `npm run build` (default)
- **Output Directory**: `.next` (default)
- **Install Command**: `npm install` (default)

### Step 3: Add Environment Variables
Go to **Settings** > **Environment Variables** and add:

| Variable | Value | Where to Find |
|----------|-------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard > Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key | Supabase Dashboard > Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service role key | Supabase Dashboard > Settings > API |

**Important**: 
- Apply to **Production**, **Preview**, and **Development** environments
- Click **"Save"** after each variable

### Step 4: Deploy
1. Click **"Deploy"** button
2. Wait for build to complete (usually 2-5 minutes)
3. Check build logs for any errors

### Step 5: Verify Deployment
- [ ] Visit deployment URL
- [ ] Test `/login` page loads
- [ ] Test `/superadmin/login` page loads
- [ ] Check browser console for errors
- [ ] Test authentication flow

## 🔧 Post-Deployment

### Database Setup
- [ ] Run all migrations in Supabase SQL Editor:
  - `migrations/001_initial_schema.sql`
  - `migrations/002_add_expenses_table.sql`
  - `migrations/003_add_rls_policies.sql`
  - Continue with remaining migrations in order

### Create Superadmin User
- [ ] Option 1: Use script (if available locally)
  ```bash
  npm run create-superadmin
  ```
- [ ] Option 2: Create manually in Supabase Dashboard
  - Go to Authentication > Users
  - Add user with email and password
  - Create user record in `users` table with role `superadmin`

### Custom Domain (Optional)
- [ ] Add domain in Vercel Settings > Domains
- [ ] Configure DNS records
- [ ] Wait for SSL certificate (automatic)

## 📝 Quick Reference

### Environment Variables Format
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Useful Commands
```bash
# Test build locally
npm run build

# Deploy via CLI (alternative method)
npm i -g vercel
vercel login
vercel
```

### Important URLs
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Supabase Dashboard**: https://app.supabase.com
- **Deployment Guide**: See `docs/deployment/vercel.md`

## 🐛 Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Verify all dependencies are in `package.json`
- Ensure TypeScript compiles without errors

### Runtime Errors
- Check environment variables are set correctly
- Verify Supabase project is active
- Check function logs in Vercel dashboard

### Authentication Issues
- Verify RLS policies are set up
- Check service role key is correct
- Ensure database migrations are applied

## 📚 Documentation

- **Full Deployment Guide**: `docs/deployment/vercel.md`
- **Setup Guide**: `docs/getting-started/setup.md`
- **Database Migrations**: `docs/database/migrations.md`

## ✅ Success Criteria

Your deployment is successful when:
- ✅ Application loads without errors
- ✅ Login pages are accessible
- ✅ Authentication works correctly
- ✅ Database queries execute successfully
- ✅ All API routes respond correctly

---

**Need Help?** Check the [deployment guide](./docs/deployment/vercel.md) for detailed instructions.

