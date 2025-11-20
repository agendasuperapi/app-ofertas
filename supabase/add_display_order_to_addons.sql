-- Add display_order column to product_addons table
ALTER TABLE product_addons ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Update existing records to have sequential display_order based on created_at
WITH ranked_addons AS (
  SELECT 
    id, 
    ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY created_at) - 1 AS new_order
  FROM product_addons
)
UPDATE product_addons
SET display_order = ranked_addons.new_order
FROM ranked_addons
WHERE product_addons.id = ranked_addons.id;
