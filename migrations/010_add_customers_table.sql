-- Migration 010: Add Customers Table
-- Created: 2024
-- Description: Creates customers table for managing customer information

-- Customers Table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  gst_number VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, phone)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view customers in their tenant" ON customers;
DROP POLICY IF EXISTS "Users can insert customers in their tenant" ON customers;
DROP POLICY IF EXISTS "Users can update customers in their tenant" ON customers;
DROP POLICY IF EXISTS "Users can delete customers in their tenant" ON customers;

-- View: Tenant owners can view all customers in their tenant
CREATE POLICY "Users can view customers in their tenant"
ON customers FOR SELECT
USING (
  get_user_role() = 'superadmin'
  OR
  (get_user_role() = 'tenant_owner' AND tenant_id = get_user_tenant_id())
  OR
  (get_user_role() IN ('branch_admin', 'branch_staff') AND tenant_id = get_user_tenant_id())
);

-- Insert: Tenant owners can create customers in their tenant
CREATE POLICY "Users can insert customers in their tenant"
ON customers FOR INSERT
WITH CHECK (
  get_user_role() = 'superadmin'
  OR
  (get_user_role() = 'tenant_owner' AND tenant_id = get_user_tenant_id())
  OR
  (get_user_role() IN ('branch_admin', 'branch_staff') AND tenant_id = get_user_tenant_id())
);

-- Update: Tenant owners can update customers in their tenant
CREATE POLICY "Users can update customers in their tenant"
ON customers FOR UPDATE
USING (
  get_user_role() = 'superadmin'
  OR
  (get_user_role() = 'tenant_owner' AND tenant_id = get_user_tenant_id())
  OR
  (get_user_role() IN ('branch_admin', 'branch_staff') AND tenant_id = get_user_tenant_id())
)
WITH CHECK (
  get_user_role() = 'superadmin'
  OR
  (get_user_role() = 'tenant_owner' AND tenant_id = get_user_tenant_id())
  OR
  (get_user_role() IN ('branch_admin', 'branch_staff') AND tenant_id = get_user_tenant_id())
);

-- Delete: Tenant owners can delete customers in their tenant
CREATE POLICY "Users can delete customers in their tenant"
ON customers FOR DELETE
USING (
  get_user_role() = 'superadmin'
  OR
  (get_user_role() = 'tenant_owner' AND tenant_id = get_user_tenant_id())
  OR
  (get_user_role() IN ('branch_admin', 'branch_staff') AND tenant_id = get_user_tenant_id())
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at 
BEFORE UPDATE ON customers 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

