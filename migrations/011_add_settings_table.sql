-- Migration 011: Add Settings Table
-- Created: 2024
-- Description: Creates settings table for GST and Payment details configuration

-- Settings Table (one row per tenant)
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- GST Settings
  gst_enabled BOOLEAN DEFAULT false,
  gst_type VARCHAR(20) DEFAULT 'exclusive' CHECK (gst_type IN ('inclusive', 'exclusive')),
  gst_percentage DECIMAL(5, 2) DEFAULT 0 CHECK (gst_percentage >= 0 AND gst_percentage <= 100),
  
  -- Payment Details
  upi_id VARCHAR(255),
  bank_account_number VARCHAR(100),
  bank_name VARCHAR(255),
  bank_branch VARCHAR(255),
  bank_ifsc_code VARCHAR(20),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_settings_tenant_id ON settings(tenant_id);

-- Enable RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view settings in their tenant" ON settings;
DROP POLICY IF EXISTS "Users can update settings in their tenant" ON settings;
DROP POLICY IF EXISTS "Users can insert settings in their tenant" ON settings;

-- View: Tenant owners can view their tenant settings
CREATE POLICY "Users can view settings in their tenant"
ON settings FOR SELECT
USING (
  get_user_role() = 'superadmin'
  OR
  (get_user_role() = 'tenant_owner' AND tenant_id = get_user_tenant_id())
  OR
  (get_user_role() IN ('branch_admin', 'branch_staff') AND tenant_id = get_user_tenant_id())
);

-- Insert: Tenant owners can create settings for their tenant
CREATE POLICY "Users can insert settings in their tenant"
ON settings FOR INSERT
WITH CHECK (
  get_user_role() = 'superadmin'
  OR
  (get_user_role() = 'tenant_owner' AND tenant_id = get_user_tenant_id())
);

-- Update: Tenant owners can update settings for their tenant
CREATE POLICY "Users can update settings in their tenant"
ON settings FOR UPDATE
USING (
  get_user_role() = 'superadmin'
  OR
  (get_user_role() = 'tenant_owner' AND tenant_id = get_user_tenant_id())
)
WITH CHECK (
  get_user_role() = 'superadmin'
  OR
  (get_user_role() = 'tenant_owner' AND tenant_id = get_user_tenant_id())
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_settings_updated_at ON settings;
CREATE TRIGGER update_settings_updated_at 
BEFORE UPDATE ON settings 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

