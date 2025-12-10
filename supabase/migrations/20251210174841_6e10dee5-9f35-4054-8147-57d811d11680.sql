-- Criar bucket para comprovantes de pagamento
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-receipts', 'payment-receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Política de upload para usuários autenticados
CREATE POLICY "Authenticated users can upload receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'payment-receipts');

-- Política de leitura pública
CREATE POLICY "Public can read receipts"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'payment-receipts');

-- Política de atualização para usuários autenticados
CREATE POLICY "Authenticated users can update receipts"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'payment-receipts');

-- Política de deleção para usuários autenticados
CREATE POLICY "Authenticated users can delete receipts"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'payment-receipts');