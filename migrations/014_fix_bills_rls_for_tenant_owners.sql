-- Migration 014: Fix Bills RLS Policies for Tenant Owners
-- Created: 2024
-- Description: Updates bills INSERT policy to allow tenant owners to create bills
-- for any branch in their tenant, not just their own branch (which they don't have)

-- =====================================================
-- FIX BILLS INSERT POLICY
-- =====================================================
-- Drop old policies if they exist
DROP POLICY IF EXISTS "Branch users can create bills" ON bills;
DROP POLICY IF EXISTS "Users can create bills" ON bills;

-- Create updated INSERT policy that allows:
-- 1. Branch admins/staff: Insert for their own branch
-- 2. Tenant owners: Insert for any branch in their tenant
-- 3. Superadmin: Insert for any branch
CREATE POLICY "Users can create bills"
ON bills FOR INSERT
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
-- FIX BILL_ITEMS INSERT POLICY
-- =====================================================
-- Drop old policies if they exist
DROP POLICY IF EXISTS "Branch users can create bill items" ON bill_items;
DROP POLICY IF EXISTS "Users can create bill items" ON bill_items;

-- Create updated INSERT policy that allows:
-- 1. Branch admins/staff: Insert for bills in their own branch
-- 2. Tenant owners: Insert for bills in any branch in their tenant
-- 3. Superadmin: Insert for any bill
CREATE POLICY "Users can create bill items"
ON bill_items FOR INSERT
WITH CHECK (
  -- Superadmin can insert anywhere
  get_user_role() = 'superadmin'
  OR
  -- Tenant owners can insert for bills in any branch in their tenant
  (get_user_role() = 'tenant_owner'
   AND EXISTS (
     SELECT 1 FROM bills
     WHERE bills.id = bill_items.bill_id
     AND bills.tenant_id = get_user_tenant_id()
     AND EXISTS (
       SELECT 1 FROM branches
       WHERE id = bills.branch_id
       AND tenant_id = get_user_tenant_id()
     )
   ))
  OR
  -- Branch admins/staff can insert for bills in their own branch
  (get_user_role() IN ('branch_admin', 'branch_staff')
   AND EXISTS (
     SELECT 1 FROM bills
     WHERE bills.id = bill_items.bill_id
     AND bills.branch_id = get_user_branch_id()
     AND bills.tenant_id = get_user_tenant_id()
   ))
);

