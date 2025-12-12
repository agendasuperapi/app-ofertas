-- Atualiza a função process_affiliate_commission_for_order para calcular desconto por item
-- baseado nas coupon_discount_rules (hierarquia: produto > categoria > padrão)

CREATE OR REPLACE FUNCTION public.process_affiliate_commission_for_order(p_order_id uuid)
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
  -- Novas variáveis para regras de desconto do cupom
  v_discount_rule RECORD;
  v_item_discount_type TEXT;
  v_item_discount_value NUMERIC;
  v_calculated_item_discount NUMERIC;
  v_total_calculated_discount NUMERIC := 0;
  v_discount_adjustment_factor NUMERIC := 1;
BEGIN
  -- LOCK para evitar processamento duplicado concorrente
  PERFORM pg_advisory_xact_lock(hashtext('commission_' || p_order_id::text));

  -- Buscar dados do pedido
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  
  IF v_order.id IS NULL THEN
    RAISE NOTICE '[COMMISSION] ❌ Pedido não encontrado: %', p_order_id;
    RETURN;
  END IF;

  -- Só processar se tiver cupom
  IF v_order.coupon_code IS NULL OR v_order.coupon_code = '' THEN
    RAISE NOTICE '[COMMISSION] ℹ️ Pedido % sem cupom - ignorando', v_order.order_number;
    RETURN;
  END IF;

  -- Verificar se já existe comissão para este pedido
  IF EXISTS (SELECT 1 FROM affiliate_earnings WHERE order_id = p_order_id) THEN
    RAISE NOTICE '[COMMISSION] ⚠️ Comissão já existe para pedido % - ignorando', v_order.order_number;
    RETURN;
  END IF;

  -- Verificar se existem itens no pedido
  IF NOT EXISTS (SELECT 1 FROM order_items WHERE order_id = p_order_id AND deleted_at IS NULL) THEN
    RAISE NOTICE '[COMMISSION] ⚠️ Pedido % sem itens - aguardando', v_order.order_number;
    RETURN;
  END IF;

  RAISE NOTICE '[COMMISSION] 🚀 Iniciando processamento para pedido % com cupom %', 
    v_order.order_number, v_order.coupon_code;

  -- Buscar o cupom COM escopo
  SELECT id, code, discount_type, discount_value, applies_to, category_names, product_ids
  INTO v_coupon
  FROM coupons 
  WHERE store_id = v_order.store_id 
  AND UPPER(code) = UPPER(v_order.coupon_code)
  LIMIT 1;

  IF v_coupon.id IS NULL THEN
    RAISE NOTICE '[COMMISSION] ❌ Cupom não encontrado: %', v_order.coupon_code;
    RETURN;
  END IF;

  v_coupon_scope := COALESCE(v_coupon.applies_to, 'all');
  v_category_names := COALESCE(v_coupon.category_names, '{}');
  v_product_ids := COALESCE(v_coupon.product_ids, '{}');

  RAISE NOTICE '[COMMISSION] 🎫 Cupom: % | Escopo: % | Desconto: % %', 
    v_coupon.code, v_coupon_scope, v_coupon.discount_value, v_coupon.discount_type;

  -- ========== BUSCA DO AFILIADO (USANDO APENAS store_affiliate_coupons) ==========
  
  -- Buscar afiliado via store_affiliate_coupons (única fonte)
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
    RAISE NOTICE '[COMMISSION] ❌ Nenhum afiliado encontrado para cupom % via store_affiliate_coupons', v_order.coupon_code;
    RETURN;
  END IF;

  RAISE NOTICE '[COMMISSION] ✅ Afiliado encontrado via store_affiliate_coupons';
  
  -- Buscar affiliate_id usando affiliate_account_id
  SELECT a.id INTO v_affiliate_id
  FROM affiliates a
  WHERE a.affiliate_account_id = v_store_affiliate.affiliate_account_id
  AND a.store_id = v_order.store_id
  LIMIT 1;
  
  -- Fallback para CPF se affiliate_account_id não estiver populado
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

  -- Se não encontrou affiliate_id, criar registro em affiliates
  IF v_affiliate_id IS NULL THEN
    INSERT INTO affiliates (store_id, name, email, cpf_cnpj, affiliate_account_id, default_commission_type, default_commission_value, use_default_commission, is_active)
    SELECT v_order.store_id, aa.name, aa.email, aa.cpf_cnpj, aa.id, v_commission_type, v_commission_value, v_use_default_commission, true
    FROM affiliate_accounts aa
    WHERE aa.id = v_store_affiliate.affiliate_account_id
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_affiliate_id;
    
    -- Buscar novamente se insert falhou por conflito
    IF v_affiliate_id IS NULL THEN
      SELECT a.id INTO v_affiliate_id
      FROM affiliates a
      WHERE a.affiliate_account_id = v_store_affiliate.affiliate_account_id
      AND a.store_id = v_order.store_id
      LIMIT 1;
    END IF;
  END IF;

  RAISE NOTICE '[COMMISSION] 👤 Afiliado ID: % | Store Affiliate ID: % | use_default: % | tipo: % | valor: %',
    v_affiliate_id, v_store_affiliate_id, v_use_default_commission, v_commission_type, v_commission_value;

  -- ========== PRIMEIRA PASSAGEM: Calcular subtotal elegível e descontos por item ==========
  -- Calcular o desconto de cada item baseado nas coupon_discount_rules
  
  FOR v_item IN 
    SELECT oi.id, oi.product_id, oi.product_name, oi.subtotal, oi.quantity, oi.unit_price
    FROM order_items oi 
    WHERE oi.order_id = p_order_id AND oi.deleted_at IS NULL
  LOOP
    SELECT category INTO v_product FROM products WHERE id = v_item.product_id;
    
    -- Verificar elegibilidade do item para o cupom
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

  RAISE NOTICE '[COMMISSION] 💰 Subtotal elegível: R$ % de R$ %', v_eligible_subtotal, v_order.subtotal;

  -- ========== CALCULAR DESCONTO POR ITEM BASEADO NAS REGRAS ==========
  -- Primeira passagem: calcular desconto teórico de cada item
  v_total_calculated_discount := 0;
  
  FOR v_item IN 
    SELECT oi.id, oi.product_id, oi.product_name, oi.subtotal, oi.quantity, oi.unit_price
    FROM order_items oi 
    WHERE oi.order_id = p_order_id AND oi.deleted_at IS NULL
  LOOP
    SELECT category INTO v_product FROM products WHERE id = v_item.product_id;
    
    -- Verificar elegibilidade
    v_is_eligible := false;
    IF v_coupon_scope = 'all' THEN
      v_is_eligible := true;
    ELSIF v_coupon_scope = 'category' AND v_product.category IS NOT NULL THEN
      v_is_eligible := v_product.category = ANY(v_category_names);
    ELSIF v_coupon_scope = 'product' THEN
      v_is_eligible := v_item.product_id = ANY(v_product_ids);
    END IF;
    
    IF v_is_eligible THEN
      -- Inicializar com valores padrão do cupom
      v_item_discount_type := v_coupon.discount_type;
      v_item_discount_value := v_coupon.discount_value;
      
      -- 1. Verificar regra específica do PRODUTO
      SELECT discount_type, discount_value INTO v_discount_rule
      FROM coupon_discount_rules
      WHERE coupon_id = v_coupon.id
      AND rule_type = 'product'
      AND product_id = v_item.product_id
      LIMIT 1;
      
      IF v_discount_rule.discount_type IS NOT NULL THEN
        v_item_discount_type := v_discount_rule.discount_type;
        v_item_discount_value := v_discount_rule.discount_value;
        RAISE NOTICE '[DISCOUNT] 🎯 Item "%": Regra PRODUTO (% %)', 
          v_item.product_name, v_item_discount_value, v_item_discount_type;
      ELSE
        -- 2. Verificar regra de CATEGORIA
        SELECT discount_type, discount_value INTO v_discount_rule
        FROM coupon_discount_rules
        WHERE coupon_id = v_coupon.id
        AND rule_type = 'category'
        AND LOWER(category_name) = LOWER(v_product.category)
        LIMIT 1;
        
        IF v_discount_rule.discount_type IS NOT NULL THEN
          v_item_discount_type := v_discount_rule.discount_type;
          v_item_discount_value := v_discount_rule.discount_value;
          RAISE NOTICE '[DISCOUNT] 📁 Item "%": Regra CATEGORIA "%" (% %)', 
            v_item.product_name, v_product.category, v_item_discount_value, v_item_discount_type;
        ELSE
          RAISE NOTICE '[DISCOUNT] 📌 Item "%": Desconto PADRÃO (% %)', 
            v_item.product_name, v_item_discount_value, v_item_discount_type;
        END IF;
      END IF;
      
      -- Calcular desconto do item
      IF v_item_discount_type = 'percentage' THEN
        v_calculated_item_discount := (v_item.subtotal * v_item_discount_value) / 100;
      ELSE
        -- Para desconto fixo, distribuir proporcionalmente ao subtotal
        IF v_eligible_subtotal > 0 THEN
          v_calculated_item_discount := (v_item.subtotal / v_eligible_subtotal) * v_item_discount_value;
        ELSE
          v_calculated_item_discount := 0;
        END IF;
      END IF;
      
      -- Limitar desconto ao valor do item
      v_calculated_item_discount := LEAST(v_calculated_item_discount, v_item.subtotal);
      v_total_calculated_discount := v_total_calculated_discount + v_calculated_item_discount;
    END IF;
  END LOOP;

  -- Calcular fator de ajuste se o desconto calculado difere do desconto real do pedido
  -- Isso garante que a soma dos descontos por item = desconto total do pedido
  IF v_total_calculated_discount > 0 AND COALESCE(v_order.coupon_discount, 0) > 0 THEN
    v_discount_adjustment_factor := COALESCE(v_order.coupon_discount, 0) / v_total_calculated_discount;
    RAISE NOTICE '[DISCOUNT] 🔧 Fator de ajuste: % (calculado: R$ %, real: R$ %)', 
      ROUND(v_discount_adjustment_factor, 4), v_total_calculated_discount, v_order.coupon_discount;
  ELSE
    v_discount_adjustment_factor := 1;
  END IF;

  -- Criar registro principal de earnings
  INSERT INTO affiliate_earnings (
    affiliate_id, store_affiliate_id, order_id, order_total,
    commission_type, commission_value, commission_amount, status
  ) VALUES (
    v_affiliate_id, v_store_affiliate_id, p_order_id, v_order.subtotal - COALESCE(v_order.coupon_discount, 0),
    v_commission_type, v_commission_value, 0, 'pending'
  )
  RETURNING id INTO v_earning_id;

  RAISE NOTICE '[COMMISSION] 📝 Earning ID criado: %', v_earning_id;

  -- ========== SEGUNDA PASSAGEM: Processar cada item com desconto correto ==========
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
    
    -- ========== CALCULAR DESCONTO DO ITEM BASEADO NAS REGRAS ==========
    IF v_is_eligible THEN
      -- Inicializar com valores padrão do cupom
      v_item_discount_type := v_coupon.discount_type;
      v_item_discount_value := v_coupon.discount_value;
      
      -- 1. Verificar regra específica do PRODUTO
      SELECT discount_type, discount_value INTO v_discount_rule
      FROM coupon_discount_rules
      WHERE coupon_id = v_coupon.id
      AND rule_type = 'product'
      AND product_id = v_item.product_id
      LIMIT 1;
      
      IF v_discount_rule.discount_type IS NOT NULL THEN
        v_item_discount_type := v_discount_rule.discount_type;
        v_item_discount_value := v_discount_rule.discount_value;
      ELSE
        -- 2. Verificar regra de CATEGORIA
        SELECT discount_type, discount_value INTO v_discount_rule
        FROM coupon_discount_rules
        WHERE coupon_id = v_coupon.id
        AND rule_type = 'category'
        AND LOWER(category_name) = LOWER(v_product.category)
        LIMIT 1;
        
        IF v_discount_rule.discount_type IS NOT NULL THEN
          v_item_discount_type := v_discount_rule.discount_type;
          v_item_discount_value := v_discount_rule.discount_value;
        END IF;
      END IF;
      
      -- Calcular desconto do item
      IF v_item_discount_type = 'percentage' THEN
        v_item_discount := (v_item.subtotal * v_item_discount_value) / 100;
      ELSE
        -- Para desconto fixo, distribuir proporcionalmente
        IF v_eligible_subtotal > 0 THEN
          v_item_discount := (v_item.subtotal / v_eligible_subtotal) * v_item_discount_value;
        ELSE
          v_item_discount := 0;
        END IF;
      END IF;
      
      -- Aplicar fator de ajuste para garantir que soma = desconto total
      v_item_discount := v_item_discount * v_discount_adjustment_factor;
      v_item_discount := LEAST(v_item_discount, v_item.subtotal);
    ELSE
      v_item_discount := 0;
    END IF;
    
    v_item_value_with_discount := v_item.subtotal - v_item_discount;
    
    -- ========== HIERARQUIA DE COMISSÃO ==========
    v_specific_rule := NULL;
    v_commission_source := 'none';
    v_item_commission_type := NULL;
    v_item_commission_value := 0;
    
    -- 1. Verificar regra específica do produto
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
      -- PRIORIDADE 1: Regra específica do produto
      v_item_commission_type := v_specific_rule.commission_type;
      v_item_commission_value := v_specific_rule.commission_value;
      v_commission_source := 'specific_product';
      v_items_with_specific_rule := v_items_with_specific_rule + 1;
      RAISE NOTICE '[COMMISSION] 🎯 Item "%": REGRA ESPECÍFICA (% %)', 
        v_item.product_name, v_item_commission_value, v_item_commission_type;
    ELSIF v_use_default_commission = true THEN
      -- PRIORIDADE 2: Comissão padrão
      v_item_commission_type := v_commission_type;
      v_item_commission_value := v_commission_value;
      v_commission_source := 'default';
      v_items_with_default := v_items_with_default + 1;
      RAISE NOTICE '[COMMISSION] 📌 Item "%": PADRÃO (% %)', 
        v_item.product_name, v_item_commission_value, v_item_commission_type;
    ELSE
      -- PRIORIDADE 3: Sem comissão
      v_item_commission_type := 'percentage';
      v_item_commission_value := 0;
      v_commission_source := 'none';
      v_items_without_commission := v_items_without_commission + 1;
      RAISE NOTICE '[COMMISSION] ⛔ Item "%": SEM COMISSÃO', v_item.product_name;
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
    
    -- Inserir detalhes do item COM commission_source
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

  -- Log de resumo
  RAISE NOTICE '[COMMISSION] ========================================';
  RAISE NOTICE '[COMMISSION] ✅ RESUMO PEDIDO %:', v_order.order_number;
  RAISE NOTICE '[COMMISSION] 📦 Total de itens: %', v_total_items;
  RAISE NOTICE '[COMMISSION] 🎯 Com regra específica: %', v_items_with_specific_rule;
  RAISE NOTICE '[COMMISSION] 📌 Com comissão padrão: %', v_items_with_default;
  RAISE NOTICE '[COMMISSION] ⛔ Sem comissão: %', v_items_without_commission;
  RAISE NOTICE '[COMMISSION] 💵 Comissão total: R$ %', v_total_commission;
  RAISE NOTICE '[COMMISSION] ========================================';
END;
$function$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION process_affiliate_commission_for_order(uuid) TO authenticated, anon, service_role;