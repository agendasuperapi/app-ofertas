-- Migration: Add is_featured column to products table
-- This allows store owners to mark products to appear in the featured carousel

-- Add is_featured column
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- Create index for better performance on featured products queries
CREATE INDEX IF NOT EXISTS idx_products_is_featured 
ON public.products(store_id, is_featured) 
WHERE is_featured = true;

-- Add comment explaining the column
COMMENT ON COLUMN public.products.is_featured IS 'Indica se o produto aparece no carrossel de destaques da loja';
