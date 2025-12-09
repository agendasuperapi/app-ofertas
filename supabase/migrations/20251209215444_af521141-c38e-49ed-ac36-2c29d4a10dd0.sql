-- 1. Adicionar coluna affiliate_account_id na tabela affiliates
ALTER TABLE public.affiliates 
ADD COLUMN IF NOT EXISTS affiliate_account_id UUID REFERENCES public.affiliate_accounts(id);

-- 2. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_affiliates_affiliate_account_id 
ON public.affiliates(affiliate_account_id);

-- 3. Popular affiliate_account_id baseado no CPF normalizado (prioridade) ou email (fallback)
UPDATE public.affiliates a
SET affiliate_account_id = aa.id
FROM public.affiliate_accounts aa
WHERE a.affiliate_account_id IS NULL
AND (
  -- Prioridade 1: Match por CPF normalizado
  (a.cpf_cnpj IS NOT NULL AND aa.cpf_cnpj IS NOT NULL AND
   REGEXP_REPLACE(a.cpf_cnpj, '[^0-9]', '', 'g') = REGEXP_REPLACE(aa.cpf_cnpj, '[^0-9]', '', 'g'))
  OR
  -- Prioridade 2: Match por email (fallback)
  (a.cpf_cnpj IS NULL AND LOWER(a.email) = LOWER(aa.email))
);

-- 4. Atualizar função process_affiliate_commission_for_order para usar affiliate_account_id/CPF
CREATE OR REPLACE FUNCTION public.process_affiliate_commission_for_order(p_order_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order RECORD;
  v_coupon RECORD;
  v_affiliate RECORD;
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

  -- ========== BUSCA DO AFILIADO (USANDO affiliate_account_id ou CPF, NÃO EMAIL) ==========
  
  -- MÉTODO 1: store_affiliate_coupons (sistema novo)
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

  IF v_store_affiliate.store_affiliate_id IS NOT NULL THEN
    RAISE NOTICE '[COMMISSION] ✅ Afiliado encontrado via store_affiliate_coupons';
    
    -- Buscar affiliate_id usando affiliate_account_id (não email!)
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
  END IF;

  -- MÉTODO 2: store_affiliates.coupon_id
  IF v_store_affiliate_id IS NULL THEN
    SELECT sa.id, sa.default_commission_type, sa.default_commission_value, 
           COALESCE(sa.use_default_commission, true) as use_default_commission,
           sa.affiliate_account_id
    INTO v_store_affiliate
    FROM store_affiliates sa
    WHERE sa.coupon_id = v_coupon.id
    AND sa.store_id = v_order.store_id
    AND sa.is_active = true
    LIMIT 1;

    IF v_store_affiliate.id IS NOT NULL THEN
      RAISE NOTICE '[COMMISSION] ✅ Afiliado encontrado via store_affiliates.coupon_id';
      v_store_affiliate_id := v_store_affiliate.id;
      v_commission_type := v_store_affiliate.default_commission_type;
      v_commission_value := v_store_affiliate.default_commission_value;
      v_use_default_commission := v_store_affiliate.use_default_commission;
      
      -- Buscar affiliate_id usando affiliate_account_id
      SELECT a.id INTO v_affiliate_id
      FROM affiliates a
      WHERE a.affiliate_account_id = v_store_affiliate.affiliate_account_id
      AND a.store_id = v_order.store_id
      LIMIT 1;
      
      -- Fallback para CPF
      IF v_affiliate_id IS NULL THEN
        SELECT a.id INTO v_affiliate_id
        FROM affiliates a
        JOIN affiliate_accounts aa ON aa.id = v_store_affiliate.affiliate_account_id
        WHERE a.store_id = v_order.store_id
        AND a.cpf_cnpj IS NOT NULL AND aa.cpf_cnpj IS NOT NULL
        AND REGEXP_REPLACE(a.cpf_cnpj, '[^0-9]', '', 'g') = REGEXP_REPLACE(aa.cpf_cnpj, '[^0-9]', '', 'g')
        LIMIT 1;
      END IF;
    END IF;
  END IF;

  -- MÉTODO 3: affiliate_coupons (legado)
  IF v_affiliate_id IS NULL THEN
    SELECT a.id, a.default_commission_type, a.default_commission_value,
           COALESCE(a.use_default_commission, true) as use_default_commission,
           a.affiliate_account_id
    INTO v_affiliate
    FROM affiliate_coupons ac
    JOIN affiliates a ON a.id = ac.affiliate_id
    WHERE ac.coupon_id = v_coupon.id
    AND a.store_id = v_order.store_id
    AND a.is_active = true
    LIMIT 1;

    IF v_affiliate.id IS NOT NULL THEN
      RAISE NOTICE '[COMMISSION] ✅ Afiliado encontrado via affiliate_coupons (legado)';
      v_affiliate_id := v_affiliate.id;
      v_commission_type := v_affiliate.default_commission_type;
      v_commission_value := v_affiliate.default_commission_value;
      v_use_default_commission := v_affiliate.use_default_commission;
      
      -- Buscar store_affiliate usando affiliate_account_id
      IF v_affiliate.affiliate_account_id IS NOT NULL THEN
        SELECT sa.id INTO v_store_affiliate_id
        FROM store_affiliates sa
        WHERE sa.affiliate_account_id = v_affiliate.affiliate_account_id
        AND sa.store_id = v_order.store_id
        AND sa.is_active = true
        LIMIT 1;
      END IF;
      
      -- Fallback para CPF
      IF v_store_affiliate_id IS NULL THEN
        SELECT sa.id INTO v_store_affiliate_id
        FROM store_affiliates sa
        JOIN affiliate_accounts aa ON aa.id = sa.affiliate_account_id
        JOIN affiliates aff ON aff.id = v_affiliate_id
        WHERE sa.store_id = v_order.store_id
        AND sa.is_active = true
        AND aff.cpf_cnpj IS NOT NULL AND aa.cpf_cnpj IS NOT NULL
        AND REGEXP_REPLACE(aff.cpf_cnpj, '[^0-9]', '', 'g') = REGEXP_REPLACE(aa.cpf_cnpj, '[^0-9]', '', 'g')
        LIMIT 1;
      END IF;
    END IF;
  END IF;

  -- MÉTODO 4: affiliates.coupon_id (legado)
  IF v_affiliate_id IS NULL THEN
    SELECT a.id, a.default_commission_type, a.default_commission_value,
           COALESCE(a.use_default_commission, true) as use_default_commission,
           a.affiliate_account_id
    INTO v_affiliate
    FROM affiliates a
    WHERE a.coupon_id = v_coupon.id
    AND a.store_id = v_order.store_id
    AND a.is_active = true
    LIMIT 1;

    IF v_affiliate.id IS NOT NULL THEN
      RAISE NOTICE '[COMMISSION] ✅ Afiliado encontrado via affiliates.coupon_id (legado)';
      v_affiliate_id := v_affiliate.id;
      v_commission_type := v_affiliate.default_commission_type;
      v_commission_value := v_affiliate.default_commission_value;
      v_use_default_commission := v_affiliate.use_default_commission;
      
      -- Buscar store_affiliate usando affiliate_account_id
      IF v_affiliate.affiliate_account_id IS NOT NULL THEN
        SELECT sa.id INTO v_store_affiliate_id
        FROM store_affiliates sa
        WHERE sa.affiliate_account_id = v_affiliate.affiliate_account_id
        AND sa.store_id = v_order.store_id
        AND sa.is_active = true
        LIMIT 1;
      END IF;
      
      -- Fallback para CPF
      IF v_store_affiliate_id IS NULL THEN
        SELECT sa.id INTO v_store_affiliate_id
        FROM store_affiliates sa
        JOIN affiliate_accounts aa ON aa.id = sa.affiliate_account_id
        JOIN affiliates aff ON aff.id = v_affiliate_id
        WHERE sa.store_id = v_order.store_id
        AND sa.is_active = true
        AND aff.cpf_cnpj IS NOT NULL AND aa.cpf_cnpj IS NOT NULL
        AND REGEXP_REPLACE(aff.cpf_cnpj, '[^0-9]', '', 'g') = REGEXP_REPLACE(aa.cpf_cnpj, '[^0-9]', '', 'g')
        LIMIT 1;
      END IF;
    END IF;
  END IF;

  -- Se não encontrou afiliado, sair
  IF v_affiliate_id IS NULL AND v_store_affiliate_id IS NULL THEN
    RAISE NOTICE '[COMMISSION] ❌ Nenhum afiliado encontrado para cupom %', v_order.coupon_code;
    RETURN;
  END IF;

  -- Garantir affiliate_id se só temos store_affiliate_id
  IF v_affiliate_id IS NULL AND v_store_affiliate_id IS NOT NULL THEN
    -- Buscar usando affiliate_account_id
    SELECT a.id INTO v_affiliate_id
    FROM affiliates a
    JOIN store_affiliates sa ON sa.id = v_store_affiliate_id
    WHERE a.affiliate_account_id = sa.affiliate_account_id
    AND a.store_id = v_order.store_id
    LIMIT 1;
    
    -- Fallback para CPF
    IF v_affiliate_id IS NULL THEN
      SELECT a.id INTO v_affiliate_id
      FROM affiliates a
      JOIN store_affiliates sa ON sa.id = v_store_affiliate_id
      JOIN affiliate_accounts aa ON aa.id = sa.affiliate_account_id
      WHERE a.store_id = v_order.store_id
      AND a.cpf_cnpj IS NOT NULL AND aa.cpf_cnpj IS NOT NULL
      AND REGEXP_REPLACE(a.cpf_cnpj, '[^0-9]', '', 'g') = REGEXP_REPLACE(aa.cpf_cnpj, '[^0-9]', '', 'g')
      LIMIT 1;
    END IF;
    
    -- Se ainda não encontrou, criar registro em affiliates
    IF v_affiliate_id IS NULL THEN
      INSERT INTO affiliates (store_id, name, email, cpf_cnpj, affiliate_account_id, default_commission_type, default_commission_value, use_default_commission, is_active)
      SELECT v_order.store_id, aa.name, aa.email, aa.cpf_cnpj, aa.id, sa.default_commission_type, sa.default_commission_value, 
             COALESCE(sa.use_default_commission, true), true
      FROM store_affiliates sa
      JOIN affiliate_accounts aa ON aa.id = sa.affiliate_account_id
      WHERE sa.id = v_store_affiliate_id
      ON CONFLICT DO NOTHING
      RETURNING id INTO v_affiliate_id;
      
      -- Buscar novamente se insert falhou por conflito
      IF v_affiliate_id IS NULL THEN
        SELECT a.id INTO v_affiliate_id
        FROM affiliates a
        JOIN store_affiliates sa ON sa.id = v_store_affiliate_id
        JOIN affiliate_accounts aa ON aa.id = sa.affiliate_account_id
        WHERE a.store_id = v_order.store_id
        AND (
          a.affiliate_account_id = aa.id
          OR (a.cpf_cnpj IS NOT NULL AND aa.cpf_cnpj IS NOT NULL AND
              REGEXP_REPLACE(a.cpf_cnpj, '[^0-9]', '', 'g') = REGEXP_REPLACE(aa.cpf_cnpj, '[^0-9]', '', 'g'))
        )
        LIMIT 1;
      END IF;
    END IF;
  END IF;

  RAISE NOTICE '[COMMISSION] 👤 Afiliado ID: % | use_default: % | tipo: % | valor: %',
    v_affiliate_id, v_use_default_commission, v_commission_type, v_commission_value;

  -- Contar regras específicas do afiliado
  RAISE NOTICE '[COMMISSION] 📋 Regras específicas do afiliado: %',
    (SELECT COUNT(*) FROM affiliate_commission_rules WHERE affiliate_id = v_affiliate_id AND is_active = true);

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

  RAISE NOTICE '[COMMISSION] 💰 Subtotal elegível: R$ % de R$ %', v_eligible_subtotal, v_order.subtotal;

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
    
    -- ========== HIERARQUIA DE COMISSÃO ==========
    v_specific_rule := NULL;
    v_commission_source := 'none';
    v_item_commission_type := NULL;
    v_item_commission_value := 0;
    
    -- 1. Verificar regra específica do produto (SEMPRE buscar do banco)
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

-- 5. Atualizar get_affiliate_stores para usar affiliate_account_id
CREATE OR REPLACE FUNCTION public.get_affiliate_stores(p_affiliate_account_id uuid)
 RETURNS TABLE(store_affiliate_id uuid, store_id uuid, store_name text, store_slug text, store_logo text, commission_type text, commission_value numeric, status text, coupon_code text, coupon_discount_type text, coupon_discount_value numeric, coupons jsonb, total_sales numeric, total_commission numeric, pending_commission numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    sa.id as store_affiliate_id,
    s.id as store_id,
    s.name as store_name,
    s.slug as store_slug,
    s.logo_url as store_logo,
    sa.default_commission_type as commission_type,
    sa.default_commission_value as commission_value,
    sa.status,
    -- Legacy: first coupon (from junction table or legacy field)
    COALESCE(
      (SELECT c.code FROM store_affiliate_coupons sac 
       JOIN coupons c ON c.id = sac.coupon_id 
       WHERE sac.store_affiliate_id = sa.id 
       LIMIT 1),
      legacy_c.code
    ) as coupon_code,
    COALESCE(
      (SELECT c.discount_type::TEXT FROM store_affiliate_coupons sac 
       JOIN coupons c ON c.id = sac.coupon_id 
       WHERE sac.store_affiliate_id = sa.id 
       LIMIT 1),
      legacy_c.discount_type::TEXT
    ) as coupon_discount_type,
    COALESCE(
      (SELECT c.discount_value FROM store_affiliate_coupons sac 
       JOIN coupons c ON c.id = sac.coupon_id 
       WHERE sac.store_affiliate_id = sa.id 
       LIMIT 1),
      legacy_c.discount_value
    ) as coupon_discount_value,
    -- New: all coupons as JSONB array with scope info AND coupon id
    COALESCE(
      (
        SELECT jsonb_agg(jsonb_build_object(
          'id', c.id,
          'code', c.code,
          'discount_type', c.discount_type::TEXT,
          'discount_value', c.discount_value,
          'applies_to', c.applies_to,
          'category_names', c.category_names,
          'product_ids', c.product_ids
        ))
        FROM store_affiliate_coupons sac
        JOIN coupons c ON c.id = sac.coupon_id
        WHERE sac.store_affiliate_id = sa.id
      ),
      -- Fallback to legacy coupon_id if no junction table entries
      CASE 
        WHEN legacy_c.id IS NOT NULL THEN 
          jsonb_build_array(jsonb_build_object(
            'id', legacy_c.id,
            'code', legacy_c.code,
            'discount_type', legacy_c.discount_type::TEXT,
            'discount_value', legacy_c.discount_value,
            'applies_to', legacy_c.applies_to,
            'category_names', legacy_c.category_names,
            'product_ids', legacy_c.product_ids
          ))
        ELSE NULL
      END
    ) as coupons,
    -- Total de vendas: excluir cancelados
    COALESCE(SUM(
      CASE 
        WHEN o.status::TEXT NOT IN ('cancelado', 'cancelled') 
        THEN ae.order_total 
        ELSE 0 
      END
    ), 0) as total_sales,
    -- Comissão disponível: apenas pedidos entregues E não pagos
    COALESCE(SUM(
      CASE 
        WHEN o.status::TEXT IN ('entregue', 'delivered') AND ae.status != 'paid'
        THEN ae.commission_amount 
        ELSE 0 
      END
    ), 0) as total_commission,
    -- Pendente: pedidos em processamento (não entregues e não cancelados)
    COALESCE(SUM(
      CASE 
        WHEN o.status::TEXT NOT IN ('entregue', 'delivered', 'cancelado', 'cancelled') 
        THEN ae.commission_amount 
        ELSE 0 
      END
    ), 0) as pending_commission
  FROM store_affiliates sa
  JOIN stores s ON s.id = sa.store_id
  LEFT JOIN coupons legacy_c ON legacy_c.id = sa.coupon_id
  LEFT JOIN affiliate_earnings ae ON ae.store_affiliate_id = sa.id
  LEFT JOIN orders o ON o.id = ae.order_id
  WHERE sa.affiliate_account_id = p_affiliate_account_id
  AND sa.is_active = true
  GROUP BY sa.id, s.id, s.name, s.slug, s.logo_url, sa.default_commission_type, sa.default_commission_value, sa.status, legacy_c.id, legacy_c.code, legacy_c.discount_type, legacy_c.discount_value, legacy_c.applies_to, legacy_c.category_names, legacy_c.product_ids;
END;
$function$;

-- 6. Criar trigger para manter affiliate_account_id sincronizado ao criar/atualizar affiliates
CREATE OR REPLACE FUNCTION public.sync_affiliate_account_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Se affiliate_account_id já está definido, não fazer nada
  IF NEW.affiliate_account_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Tentar encontrar affiliate_account_id pelo CPF normalizado
  IF NEW.cpf_cnpj IS NOT NULL THEN
    SELECT id INTO NEW.affiliate_account_id
    FROM affiliate_accounts
    WHERE REGEXP_REPLACE(cpf_cnpj, '[^0-9]', '', 'g') = REGEXP_REPLACE(NEW.cpf_cnpj, '[^0-9]', '', 'g')
    LIMIT 1;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Criar trigger
DROP TRIGGER IF EXISTS sync_affiliate_account_id_trigger ON affiliates;
CREATE TRIGGER sync_affiliate_account_id_trigger
  BEFORE INSERT OR UPDATE ON affiliates
  FOR EACH ROW
  EXECUTE FUNCTION sync_affiliate_account_id();

-- 7. Grant permissions
GRANT EXECUTE ON FUNCTION public.process_affiliate_commission_for_order(uuid) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_affiliate_stores(uuid) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.sync_affiliate_account_id() TO authenticated, anon, service_role;