-- =====================================================
-- Create Superadmin User in Supabase Backend
-- =====================================================
-- Run this script in Supabase SQL Editor
-- Dashboard > SQL Editor > New Query > Paste this > Run
-- =====================================================

-- Step 1: Create user in Supabase Auth (using Supabase Auth Admin API)
-- Note: This needs to be done via the Supabase Dashboard or API
-- Go to: Authentication > Users > Add User
-- Email: superadmin@gmail.com
-- Password: superadmin123
-- Auto Confirm: Yes

-- Step 2: After creating the user in Auth, get the user ID from Auth.users table
-- Then run this query to create the user record in the users table:

-- First, let's check if the user exists in auth.users
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'superadmin@gmail.com';

-- If the user exists, note the ID and use it below
-- Replace 'USER_ID_FROM_AUTH' with the actual user ID from the query above

-- Step 3: Insert user record into users table
-- This automatically uses the user ID from auth.users (no manual replacement needed)
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

-- =====================================================
-- Alternative: Complete SQL Script (if user already exists in auth.users)
-- =====================================================

-- This will create the user record using the ID from auth.users
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

-- =====================================================
-- Verify the user was created
-- =====================================================
SELECT 
  u.id,
  u.email,
  u.full_name,
  u.role,
  u.is_active,
  u.created_at,
  u.updated_at
FROM users u
WHERE u.email = 'superadmin@gmail.com';

