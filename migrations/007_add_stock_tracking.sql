-- Migration 007: Add Stock Tracking Type and Serial Numbers Support
-- Created: 2024
-- Description: Adds stock_tracking_type field to products and creates serial_numbers table
-- This enables tracking products by quantity (count) or by individual serial numbers

-- Add stock_tracking_type column to products table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'stock_tracking_type'
  ) THEN
    ALTER TABLE products 
    ADD COLUMN stock_tracking_type VARCHAR(20) DEFAULT 'quantity' 
    CHECK (stock_tracking_type IN ('quantity', 'serial'));
    
    -- Set default for existing products
    UPDATE products SET stock_tracking_type = 'quantity' WHERE stock_tracking_type IS NULL;
  END IF;
END $$;

-- Create product_serial_numbers table for tracking individual serial numbers
CREATE TABLE IF NOT EXISTS product_serial_numbers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  serial_number VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'sold', 'damaged', 'returned')),
  bill_id UUID REFERENCES bills(id) ON DELETE SET NULL,
  sold_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(branch_id, product_id, serial_number)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_serial_numbers_product_id ON product_serial_numbers(product_id);
CREATE INDEX IF NOT EXISTS idx_product_serial_numbers_branch_id ON product_serial_numbers(branch_id);
CREATE INDEX IF NOT EXISTS idx_product_serial_numbers_status ON product_serial_numbers(status);
CREATE INDEX IF NOT EXISTS idx_product_serial_numbers_serial_number ON product_serial_numbers(serial_number);
CREATE INDEX IF NOT EXISTS idx_product_serial_numbers_tenant_id ON product_serial_numbers(tenant_id);

-- RLS Policies for product_serial_numbers
ALTER TABLE product_serial_numbers ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view serial numbers in their tenant
DROP POLICY IF EXISTS "Users can view serial numbers in their tenant" ON product_serial_numbers;
CREATE POLICY "Users can view serial numbers in their tenant"
  ON product_serial_numbers FOR SELECT
  USING (
    tenant_id IN (
      SELECT id FROM tenants WHERE id = tenant_id
    )
  );

-- Policy: Users can insert serial numbers in their tenant
DROP POLICY IF EXISTS "Users can insert serial numbers in their tenant" ON product_serial_numbers;
CREATE POLICY "Users can insert serial numbers in their tenant"
  ON product_serial_numbers FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT id FROM tenants WHERE id = tenant_id
    )
  );

-- Policy: Users can update serial numbers in their tenant
DROP POLICY IF EXISTS "Users can update serial numbers in their tenant" ON product_serial_numbers;
CREATE POLICY "Users can update serial numbers in their tenant"
  ON product_serial_numbers FOR UPDATE
  USING (
    tenant_id IN (
      SELECT id FROM tenants WHERE id = tenant_id
    )
  );

-- Policy: Users can delete serial numbers in their tenant
DROP POLICY IF EXISTS "Users can delete serial numbers in their tenant" ON product_serial_numbers;
CREATE POLICY "Users can delete serial numbers in their tenant"
  ON product_serial_numbers FOR DELETE
  USING (
    tenant_id IN (
      SELECT id FROM tenants WHERE id = tenant_id
    )
  );

