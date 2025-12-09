# How to Create Superadmin User

## Default Superadmin Credentials

**Email:** `superadmin@gmail.com`  
**Password:** `superadmin123`

⚠️ **Security Note:** Change this password immediately after first login in production!

## Overview

The superadmin user has full access to manage all tenants, branches, and system settings. This guide shows you how to create your first superadmin user.

## Method 1: Using Supabase Dashboard (Recommended)

### Step 1: Create User in Authentication

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Authentication** > **Users**
4. Click **"Add User"** or **"Invite User"**
5. Fill in the details:
   - **Email**: `superadmin@gmail.com` (or your preferred email)
   - **Password**: Choose a strong password
   - **Auto Confirm User**: ✅ Yes (check this box)
6. Click **"Create User"**

### Step 2: Get the User ID

1. After creating the user, you'll see them in the users list
2. Click on the user to view details
3. Copy the **User ID** (UUID format, e.g., `7d49489c-f43e-4ac7-846a-4cfe44d5d7e1`)

### Step 3: Create User Record in Database

1. Go to **SQL Editor** in Supabase Dashboard
2. Click **"New Query"**
3. Paste the following SQL (replace `USER_ID_FROM_AUTH` with the actual User ID from Step 2):

```sql
INSERT INTO users (
  id,
  email,
  full_name,
  role,
  is_active
) VALUES (
  'USER_ID_FROM_AUTH',  -- Replace with actual user ID from Step 2
  'superadmin@gmail.com',
  'Super Admin',
  'superadmin',
  true
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();
```

4. Click **"Run"** to execute the query

### Step 4: Verify User Creation

Run this query to verify:

```sql
SELECT 
  id,
  email,
  full_name,
  role,
  is_active,
  created_at
FROM users
WHERE email = 'superadmin@gmail.com';
```

You should see the superadmin user with `role = 'superadmin'` and `is_active = true`.

---

## Method 2: Using SQL Editor (If User Already Exists in Auth)

If the user already exists in `auth.users` but not in the `users` table:

1. Go to **SQL Editor** in Supabase Dashboard
2. Click **"New Query"**
3. Paste and run this SQL:

```sql
INSERT INTO users (
  id,
  email,
  full_name,
  role,
  is_active
)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', 'Super Admin') as full_name,
  COALESCE(raw_user_meta_data->>'role', 'superadmin')::varchar as role,
  true as is_active
FROM auth.users
WHERE email = 'superadmin@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();
```

This will automatically:
- Find the user in `auth.users` by email
- Create a corresponding record in the `users` table
- Use the user's metadata if available, or default values

---

## Method 3: Using Scripts Folder

If you have the setup scripts:

1. Go to **SQL Editor** in Supabase Dashboard
2. Open `scripts/create-superadmin-direct.sql`
3. Copy and paste the SQL
4. Modify the email if needed
5. Run the query

---

## Quick Verification

After creating the user, test login:

1. Go to your app: `http://localhost:3000/login`
2. Login with:
   - Email: `superadmin@gmail.com`
   - Password: `superadmin123` (or the password you set)
3. You should be redirected to `/superadmin/dashboard`

## Troubleshooting

### Error: "duplicate key value violates unique constraint"

**Cause:** The user already exists in the `users` table.

**Solution:** 
- Run the verification query to check
- If user exists, you can update it instead of inserting
- Or use `ON CONFLICT` clause (already included in the SQL above)

### Error: "foreign key constraint"

**Cause:** The user doesn't exist in `auth.users`.

**Solution:** 
- Create the user in Authentication first (Method 1, Step 1)
- Make sure the User ID matches exactly

### User exists but can't login

**Checklist:**
1. ✅ Check if `is_active = true` in the users table
2. ✅ Verify the password is correct
3. ✅ Check if email is confirmed in Authentication
4. ✅ Verify RLS policies are set up (see [RLS Policies Guide](../database/rls-policies.md))
5. ✅ Check browser console for errors

### User can login but redirected to wrong page

**Cause:** User role might not be set correctly.

**Solution:**
```sql
-- Check user role
SELECT email, role FROM users WHERE email = 'superadmin@gmail.com';

-- Update role if needed
UPDATE users 
SET role = 'superadmin' 
WHERE email = 'superadmin@gmail.com';
```

## Security Best Practices

1. **Use Strong Passwords** - Don't use default passwords in production
2. **Limit Superadmin Users** - Only create superadmin users when necessary
3. **Use Environment Variables** - Don't hardcode credentials
4. **Enable 2FA** - Consider enabling two-factor authentication for superadmin accounts
5. **Regular Audits** - Periodically review superadmin users

## Related Documentation

- [Setup Guide](../getting-started/setup.md)
- [RLS Policies Guide](../database/rls-policies.md)
- [Main Documentation](../README.md)

