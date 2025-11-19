-- Add require_delivery_zone column to stores table
-- This column determines if the store requires customers to be in a registered delivery zone

ALTER TABLE stores 
ADD COLUMN IF NOT EXISTS require_delivery_zone BOOLEAN DEFAULT false;

-- Add comment to explain the column
COMMENT ON COLUMN stores.require_delivery_zone IS 'When true, blocks orders from customers outside registered delivery zones';
