-- Corrigir inconsistências em affiliate_earnings.order_total
-- Atualizar para usar subtotal - coupon_discount (valor líquido do pedido)
UPDATE affiliate_earnings ae
SET order_total = o.subtotal - COALESCE(o.coupon_discount, 0)
FROM orders o
WHERE ae.order_id = o.id
AND ae.order_total != (o.subtotal - COALESCE(o.coupon_discount, 0));

-- Também garantir que order_total nunca seja negativo
UPDATE affiliate_earnings ae
SET order_total = 0
WHERE ae.order_total < 0;