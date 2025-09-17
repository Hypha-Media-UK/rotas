-- Add display_order column to departments table for drag and drop reordering
-- This migration adds a display_order column and sets initial values based on current order

-- Add the display_order column
ALTER TABLE departments 
ADD COLUMN display_order INT DEFAULT 1 AFTER required_staff;

-- Set initial display_order values based on current alphabetical order
SET @row_number = 0;
UPDATE departments 
SET display_order = (@row_number := @row_number + 1)
WHERE is_active = TRUE
ORDER BY name;

-- Add index for better performance when ordering
ALTER TABLE departments 
ADD INDEX idx_display_order (display_order);

-- Update the default ORDER BY clause to use display_order
-- Note: This is a comment for developers - the actual queries need to be updated in the code
