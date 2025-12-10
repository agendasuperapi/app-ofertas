-- Create storage bucket for payment receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-receipts', 'payment-receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload payment receipts
CREATE POLICY "Store owners can upload payment receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'payment-receipts');

-- Allow anyone to view payment receipts (public bucket)
CREATE POLICY "Anyone can view payment receipts"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'payment-receipts');

-- Allow authenticated users to update their uploads
CREATE POLICY "Store owners can update payment receipts"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'payment-receipts');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Store owners can delete payment receipts"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'payment-receipts');