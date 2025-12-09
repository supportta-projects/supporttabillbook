-- =====================================================
-- CREATE SUPERADMIN USER - READY TO RUN
-- =====================================================
-- Copy and paste this entire script into Supabase SQL Editor
-- Dashboard > SQL Editor > New Query > Paste > Run
-- =====================================================
-- This script will automatically find the user in auth.users
-- and create the corresponding record in the users table
-- =====================================================

-- Step 1: Check if user exists in auth.users
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at
FROM auth.users 
WHERE email = 'superadmin@gmail.com';

-- Step 2: Create/update user record in users table
-- This automatically uses the user ID from auth.users
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

-- Step 3: Verify the user was created successfully
SELECT 
  u.id,
  u.email,
  u.full_name,
  u.role,
  u.is_active,
  u.created_at,
  u.updated_at,
  CASE 
    WHEN au.id IS NOT NULL THEN '✓ Exists in Auth'
    ELSE '✗ Missing in Auth'
  END as auth_status
FROM users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE u.email = 'superadmin@gmail.com';

