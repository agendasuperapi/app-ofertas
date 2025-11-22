-- Add separate columns for desktop and mobile layout templates
ALTER TABLE stores 
ADD COLUMN IF NOT EXISTS product_layout_template_desktop TEXT DEFAULT 'template-4',
ADD COLUMN IF NOT EXISTS product_layout_template_mobile TEXT DEFAULT 'template-2';

-- Update existing stores to have both templates
UPDATE stores 
SET 
  product_layout_template_desktop = COALESCE(product_layout_template, 'template-4'),
  product_layout_template_mobile = 'template-2'
WHERE product_layout_template_desktop IS NULL;

-- Add comments
COMMENT ON COLUMN stores.product_layout_template_desktop IS 'Layout template for product display on desktop. Options: template-2, template-3, template-4, template-6, template-list';
COMMENT ON COLUMN stores.product_layout_template_mobile IS 'Layout template for product display on mobile. Options: template-2, template-3, template-4, template-6, template-list';
