-- Add deleted_at column to products table for soft delete
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE products ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
    
    COMMENT ON COLUMN products.deleted_at IS 'Timestamp when the product was soft-deleted. NULL means active.';
  END IF;
END $$;

-- Create index for better performance on soft delete queries
CREATE INDEX IF NOT EXISTS idx_products_deleted_at ON products(deleted_at) WHERE deleted_at IS NULL;

-- Verification
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'deleted_at'
  ) THEN
    RAISE NOTICE '✅ Column deleted_at added successfully to products table';
  ELSE
    RAISE NOTICE '❌ Failed to add deleted_at column';
  END IF;
END $$;
