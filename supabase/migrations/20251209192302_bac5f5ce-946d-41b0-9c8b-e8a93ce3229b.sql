-- 1. Corrigir comissões já pagas para fabiana@gmail.com (saque de R$ 73,50)
UPDATE affiliate_earnings ae
SET status = 'paid', paid_at = '2025-12-09T18:43:50+00:00'
FROM orders o
WHERE ae.order_id = o.id
AND ae.store_affiliate_id = '08c4dd01-8a7c-4427-af65-0a509b477157'
AND o.status::TEXT = 'entregue'
AND ae.status = 'pending';

-- 2. Atualizar função get_affiliate_stores para calcular corretamente o disponível
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

-- 3. Atualizar função consolidada também
CREATE OR REPLACE FUNCTION public.get_affiliate_consolidated_stats(p_affiliate_account_id uuid)
 RETURNS TABLE(total_stores bigint, total_sales numeric, total_commission numeric, pending_commission numeric, paid_commission numeric, total_orders bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT sa.store_id) as total_stores,
    -- Total de vendas: excluir pedidos cancelados
    COALESCE(SUM(
      CASE 
        WHEN o.status::TEXT NOT IN ('cancelado', 'cancelled') 
        THEN ae.order_total 
        ELSE 0 
      END
    ), 0::NUMERIC) as total_sales,
    -- Ganhos disponíveis: pedidos entregues E NÃO pagos
    COALESCE(SUM(
      CASE 
        WHEN o.status::TEXT IN ('entregue', 'delivered') AND ae.status != 'paid'
        THEN ae.commission_amount 
        ELSE 0 
      END
    ), 0::NUMERIC) as total_commission,
    -- Pendente: pedidos em processamento
    COALESCE(SUM(
      CASE 
        WHEN o.status::TEXT NOT IN ('entregue', 'delivered', 'cancelado', 'cancelled') 
        THEN ae.commission_amount 
        ELSE 0 
      END
    ), 0::NUMERIC) as pending_commission,
    -- Pago: comissões já pagas
    COALESCE(SUM(
      CASE 
        WHEN ae.status = 'paid'
        THEN ae.commission_amount 
        ELSE 0 
      END
    ), 0::NUMERIC) as paid_commission,
    -- Total de pedidos: excluir cancelados
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
$function$;