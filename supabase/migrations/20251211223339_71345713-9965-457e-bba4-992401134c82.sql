-- Função para reprocessar comissão de afiliado quando pedido é editado
-- Deleta a comissão existente e recalcula do zero
CREATE OR REPLACE FUNCTION reprocess_affiliate_commission_for_order(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Log início do reprocessamento
  RAISE NOTICE '[REPROCESS COMMISSION] Iniciando reprocessamento para order_id: %', p_order_id;
  
  -- 1. Deletar item_earnings relacionados
  DELETE FROM affiliate_item_earnings 
  WHERE earning_id IN (SELECT id FROM affiliate_earnings WHERE order_id = p_order_id);
  
  RAISE NOTICE '[REPROCESS COMMISSION] Item earnings deletados';
  
  -- 2. Deletar earnings principais
  DELETE FROM affiliate_earnings WHERE order_id = p_order_id;
  
  RAISE NOTICE '[REPROCESS COMMISSION] Earnings deletados, chamando process_affiliate_commission_for_order';
  
  -- 3. Reprocessar comissão do zero
  PERFORM process_affiliate_commission_for_order(p_order_id);
  
  RAISE NOTICE '[REPROCESS COMMISSION] Reprocessamento concluído para order_id: %', p_order_id;
END;
$function$;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION reprocess_affiliate_commission_for_order(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION reprocess_affiliate_commission_for_order(uuid) TO service_role;