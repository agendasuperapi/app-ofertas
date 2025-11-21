-- Add min_items and max_items columns to addon_categories table
ALTER TABLE addon_categories
ADD COLUMN IF NOT EXISTS min_items INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_items INTEGER DEFAULT NULL;

-- Add check constraint to ensure min_items is not negative
ALTER TABLE addon_categories
ADD CONSTRAINT min_items_non_negative CHECK (min_items >= 0);

-- Add check constraint to ensure max_items is greater than or equal to min_items when set
ALTER TABLE addon_categories
ADD CONSTRAINT max_items_valid CHECK (max_items IS NULL OR max_items >= min_items);

-- Add comment to columns
COMMENT ON COLUMN addon_categories.min_items IS 'Minimum number of items that must be selected from this category (0 = optional)';
COMMENT ON COLUMN addon_categories.max_items IS 'Maximum number of items that can be selected from this category (NULL = unlimited)';
