-- Migration 006: Add RLS Policies for Categories and Brands
-- Created: 2024
-- Description: Adds Row Level Security policies for categories and brands tables
-- This migration is idempotent - it can be run multiple times safely

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view categories in their tenant" ON categories;
DROP POLICY IF EXISTS "Tenant owners can manage categories" ON categories;
DROP POLICY IF EXISTS "Users can view brands in their tenant" ON brands;
DROP POLICY IF EXISTS "Tenant owners can manage brands" ON brands;

-- Categories RLS Policies
-- Policy: Users can view categories in their tenant
CREATE POLICY "Users can view categories in their tenant"
  ON categories FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Tenant owners can manage categories
CREATE POLICY "Tenant owners can manage categories"
  ON categories FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users 
      WHERE id = auth.uid() AND role = 'tenant_owner'
    )
  );

-- Brands RLS Policies
-- Policy: Users can view brands in their tenant
CREATE POLICY "Users can view brands in their tenant"
  ON brands FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Tenant owners can manage brands
CREATE POLICY "Tenant owners can manage brands"
  ON brands FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users 
      WHERE id = auth.uid() AND role = 'tenant_owner'
    )
  );

