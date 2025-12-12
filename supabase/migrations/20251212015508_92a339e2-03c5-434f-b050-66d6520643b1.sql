-- Drop and recreate fix_store_data_integrity function
DROP FUNCTION IF EXISTS fix_store_data_integrity(uuid, text, uuid, text);

-- Atualizar função check_all_stores_data_integrity para incluir verificação de regras de desconto de cupom
CREATE OR REPLACE FUNCTION check_all_stores_data_integrity()
RETURNS TABLE(
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
  -- Verificação 1: Totais de pedidos desincronizados
  RETURN QUERY
  SELECT 
    s.id as store_id,
    s.name as store_name,
    'order_total_mismatch'::text as issue_type,
    'Valores de pedido não correspondem à soma dos itens'::text as issue_description,
    COUNT(*)::integer as affected_count,
    'warning'::text as severity,
    jsonb_agg(jsonb_build_object(
      'order_number', o.order_number,
      'stored_total', o.total,
      'calculated_total', calc.calculated_total
    ))::jsonb as sample_data
  FROM orders o
  JOIN stores s ON s.id = o.store_id
  CROSS JOIN LATERAL (
    SELECT COALESCE(SUM(oi.subtotal), 0) + o.delivery_fee - COALESCE(o.coupon_discount, 0) as calculated_total
    FROM order_items oi WHERE oi.order_id = o.id AND oi.deleted_at IS NULL
  ) calc
  WHERE s.status = 'active'
    AND ABS(o.total - calc.calculated_total) > 0.01
  GROUP BY s.id, s.name
  HAVING COUNT(*) > 0;

  -- Verificação 2: Soma de comissões de itens não corresponde ao total
  RETURN QUERY
  SELECT 
    s.id as store_id,
    s.name as store_name,
    'commission_items_mismatch'::text as issue_type,
    'Soma de comissões por item não corresponde ao total'::text as issue_description,
    COUNT(*)::integer as affected_count,
    'warning'::text as severity,
    jsonb_agg(jsonb_build_object(
      'earning_id', ae.id,
      'stored_commission', ae.commission_amount,
      'items_sum', calc.items_sum
    ))::jsonb as sample_data
  FROM affiliate_earnings ae
  JOIN orders o ON o.id = ae.order_id
  JOIN stores s ON s.id = o.store_id
  CROSS JOIN LATERAL (
    SELECT COALESCE(SUM(aie.commission_amount), 0) as items_sum
    FROM affiliate_item_earnings aie WHERE aie.earning_id = ae.id
  ) calc
  WHERE s.status = 'active'
    AND ABS(ae.commission_amount - calc.items_sum) > 0.01
  GROUP BY s.id, s.name
  HAVING COUNT(*) > 0;

  -- Verificação 3: Configurações de afiliado desincronizadas entre tabelas
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
      'affiliates_maturity', a.commission_maturity_days,
      'store_affiliates_maturity', sa.commission_maturity_days
    ))::jsonb as sample_data
  FROM affiliates a
  JOIN store_affiliates sa ON sa.affiliate_id = a.id AND sa.store_id = a.store_id
  JOIN stores s ON s.id = a.store_id
  WHERE s.status = 'active'
    AND (
      a.commission_maturity_days IS DISTINCT FROM sa.commission_maturity_days
      OR a.default_commission_type IS DISTINCT FROM sa.default_commission_type
      OR a.default_commission_value IS DISTINCT FROM sa.default_commission_value
      OR a.use_default_commission IS DISTINCT FROM sa.use_default_commission
    )
  GROUP BY s.id, s.name
  HAVING COUNT(*) > 0;

  -- Verificação 4: Pedidos com cupom mas sem comissão registrada
  RETURN QUERY
  SELECT 
    s.id as store_id,
    s.name as store_name,
    'missing_commission'::text as issue_type,
    'Pedidos com cupom de afiliado mas sem comissão registrada'::text as issue_description,
    COUNT(*)::integer as affected_count,
    'error'::text as severity,
    jsonb_agg(jsonb_build_object(
      'order_number', o.order_number,
      'coupon_code', o.coupon_code,
      'order_total', o.total
    ))::jsonb as sample_data
  FROM orders o
  JOIN stores s ON s.id = o.store_id
  JOIN coupons c ON UPPER(c.code) = UPPER(o.coupon_code) AND c.store_id = o.store_id
  LEFT JOIN affiliate_earnings ae ON ae.order_id = o.id
  WHERE s.status = 'active'
    AND o.coupon_code IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM store_affiliate_coupons sac 
      WHERE sac.coupon_id = c.id
    )
    AND ae.id IS NULL
  GROUP BY s.id, s.name
  HAVING COUNT(*) > 0;

  -- Verificação 5: Valores negativos em comissões
  RETURN QUERY
  SELECT 
    s.id as store_id,
    s.name as store_name,
    'negative_values'::text as issue_type,
    'Valores negativos detectados em comissões'::text as issue_description,
    COUNT(*)::integer as affected_count,
    'error'::text as severity,
    jsonb_agg(jsonb_build_object(
      'earning_id', ae.id,
      'commission_amount', ae.commission_amount
    ))::jsonb as sample_data
  FROM affiliate_earnings ae
  JOIN orders o ON o.id = ae.order_id
  JOIN stores s ON s.id = o.store_id
  WHERE s.status = 'active'
    AND ae.commission_amount < 0
  GROUP BY s.id, s.name
  HAVING COUNT(*) > 0;

  -- Verificação 6: Descontos de item não correspondem às regras do cupom
  RETURN QUERY
  WITH item_discount_check AS (
    SELECT 
      aie.id as item_earning_id,
      aie.product_name,
      aie.product_category,
      aie.item_subtotal,
      aie.item_discount as calculated_discount,
      aie.product_id,
      o.order_number,
      o.store_id,
      c.id as coupon_id,
      c.discount_type as default_discount_type,
      c.discount_value as default_discount_value,
      (SELECT jsonb_build_object('type', cdr.discount_type, 'value', cdr.discount_value)
       FROM coupon_discount_rules cdr 
       WHERE cdr.coupon_id = c.id 
       AND cdr.rule_type = 'product' 
       AND cdr.product_id = aie.product_id
       LIMIT 1) as product_rule,
      (SELECT jsonb_build_object('type', cdr.discount_type, 'value', cdr.discount_value)
       FROM coupon_discount_rules cdr 
       WHERE cdr.coupon_id = c.id 
       AND cdr.rule_type = 'category' 
       AND LOWER(cdr.category_name) = LOWER(aie.product_category)
       LIMIT 1) as category_rule
    FROM affiliate_item_earnings aie
    JOIN affiliate_earnings ae ON ae.id = aie.earning_id
    JOIN orders o ON o.id = ae.order_id
    JOIN coupons c ON UPPER(c.code) = UPPER(o.coupon_code) AND c.store_id = o.store_id
    WHERE o.coupon_code IS NOT NULL
      AND aie.is_coupon_eligible = true
      AND aie.item_discount > 0
  )
  SELECT 
    s.id as store_id,
    s.name as store_name,
    'coupon_discount_rules_mismatch'::text as issue_type,
    'Descontos de item não correspondem às regras do cupom'::text as issue_description,
    COUNT(*)::integer as affected_count,
    'warning'::text as severity,
    jsonb_agg(jsonb_build_object(
      'order_number', idc.order_number,
      'product_name', idc.product_name,
      'item_subtotal', idc.item_subtotal,
      'calculated_discount', idc.calculated_discount,
      'expected_discount', CASE
        WHEN idc.product_rule IS NOT NULL THEN 
          CASE WHEN (idc.product_rule->>'type') = 'percentage' 
            THEN ROUND(idc.item_subtotal * ((idc.product_rule->>'value')::numeric / 100), 2)
            ELSE LEAST((idc.product_rule->>'value')::numeric, idc.item_subtotal)
          END
        WHEN idc.category_rule IS NOT NULL THEN 
          CASE WHEN (idc.category_rule->>'type') = 'percentage' 
            THEN ROUND(idc.item_subtotal * ((idc.category_rule->>'value')::numeric / 100), 2)
            ELSE LEAST((idc.category_rule->>'value')::numeric, idc.item_subtotal)
          END
        ELSE 
          CASE WHEN idc.default_discount_type = 'percentage' 
            THEN ROUND(idc.item_subtotal * (idc.default_discount_value / 100), 2)
            ELSE LEAST(idc.default_discount_value, idc.item_subtotal)
          END
      END,
      'rule_type', CASE
        WHEN idc.product_rule IS NOT NULL THEN 'product'
        WHEN idc.category_rule IS NOT NULL THEN 'category'
        ELSE 'default'
      END
    ))::jsonb as sample_data
  FROM item_discount_check idc
  JOIN stores s ON s.id = idc.store_id
  WHERE s.status = 'active'
    AND ABS(idc.calculated_discount - (
      CASE
        WHEN idc.product_rule IS NOT NULL THEN 
          CASE WHEN (idc.product_rule->>'type') = 'percentage' 
            THEN idc.item_subtotal * ((idc.product_rule->>'value')::numeric / 100)
            ELSE LEAST((idc.product_rule->>'value')::numeric, idc.item_subtotal)
          END
        WHEN idc.category_rule IS NOT NULL THEN 
          CASE WHEN (idc.category_rule->>'type') = 'percentage' 
            THEN idc.item_subtotal * ((idc.category_rule->>'value')::numeric / 100)
            ELSE LEAST((idc.category_rule->>'value')::numeric, idc.item_subtotal)
          END
        ELSE 
          CASE WHEN idc.default_discount_type = 'percentage' 
            THEN idc.item_subtotal * (idc.default_discount_value / 100)
            ELSE LEAST(idc.default_discount_value, idc.item_subtotal)
          END
      END
    )) > 0.01
  GROUP BY s.id, s.name
  HAVING COUNT(*) > 0;
END;
$$;

-- Criar função fix_store_data_integrity com suporte a coupon_discount_rules_mismatch
CREATE FUNCTION fix_store_data_integrity(
  p_store_id uuid,
  p_issue_type text,
  p_fixed_by uuid,
  p_fixed_by_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fixed_count integer := 0;
  v_store_name text;
  v_order record;
BEGIN
  SELECT name INTO v_store_name FROM stores WHERE id = p_store_id;
  
  IF v_store_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Loja não encontrada');
  END IF;

  IF p_issue_type = 'order_total_mismatch' THEN
    WITH updated_orders AS (
      UPDATE orders o
      SET total = (
        SELECT COALESCE(SUM(oi.subtotal), 0) + o.delivery_fee - COALESCE(o.coupon_discount, 0)
        FROM order_items oi WHERE oi.order_id = o.id AND oi.deleted_at IS NULL
      ),
      updated_at = now()
      WHERE o.store_id = p_store_id
        AND ABS(o.total - (
          SELECT COALESCE(SUM(oi.subtotal), 0) + o.delivery_fee - COALESCE(o.coupon_discount, 0)
          FROM order_items oi WHERE oi.order_id = o.id AND oi.deleted_at IS NULL
        )) > 0.01
      RETURNING id
    )
    SELECT COUNT(*) INTO v_fixed_count FROM updated_orders;

  ELSIF p_issue_type = 'affiliate_config_desync' THEN
    WITH synced AS (
      UPDATE store_affiliates sa
      SET 
        commission_maturity_days = a.commission_maturity_days,
        default_commission_type = a.default_commission_type,
        default_commission_value = a.default_commission_value,
        use_default_commission = a.use_default_commission,
        updated_at = now()
      FROM affiliates a
      WHERE sa.affiliate_id = a.id
        AND sa.store_id = a.store_id
        AND a.store_id = p_store_id
        AND (
          a.commission_maturity_days IS DISTINCT FROM sa.commission_maturity_days
          OR a.default_commission_type IS DISTINCT FROM sa.default_commission_type
          OR a.default_commission_value IS DISTINCT FROM sa.default_commission_value
          OR a.use_default_commission IS DISTINCT FROM sa.use_default_commission
        )
      RETURNING sa.id
    )
    SELECT COUNT(*) INTO v_fixed_count FROM synced;

  ELSIF p_issue_type = 'negative_values' THEN
    WITH fixed AS (
      UPDATE affiliate_earnings ae
      SET commission_amount = 0
      FROM orders o
      WHERE ae.order_id = o.id
        AND o.store_id = p_store_id
        AND ae.commission_amount < 0
      RETURNING ae.id
    )
    SELECT COUNT(*) INTO v_fixed_count FROM fixed;

  ELSIF p_issue_type = 'coupon_discount_rules_mismatch' THEN
    -- Contar e reprocessar pedidos afetados
    FOR v_order IN 
      SELECT DISTINCT ae.order_id
      FROM affiliate_item_earnings aie
      JOIN affiliate_earnings ae ON ae.id = aie.earning_id
      JOIN orders o ON o.id = ae.order_id
      JOIN coupons c ON UPPER(c.code) = UPPER(o.coupon_code) AND c.store_id = o.store_id
      WHERE o.store_id = p_store_id
        AND o.coupon_code IS NOT NULL
        AND aie.is_coupon_eligible = true
        AND aie.item_discount > 0
        AND ABS(aie.item_discount - (
          CASE
            WHEN EXISTS (
              SELECT 1 FROM coupon_discount_rules cdr 
              WHERE cdr.coupon_id = c.id AND cdr.rule_type = 'product' AND cdr.product_id = aie.product_id
            ) THEN (
              SELECT CASE WHEN cdr.discount_type = 'percentage' 
                THEN aie.item_subtotal * (cdr.discount_value / 100)
                ELSE LEAST(cdr.discount_value, aie.item_subtotal)
              END
              FROM coupon_discount_rules cdr 
              WHERE cdr.coupon_id = c.id AND cdr.rule_type = 'product' AND cdr.product_id = aie.product_id
              LIMIT 1
            )
            WHEN EXISTS (
              SELECT 1 FROM coupon_discount_rules cdr 
              WHERE cdr.coupon_id = c.id AND cdr.rule_type = 'category' AND LOWER(cdr.category_name) = LOWER(aie.product_category)
            ) THEN (
              SELECT CASE WHEN cdr.discount_type = 'percentage' 
                THEN aie.item_subtotal * (cdr.discount_value / 100)
                ELSE LEAST(cdr.discount_value, aie.item_subtotal)
              END
              FROM coupon_discount_rules cdr 
              WHERE cdr.coupon_id = c.id AND cdr.rule_type = 'category' AND LOWER(cdr.category_name) = LOWER(aie.product_category)
              LIMIT 1
            )
            ELSE CASE WHEN c.discount_type = 'percentage' 
              THEN aie.item_subtotal * (c.discount_value / 100)
              ELSE LEAST(c.discount_value, aie.item_subtotal)
            END
          END
        )) > 0.01
    LOOP
      PERFORM reprocess_affiliate_commission_for_order(v_order.order_id);
      v_fixed_count := v_fixed_count + 1;
    END LOOP;

  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Tipo de problema não suportado para correção automática');
  END IF;

  IF v_fixed_count > 0 THEN
    INSERT INTO data_integrity_corrections (
      store_id, store_name, issue_type, fixed_count, fixed_by, fixed_by_name, details
    ) VALUES (
      p_store_id, v_store_name, p_issue_type, v_fixed_count, p_fixed_by, p_fixed_by_name, 
      jsonb_build_object('fixed_at', now())
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'fixed_count', v_fixed_count,
    'store_name', v_store_name,
    'issue_type', p_issue_type
  );
END;
$$;

GRANT EXECUTE ON FUNCTION check_all_stores_data_integrity() TO authenticated;
GRANT EXECUTE ON FUNCTION fix_store_data_integrity(uuid, text, uuid, text) TO authenticated;