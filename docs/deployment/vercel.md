# Vercel Deployment Guide

This guide will help you deploy the Supportta Bill Book application to Vercel.

## Prerequisites

1. A Vercel account ([sign up here](https://vercel.com/signup))
2. A Supabase project with database schema set up
3. Git repository (GitHub, GitLab, or Bitbucket)

## Step 1: Prepare Your Repository

Ensure your code is pushed to a Git repository:

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

## Step 2: Set Up Supabase

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Navigate to **Project Settings** > **API**
3. Copy the following values:
   - **Project URL** (NEXT_PUBLIC_SUPABASE_URL)
   - **anon/public key** (NEXT_PUBLIC_SUPABASE_ANON_KEY)
   - **service_role key** (SUPABASE_SERVICE_ROLE_KEY) - Keep this secret!

## Step 3: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New Project"**
3. Import your Git repository
4. Configure the project:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install` (default)

### Option B: Deploy via Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   vercel
   ```

   Follow the prompts to link your project.

## Step 4: Configure Environment Variables

In your Vercel project dashboard:

1. Go to **Settings** > **Environment Variables**
2. Add the following variables:

   | Variable Name | Value | Environment |
   |--------------|-------|-------------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Production, Preview, Development |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key | Production, Preview, Development |
   | `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key | Production, Preview, Development |

3. Click **"Save"** after adding each variable

**Important Notes:**
- `NEXT_PUBLIC_*` variables are exposed to the browser (safe for anon key)
- `SUPABASE_SERVICE_ROLE_KEY` is server-only and should NEVER be exposed
- Apply variables to all environments (Production, Preview, Development)

## Step 5: Redeploy

After adding environment variables:

1. Go to **Deployments** tab
2. Click the **"..."** menu on the latest deployment
3. Click **"Redeploy"**
4. Or trigger a new deployment by pushing to your repository

## Step 6: Verify Deployment

1. Visit your deployment URL (provided by Vercel)
2. Test the application:
   - Navigate to `/login` - Should show login page
   - Navigate to `/superadmin/login` - Should show superadmin login
   - Check that pages load without errors

## Step 7: Set Up Custom Domain (Optional)

1. Go to **Settings** > **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions
4. Wait for SSL certificate provisioning (automatic)

## Database Setup

**Important:** Before using the application, ensure:

1. **Database Schema**: Run all migrations in order:
   - `migrations/001_initial_schema.sql`
   - `migrations/002_add_expenses_table.sql`
   - `migrations/003_add_rls_policies.sql`
   - Continue with remaining migrations in order

2. **Create Superadmin User**: 
   - Use the script: `npm run create-superadmin`
   - Or manually create via Supabase Dashboard > Authentication

3. **Verify RLS Policies**: Ensure all Row Level Security policies are active

## Environment Variables Reference

### Required Variables

```env
# Public Supabase URL (safe to expose)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co

# Public Supabase Anon Key (safe to expose)
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Service Role Key (KEEP SECRET - server-only)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### Where to Find These Values

1. **Supabase Dashboard** > **Project Settings** > **API**
2. Copy the values from the respective fields

## Troubleshooting

### Build Fails

**Error: Missing environment variables**
- Ensure all three environment variables are set in Vercel
- Redeploy after adding variables

**Error: Module not found**
- Check that `package.json` includes all dependencies
- Ensure build command is `npm run build`

### Runtime Errors

**Error: "Missing Supabase environment variables"**
- Verify environment variables are set correctly
- Check that variables are applied to the correct environment (Production/Preview)
- Redeploy after updating variables

**Error: "Unauthorized" or authentication issues**
- Verify Supabase project is active
- Check that RLS policies are set up correctly
- Ensure service role key is correct

### Database Connection Issues

- Verify Supabase project is active
- Check database connection pooling settings
- Ensure migrations have been run

### Performance Issues

- Check Vercel function logs for slow API routes
- Monitor Supabase database performance
- Consider upgrading Vercel plan for better performance

## Continuous Deployment

Vercel automatically deploys on every push to your main branch:

1. Push changes to your repository
2. Vercel detects the push
3. Builds and deploys automatically
4. Sends deployment notifications (if configured)

## Preview Deployments

Every pull request gets a preview deployment:

1. Create a pull request
2. Vercel creates a preview URL
3. Test changes in isolation
4. Merge when ready

## Monitoring

- **Deployments**: View all deployments in Vercel dashboard
- **Logs**: Check function logs for errors
- **Analytics**: Enable Vercel Analytics for performance monitoring
- **Alerts**: Set up deployment notifications

## Security Best Practices

1. **Never commit** `.env.local` or environment variables to Git
2. **Use Vercel Environment Variables** for all secrets
3. **Rotate keys** periodically
4. **Enable 2FA** on Vercel account
5. **Review RLS policies** regularly
6. **Monitor access logs** in Supabase

## Support

For deployment issues:
1. Check [Vercel Documentation](https://vercel.com/docs)
2. Review [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
3. Check Vercel deployment logs
4. Contact Vercel support if needed

## Next Steps

After successful deployment:
1. Set up custom domain (optional)
2. Configure DNS records
3. Enable SSL (automatic with Vercel)
4. Set up monitoring and alerts
5. Create your first superadmin user
6. Start using the application!

