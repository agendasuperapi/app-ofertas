-- Tabela para rastrear ajustes de comissão (extrato detalhado)
CREATE TABLE IF NOT EXISTS public.affiliate_commission_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  earning_id UUID NOT NULL REFERENCES affiliate_earnings(id) ON DELETE CASCADE,
  store_affiliate_id UUID REFERENCES store_affiliates(id),
  adjustment_type TEXT NOT NULL, -- 'credit', 'debit', 'reversal'
  reason TEXT NOT NULL, -- 'order_delivered', 'order_cancelled', 'order_status_changed'
  amount NUMERIC NOT NULL,
  previous_order_status TEXT,
  new_order_status TEXT,
  order_id UUID REFERENCES orders(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_commission_adjustments_earning_id ON affiliate_commission_adjustments(earning_id);
CREATE INDEX IF NOT EXISTS idx_commission_adjustments_store_affiliate_id ON affiliate_commission_adjustments(store_affiliate_id);
CREATE INDEX IF NOT EXISTS idx_commission_adjustments_created_at ON affiliate_commission_adjustments(created_at DESC);

-- Habilitar RLS
ALTER TABLE affiliate_commission_adjustments ENABLE ROW LEVEL SECURITY;

-- Policy: Afiliados podem ver seus ajustes via store_affiliates
CREATE POLICY "Affiliates can view their commission adjustments"
  ON affiliate_commission_adjustments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM store_affiliates sa
      JOIN affiliate_accounts aa ON aa.id = sa.affiliate_account_id
      WHERE sa.id = affiliate_commission_adjustments.store_affiliate_id
    )
  );

-- Policy: Store owners podem ver ajustes de seus afiliados
CREATE POLICY "Store owners can view commission adjustments"
  ON affiliate_commission_adjustments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM affiliate_earnings ae
      JOIN affiliates a ON a.id = ae.affiliate_id
      JOIN stores s ON s.id = a.store_id
      WHERE ae.id = affiliate_commission_adjustments.earning_id
      AND (s.owner_id = auth.uid() OR has_role(auth.uid(), 'admin'))
    )
  );

-- Policy: Sistema pode gerenciar ajustes
CREATE POLICY "System can manage commission adjustments"
  ON affiliate_commission_adjustments
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Função trigger para processar mudanças de status
CREATE OR REPLACE FUNCTION handle_order_status_change_commission()
RETURNS TRIGGER AS $$
DECLARE
  v_earning RECORD;
  v_adjustment_type TEXT;
  v_adjustment_reason TEXT;
  v_old_status TEXT;
  v_new_status TEXT;
BEGIN
  -- Converter enum para text
  v_old_status := OLD.status::TEXT;
  v_new_status := NEW.status::TEXT;
  
  -- Só processar se o status realmente mudou
  IF v_old_status = v_new_status THEN
    RETURN NEW;
  END IF;
  
  -- Buscar earning deste pedido
  SELECT * INTO v_earning FROM affiliate_earnings WHERE order_id = NEW.id LIMIT 1;
  
  -- Se não existe earning, não fazer nada
  IF v_earning.id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Normalizar status para comparação (entregue/delivered)
  -- CASO 1: Pedido foi ENTREGUE (crédito)
  IF (v_new_status IN ('entregue', 'delivered')) AND (v_old_status NOT IN ('entregue', 'delivered')) THEN
    v_adjustment_type := 'credit';
    v_adjustment_reason := 'order_delivered';
    
  -- CASO 2: Pedido ERA entregue e foi CANCELADO (débito/estorno)
  ELSIF (v_old_status IN ('entregue', 'delivered')) AND (v_new_status IN ('cancelado', 'cancelled')) THEN
    v_adjustment_type := 'debit';
    v_adjustment_reason := 'order_cancelled';
    
  -- CASO 3: Pedido ERA entregue e mudou para OUTRO status (reversão para pendente)
  ELSIF (v_old_status IN ('entregue', 'delivered')) AND (v_new_status NOT IN ('entregue', 'delivered')) THEN
    v_adjustment_type := 'reversal';
    v_adjustment_reason := 'order_status_changed';
    
  ELSE
    -- Outras transições não afetam a comissão disponível
    RETURN NEW;
  END IF;
  
  -- Registrar ajuste no histórico
  INSERT INTO affiliate_commission_adjustments (
    earning_id, store_affiliate_id, adjustment_type, reason, amount,
    previous_order_status, new_order_status, order_id
  ) VALUES (
    v_earning.id, v_earning.store_affiliate_id, v_adjustment_type, v_adjustment_reason, v_earning.commission_amount,
    v_old_status, v_new_status, NEW.id
  );
  
  RAISE NOTICE '[COMMISSION ADJUSTMENT] % - Pedido % mudou de % para % | Valor: R$ %',
    v_adjustment_type, NEW.order_number, v_old_status, v_new_status, v_earning.commission_amount;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger na tabela orders
DROP TRIGGER IF EXISTS order_status_commission_trigger ON orders;
CREATE TRIGGER order_status_commission_trigger
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION handle_order_status_change_commission();

-- Comentários
COMMENT ON TABLE affiliate_commission_adjustments IS 'Rastreia todos os ajustes de comissão baseados em mudanças de status do pedido';
COMMENT ON COLUMN affiliate_commission_adjustments.adjustment_type IS 'Tipo: credit (entregue), debit (cancelado após entrega), reversal (voltou para processamento)';
COMMENT ON COLUMN affiliate_commission_adjustments.reason IS 'Motivo: order_delivered, order_cancelled, order_status_changed';