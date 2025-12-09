-- Migration 008: Add Main Branch Support
-- Created: 2024
-- Description: Adds is_main field to branches table to mark the main branch
-- Only one branch per tenant can be marked as main branch

-- Add is_main column to branches table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'branches' AND column_name = 'is_main'
  ) THEN
    ALTER TABLE branches 
    ADD COLUMN is_main BOOLEAN DEFAULT false;
    
    -- Create index for performance
    CREATE INDEX IF NOT EXISTS idx_branches_is_main ON branches(tenant_id, is_main) WHERE is_main = true;
    
    -- Set the first branch of each tenant as main branch (if no main branch exists)
    UPDATE branches b1
    SET is_main = true
    WHERE NOT EXISTS (
      SELECT 1 FROM branches b2 
      WHERE b2.tenant_id = b1.tenant_id 
      AND b2.is_main = true
    )
    AND b1.id = (
      SELECT id FROM branches b3 
      WHERE b3.tenant_id = b1.tenant_id 
      ORDER BY created_at ASC 
      LIMIT 1
    );
  END IF;
END $$;

-- Add constraint to ensure only one main branch per tenant
-- Note: This is enforced at application level, but we can add a unique partial index
CREATE UNIQUE INDEX IF NOT EXISTS idx_branches_one_main_per_tenant 
ON branches(tenant_id) 
WHERE is_main = true;

