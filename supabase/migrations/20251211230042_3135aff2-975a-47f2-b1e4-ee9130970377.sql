-- Tabela para registrar histórico de recálculos de comissão
CREATE TABLE IF NOT EXISTS affiliate_commission_recalc_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_number TEXT,
  earning_id_before UUID,
  earning_id_after UUID,
  affiliate_id UUID,
  store_affiliate_id UUID,
  affiliate_name TEXT,
  store_id UUID,
  
  -- Valores ANTES do recálculo
  order_total_before NUMERIC DEFAULT 0,
  coupon_discount_before NUMERIC DEFAULT 0,
  commission_amount_before NUMERIC DEFAULT 0,
  items_count_before INTEGER DEFAULT 0,
  
  -- Valores DEPOIS do recálculo
  order_total_after NUMERIC DEFAULT 0,
  coupon_discount_after NUMERIC DEFAULT 0,
  commission_amount_after NUMERIC DEFAULT 0,
  items_count_after INTEGER DEFAULT 0,
  
  -- Diferença calculada
  commission_difference NUMERIC GENERATED ALWAYS AS (
    COALESCE(commission_amount_after, 0) - COALESCE(commission_amount_before, 0)
  ) STORED,
  
  -- Metadados
  reason TEXT DEFAULT 'order_edit',
  recalculated_by UUID,
  recalculated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_recalc_log_order_id ON affiliate_commission_recalc_log(order_id);
CREATE INDEX IF NOT EXISTS idx_recalc_log_affiliate ON affiliate_commission_recalc_log(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_recalc_log_store ON affiliate_commission_recalc_log(store_id);
CREATE INDEX IF NOT EXISTS idx_recalc_log_date ON affiliate_commission_recalc_log(recalculated_at DESC);

-- Habilitar RLS
ALTER TABLE affiliate_commission_recalc_log ENABLE ROW LEVEL SECURITY;

-- Policy para donos de loja visualizarem logs
CREATE POLICY "Store owners can view recalc logs" ON affiliate_commission_recalc_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM stores s
      WHERE s.id = affiliate_commission_recalc_log.store_id
      AND (s.owner_id = auth.uid() OR public.is_store_employee(auth.uid(), s.id))
    )
    OR public.has_role(auth.uid(), 'admin')
  );

-- Policy para sistema inserir logs
CREATE POLICY "System can insert recalc logs" ON affiliate_commission_recalc_log
  FOR INSERT WITH CHECK (true);

-- Atualizar função de reprocessamento para registrar no log
CREATE OR REPLACE FUNCTION public.reprocess_affiliate_commission_for_order(p_order_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_earning_before RECORD;
  v_order RECORD;
  v_items_count_before INTEGER := 0;
  v_earning_after RECORD;
  v_items_count_after INTEGER := 0;
  v_affiliate_name TEXT;
BEGIN
  -- Capturar dados do pedido
  SELECT o.*, s.id as store_id 
  INTO v_order 
  FROM orders o
  JOIN stores s ON s.id = o.store_id
  WHERE o.id = p_order_id;
  
  IF v_order.id IS NULL THEN
    RAISE NOTICE '[REPROCESS] Pedido não encontrado: %', p_order_id;
    RETURN;
  END IF;

  -- Capturar estado ANTES do recálculo
  SELECT ae.*, a.name as affiliate_name
  INTO v_earning_before 
  FROM affiliate_earnings ae
  LEFT JOIN affiliates a ON a.id = ae.affiliate_id
  WHERE ae.order_id = p_order_id 
  LIMIT 1;
  
  IF v_earning_before.id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_items_count_before 
    FROM affiliate_item_earnings 
    WHERE earning_id = v_earning_before.id;
    
    v_affiliate_name := v_earning_before.affiliate_name;
    
    RAISE NOTICE '[REPROCESS] Estado ANTES: earning_id=%, comissão=R$%, itens=%', 
      v_earning_before.id, v_earning_before.commission_amount, v_items_count_before;
    
    -- Deletar item_earnings relacionados
    DELETE FROM affiliate_item_earnings 
    WHERE earning_id IN (SELECT id FROM affiliate_earnings WHERE order_id = p_order_id);
    
    -- Deletar earnings principais
    DELETE FROM affiliate_earnings WHERE order_id = p_order_id;
    
    RAISE NOTICE '[REPROCESS] Registros anteriores deletados';
  END IF;
  
  -- Reprocessar comissão do zero
  PERFORM process_affiliate_commission_for_order(p_order_id);
  
  -- Capturar estado DEPOIS do recálculo
  SELECT ae.*, a.name as affiliate_name
  INTO v_earning_after 
  FROM affiliate_earnings ae
  LEFT JOIN affiliates a ON a.id = ae.affiliate_id
  WHERE ae.order_id = p_order_id 
  LIMIT 1;
  
  IF v_earning_after.id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_items_count_after 
    FROM affiliate_item_earnings 
    WHERE earning_id = v_earning_after.id;
    
    IF v_affiliate_name IS NULL THEN
      v_affiliate_name := v_earning_after.affiliate_name;
    END IF;
    
    RAISE NOTICE '[REPROCESS] Estado DEPOIS: earning_id=%, comissão=R$%, itens=%', 
      v_earning_after.id, v_earning_after.commission_amount, v_items_count_after;
  END IF;
  
  -- Registrar no log de recálculos (apenas se houve earning antes ou depois)
  IF v_earning_before.id IS NOT NULL OR v_earning_after.id IS NOT NULL THEN
    INSERT INTO affiliate_commission_recalc_log (
      order_id,
      order_number,
      earning_id_before,
      earning_id_after,
      affiliate_id,
      store_affiliate_id,
      affiliate_name,
      store_id,
      order_total_before,
      coupon_discount_before,
      commission_amount_before,
      items_count_before,
      order_total_after,
      coupon_discount_after,
      commission_amount_after,
      items_count_after,
      reason
    ) VALUES (
      p_order_id,
      v_order.order_number,
      v_earning_before.id,
      v_earning_after.id,
      COALESCE(v_earning_after.affiliate_id, v_earning_before.affiliate_id),
      COALESCE(v_earning_after.store_affiliate_id, v_earning_before.store_affiliate_id),
      v_affiliate_name,
      v_order.store_id,
      COALESCE(v_earning_before.order_total, v_order.total),
      COALESCE(v_order.coupon_discount, 0),
      COALESCE(v_earning_before.commission_amount, 0),
      v_items_count_before,
      COALESCE(v_earning_after.order_total, v_order.total),
      COALESCE(v_order.coupon_discount, 0),
      COALESCE(v_earning_after.commission_amount, 0),
      v_items_count_after,
      'order_edit'
    );
    
    RAISE NOTICE '[REPROCESS] ✅ Log de auditoria registrado. Variação: R$% -> R$%',
      COALESCE(v_earning_before.commission_amount, 0),
      COALESCE(v_earning_after.commission_amount, 0);
  END IF;
END;
$function$;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION public.reprocess_affiliate_commission_for_order(UUID) TO authenticated, anon, service_role;