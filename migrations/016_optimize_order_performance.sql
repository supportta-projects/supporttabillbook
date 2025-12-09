-- Migration 016: Optimize Order Performance
-- Created: 2024
-- Description: Add critical indexes for order queries and filtering

-- Index for bill_items.bill_id (critical for joins when fetching order details)
CREATE INDEX IF NOT EXISTS idx_bill_items_bill_id ON bill_items(bill_id);

-- Composite index for tenant owner queries (most common query pattern)
-- This covers: tenant_id + branch_id + created_at ordering
CREATE INDEX IF NOT EXISTS idx_bills_tenant_branch_created 
ON bills(tenant_id, branch_id, created_at DESC);

-- Index for invoice number search (used in order list filtering)
CREATE INDEX IF NOT EXISTS idx_bills_invoice_number ON bills(invoice_number);

-- Indexes for customer search (name and phone filtering)
CREATE INDEX IF NOT EXISTS idx_bills_customer_name ON bills(customer_name);
CREATE INDEX IF NOT EXISTS idx_bills_customer_phone ON bills(customer_phone);

-- Indexes for payment filtering (paid_amount and due_amount)
CREATE INDEX IF NOT EXISTS idx_bills_paid_amount ON bills(paid_amount);
CREATE INDEX IF NOT EXISTS idx_bills_due_amount ON bills(due_amount);

-- Composite index for payment mode filtering
CREATE INDEX IF NOT EXISTS idx_bills_payment_mode ON bills(payment_mode);

-- Index for date range queries (used in order list date filters)
-- Note: created_at DESC index already exists, but adding composite for tenant + date
CREATE INDEX IF NOT EXISTS idx_bills_tenant_created 
ON bills(tenant_id, created_at DESC);

-- Index for product_id in bill_items (used in product sales reports)
CREATE INDEX IF NOT EXISTS idx_bill_items_product_id ON bill_items(product_id);

-- Index for bill_items total_amount (for calculations)
CREATE INDEX IF NOT EXISTS idx_bill_items_total_amount ON bill_items(total_amount);

-- Composite index for branch + date queries (common pattern)
CREATE INDEX IF NOT EXISTS idx_bills_branch_created 
ON bills(branch_id, created_at DESC);

-- Analyze tables to update statistics
ANALYZE bills;
ANALYZE bill_items;

