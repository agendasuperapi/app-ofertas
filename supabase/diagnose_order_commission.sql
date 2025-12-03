-- Diagnóstico completo para pedido #88067369 e comissões faltantes
-- Execute cada seção separadamente para análise

-- =====================================================
-- 1. VERIFICAR O PEDIDO E SEU CUPOM
-- =====================================================
SELECT 
  o.id,
  o.order_number,
  o.coupon_code,
  o.subtotal,
  o.total,
  o.store_id,
  o.created_at
FROM orders o
WHERE o.order_number LIKE '%88067369%';

-- =====================================================
-- 2. VERIFICAR SE EXISTE COMISSÃO PARA O PEDIDO
-- =====================================================
SELECT ae.*
FROM affiliate_earnings ae
JOIN orders o ON o.id = ae.order_id
WHERE o.order_number LIKE '%88067369%';

-- =====================================================
-- 3. VERIFICAR CONFIGURAÇÃO DO AFILIADO (via store_affiliates)
-- =====================================================
SELECT 
  sa.id as store_affiliate_id,
  sa.store_id,
  sa.affiliate_account_id,
  aa.email,
  aa.name,
  sa.default_commission_type,
  sa.default_commission_value,
  sa.is_active,
  sa.status
FROM store_affiliates sa
JOIN affiliate_accounts aa ON aa.id = sa.affiliate_account_id
WHERE LOWER(aa.email) = 'luanateste04@gmail.com';

-- =====================================================
-- 4. VERIFICAR CONFIGURAÇÃO DO AFILIADO (via affiliates - legado)
-- =====================================================
SELECT 
  a.id,
  a.store_id,
  a.email,
  a.name,
  a.default_commission_type,
  a.default_commission_value,
  a.is_active,
  a.coupon_id
FROM affiliates a
WHERE LOWER(a.email) = 'luanateste04@gmail.com';

-- =====================================================
-- 5. VERIFICAR CUPOM LUANAOFF10
-- =====================================================
SELECT 
  c.id,
  c.code,
  c.store_id,
  c.discount_type,
  c.discount_value,
  c.is_active
FROM coupons c
WHERE UPPER(c.code) = 'LUANAOFF10';

-- =====================================================
-- 6. VERIFICAR VÍNCULO CUPOM -> AFILIADO (store_affiliate_coupons)
-- =====================================================
SELECT 
  sac.*,
  c.code,
  sa.default_commission_type,
  sa.default_commission_value,
  aa.email
FROM store_affiliate_coupons sac
JOIN coupons c ON c.id = sac.coupon_id
JOIN store_affiliates sa ON sa.id = sac.store_affiliate_id
JOIN affiliate_accounts aa ON aa.id = sa.affiliate_account_id
WHERE UPPER(c.code) = 'LUANAOFF10';

-- =====================================================
-- 7. VERIFICAR VÍNCULO CUPOM -> AFILIADO (affiliate_coupons - legado)
-- =====================================================
SELECT 
  ac.*,
  c.code,
  a.email,
  a.default_commission_type,
  a.default_commission_value
FROM affiliate_coupons ac
JOIN coupons c ON c.id = ac.coupon_id
JOIN affiliates a ON a.id = ac.affiliate_id
WHERE UPPER(c.code) = 'LUANAOFF10';

-- =====================================================
-- 8. VERIFICAR SE TRIGGERS EXISTEM
-- =====================================================
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'orders'
AND trigger_schema = 'public';

-- =====================================================
-- 9. LISTAR TODOS PEDIDOS SEM COMISSÃO QUE USARAM CUPOM
-- =====================================================
SELECT 
  o.id,
  o.order_number,
  o.coupon_code,
  o.subtotal,
  o.total,
  o.created_at,
  CASE WHEN ae.id IS NOT NULL THEN '✅ Tem comissão' ELSE '❌ SEM COMISSÃO' END as status
FROM orders o
LEFT JOIN affiliate_earnings ae ON ae.order_id = o.id
WHERE o.coupon_code IS NOT NULL
AND o.store_id = '6bc45f44-067a-4008-b6b5-767851233975'
ORDER BY o.created_at DESC
LIMIT 20;
