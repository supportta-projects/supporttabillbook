# Quick Setup Guide

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings > API
3. Copy your Project URL and anon/public key

## Step 3: Configure Environment Variables

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` and add your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```

## Step 4: Set Up Database Schema

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the file `src/lib/db/schema.sql`
4. Copy the entire SQL content
5. Paste it into the SQL Editor
6. Click **Run** to execute the schema

This will create all necessary tables, indexes, and triggers.

## Step 5: Run Database Migrations

After running the base schema, run migrations in order:

1. Run `migrations/001_initial_schema.sql` (if not already included in schema.sql)
2. Run `migrations/002_add_expenses_table.sql`
3. Run `migrations/003_add_rls_policies.sql` (REQUIRED for security)

See [Migrations Guide](../database/migrations.md) for detailed instructions.

## Step 6: Create Your First Superadmin User

See [Superadmin Setup Guide](../setup/superadmin.md) for detailed instructions.

### Default Credentials

**Email:** `superadmin@gmail.com`  
**Password:** `superadmin123`

### Quick Method:

1. **Create User in Authentication:**
   - Go to Supabase Dashboard > **Authentication** > **Users**
   - Click **"Add User"** or **"Invite User"**
   - Email: `superadmin@gmail.com`
   - Password: `superadmin123`
   - ✅ Check **"Auto Confirm User"**
   - Click **"Create User"**

2. **Create User Record in Database:**
   - Go to **SQL Editor** in Supabase Dashboard
   - Click **"New Query"**
   - Open and copy the SQL from: `scripts/create-superadmin-direct.sql`
   - Paste and click **"Run"**

### Verify User Creation

Run this query to verify:

```sql
SELECT id, email, full_name, role, is_active 
FROM users 
WHERE email = 'superadmin@gmail.com';
```

You should see the superadmin user with `role = 'superadmin'` and `is_active = true`.

## Step 7: Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Step 8: Test the Application

1. Navigate to `/login`
2. Sign in with:
   - Email: `superadmin@gmail.com`
   - Password: `superadmin123`
3. You should be redirected to `/superadmin/dashboard`

## Next Steps

- Create your first tenant (shop)
- Set up branches for the tenant
- Add products
- Create branch users
- Start managing stock and billing!

## Troubleshooting

### Authentication Issues

- Ensure RLS policies are set up correctly (see [RLS Policies Guide](../database/rls-policies.md))
- Check that your user exists in both `auth.users` and `users` table
- Verify environment variables are loaded correctly

### Database Errors

- Make sure you've run the complete schema.sql
- Check that all migrations have been run in order
- Verify UUID extension is enabled
- Check that all foreign key relationships are correct

### Build Errors

- Clear `.next` folder: `rm -rf .next` (or `Remove-Item -Recurse -Force .next` on Windows)
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check TypeScript errors: `npm run lint`

## Project Structure Overview

- `src/app/` - All page routes (Next.js App Router)
- `src/lib/supabase/` - Supabase client configuration
- `src/lib/auth/` - Authentication utilities
- `src/lib/api/` - Business logic functions
- `src/types/` - TypeScript type definitions
- `src/lib/db/` - Database schema
- `migrations/` - Database migration files
- `scripts/` - Setup and utility scripts

## Support

For detailed documentation, see the [main documentation index](../README.md)

