-- =====================================================
-- Row Level Security (RLS) Policies for Users Table
-- =====================================================
-- Run this in Supabase SQL Editor after creating the schema
-- This allows users to read/insert their own records
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own record" ON users;
DROP POLICY IF EXISTS "Users can insert their own record" ON users;
DROP POLICY IF EXISTS "Users can update their own record" ON users;
DROP POLICY IF EXISTS "Service role can do everything" ON users;

-- Policy: Users can view their own record
CREATE POLICY "Users can view their own record"
ON users
FOR SELECT
USING (auth.uid() = id);

-- Policy: Users can insert their own record (for first-time login)
CREATE POLICY "Users can insert their own record"
ON users
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Policy: Users can update their own record
CREATE POLICY "Users can update their own record"
ON users
FOR UPDATE
USING (auth.uid() = id);

-- Policy: Service role (backend) can do everything
-- This allows server-side operations using service role key
CREATE POLICY "Service role can do everything"
ON users
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- Additional Policies for Other Tables (if needed)
-- =====================================================

-- Note: You may need to add similar policies for other tables
-- based on your access requirements. For now, these user policies
-- should fix the login issue.


