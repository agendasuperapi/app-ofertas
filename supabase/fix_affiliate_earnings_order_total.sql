-- Script para corrigir order_total em affiliate_earnings
-- Atualiza registros existentes para usar orders.subtotal ao invés do total com desconto

-- Atualizar order_total dos registros existentes para usar o subtotal do pedido
UPDATE affiliate_earnings ae
SET order_total = o.subtotal
FROM orders o
WHERE ae.order_id = o.id
AND ae.order_total != o.subtotal;

-- Verificar quantos registros foram atualizados
-- SELECT COUNT(*) as registros_corrigidos 
-- FROM affiliate_earnings ae
-- JOIN orders o ON o.id = ae.order_id
-- WHERE ae.order_total = o.subtotal;
