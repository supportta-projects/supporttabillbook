-- Migration 013: Add Profit Calculation to Bills
-- Created: 2024
-- Description: Adds profit calculation fields to bills and bill_items tables

-- Add profit_amount to bills table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bills' AND column_name = 'profit_amount'
  ) THEN
    ALTER TABLE bills 
    ADD COLUMN profit_amount DECIMAL(10, 2) DEFAULT 0;
  END IF;
END $$;

-- Add purchase_price and profit_amount to bill_items table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bill_items' AND column_name = 'purchase_price'
  ) THEN
    ALTER TABLE bill_items 
    ADD COLUMN purchase_price DECIMAL(10, 2);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bill_items' AND column_name = 'profit_amount'
  ) THEN
    ALTER TABLE bill_items 
    ADD COLUMN profit_amount DECIMAL(10, 2) DEFAULT 0;
  END IF;
END $$;

-- Add customer_id to bills table for linking to customers table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bills' AND column_name = 'customer_id'
  ) THEN
    ALTER TABLE bills 
    ADD COLUMN customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add serial_numbers JSONB column to bill_items for tracking sold serial numbers
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bill_items' AND column_name = 'serial_numbers'
  ) THEN
    ALTER TABLE bill_items 
    ADD COLUMN serial_numbers JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

