-- Migration 012: Add GST Number Column to Settings Table
-- Created: 2024
-- Description: Adds gst_number column to existing settings table

-- Add gst_number column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'settings' AND column_name = 'gst_number'
  ) THEN
    ALTER TABLE settings 
    ADD COLUMN gst_number VARCHAR(50);
  END IF;
END $$;

