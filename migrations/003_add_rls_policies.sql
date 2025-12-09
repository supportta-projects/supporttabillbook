-- Migration 003: Add Comprehensive Row Level Security (RLS) Policies
-- Created: 2024
-- Description: Adds comprehensive RLS policies for tenant and branch isolation
-- This migration can be run safely even if some policies already exist
-- IMPORTANT: Run this after migrations 001 and 002

-- =====================================================
-- Helper Functions for RLS Policies
-- =====================================================

-- Helper function to get user's tenant_id
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper function to get user's branch_id
CREATE OR REPLACE FUNCTION get_user_branch_id()
RETURNS UUID AS $$
  SELECT branch_id FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper function to get user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- =====================================================
-- TENANTS TABLE POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Superadmin can view all tenants" ON tenants;
DROP POLICY IF EXISTS "Superadmin can insert tenants" ON tenants;
DROP POLICY IF EXISTS "Superadmin can update tenants" ON tenants;
DROP POLICY IF EXISTS "Superadmin can delete tenants" ON tenants;
DROP POLICY IF EXISTS "Tenant owners can view their tenant" ON tenants;
DROP POLICY IF EXISTS "Service role can do everything" ON tenants;

-- Superadmin: Full access
CREATE POLICY "Superadmin can view all tenants"
ON tenants FOR SELECT
USING (get_user_role() = 'superadmin');

CREATE POLICY "Superadmin can insert tenants"
ON tenants FOR INSERT
WITH CHECK (get_user_role() = 'superadmin');

CREATE POLICY "Superadmin can update tenants"
ON tenants FOR UPDATE
USING (get_user_role() = 'superadmin')
WITH CHECK (get_user_role() = 'superadmin');

CREATE POLICY "Superadmin can delete tenants"
ON tenants FOR DELETE
USING (get_user_role() = 'superadmin');

-- Tenant owners: Can view their own tenant
CREATE POLICY "Tenant owners can view their tenant"
ON tenants FOR SELECT
USING (id = get_user_tenant_id() OR get_user_role() = 'superadmin');

-- Service role: Full access
CREATE POLICY "Service role can do everything" ON tenants
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- BRANCHES TABLE POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Superadmin can view all branches" ON branches;
DROP POLICY IF EXISTS "Superadmin can manage branches" ON branches;
DROP POLICY IF EXISTS "Tenant owners can view their branches" ON branches;
DROP POLICY IF EXISTS "Tenant owners can manage their branches" ON branches;
DROP POLICY IF EXISTS "Branch users can view their branch" ON branches;
DROP POLICY IF EXISTS "Service role can do everything" ON branches;

-- Superadmin: Full access
CREATE POLICY "Superadmin can view all branches"
ON branches FOR SELECT
USING (get_user_role() = 'superadmin');

CREATE POLICY "Superadmin can manage branches"
ON branches FOR ALL
USING (get_user_role() = 'superadmin')
WITH CHECK (get_user_role() = 'superadmin');

-- Tenant owners: Can manage branches in their tenant
CREATE POLICY "Tenant owners can view their branches"
ON branches FOR SELECT
USING (tenant_id = get_user_tenant_id() OR get_user_role() = 'superadmin');

CREATE POLICY "Tenant owners can manage their branches"
ON branches FOR ALL
USING (tenant_id = get_user_tenant_id() AND get_user_role() = 'tenant_owner')
WITH CHECK (tenant_id = get_user_tenant_id() AND get_user_role() = 'tenant_owner');

-- Branch users: Can view their own branch
CREATE POLICY "Branch users can view their branch"
ON branches FOR SELECT
USING (id = get_user_branch_id() OR tenant_id = get_user_tenant_id() OR get_user_role() = 'superadmin');

-- Service role
CREATE POLICY "Service role can do everything" ON branches
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- USERS TABLE POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Users can view their own record" ON users;
DROP POLICY IF EXISTS "Users can insert their own record" ON users;
DROP POLICY IF EXISTS "Users can update their own record" ON users;
DROP POLICY IF EXISTS "Superadmin can view all users" ON users;
DROP POLICY IF EXISTS "Superadmin can manage users" ON users;
DROP POLICY IF EXISTS "Tenant owners can view their users" ON users;
DROP POLICY IF EXISTS "Tenant owners can manage their users" ON users;
DROP POLICY IF EXISTS "Service role can do everything" ON users;

-- Users: Can view/update their own record
CREATE POLICY "Users can view their own record"
ON users FOR SELECT
USING (auth.uid() = id OR get_user_role() = 'superadmin' OR 
       (get_user_role() = 'tenant_owner' AND tenant_id = get_user_tenant_id()));

CREATE POLICY "Users can insert their own record"
ON users FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own record"
ON users FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Superadmin: Full access
CREATE POLICY "Superadmin can view all users"
ON users FOR SELECT
USING (get_user_role() = 'superadmin');

CREATE POLICY "Superadmin can manage users"
ON users FOR ALL
USING (get_user_role() = 'superadmin')
WITH CHECK (get_user_role() = 'superadmin');

-- Tenant owners: Can manage users in their tenant
CREATE POLICY "Tenant owners can view their users"
ON users FOR SELECT
USING (tenant_id = get_user_tenant_id() OR get_user_role() = 'superadmin');

CREATE POLICY "Tenant owners can manage their users"
ON users FOR ALL
USING (tenant_id = get_user_tenant_id() AND get_user_role() = 'tenant_owner')
WITH CHECK (tenant_id = get_user_tenant_id() AND get_user_role() = 'tenant_owner');

-- Service role
CREATE POLICY "Service role can do everything" ON users
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- PRODUCTS TABLE POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Superadmin can view all products" ON products;
DROP POLICY IF EXISTS "Superadmin can manage products" ON products;
DROP POLICY IF EXISTS "Tenant users can view their products" ON products;
DROP POLICY IF EXISTS "Tenant owners can manage products" ON products;
DROP POLICY IF EXISTS "Service role can do everything" ON products;

-- Superadmin: Full access
CREATE POLICY "Superadmin can view all products"
ON products FOR SELECT
USING (get_user_role() = 'superadmin');

CREATE POLICY "Superadmin can manage products"
ON products FOR ALL
USING (get_user_role() = 'superadmin')
WITH CHECK (get_user_role() = 'superadmin');

-- Tenant users: Can view products in their tenant
CREATE POLICY "Tenant users can view their products"
ON products FOR SELECT
USING (tenant_id = get_user_tenant_id() OR get_user_role() = 'superadmin');

-- Tenant owners: Can manage products
CREATE POLICY "Tenant owners can manage products"
ON products FOR ALL
USING (tenant_id = get_user_tenant_id() AND get_user_role() = 'tenant_owner')
WITH CHECK (tenant_id = get_user_tenant_id() AND get_user_role() = 'tenant_owner');

-- Service role
CREATE POLICY "Service role can do everything" ON products
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- CURRENT_STOCK TABLE POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Superadmin can view all stock" ON current_stock;
DROP POLICY IF EXISTS "Tenant users can view their stock" ON current_stock;
DROP POLICY IF EXISTS "Branch users can view their branch stock" ON current_stock;
DROP POLICY IF EXISTS "Branch admins can manage stock" ON current_stock;
DROP POLICY IF EXISTS "Service role can do everything" ON current_stock;

-- Superadmin: Full access
CREATE POLICY "Superadmin can view all stock"
ON current_stock FOR SELECT
USING (get_user_role() = 'superadmin');

-- Tenant users: Can view stock in their tenant
CREATE POLICY "Tenant users can view their stock"
ON current_stock FOR SELECT
USING (tenant_id = get_user_tenant_id() OR get_user_role() = 'superadmin');

-- Branch users: Can view stock in their branch
CREATE POLICY "Branch users can view their branch stock"
ON current_stock FOR SELECT
USING ((branch_id = get_user_branch_id() AND tenant_id = get_user_tenant_id()) 
       OR get_user_role() = 'superadmin' 
       OR (get_user_role() = 'tenant_owner' AND tenant_id = get_user_tenant_id()));

-- Branch admins: Can manage stock (insert/update)
CREATE POLICY "Branch admins can manage stock"
ON current_stock FOR ALL
USING ((branch_id = get_user_branch_id() AND tenant_id = get_user_tenant_id() 
        AND get_user_role() IN ('branch_admin', 'tenant_owner', 'superadmin')))
WITH CHECK ((branch_id = get_user_branch_id() AND tenant_id = get_user_tenant_id() 
            AND get_user_role() IN ('branch_admin', 'tenant_owner', 'superadmin')));

-- Service role
CREATE POLICY "Service role can do everything" ON current_stock
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- STOCK_LEDGER TABLE POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Superadmin can view all ledger" ON stock_ledger;
DROP POLICY IF EXISTS "Tenant users can view their ledger" ON stock_ledger;
DROP POLICY IF EXISTS "Branch users can view their branch ledger" ON stock_ledger;
DROP POLICY IF EXISTS "Branch admins can insert ledger" ON stock_ledger;
DROP POLICY IF EXISTS "Service role can do everything" ON stock_ledger;

-- Superadmin: Full access
CREATE POLICY "Superadmin can view all ledger"
ON stock_ledger FOR SELECT
USING (get_user_role() = 'superadmin');

-- Tenant users: Can view ledger in their tenant
CREATE POLICY "Tenant users can view their ledger"
ON stock_ledger FOR SELECT
USING (tenant_id = get_user_tenant_id() OR get_user_role() = 'superadmin');

-- Branch users: Can view ledger in their branch
CREATE POLICY "Branch users can view their branch ledger"
ON stock_ledger FOR SELECT
USING ((branch_id = get_user_branch_id() AND tenant_id = get_user_tenant_id()) 
       OR get_user_role() = 'superadmin' 
       OR (get_user_role() = 'tenant_owner' AND tenant_id = get_user_tenant_id()));

-- Branch admins: Can insert ledger entries
CREATE POLICY "Branch admins can insert ledger"
ON stock_ledger FOR INSERT
WITH CHECK ((branch_id = get_user_branch_id() AND tenant_id = get_user_tenant_id() 
            AND get_user_role() IN ('branch_admin', 'branch_staff', 'tenant_owner', 'superadmin')));

-- Service role
CREATE POLICY "Service role can do everything" ON stock_ledger
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- BILLS TABLE POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Superadmin can view all bills" ON bills;
DROP POLICY IF EXISTS "Tenant users can view their bills" ON bills;
DROP POLICY IF EXISTS "Branch users can view their branch bills" ON bills;
DROP POLICY IF EXISTS "Branch users can create bills" ON bills;
DROP POLICY IF EXISTS "Service role can do everything" ON bills;

-- Superadmin: Full access
CREATE POLICY "Superadmin can view all bills"
ON bills FOR SELECT
USING (get_user_role() = 'superadmin');

-- Tenant users: Can view bills in their tenant
CREATE POLICY "Tenant users can view their bills"
ON bills FOR SELECT
USING (tenant_id = get_user_tenant_id() OR get_user_role() = 'superadmin');

-- Branch users: Can view bills in their branch
CREATE POLICY "Branch users can view their branch bills"
ON bills FOR SELECT
USING ((branch_id = get_user_branch_id() AND tenant_id = get_user_tenant_id()) 
       OR get_user_role() = 'superadmin' 
       OR (get_user_role() = 'tenant_owner' AND tenant_id = get_user_tenant_id()));

-- Branch users: Can create bills
CREATE POLICY "Branch users can create bills"
ON bills FOR INSERT
WITH CHECK ((branch_id = get_user_branch_id() AND tenant_id = get_user_tenant_id() 
            AND get_user_role() IN ('branch_admin', 'branch_staff', 'tenant_owner', 'superadmin')));

-- Service role
CREATE POLICY "Service role can do everything" ON bills
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- BILL_ITEMS TABLE POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Users can view bill items" ON bill_items;
DROP POLICY IF EXISTS "Branch users can create bill items" ON bill_items;
DROP POLICY IF EXISTS "Service role can do everything" ON bill_items;

CREATE POLICY "Users can view bill items"
ON bill_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM bills 
    WHERE bills.id = bill_items.bill_id 
    AND (
      bills.branch_id = get_user_branch_id() 
      OR bills.tenant_id = get_user_tenant_id() 
      OR get_user_role() = 'superadmin'
    )
  )
);

CREATE POLICY "Branch users can create bill items"
ON bill_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM bills 
    WHERE bills.id = bill_items.bill_id 
    AND bills.branch_id = get_user_branch_id() 
    AND bills.tenant_id = get_user_tenant_id()
    AND get_user_role() IN ('branch_admin', 'branch_staff', 'tenant_owner', 'superadmin')
  )
);

CREATE POLICY "Service role can do everything" ON bill_items
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- PURCHASES TABLE POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Users can view purchases" ON purchases;
DROP POLICY IF EXISTS "Branch admins can manage purchases" ON purchases;
DROP POLICY IF EXISTS "Service role can do everything" ON purchases;

CREATE POLICY "Users can view purchases"
ON purchases FOR SELECT
USING ((branch_id = get_user_branch_id() AND tenant_id = get_user_tenant_id()) 
       OR get_user_role() = 'superadmin' 
       OR (get_user_role() = 'tenant_owner' AND tenant_id = get_user_tenant_id()));

CREATE POLICY "Branch admins can manage purchases"
ON purchases FOR ALL
USING ((branch_id = get_user_branch_id() AND tenant_id = get_user_tenant_id() 
        AND get_user_role() IN ('branch_admin', 'tenant_owner', 'superadmin')))
WITH CHECK ((branch_id = get_user_branch_id() AND tenant_id = get_user_tenant_id() 
            AND get_user_role() IN ('branch_admin', 'tenant_owner', 'superadmin')));

CREATE POLICY "Service role can do everything" ON purchases
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- PURCHASE_ITEMS TABLE POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Users can view purchase items" ON purchase_items;
DROP POLICY IF EXISTS "Branch admins can create purchase items" ON purchase_items;
DROP POLICY IF EXISTS "Service role can do everything" ON purchase_items;

CREATE POLICY "Users can view purchase items"
ON purchase_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM purchases 
    WHERE purchases.id = purchase_items.purchase_id 
    AND (
      purchases.branch_id = get_user_branch_id() 
      OR purchases.tenant_id = get_user_tenant_id() 
      OR get_user_role() = 'superadmin'
    )
  )
);

CREATE POLICY "Branch admins can create purchase items"
ON purchase_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM purchases 
    WHERE purchases.id = purchase_items.purchase_id 
    AND purchases.branch_id = get_user_branch_id() 
    AND purchases.tenant_id = get_user_tenant_id()
    AND get_user_role() IN ('branch_admin', 'tenant_owner', 'superadmin')
  )
);

CREATE POLICY "Service role can do everything" ON purchase_items
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- EXPENSES TABLE POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Users can view expenses" ON expenses;
DROP POLICY IF EXISTS "Branch users can manage expenses" ON expenses;
DROP POLICY IF EXISTS "Service role can do everything" ON expenses;

CREATE POLICY "Users can view expenses"
ON expenses FOR SELECT
USING ((branch_id = get_user_branch_id() AND tenant_id = get_user_tenant_id()) 
       OR get_user_role() = 'superadmin' 
       OR (get_user_role() = 'tenant_owner' AND tenant_id = get_user_tenant_id()));

CREATE POLICY "Branch users can manage expenses"
ON expenses FOR ALL
USING ((branch_id = get_user_branch_id() AND tenant_id = get_user_tenant_id() 
        AND get_user_role() IN ('branch_admin', 'branch_staff', 'tenant_owner', 'superadmin')))
WITH CHECK ((branch_id = get_user_branch_id() AND tenant_id = get_user_tenant_id() 
            AND get_user_role() IN ('branch_admin', 'branch_staff', 'tenant_owner', 'superadmin')));

CREATE POLICY "Service role can do everything" ON expenses
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

