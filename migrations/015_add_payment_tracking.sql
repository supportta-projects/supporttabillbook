-- Migration 015: Add Payment Tracking to Bills
-- Created: 2024
-- Description: Adds payment tracking fields to bills table and creates payment_transactions table

-- =====================================================
-- ADD PAYMENT TRACKING FIELDS TO BILLS TABLE
-- =====================================================
DO $$ 
BEGIN
  -- Add paid_amount field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bills' AND column_name = 'paid_amount'
  ) THEN
    ALTER TABLE bills ADD COLUMN paid_amount DECIMAL(10, 2) DEFAULT 0;
  END IF;
  
  -- Add due_amount field (calculated: total_amount - paid_amount)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bills' AND column_name = 'due_amount'
  ) THEN
    ALTER TABLE bills ADD COLUMN due_amount DECIMAL(10, 2) DEFAULT 0;
  END IF;
END $$;

-- Update existing bills: if payment_mode is not 'credit', set paid_amount = total_amount
UPDATE bills 
SET paid_amount = total_amount,
    due_amount = 0
WHERE payment_mode != 'credit' AND (paid_amount IS NULL OR paid_amount = 0);

-- Update credit bills: set due_amount = total_amount
UPDATE bills 
SET paid_amount = 0,
    due_amount = total_amount
WHERE payment_mode = 'credit' AND (due_amount IS NULL OR due_amount = 0);

-- =====================================================
-- CREATE PAYMENT_TRANSACTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  payment_mode VARCHAR(50) NOT NULL CHECK (payment_mode IN ('cash', 'card', 'upi', 'bank_transfer')),
  transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_payment_transactions_bill_id ON payment_transactions(bill_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_tenant_id ON payment_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_branch_id ON payment_transactions(branch_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON payment_transactions(created_at DESC);

-- =====================================================
-- RLS POLICIES FOR PAYMENT_TRANSACTIONS
-- =====================================================
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view payment transactions in their tenant" ON payment_transactions;
DROP POLICY IF EXISTS "Users can create payment transactions" ON payment_transactions;

-- SELECT policy: Users can view payment transactions in their tenant
CREATE POLICY "Users can view payment transactions in their tenant"
ON payment_transactions FOR SELECT
USING (
  -- Superadmin can view all
  get_user_role() = 'superadmin'
  OR
  -- Tenant owners can view transactions for their tenant
  (get_user_role() = 'tenant_owner'
   AND tenant_id = get_user_tenant_id())
  OR
  -- Branch admins/staff can view transactions for their branch
  (get_user_role() IN ('branch_admin', 'branch_staff')
   AND branch_id = get_user_branch_id()
   AND tenant_id = get_user_tenant_id())
);

-- INSERT policy: Users can create payment transactions
CREATE POLICY "Users can create payment transactions"
ON payment_transactions FOR INSERT
WITH CHECK (
  -- Superadmin can insert anywhere
  get_user_role() = 'superadmin'
  OR
  -- Tenant owners can insert for bills in their tenant
  (get_user_role() = 'tenant_owner'
   AND tenant_id = get_user_tenant_id()
   AND EXISTS (
     SELECT 1 FROM bills
     WHERE bills.id = payment_transactions.bill_id
     AND bills.tenant_id = get_user_tenant_id()
   ))
  OR
  -- Branch admins/staff can insert for bills in their branch
  (get_user_role() IN ('branch_admin', 'branch_staff')
   AND branch_id = get_user_branch_id()
   AND tenant_id = get_user_tenant_id()
   AND EXISTS (
     SELECT 1 FROM bills
     WHERE bills.id = payment_transactions.bill_id
     AND bills.branch_id = get_user_branch_id()
     AND bills.tenant_id = get_user_tenant_id()
   ))
);

