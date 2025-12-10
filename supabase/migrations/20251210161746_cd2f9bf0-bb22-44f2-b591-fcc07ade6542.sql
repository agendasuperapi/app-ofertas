-- Sincronizar commission_enabled de affiliates para store_affiliates
UPDATE store_affiliates sa
SET commission_enabled = a.commission_enabled
FROM affiliates a
JOIN affiliate_accounts aa ON aa.id = a.affiliate_account_id
WHERE sa.affiliate_account_id = aa.id
  AND sa.store_id = a.store_id
  AND sa.commission_enabled IS DISTINCT FROM a.commission_enabled;

-- Sincronizar dados pessoais (name, phone, pix_key) de affiliates para affiliate_accounts
-- Isso garante que os afiliados vejam os dados atualizados pelo lojista
UPDATE affiliate_accounts aa
SET 
  name = COALESCE(a.name, aa.name),
  phone = COALESCE(a.phone, aa.phone),
  pix_key = COALESCE(a.pix_key, aa.pix_key)
FROM affiliates a
WHERE aa.id = a.affiliate_account_id
  AND (
    aa.name IS DISTINCT FROM a.name OR
    aa.phone IS DISTINCT FROM a.phone OR
    aa.pix_key IS DISTINCT FROM a.pix_key
  );