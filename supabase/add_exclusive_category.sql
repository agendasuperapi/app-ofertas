-- Add is_exclusive column to addon_categories table
ALTER TABLE addon_categories
ADD COLUMN IF NOT EXISTS is_exclusive BOOLEAN DEFAULT false;

-- Add comment to column
COMMENT ON COLUMN addon_categories.is_exclusive IS 'When true, only one addon can be selected from this category (radio button behavior)';

-- Update constraint: when is_exclusive is true, max_items should be 1 or null
ALTER TABLE addon_categories
DROP CONSTRAINT IF EXISTS max_items_valid;

ALTER TABLE addon_categories
ADD CONSTRAINT max_items_valid CHECK (
  max_items IS NULL OR 
  max_items >= min_items OR
  (is_exclusive = true AND (max_items = 1 OR max_items IS NULL))
);
