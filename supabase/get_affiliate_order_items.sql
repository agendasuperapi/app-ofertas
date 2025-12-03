-- Função para buscar itens de um pedido com detalhes de comissão do afiliado
-- Suporta tanto sistema novo (store_affiliate_id) quanto legado (affiliate_id via affiliate_earnings)
-- CORRIGIDO: Usa orders.subtotal para distribuição proporcional (antes do desconto)
CREATE OR REPLACE FUNCTION public.get_affiliate_order_items(
  p_order_id UUID,
  p_store_affiliate_id UUID DEFAULT NULL
)
RETURNS TABLE (
  item_id UUID,
  product_id UUID,
  product_name TEXT,
  product_category TEXT,
  quantity INT,
  unit_price NUMERIC,
  subtotal NUMERIC,
  commission_type TEXT,
  commission_source TEXT,
  commission_value NUMERIC,
  item_commission NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_commission_type TEXT;
  v_commission_value NUMERIC;
  v_total_commission NUMERIC;
  v_order_subtotal NUMERIC;
BEGIN
  -- Buscar subtotal do pedido da tabela orders (antes do desconto e sem taxa de entrega)
  SELECT o.subtotal INTO v_order_subtotal
  FROM orders o
  WHERE o.id = p_order_id;

  -- Buscar comissão do momento do pedido
  -- Primeiro tenta pelo store_affiliate_id (sistema novo)
  -- Se não encontrar e store_affiliate_id for NULL, busca pelo order_id apenas
  IF p_store_affiliate_id IS NOT NULL THEN
    SELECT 
      ae.commission_type,
      ae.commission_value,
      ae.commission_amount
    INTO v_commission_type, v_commission_value, v_total_commission
    FROM affiliate_earnings ae
    WHERE ae.order_id = p_order_id
    AND ae.store_affiliate_id = p_store_affiliate_id;
  ELSE
    -- Buscar pelo order_id onde store_affiliate_id é NULL (sistema legado)
    SELECT 
      ae.commission_type,
      ae.commission_value,
      ae.commission_amount
    INTO v_commission_type, v_commission_value, v_total_commission
    FROM affiliate_earnings ae
    WHERE ae.order_id = p_order_id
    AND ae.store_affiliate_id IS NULL
    LIMIT 1;
  END IF;

  -- Se não encontrou earning, usar valores padrão
  IF v_commission_type IS NULL THEN
    v_commission_type := 'percentage';
    v_commission_value := 0;
    v_total_commission := 0;
  END IF;

  -- Se não encontrou subtotal, usar 0
  IF v_order_subtotal IS NULL OR v_order_subtotal = 0 THEN
    v_order_subtotal := 1; -- Evitar divisão por zero
  END IF;

  RETURN QUERY
  SELECT 
    oi.id as item_id,
    oi.product_id,
    oi.product_name::TEXT,
    COALESCE(p.category, 'Sem categoria')::TEXT as product_category,
    oi.quantity::INT,
    oi.unit_price,
    oi.subtotal,
    v_commission_type::TEXT as commission_type,
    'pedido'::TEXT as commission_source,
    v_commission_value as commission_value,
    -- Distribuir a comissão total proporcionalmente ao subtotal do item
    -- Usa orders.subtotal (antes do desconto) para cálculo correto
    CASE 
      WHEN v_order_subtotal > 0 THEN 
        ROUND((oi.subtotal / v_order_subtotal) * v_total_commission, 2)
      ELSE 
        0
    END as item_commission
  FROM order_items oi
  LEFT JOIN products p ON p.id = oi.product_id
  WHERE oi.order_id = p_order_id
  AND oi.deleted_at IS NULL
  ORDER BY oi.created_at;
END;
$$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION public.get_affiliate_order_items(UUID, UUID) TO anon, authenticated, service_role;
