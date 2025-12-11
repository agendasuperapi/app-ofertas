-- Adicionar colunas para nome e email do editor
ALTER TABLE affiliate_commission_recalc_log 
ADD COLUMN IF NOT EXISTS editor_name TEXT,
ADD COLUMN IF NOT EXISTS editor_email TEXT;

-- Atualizar função para aceitar e salvar dados do editor
CREATE OR REPLACE FUNCTION reprocess_affiliate_commission_for_order(
  p_order_id UUID,
  p_editor_id UUID DEFAULT NULL,
  p_editor_name TEXT DEFAULT NULL,
  p_editor_email TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_order RECORD;
  v_coupon RECORD;
  v_store_affiliate RECORD;
  v_commission_type TEXT;
  v_commission_value NUMERIC;
  v_use_default_commission BOOLEAN := true;
  v_total_commission NUMERIC := 0;
  v_store_affiliate_id UUID;
  v_affiliate_id UUID;
  v_earning_id UUID;
  v_item RECORD;
  v_product RECORD;
  v_is_eligible BOOLEAN;
  v_item_discount NUMERIC;
  v_item_value_with_discount NUMERIC;
  v_item_commission NUMERIC;
  v_eligible_subtotal NUMERIC := 0;
  v_coupon_scope TEXT;
  v_category_names TEXT[];
  v_product_ids UUID[];
  v_specific_rule RECORD;
  v_item_commission_type TEXT;
  v_item_commission_value NUMERIC;
  v_commission_source TEXT;
  v_total_items INT := 0;
  v_items_with_specific_rule INT := 0;
  v_items_with_default INT := 0;
  v_items_without_commission INT := 0;
  -- Variáveis para log de auditoria
  v_old_earning RECORD;
  v_old_items_count INT := 0;
  v_old_commission_amount NUMERIC := 0;
  v_old_order_total NUMERIC := 0;
  v_old_coupon_discount NUMERIC := 0;
  v_old_earning_id UUID := NULL;
BEGIN
  -- LOCK para evitar processamento duplicado concorrente
  PERFORM pg_advisory_xact_lock(hashtext('reprocess_commission_' || p_order_id::text));

  -- Buscar dados do pedido
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  
  IF v_order.id IS NULL THEN
    RAISE NOTICE '[REPROCESS] ❌ Pedido não encontrado: %', p_order_id;
    RETURN;
  END IF;

  -- Só processar se tiver cupom
  IF v_order.coupon_code IS NULL OR v_order.coupon_code = '' THEN
    RAISE NOTICE '[REPROCESS] ℹ️ Pedido % sem cupom - ignorando', v_order.order_number;
    RETURN;
  END IF;

  RAISE NOTICE '[REPROCESS] 🔄 Reprocessando comissão para pedido % com cupom %', 
    v_order.order_number, v_order.coupon_code;

  -- Buscar earning existente para log de auditoria
  SELECT * INTO v_old_earning 
  FROM affiliate_earnings 
  WHERE order_id = p_order_id 
  LIMIT 1;

  IF v_old_earning.id IS NOT NULL THEN
    v_old_earning_id := v_old_earning.id;
    v_old_commission_amount := COALESCE(v_old_earning.commission_amount, 0);
    v_old_order_total := COALESCE(v_old_earning.order_total, 0);
    
    -- Contar itens antigos
    SELECT COUNT(*) INTO v_old_items_count 
    FROM affiliate_item_earnings 
    WHERE earning_id = v_old_earning.id;
    
    -- Buscar desconto do cupom antigo (do pedido)
    v_old_coupon_discount := COALESCE(v_order.coupon_discount, 0);
  END IF;

  -- Deletar earnings e item_earnings existentes
  DELETE FROM affiliate_item_earnings 
  WHERE earning_id IN (SELECT id FROM affiliate_earnings WHERE order_id = p_order_id);
  
  DELETE FROM affiliate_earnings WHERE order_id = p_order_id;
  
  RAISE NOTICE '[REPROCESS] 🗑️ Registros anteriores deletados';

  -- Verificar se existem itens no pedido
  IF NOT EXISTS (SELECT 1 FROM order_items WHERE order_id = p_order_id AND deleted_at IS NULL) THEN
    RAISE NOTICE '[REPROCESS] ⚠️ Pedido % sem itens ativos', v_order.order_number;
    RETURN;
  END IF;

  -- Buscar o cupom COM escopo
  SELECT id, code, discount_type, discount_value, applies_to, category_names, product_ids
  INTO v_coupon
  FROM coupons 
  WHERE store_id = v_order.store_id 
  AND UPPER(code) = UPPER(v_order.coupon_code)
  LIMIT 1;

  IF v_coupon.id IS NULL THEN
    RAISE NOTICE '[REPROCESS] ❌ Cupom não encontrado: %', v_order.coupon_code;
    RETURN;
  END IF;

  v_coupon_scope := COALESCE(v_coupon.applies_to, 'all');
  v_category_names := COALESCE(v_coupon.category_names, '{}');
  v_product_ids := COALESCE(v_coupon.product_ids, '{}');

  -- ========== BUSCA DO AFILIADO (USANDO APENAS store_affiliate_coupons) ==========
  
  SELECT 
    sa.id as store_affiliate_id,
    sa.default_commission_type,
    sa.default_commission_value,
    COALESCE(sa.use_default_commission, true) as use_default_commission,
    aa.id as affiliate_account_id
  INTO v_store_affiliate
  FROM store_affiliate_coupons sac
  JOIN store_affiliates sa ON sa.id = sac.store_affiliate_id
  JOIN affiliate_accounts aa ON aa.id = sa.affiliate_account_id
  WHERE sac.coupon_id = v_coupon.id
  AND sa.store_id = v_order.store_id
  AND sa.is_active = true
  LIMIT 1;

  IF v_store_affiliate.store_affiliate_id IS NULL THEN
    RAISE NOTICE '[REPROCESS] ❌ Nenhum afiliado encontrado para cupom %', v_order.coupon_code;
    RETURN;
  END IF;
  
  -- Buscar affiliate_id
  SELECT a.id INTO v_affiliate_id
  FROM affiliates a
  WHERE a.affiliate_account_id = v_store_affiliate.affiliate_account_id
  AND a.store_id = v_order.store_id
  LIMIT 1;
  
  IF v_affiliate_id IS NULL THEN
    SELECT a.id INTO v_affiliate_id
    FROM affiliates a
    JOIN affiliate_accounts aa ON aa.id = v_store_affiliate.affiliate_account_id
    WHERE a.store_id = v_order.store_id
    AND a.cpf_cnpj IS NOT NULL AND aa.cpf_cnpj IS NOT NULL
    AND REGEXP_REPLACE(a.cpf_cnpj, '[^0-9]', '', 'g') = REGEXP_REPLACE(aa.cpf_cnpj, '[^0-9]', '', 'g')
    LIMIT 1;
  END IF;
  
  v_store_affiliate_id := v_store_affiliate.store_affiliate_id;
  v_commission_type := v_store_affiliate.default_commission_type;
  v_commission_value := v_store_affiliate.default_commission_value;
  v_use_default_commission := v_store_affiliate.use_default_commission;

  -- Calcular subtotal elegível
  FOR v_item IN 
    SELECT oi.id, oi.product_id, oi.product_name, oi.subtotal, oi.quantity, oi.unit_price
    FROM order_items oi 
    WHERE oi.order_id = p_order_id AND oi.deleted_at IS NULL
  LOOP
    SELECT category INTO v_product FROM products WHERE id = v_item.product_id;
    
    v_is_eligible := false;
    IF v_coupon_scope = 'all' THEN
      v_is_eligible := true;
    ELSIF v_coupon_scope = 'category' AND v_product.category IS NOT NULL THEN
      v_is_eligible := v_product.category = ANY(v_category_names);
    ELSIF v_coupon_scope = 'product' THEN
      v_is_eligible := v_item.product_id = ANY(v_product_ids);
    END IF;
    
    IF v_is_eligible THEN
      v_eligible_subtotal := v_eligible_subtotal + v_item.subtotal;
    END IF;
  END LOOP;

  -- Criar registro principal de earnings
  INSERT INTO affiliate_earnings (
    affiliate_id, store_affiliate_id, order_id, order_total,
    commission_type, commission_value, commission_amount, status
  ) VALUES (
    v_affiliate_id, v_store_affiliate_id, p_order_id, v_order.subtotal - COALESCE(v_order.coupon_discount, 0),
    v_commission_type, v_commission_value, 0, 'pending'
  )
  RETURNING id INTO v_earning_id;

  -- Processar cada item
  FOR v_item IN 
    SELECT oi.id, oi.product_id, oi.product_name, oi.subtotal, oi.quantity, oi.unit_price
    FROM order_items oi 
    WHERE oi.order_id = p_order_id AND oi.deleted_at IS NULL
  LOOP
    v_total_items := v_total_items + 1;
    SELECT category INTO v_product FROM products WHERE id = v_item.product_id;
    
    -- Elegibilidade
    v_is_eligible := false;
    IF v_coupon_scope = 'all' THEN
      v_is_eligible := true;
    ELSIF v_coupon_scope = 'category' AND v_product.category IS NOT NULL THEN
      v_is_eligible := v_product.category = ANY(v_category_names);
    ELSIF v_coupon_scope = 'product' THEN
      v_is_eligible := v_item.product_id = ANY(v_product_ids);
    END IF;
    
    -- Calcular desconto do item
    IF v_is_eligible AND v_eligible_subtotal > 0 THEN
      v_item_discount := (v_item.subtotal / v_eligible_subtotal) * COALESCE(v_order.coupon_discount, 0);
    ELSE
      v_item_discount := 0;
    END IF;
    
    v_item_value_with_discount := v_item.subtotal - v_item_discount;
    
    -- Hierarquia de comissão
    v_specific_rule := NULL;
    v_commission_source := 'none';
    v_item_commission_type := NULL;
    v_item_commission_value := 0;
    
    IF v_item.product_id IS NOT NULL AND v_affiliate_id IS NOT NULL THEN
      SELECT commission_type, commission_value
      INTO v_specific_rule
      FROM affiliate_commission_rules
      WHERE affiliate_id = v_affiliate_id
      AND product_id = v_item.product_id
      AND applies_to = 'product'
      AND is_active = true
      LIMIT 1;
    END IF;
    
    IF v_specific_rule.commission_type IS NOT NULL THEN
      v_item_commission_type := v_specific_rule.commission_type;
      v_item_commission_value := v_specific_rule.commission_value;
      v_commission_source := 'specific_product';
      v_items_with_specific_rule := v_items_with_specific_rule + 1;
    ELSIF v_use_default_commission = true THEN
      v_item_commission_type := v_commission_type;
      v_item_commission_value := v_commission_value;
      v_commission_source := 'default';
      v_items_with_default := v_items_with_default + 1;
    ELSE
      v_item_commission_type := 'percentage';
      v_item_commission_value := 0;
      v_commission_source := 'none';
      v_items_without_commission := v_items_without_commission + 1;
    END IF;
    
    -- Calcular comissão do item
    IF v_item_commission_value > 0 THEN
      IF v_item_commission_type = 'percentage' THEN
        v_item_commission := (v_item_value_with_discount * v_item_commission_value) / 100;
      ELSE
        v_item_commission := (v_item.subtotal / GREATEST(v_order.subtotal, 1)) * v_item_commission_value;
      END IF;
    ELSE
      v_item_commission := 0;
    END IF;
    
    v_total_commission := v_total_commission + v_item_commission;
    
    INSERT INTO affiliate_item_earnings (
      earning_id, order_item_id, product_id, product_name, product_category,
      item_subtotal, item_discount, item_value_with_discount,
      is_coupon_eligible, coupon_scope,
      commission_type, commission_value, commission_amount,
      commission_source
    ) VALUES (
      v_earning_id, v_item.id, v_item.product_id, v_item.product_name, v_product.category,
      v_item.subtotal, v_item_discount, v_item_value_with_discount,
      v_is_eligible, v_coupon_scope,
      v_item_commission_type, v_item_commission_value, v_item_commission,
      v_commission_source
    );
  END LOOP;

  -- Atualizar total da comissão
  UPDATE affiliate_earnings 
  SET commission_amount = v_total_commission
  WHERE id = v_earning_id;

  -- ========== INSERIR LOG DE AUDITORIA ==========
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
    commission_difference,
    reason,
    recalculated_by,
    editor_name,
    editor_email,
    recalculated_at
  )
  SELECT
    p_order_id,
    v_order.order_number,
    v_old_earning_id,
    v_earning_id,
    v_affiliate_id,
    v_store_affiliate_id,
    aa.name,
    v_order.store_id,
    v_old_order_total,
    v_old_coupon_discount,
    v_old_commission_amount,
    v_old_items_count,
    v_order.subtotal - COALESCE(v_order.coupon_discount, 0),
    COALESCE(v_order.coupon_discount, 0),
    v_total_commission,
    v_total_items,
    v_total_commission - v_old_commission_amount,
    'order_edit',
    p_editor_id,
    p_editor_name,
    p_editor_email,
    NOW()
  FROM store_affiliates sa
  LEFT JOIN affiliate_accounts aa ON aa.id = sa.affiliate_account_id
  WHERE sa.id = v_store_affiliate_id;

  RAISE NOTICE '[REPROCESS] ✅ Comissão recalculada: R$ % -> R$ % (Δ R$ %)', 
    v_old_commission_amount, v_total_commission, v_total_commission - v_old_commission_amount;
END;
$function$;