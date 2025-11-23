-- Add show_address_on_store_page column to stores table
ALTER TABLE stores 
ADD COLUMN IF NOT EXISTS show_address_on_store_page BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN stores.show_address_on_store_page IS 'Controls whether the store address is displayed on the store page';
