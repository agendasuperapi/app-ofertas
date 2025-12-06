-- Add deleted_at column to products table for soft delete
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add index for better performance when filtering non-deleted products
CREATE INDEX IF NOT EXISTS idx_products_deleted_at ON public.products(deleted_at);

COMMENT ON COLUMN public.products.deleted_at IS 'Timestamp when the product was soft-deleted. NULL means the product is active.';