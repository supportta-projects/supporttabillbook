-- Migration 004: Add Unique Constraint and Index on Users Email
-- Created: 2024
-- Description: Adds unique constraint on users.email and index for performance
-- This ensures email uniqueness at the database level and improves lookup performance
-- IMPORTANT: Run this after migrations 001, 002, and 003

-- Add unique constraint on users.email
-- Note: This will fail if there are duplicate emails in the users table
-- If duplicates exist, clean them up first before running this migration
ALTER TABLE users 
ADD CONSTRAINT users_email_unique UNIQUE (email);

-- Add index on users.email for faster lookups
-- This improves performance when checking email uniqueness
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Add index on users.tenant_id if it doesn't exist (for faster tenant-based queries)
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);

-- Add index on users.role if it doesn't exist (for faster role-based queries)
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

