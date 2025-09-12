-- Migration: Add shift_group column to porters table
-- This allows porters to be assigned to shift types directly

USE rota_track;

-- Add shift_group column to porters table
ALTER TABLE porters 
ADD COLUMN shift_group VARCHAR(255) NULL AFTER role;

-- Add index for shift_group
CREATE INDEX idx_shift_group ON porters(shift_group);

-- Update existing porters with their current shift assignments based on role
-- This maps the existing role-based assignments to shift groups
UPDATE porters SET shift_group = 
  CASE 
    WHEN role LIKE '%Day Shift One%' THEN 'Day Shift A'
    WHEN role LIKE '%Day Shift Two%' THEN 'Day Shift B'
    WHEN role LIKE '%Night Shift%' THEN 'Night Shift A'
    ELSE NULL
  END;

-- Show the results
SELECT id, name, role, shift_group FROM porters WHERE shift_group IS NOT NULL;
