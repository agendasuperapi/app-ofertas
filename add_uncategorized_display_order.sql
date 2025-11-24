-- Add column to store the display order of the uncategorized section
ALTER TABLE stores 
ADD COLUMN IF NOT EXISTS uncategorized_display_order INTEGER DEFAULT 0;

-- Add comment to document the column purpose
COMMENT ON COLUMN stores.uncategorized_display_order IS 'Display order position for the uncategorized addons section in addon management';
