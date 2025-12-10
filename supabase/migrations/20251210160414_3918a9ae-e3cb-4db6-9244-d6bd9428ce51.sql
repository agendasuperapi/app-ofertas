
-- Sincronizar commission_maturity_days de affiliates para store_affiliates
-- para todos os registros onde os valores estão diferentes

UPDATE store_affiliates sa
SET commission_maturity_days = a.commission_maturity_days
FROM affiliates a
JOIN affiliate_accounts aa ON aa.id = a.affiliate_account_id
WHERE sa.affiliate_account_id = aa.id
  AND sa.store_id = a.store_id
  AND sa.commission_maturity_days IS DISTINCT FROM a.commission_maturity_days;

-- Também sincronizar outros campos de comissão que podem estar desincronizados
UPDATE store_affiliates sa
SET 
  default_commission_type = a.default_commission_type,
  default_commission_value = a.default_commission_value,
  use_default_commission = a.use_default_commission
FROM affiliates a
JOIN affiliate_accounts aa ON aa.id = a.affiliate_account_id
WHERE sa.affiliate_account_id = aa.id
  AND sa.store_id = a.store_id;
