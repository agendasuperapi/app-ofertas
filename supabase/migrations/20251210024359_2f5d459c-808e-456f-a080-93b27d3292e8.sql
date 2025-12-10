-- Sincronizar cupons de affiliate_coupons para store_affiliate_coupons
-- para afiliados existentes que ainda não têm cupons na nova tabela

-- Step 1: Sync coupons from affiliates and affiliate_coupons to store_affiliate_coupons
INSERT INTO store_affiliate_coupons (store_affiliate_id, coupon_id)
SELECT DISTINCT sa.id, ac.coupon_id
FROM store_affiliates sa
JOIN affiliate_accounts aa ON aa.id = sa.affiliate_account_id
JOIN affiliates a ON REGEXP_REPLACE(a.cpf_cnpj, '[^0-9]', '', 'g') = REGEXP_REPLACE(aa.cpf_cnpj, '[^0-9]', '', 'g')
  AND a.store_id = sa.store_id
JOIN affiliate_coupons ac ON ac.affiliate_id = a.id
WHERE NOT EXISTS (
  SELECT 1 FROM store_affiliate_coupons sac 
  WHERE sac.store_affiliate_id = sa.id AND sac.coupon_id = ac.coupon_id
);

-- Step 2: Sync legacy coupon_id from affiliates to store_affiliate_coupons
INSERT INTO store_affiliate_coupons (store_affiliate_id, coupon_id)
SELECT DISTINCT sa.id, a.coupon_id
FROM store_affiliates sa
JOIN affiliate_accounts aa ON aa.id = sa.affiliate_account_id
JOIN affiliates a ON REGEXP_REPLACE(a.cpf_cnpj, '[^0-9]', '', 'g') = REGEXP_REPLACE(aa.cpf_cnpj, '[^0-9]', '', 'g')
  AND a.store_id = sa.store_id
WHERE a.coupon_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM store_affiliate_coupons sac 
  WHERE sac.store_affiliate_id = sa.id AND sac.coupon_id = a.coupon_id
);

-- Step 3: Sync commission values from affiliates to store_affiliates
UPDATE store_affiliates sa
SET 
  default_commission_type = a.default_commission_type,
  default_commission_value = a.default_commission_value,
  use_default_commission = a.use_default_commission,
  commission_maturity_days = COALESCE(a.commission_maturity_days, 7),
  coupon_id = COALESCE(sa.coupon_id, a.coupon_id)
FROM affiliates a
JOIN affiliate_accounts aa ON REGEXP_REPLACE(a.cpf_cnpj, '[^0-9]', '', 'g') = REGEXP_REPLACE(aa.cpf_cnpj, '[^0-9]', '', 'g')
WHERE sa.affiliate_account_id = aa.id
  AND sa.store_id = a.store_id
  AND (
    sa.default_commission_value = 0 
    OR sa.default_commission_value IS NULL
    OR (a.default_commission_value > 0 AND sa.default_commission_value < a.default_commission_value)
  );