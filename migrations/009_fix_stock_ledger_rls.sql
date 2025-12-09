-- Migration 009: Fix Stock Ledger and Current Stock RLS Policies for Tenant Owners
-- Created: 2024
-- Description: Updates stock_ledger and current_stock INSERT/UPDATE policies to allow tenant owners 
-- to manage stock for any branch in their tenant, not just their own branch (which they don't have)

-- =====================================================
-- FIX STOCK_LEDGER INSERT POLICY
-- =====================================================
DROP POLICY IF EXISTS "Branch admins can insert ledger" ON stock_ledger;

-- Create updated INSERT policy that allows:
-- 1. Branch admins/staff: Insert for their own branch
-- 2. Tenant owners: Insert for any branch in their tenant
-- 3. Superadmin: Insert for any branch
CREATE POLICY "Users can insert ledger entries"
ON stock_ledger FOR INSERT
WITH CHECK (
  -- Superadmin can insert anywhere
  get_user_role() = 'superadmin'
  OR
  -- Tenant owners can insert for any branch in their tenant
  (get_user_role() = 'tenant_owner' 
   AND tenant_id = get_user_tenant_id()
   AND EXISTS (
     SELECT 1 FROM branches 
     WHERE id = branch_id 
     AND tenant_id = get_user_tenant_id()
   ))
  OR
  -- Branch admins/staff can insert for their own branch
  (get_user_role() IN ('branch_admin', 'branch_staff')
   AND branch_id = get_user_branch_id() 
   AND tenant_id = get_user_tenant_id())
);

-- =====================================================
-- FIX CURRENT_STOCK INSERT/UPDATE POLICY
-- =====================================================
DROP POLICY IF EXISTS "Branch admins can manage stock" ON current_stock;

-- Create updated policy that allows:
-- 1. Branch admins: Manage stock for their own branch
-- 2. Tenant owners: Manage stock for any branch in their tenant
-- 3. Superadmin: Manage stock anywhere
CREATE POLICY "Users can manage stock"
ON current_stock FOR ALL
USING (
  -- Superadmin can access anywhere
  get_user_role() = 'superadmin'
  OR
  -- Tenant owners can access any branch in their tenant
  (get_user_role() = 'tenant_owner' 
   AND tenant_id = get_user_tenant_id())
  OR
  -- Branch admins can access their own branch
  (get_user_role() = 'branch_admin'
   AND branch_id = get_user_branch_id() 
   AND tenant_id = get_user_tenant_id())
)
WITH CHECK (
  -- Superadmin can modify anywhere
  get_user_role() = 'superadmin'
  OR
  -- Tenant owners can modify any branch in their tenant
  (get_user_role() = 'tenant_owner' 
   AND tenant_id = get_user_tenant_id())
  OR
  -- Branch admins can modify their own branch
  (get_user_role() = 'branch_admin'
   AND branch_id = get_user_branch_id() 
   AND tenant_id = get_user_tenant_id())
);

