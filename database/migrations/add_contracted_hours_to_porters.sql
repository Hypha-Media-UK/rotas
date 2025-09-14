-- Migration: Add contracted_hours column to porters table
-- This allows porters to have detailed day-by-day working schedules

USE rota_track;

-- Add contracted_hours column to porters table
ALTER TABLE porters 
ADD COLUMN contracted_hours JSON NULL AFTER shift_group;

-- Add index for contracted_hours (useful for queries)
CREATE INDEX idx_contracted_hours ON porters(contracted_hours);

-- Update existing porters with default contracted hours based on their role
UPDATE porters SET contracted_hours = 
  CASE 
    WHEN role LIKE '%Night%' THEN JSON_OBJECT(
      'monday', JSON_OBJECT('start', '20:00', 'end', '08:00'),
      'tuesday', JSON_OBJECT('start', '20:00', 'end', '08:00'),
      'wednesday', JSON_OBJECT('start', '20:00', 'end', '08:00'),
      'thursday', JSON_OBJECT('start', '20:00', 'end', '08:00'),
      'friday', JSON_OBJECT('start', '20:00', 'end', '08:00'),
      'saturday', JSON_OBJECT('start', '20:00', 'end', '08:00'),
      'sunday', JSON_OBJECT('start', '20:00', 'end', '08:00')
    )
    ELSE JSON_OBJECT(
      'monday', JSON_OBJECT('start', '08:00', 'end', '20:00'),
      'tuesday', JSON_OBJECT('start', '08:00', 'end', '20:00'),
      'wednesday', JSON_OBJECT('start', '08:00', 'end', '20:00'),
      'thursday', JSON_OBJECT('start', '08:00', 'end', '20:00'),
      'friday', JSON_OBJECT('start', '08:00', 'end', '20:00'),
      'saturday', JSON_OBJECT('start', '08:00', 'end', '20:00'),
      'sunday', JSON_OBJECT('start', '08:00', 'end', '20:00')
    )
  END
WHERE contracted_hours IS NULL;

-- Show the results
SELECT id, name, role, 
       JSON_EXTRACT(contracted_hours, '$.monday.start') as monday_start,
       JSON_EXTRACT(contracted_hours, '$.monday.end') as monday_end
FROM porters 
WHERE contracted_hours IS NOT NULL 
LIMIT 5;

-- Verify the migration
SELECT 
  COUNT(*) as total_porters,
  COUNT(contracted_hours) as porters_with_hours,
  COUNT(*) - COUNT(contracted_hours) as porters_without_hours
FROM porters;
