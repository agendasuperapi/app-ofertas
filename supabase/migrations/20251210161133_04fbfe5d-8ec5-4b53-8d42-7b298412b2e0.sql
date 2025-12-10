-- Sincronizar is_active de affiliates para store_affiliates
-- para todos os registros onde os valores estão diferentes

UPDATE store_affiliates sa
SET is_active = a.is_active
FROM affiliates a
JOIN affiliate_accounts aa ON aa.id = a.affiliate_account_id
WHERE sa.affiliate_account_id = aa.id
  AND sa.store_id = a.store_id
  AND sa.is_active IS DISTINCT FROM a.is_active;