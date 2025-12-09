-- =====================================================
-- CREATE SUPERADMIN USER - SIMPLE VERSION
-- =====================================================
-- Just copy and run this in Supabase SQL Editor
-- No manual replacements needed!
-- =====================================================

-- This will automatically create the user record from auth.users
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
  'Super Admin' as full_name,
  'superadmin'::varchar as role,
  true as is_active
FROM auth.users
WHERE email = 'superadmin@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Verify it worked
SELECT 
  id,
  email,
  full_name,
  role,
  is_active,
  created_at
FROM users
WHERE email = 'superadmin@gmail.com';

