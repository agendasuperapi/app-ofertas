-- Execute este SQL no editor SQL do Supabase para adicionar campos de edição de pedidos

-- Add store-only fields to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS store_notes TEXT,
ADD COLUMN IF NOT EXISTS store_image_url TEXT;

COMMENT ON COLUMN orders.store_notes IS 'Internal notes only visible to store owner';
COMMENT ON COLUMN orders.store_image_url IS 'Internal image attachment only visible to store owner';

-- Create storage bucket for order images
INSERT INTO storage.buckets (id, name, public)
VALUES ('order-images', 'order-images', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for order images (only store owners)
CREATE POLICY "Store owners can upload order images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'order-images' AND
  EXISTS (
    SELECT 1 FROM orders o
    JOIN stores s ON s.id = o.store_id
    WHERE s.owner_id = auth.uid()
    AND storage.foldername(name)[1] = o.id::text
  )
);

CREATE POLICY "Store owners can view their order images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'order-images' AND
  EXISTS (
    SELECT 1 FROM orders o
    JOIN stores s ON s.id = o.store_id
    WHERE s.owner_id = auth.uid()
    AND storage.foldername(name)[1] = o.id::text
  )
);

CREATE POLICY "Store owners can delete their order images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'order-images' AND
  EXISTS (
    SELECT 1 FROM orders o
    JOIN stores s ON s.id = o.store_id
    WHERE s.owner_id = auth.uid()
    AND storage.foldername(name)[1] = o.id::text
  )
);
