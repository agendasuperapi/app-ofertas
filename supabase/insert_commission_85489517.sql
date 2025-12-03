-- Script para inserir comissão do pedido #85489517
-- Execute este script diretamente no SQL Editor do Supabase

INSERT INTO affiliate_earnings (
  affiliate_id,
  store_affiliate_id,
  order_id,
  order_total,
  commission_amount,
  commission_type,
  commission_value,
  status
)
SELECT 
  COALESCE(aff.affiliate_id, sa_aff.affiliate_id) as affiliate_id,
  COALESCE(aff.store_affiliate_id, sa_aff.store_affiliate_id) as store_affiliate_id,
  o.id as order_id,
  o.total as order_total,
  CASE 
    WHEN COALESCE(aff.commission_type, sa_aff.commission_type, 'percentage') = 'percentage' 
    THEN (o.subtotal * COALESCE(aff.commission_value, sa_aff.commission_value, 0) / 100)
    ELSE COALESCE(aff.commission_value, sa_aff.commission_value, 0)
  END as commission_amount,
  COALESCE(aff.commission_type, sa_aff.commission_type, 'percentage') as commission_type,
  COALESCE(aff.commission_value, sa_aff.commission_value, 0) as commission_value,
  'pending' as status
FROM orders o
JOIN coupons c ON c.store_id = o.store_id AND LOWER(c.code) = LOWER(o.coupon_code)
-- Via affiliate_coupons ou affiliates.coupon_id
LEFT JOIN LATERAL (
  SELECT 
    a.id as affiliate_id,
    sa.id as store_affiliate_id,
    a.default_commission_type as commission_type,
    a.default_commission_value as commission_value
  FROM affiliates a
  LEFT JOIN affiliate_accounts aa ON LOWER(aa.email) = LOWER(a.email)
  LEFT JOIN store_affiliates sa ON sa.affiliate_account_id = aa.id AND sa.store_id = a.store_id
  WHERE a.is_active = true
  AND (
    a.coupon_id = c.id 
    OR EXISTS (SELECT 1 FROM affiliate_coupons ac WHERE ac.affiliate_id = a.id AND ac.coupon_id = c.id)
  )
  AND a.store_id = o.store_id
  LIMIT 1
) aff ON true
-- Via store_affiliate_coupons
LEFT JOIN LATERAL (
  SELECT 
    a.id as affiliate_id,
    sa.id as store_affiliate_id,
    sa.default_commission_type as commission_type,
    sa.default_commission_value as commission_value
  FROM store_affiliate_coupons sac
  JOIN store_affiliates sa ON sa.id = sac.store_affiliate_id AND sa.is_active = true
  LEFT JOIN affiliate_accounts aa ON aa.id = sa.affiliate_account_id
  LEFT JOIN affiliates a ON LOWER(a.email) = LOWER(aa.email) AND a.store_id = sa.store_id
  WHERE sac.coupon_id = c.id
  AND sa.store_id = o.store_id
  LIMIT 1
) sa_aff ON aff.affiliate_id IS NULL
WHERE o.order_number LIKE '%85489517%'
AND o.coupon_code IS NOT NULL
AND (aff.affiliate_id IS NOT NULL OR sa_aff.affiliate_id IS NOT NULL)
AND NOT EXISTS (
  SELECT 1 FROM affiliate_earnings ae WHERE ae.order_id = o.id
);

-- Verificar se foi inserido
SELECT 
  ae.*,
  o.order_number,
  a.name as affiliate_name,
  a.email as affiliate_email
FROM affiliate_earnings ae
JOIN orders o ON o.id = ae.order_id
LEFT JOIN affiliates a ON a.id = ae.affiliate_id
WHERE o.order_number LIKE '%85489517%';
