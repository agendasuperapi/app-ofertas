-- ============================================================================
-- SISTEMA DE VERIFICAÇÃO DE INTEGRIDADE DE DADOS - ADMIN
-- ============================================================================

-- Tabela para log de correções
CREATE TABLE IF NOT EXISTS public.data_integrity_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  store_name text,
  issue_type text NOT NULL,
  fixed_count integer DEFAULT 0,
  fixed_by uuid,
  fixed_by_name text,
  fixed_at timestamp with time zone DEFAULT now(),
  details jsonb
);

-- RLS para data_integrity_corrections
ALTER TABLE public.data_integrity_corrections ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ver e gerenciar correções
CREATE POLICY "Admins can manage data integrity corrections"
  ON public.data_integrity_corrections
  FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_data_integrity_corrections_store 
  ON public.data_integrity_corrections(store_id);
CREATE INDEX IF NOT EXISTS idx_data_integrity_corrections_fixed_at 
  ON public.data_integrity_corrections(fixed_at DESC);

-- ============================================================================
-- Função: check_all_stores_data_integrity
-- Verifica todas as lojas de uma vez e retorna inconsistências
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_all_stores_data_integrity()
RETURNS TABLE (
  store_id uuid,
  store_name text,
  issue_type text,
  issue_description text,
  affected_count integer,
  severity text,
  sample_data jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificação 1: order_total desincronizado entre affiliate_earnings e orders
  RETURN QUERY
  SELECT 
    s.id as store_id,
    s.name as store_name,
    'order_total_mismatch'::text as issue_type,
    'Valores de pedido desincronizados entre affiliate_earnings e orders'::text as issue_description,
    COUNT(*)::integer as affected_count,
    'error'::text as severity,
    jsonb_agg(jsonb_build_object(
      'order_id', ae.order_id, 
      'order_number', o.order_number,
      'earning_order_total', ae.order_total,
      'correct_order_total', o.subtotal - COALESCE(o.coupon_discount, 0)
    ) ORDER BY o.created_at DESC)::jsonb as sample_data
  FROM affiliate_earnings ae
  JOIN orders o ON o.id = ae.order_id
  JOIN stores s ON s.id = o.store_id
  WHERE ae.order_total != (o.subtotal - COALESCE(o.coupon_discount, 0))
  GROUP BY s.id, s.name
  HAVING COUNT(*) > 0;

  -- Verificação 2: commission_amount não bate com soma dos itens
  RETURN QUERY
  SELECT 
    s.id as store_id,
    s.name as store_name,
    'commission_items_mismatch'::text as issue_type,
    'Comissão total não corresponde à soma dos itens'::text as issue_description,
    COUNT(*)::integer as affected_count,
    'warning'::text as severity,
    jsonb_agg(jsonb_build_object(
      'earning_id', sub.earning_id,
      'order_number', sub.order_number,
      'earning_amount', sub.earning_amount,
      'items_sum', sub.items_sum
    ) ORDER BY sub.order_number DESC)::jsonb as sample_data
  FROM (
    SELECT 
      ae.id as earning_id,
      o.order_number,
      o.store_id,
      ae.commission_amount as earning_amount,
      COALESCE(SUM(aie.commission_amount), 0) as items_sum
    FROM affiliate_earnings ae
    JOIN orders o ON o.id = ae.order_id
    LEFT JOIN affiliate_item_earnings aie ON aie.earning_id = ae.id
    WHERE ae.commission_amount > 0
    GROUP BY ae.id, o.order_number, o.store_id, ae.commission_amount
    HAVING ABS(ae.commission_amount - COALESCE(SUM(aie.commission_amount), 0)) > 0.01
  ) sub
  JOIN stores s ON s.id = sub.store_id
  GROUP BY s.id, s.name
  HAVING COUNT(*) > 0;

  -- Verificação 3: Configurações desincronizadas entre store_affiliates e affiliates
  RETURN QUERY
  SELECT 
    s.id as store_id,
    s.name as store_name,
    'affiliate_config_desync'::text as issue_type,
    'Configurações de afiliado desincronizadas entre tabelas'::text as issue_description,
    COUNT(*)::integer as affected_count,
    'warning'::text as severity,
    jsonb_agg(jsonb_build_object(
      'affiliate_name', a.name,
      'affiliate_email', a.email,
      'affiliates_commission', a.default_commission_value,
      'affiliates_type', a.default_commission_type,
      'store_affiliates_commission', sa.default_commission_value,
      'store_affiliates_type', sa.default_commission_type
    ))::jsonb as sample_data
  FROM store_affiliates sa
  JOIN affiliates a ON a.affiliate_account_id = sa.affiliate_account_id AND a.store_id = sa.store_id
  JOIN stores s ON s.id = sa.store_id
  WHERE sa.default_commission_value != a.default_commission_value
     OR sa.default_commission_type != a.default_commission_type
  GROUP BY s.id, s.name
  HAVING COUNT(*) > 0;

  -- Verificação 4: Pedidos com cupom de afiliado ativo sem comissão registrada
  RETURN QUERY
  SELECT 
    s.id as store_id,
    s.name as store_name,
    'missing_commission'::text as issue_type,
    'Pedidos com cupom de afiliado sem comissão registrada'::text as issue_description,
    COUNT(*)::integer as affected_count,
    'error'::text as severity,
    jsonb_agg(jsonb_build_object(
      'order_id', o.id,
      'order_number', o.order_number,
      'coupon_code', o.coupon_code,
      'order_total', o.total,
      'created_at', o.created_at
    ) ORDER BY o.created_at DESC)::jsonb as sample_data
  FROM orders o
  JOIN stores s ON s.id = o.store_id
  WHERE o.coupon_code IS NOT NULL
  AND o.status::text NOT IN ('cancelado', 'cancelled')
  AND EXISTS (
    SELECT 1 FROM coupons c
    JOIN store_affiliate_coupons sac ON sac.coupon_id = c.id
    JOIN store_affiliates sa ON sa.id = sac.store_affiliate_id AND sa.is_active = true
    WHERE UPPER(c.code) = UPPER(o.coupon_code) 
    AND c.store_id = o.store_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM affiliate_earnings ae WHERE ae.order_id = o.id
  )
  GROUP BY s.id, s.name
  HAVING COUNT(*) > 0;

  -- Verificação 5: Comissões com valores negativos
  RETURN QUERY
  SELECT 
    s.id as store_id,
    s.name as store_name,
    'negative_values'::text as issue_type,
    'Comissões com valores negativos detectados'::text as issue_description,
    COUNT(*)::integer as affected_count,
    'error'::text as severity,
    jsonb_agg(jsonb_build_object(
      'earning_id', ae.id,
      'order_id', ae.order_id,
      'order_number', o.order_number,
      'commission_amount', ae.commission_amount,
      'order_total', ae.order_total
    ))::jsonb as sample_data
  FROM affiliate_earnings ae
  JOIN orders o ON o.id = ae.order_id
  JOIN stores s ON s.id = o.store_id
  WHERE ae.commission_amount < 0 OR ae.order_total < 0
  GROUP BY s.id, s.name
  HAVING COUNT(*) > 0;

END;
$$;

-- ============================================================================
-- Função: fix_store_data_integrity
-- Corrige automaticamente inconsistências específicas de uma loja
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fix_store_data_integrity(
  p_store_id uuid,
  p_issue_type text,
  p_fixed_by uuid DEFAULT NULL,
  p_fixed_by_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fixed_count integer := 0;
  v_store_name text;
  v_details jsonb := '[]'::jsonb;
BEGIN
  -- Obter nome da loja
  SELECT name INTO v_store_name FROM stores WHERE id = p_store_id;

  IF p_issue_type = 'order_total_mismatch' THEN
    -- Corrigir order_total em affiliate_earnings
    WITH fixed AS (
      UPDATE affiliate_earnings ae
      SET order_total = o.subtotal - COALESCE(o.coupon_discount, 0)
      FROM orders o
      WHERE ae.order_id = o.id
      AND o.store_id = p_store_id
      AND ae.order_total != (o.subtotal - COALESCE(o.coupon_discount, 0))
      RETURNING ae.id, ae.order_id
    )
    SELECT COUNT(*), jsonb_agg(jsonb_build_object('earning_id', id, 'order_id', order_id))
    INTO v_fixed_count, v_details
    FROM fixed;

  ELSIF p_issue_type = 'affiliate_config_desync' THEN
    -- Sincronizar store_affiliates com affiliates
    WITH fixed AS (
      UPDATE store_affiliates sa
      SET 
        default_commission_value = a.default_commission_value,
        default_commission_type = a.default_commission_type,
        use_default_commission = a.use_default_commission,
        commission_maturity_days = a.commission_maturity_days
      FROM affiliates a
      WHERE a.affiliate_account_id = sa.affiliate_account_id 
      AND a.store_id = sa.store_id
      AND sa.store_id = p_store_id
      AND (sa.default_commission_value != a.default_commission_value
           OR sa.default_commission_type != a.default_commission_type)
      RETURNING sa.id, a.name
    )
    SELECT COUNT(*), jsonb_agg(jsonb_build_object('store_affiliate_id', id, 'affiliate_name', name))
    INTO v_fixed_count, v_details
    FROM fixed;

  ELSIF p_issue_type = 'negative_values' THEN
    -- Corrigir valores negativos para zero
    WITH fixed AS (
      UPDATE affiliate_earnings ae
      SET 
        commission_amount = CASE WHEN ae.commission_amount < 0 THEN 0 ELSE ae.commission_amount END,
        order_total = CASE WHEN ae.order_total < 0 THEN 0 ELSE ae.order_total END
      FROM orders o
      WHERE ae.order_id = o.id
      AND o.store_id = p_store_id
      AND (ae.commission_amount < 0 OR ae.order_total < 0)
      RETURNING ae.id, ae.order_id
    )
    SELECT COUNT(*), jsonb_agg(jsonb_build_object('earning_id', id, 'order_id', order_id))
    INTO v_fixed_count, v_details
    FROM fixed;

  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Tipo de issue não suportado para correção automática: ' || p_issue_type,
      'fixed_count', 0
    );
  END IF;

  -- Registrar correção no log
  IF v_fixed_count > 0 THEN
    INSERT INTO data_integrity_corrections (
      store_id, store_name, issue_type, fixed_count, fixed_by, fixed_by_name, details
    ) VALUES (
      p_store_id, v_store_name, p_issue_type, v_fixed_count, p_fixed_by, p_fixed_by_name, v_details
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'fixed_count', v_fixed_count,
    'issue_type', p_issue_type,
    'store_name', v_store_name,
    'details', v_details
  );
END;
$$;

-- ============================================================================
-- Função: get_data_integrity_corrections_history
-- Retorna histórico de correções
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_data_integrity_corrections_history(
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  store_id uuid,
  store_name text,
  issue_type text,
  fixed_count integer,
  fixed_by_name text,
  fixed_at timestamp with time zone,
  details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dic.id,
    dic.store_id,
    dic.store_name,
    dic.issue_type,
    dic.fixed_count,
    dic.fixed_by_name,
    dic.fixed_at,
    dic.details
  FROM data_integrity_corrections dic
  ORDER BY dic.fixed_at DESC
  LIMIT p_limit;
END;
$$;

-- Comentários
COMMENT ON TABLE public.data_integrity_corrections IS 'Log de correções de integridade de dados realizadas pelo admin';
COMMENT ON FUNCTION public.check_all_stores_data_integrity() IS 'Verifica inconsistências de dados em todas as lojas';
COMMENT ON FUNCTION public.fix_store_data_integrity(uuid, text, uuid, text) IS 'Corrige automaticamente inconsistências específicas de uma loja';