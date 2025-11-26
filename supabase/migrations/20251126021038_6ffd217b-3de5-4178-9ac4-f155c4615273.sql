-- Add field to control if store address is available for pickup
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS store_address_pickup_enabled boolean DEFAULT true;

COMMENT ON COLUMN stores.store_address_pickup_enabled IS 'Se o endereço da loja está disponível para retirada';