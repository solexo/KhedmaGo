/*
  # Update Professional Status System

  Change is_available boolean to status text with multiple options:
  - 'available': Connected and available for work
  - 'busy': Currently completing work
  - 'offline': Not connected to the platform
*/

-- Add new status column
ALTER TABLE professionals ADD COLUMN status text DEFAULT 'available' CHECK (status IN ('available', 'busy', 'offline'));

-- Migrate existing is_available data to status
UPDATE professionals SET status = CASE
  WHEN is_available = true THEN 'available'
  ELSE 'offline'
END;

-- Drop old column
ALTER TABLE professionals DROP COLUMN is_available;

-- Update RLS policies to use new status column
DROP POLICY IF EXISTS "Anyone can read available professionals" ON professionals;
CREATE POLICY "Anyone can read available professionals"
  ON professionals FOR SELECT
  TO authenticated
  USING (status = 'available');

-- Update indexes
DROP INDEX IF EXISTS idx_professionals_available;
CREATE INDEX IF NOT EXISTS idx_professionals_status ON professionals(status);