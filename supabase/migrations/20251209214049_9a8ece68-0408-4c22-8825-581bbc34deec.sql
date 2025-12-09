-- Create storage bucket for affiliate avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('affiliate-avatars', 'affiliate-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view affiliate avatars (public bucket)
CREATE POLICY "Affiliate avatars are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'affiliate-avatars');

-- Allow affiliates to upload their own avatar (using folder structure)
CREATE POLICY "Affiliates can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'affiliate-avatars');

-- Allow affiliates to update their own avatar
CREATE POLICY "Affiliates can update their own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'affiliate-avatars');

-- Allow affiliates to delete their own avatar
CREATE POLICY "Affiliates can delete their own avatar"
ON storage.objects FOR DELETE
USING (bucket_id = 'affiliate-avatars');