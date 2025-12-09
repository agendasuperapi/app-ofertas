-- Corrigir função get_affiliate_stores - cast o.status para TEXT
CREATE OR REPLACE FUNCTION public.get_affiliate_stores(p_affiliate_account_id UUID)
RETURNS TABLE (
  store_affiliate_id UUID,
  store_id UUID,
  store_name TEXT,
  store_slug TEXT,
  store_logo TEXT,
  commission_type TEXT,
  commission_value NUMERIC,
  status TEXT,
  coupon_code TEXT,
  coupon_discount_type TEXT,
  coupon_discount_value NUMERIC,
  coupons JSONB,
  total_sales NUMERIC,
  total_commission NUMERIC,
  pending_commission NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sa.id as store_affiliate_id,
    s.id as store_id,
    s.name::TEXT as store_name,
    s.slug::TEXT as store_slug,
    s.logo_url::TEXT as store_logo,
    sa.default_commission_type::TEXT as commission_type,
    sa.default_commission_value as commission_value,
    sa.status::TEXT,
    COALESCE(
      (SELECT c.code FROM store_affiliate_coupons sac 
       JOIN coupons c ON c.id = sac.coupon_id 
       WHERE sac.store_affiliate_id = sa.id 
       ORDER BY sac.created_at
       LIMIT 1),
      legacy_c.code
    )::TEXT as coupon_code,
    COALESCE(
      (SELECT c.discount_type::TEXT FROM store_affiliate_coupons sac 
       JOIN coupons c ON c.id = sac.coupon_id 
       WHERE sac.store_affiliate_id = sa.id 
       ORDER BY sac.created_at
       LIMIT 1),
      legacy_c.discount_type::TEXT
    ) as coupon_discount_type,
    COALESCE(
      (SELECT c.discount_value FROM store_affiliate_coupons sac 
       JOIN coupons c ON c.id = sac.coupon_id 
       WHERE sac.store_affiliate_id = sa.id 
       ORDER BY sac.created_at
       LIMIT 1),
      legacy_c.discount_value
    ) as coupon_discount_value,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'code', c.code,
            'discount_type', c.discount_type::TEXT,
            'discount_value', c.discount_value,
            'applies_to', c.applies_to,
            'category_names', c.category_names,
            'product_ids', c.product_ids
          )
        )
        FROM store_affiliate_coupons sac
        JOIN coupons c ON c.id = sac.coupon_id
        WHERE sac.store_affiliate_id = sa.id
      ),
      CASE 
        WHEN legacy_c.id IS NOT NULL THEN 
          jsonb_build_array(
            jsonb_build_object(
              'code', legacy_c.code,
              'discount_type', legacy_c.discount_type::TEXT,
              'discount_value', legacy_c.discount_value,
              'applies_to', legacy_c.applies_to,
              'category_names', legacy_c.category_names,
              'product_ids', legacy_c.product_ids
            )
          )
        ELSE '[]'::JSONB
      END
    ) as coupons,
    -- Total de vendas: excluir pedidos cancelados (cast para TEXT)
    COALESCE(SUM(
      CASE 
        WHEN o.status::TEXT NOT IN ('cancelado', 'cancelled') 
        THEN ae.order_total 
        ELSE 0 
      END
    ), 0::NUMERIC) as total_sales,
    -- Ganhos: somente pedidos entregues (cast para TEXT)
    COALESCE(SUM(
      CASE 
        WHEN o.status::TEXT IN ('entregue', 'delivered') 
        THEN ae.commission_amount 
        ELSE 0 
      END
    ), 0::NUMERIC) as total_commission,
    -- Pendente: pedidos em processamento (cast para TEXT)
    COALESCE(SUM(
      CASE 
        WHEN o.status::TEXT NOT IN ('entregue', 'delivered', 'cancelado', 'cancelled') 
        THEN ae.commission_amount 
        ELSE 0 
      END
    ), 0::NUMERIC) as pending_commission
  FROM store_affiliates sa
  JOIN stores s ON s.id = sa.store_id
  LEFT JOIN coupons legacy_c ON legacy_c.id = sa.coupon_id
  LEFT JOIN affiliate_earnings ae ON ae.store_affiliate_id = sa.id
  LEFT JOIN orders o ON o.id = ae.order_id
  WHERE sa.affiliate_account_id = p_affiliate_account_id
  AND sa.is_active = true
  GROUP BY sa.id, s.id, s.name, s.slug, s.logo_url, sa.default_commission_type, sa.default_commission_value, sa.status, legacy_c.id, legacy_c.code, legacy_c.discount_type, legacy_c.discount_value, legacy_c.applies_to, legacy_c.category_names, legacy_c.product_ids;
END;
$$;

-- Corrigir função get_affiliate_consolidated_stats - cast o.status para TEXT
CREATE OR REPLACE FUNCTION public.get_affiliate_consolidated_stats(p_affiliate_account_id UUID)
RETURNS TABLE (
  total_stores BIGINT,
  total_sales NUMERIC,
  total_commission NUMERIC,
  pending_commission NUMERIC,
  paid_commission NUMERIC,
  total_orders BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT sa.store_id) as total_stores,
    -- Total de vendas: excluir pedidos cancelados (cast para TEXT)
    COALESCE(SUM(
      CASE 
        WHEN o.status::TEXT NOT IN ('cancelado', 'cancelled') 
        THEN ae.order_total 
        ELSE 0 
      END
    ), 0::NUMERIC) as total_sales,
    -- Ganhos: somente pedidos entregues (cast para TEXT)
    COALESCE(SUM(
      CASE 
        WHEN o.status::TEXT IN ('entregue', 'delivered') 
        THEN ae.commission_amount 
        ELSE 0 
      END
    ), 0::NUMERIC) as total_commission,
    -- Pendente: pedidos em processamento (cast para TEXT)
    COALESCE(SUM(
      CASE 
        WHEN o.status::TEXT NOT IN ('entregue', 'delivered', 'cancelado', 'cancelled') 
        THEN ae.commission_amount 
        ELSE 0 
      END
    ), 0::NUMERIC) as pending_commission,
    -- Pago (alias para total_commission)
    COALESCE(SUM(
      CASE 
        WHEN o.status::TEXT IN ('entregue', 'delivered') 
        THEN ae.commission_amount 
        ELSE 0 
      END
    ), 0::NUMERIC) as paid_commission,
    -- Total de pedidos: excluir cancelados (cast para TEXT)
    COUNT(DISTINCT CASE 
      WHEN o.status::TEXT NOT IN ('cancelado', 'cancelled') 
      THEN ae.order_id 
      ELSE NULL 
    END) as total_orders
  FROM store_affiliates sa
  LEFT JOIN affiliate_earnings ae ON ae.store_affiliate_id = sa.id
  LEFT JOIN orders o ON o.id = ae.order_id
  WHERE sa.affiliate_account_id = p_affiliate_account_id
  AND sa.is_active = true;
END;
$$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION public.get_affiliate_stores(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_affiliate_consolidated_stats(UUID) TO anon, authenticated, service_role;