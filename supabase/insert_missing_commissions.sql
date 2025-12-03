-- Script para inserir comissões faltantes para pedidos específicos
-- Pedidos: #73621315, #73535988, #88067369

-- =====================================================
-- PASSO 1: Verificar pedidos e se têm comissão
-- =====================================================
SELECT 
  o.id,
  o.order_number,
  o.coupon_code,
  o.subtotal,
  o.total,
  o.created_at,
  CASE WHEN ae.id IS NOT NULL THEN '✅ Tem' ELSE '❌ Não tem' END as comissao
FROM orders o
LEFT JOIN affiliate_earnings ae ON ae.order_id = o.id
WHERE o.order_number LIKE '%73621315%'
   OR o.order_number LIKE '%73535988%'
   OR o.order_number LIKE '%88067369%';

-- =====================================================
-- PASSO 2: Buscar dados do afiliado para os cupons usados
-- =====================================================
WITH pedidos_sem_comissao AS (
  SELECT 
    o.id as order_id,
    o.order_number,
    o.coupon_code,
    o.subtotal,
    o.total,
    o.store_id
  FROM orders o
  LEFT JOIN affiliate_earnings ae ON ae.order_id = o.id
  WHERE (o.order_number LIKE '%73621315%'
     OR o.order_number LIKE '%73535988%'
     OR o.order_number LIKE '%88067369%')
  AND ae.id IS NULL
  AND o.coupon_code IS NOT NULL
)
SELECT 
  p.*,
  c.id as coupon_id,
  c.code,
  COALESCE(sa.id, NULL) as store_affiliate_id,
  COALESCE(a.id, a2.id) as affiliate_id,
  COALESCE(sa.default_commission_type, a.default_commission_type, a2.default_commission_type, 'percentage') as commission_type,
  COALESCE(sa.default_commission_value, a.default_commission_value, a2.default_commission_value, 10) as commission_value,
  COALESCE(aa.email, a.email, a2.email) as affiliate_email
FROM pedidos_sem_comissao p
JOIN coupons c ON UPPER(c.code) = UPPER(p.coupon_code) AND c.store_id = p.store_id
-- Via store_affiliate_coupons (novo)
LEFT JOIN store_affiliate_coupons sac ON sac.coupon_id = c.id
LEFT JOIN store_affiliates sa ON sa.id = sac.store_affiliate_id AND sa.is_active = true
LEFT JOIN affiliate_accounts aa ON aa.id = sa.affiliate_account_id
-- Via affiliate_coupons (legado)
LEFT JOIN affiliate_coupons ac ON ac.coupon_id = c.id
LEFT JOIN affiliates a ON a.id = ac.affiliate_id AND a.store_id = p.store_id AND a.is_active = true
-- Via affiliates.coupon_id (legado alternativo)
LEFT JOIN affiliates a2 ON a2.coupon_id = c.id AND a2.store_id = p.store_id AND a2.is_active = true;

-- =====================================================
-- PASSO 3: INSERIR COMISSÕES FALTANTES
-- =====================================================
INSERT INTO affiliate_earnings (
  affiliate_id,
  store_affiliate_id,
  order_id,
  order_total,
  commission_type,
  commission_value,
  commission_amount,
  status
)
SELECT 
  COALESCE(a.id, a2.id, a3.id) as affiliate_id,
  sa.id as store_affiliate_id,
  o.id as order_id,
  o.total as order_total,
  COALESCE(sa.default_commission_type, a.default_commission_type, a2.default_commission_type, a3.default_commission_type, 'percentage') as commission_type,
  COALESCE(sa.default_commission_value, a.default_commission_value, a2.default_commission_value, a3.default_commission_value, 10) as commission_value,
  -- Calcular comissão (usando 10% como fallback se valor = 0)
  CASE 
    WHEN COALESCE(sa.default_commission_type, a.default_commission_type, a2.default_commission_type, a3.default_commission_type, 'percentage') = 'percentage' 
    THEN ROUND(
      (o.subtotal * GREATEST(COALESCE(sa.default_commission_value, a.default_commission_value, a2.default_commission_value, a3.default_commission_value, 10), 10)) / 100, 
      2
    )
    ELSE GREATEST(COALESCE(sa.default_commission_value, a.default_commission_value, a2.default_commission_value, a3.default_commission_value, 10), 10)
  END as commission_amount,
  'pending' as status
FROM orders o
JOIN coupons c ON UPPER(c.code) = UPPER(o.coupon_code) AND c.store_id = o.store_id
-- Via store_affiliate_coupons (novo)
LEFT JOIN store_affiliate_coupons sac ON sac.coupon_id = c.id
LEFT JOIN store_affiliates sa ON sa.id = sac.store_affiliate_id AND sa.is_active = true
LEFT JOIN affiliate_accounts aa ON aa.id = sa.affiliate_account_id
-- Buscar affiliate_id pelo email do affiliate_account
LEFT JOIN affiliates a ON LOWER(a.email) = LOWER(aa.email) AND a.store_id = o.store_id
-- Via affiliate_coupons (legado)
LEFT JOIN affiliate_coupons ac ON ac.coupon_id = c.id AND sac.id IS NULL
LEFT JOIN affiliates a2 ON a2.id = ac.affiliate_id AND a2.store_id = o.store_id AND a2.is_active = true
-- Via affiliates.coupon_id (legado alternativo)
LEFT JOIN affiliates a3 ON a3.coupon_id = c.id AND a3.store_id = o.store_id AND a3.is_active = true AND sac.id IS NULL AND ac.id IS NULL
WHERE (o.order_number LIKE '%73621315%'
   OR o.order_number LIKE '%73535988%'
   OR o.order_number LIKE '%88067369%')
AND o.coupon_code IS NOT NULL
-- Não inserir se já existe
AND NOT EXISTS (SELECT 1 FROM affiliate_earnings ae WHERE ae.order_id = o.id)
-- Garantir que encontrou afiliado
AND (sa.id IS NOT NULL OR a.id IS NOT NULL OR a2.id IS NOT NULL OR a3.id IS NOT NULL);

-- =====================================================
-- PASSO 4: Verificar resultado
-- =====================================================
SELECT 
  ae.id,
  o.order_number,
  o.coupon_code,
  ae.commission_type,
  ae.commission_value,
  ae.commission_amount,
  ae.status,
  COALESCE(a.email, aa.email) as affiliate_email
FROM affiliate_earnings ae
JOIN orders o ON o.id = ae.order_id
LEFT JOIN affiliates a ON a.id = ae.affiliate_id
LEFT JOIN store_affiliates sa ON sa.id = ae.store_affiliate_id
LEFT JOIN affiliate_accounts aa ON aa.id = sa.affiliate_account_id
WHERE o.order_number LIKE '%73621315%'
   OR o.order_number LIKE '%73535988%'
   OR o.order_number LIKE '%88067369%';
