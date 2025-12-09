-- Adicionar coluna de dias de carência (pode já existir do erro anterior)
ALTER TABLE stores 
ADD COLUMN IF NOT EXISTS affiliate_commission_maturity_days INTEGER DEFAULT 7;

-- Dropar funções existentes para recriar com nova assinatura
DROP FUNCTION IF EXISTS public.get_affiliate_stores(uuid);
DROP FUNCTION IF EXISTS public.get_affiliate_orders(uuid);

-- Recriar função get_affiliate_stores com novos campos
CREATE FUNCTION public.get_affiliate_stores(p_affiliate_account_id UUID)
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
  maturing_commission NUMERIC,
  pending_commission NUMERIC,
  maturity_days INTEGER
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
    s.name as store_name,
    s.slug as store_slug,
    s.logo_url as store_logo,
    sa.default_commission_type as commission_type,
    sa.default_commission_value as commission_value,
    sa.status,
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
    COALESCE(SUM(
      CASE 
        WHEN o.status::TEXT NOT IN ('cancelado', 'cancelled') 
        THEN ae.order_total 
        ELSE 0 
      END
    ), 0) as total_sales,
    COALESCE(SUM(
      CASE 
        WHEN o.status::TEXT IN ('entregue', 'delivered') 
        AND ae.status != 'paid'
        AND o.updated_at + (COALESCE(s.affiliate_commission_maturity_days, 7) || ' days')::INTERVAL <= NOW()
        THEN ae.commission_amount 
        ELSE 0 
      END
    ), 0) as total_commission,
    COALESCE(SUM(
      CASE 
        WHEN o.status::TEXT IN ('entregue', 'delivered') 
        AND ae.status != 'paid'
        AND o.updated_at + (COALESCE(s.affiliate_commission_maturity_days, 7) || ' days')::INTERVAL > NOW()
        THEN ae.commission_amount 
        ELSE 0 
      END
    ), 0) as maturing_commission,
    COALESCE(SUM(
      CASE 
        WHEN o.status::TEXT NOT IN ('entregue', 'delivered', 'cancelado', 'cancelled') 
        THEN ae.commission_amount 
        ELSE 0 
      END
    ), 0) as pending_commission,
    COALESCE(s.affiliate_commission_maturity_days, 7) as maturity_days
  FROM store_affiliates sa
  JOIN stores s ON s.id = sa.store_id
  LEFT JOIN coupons legacy_c ON legacy_c.id = sa.coupon_id
  LEFT JOIN affiliate_earnings ae ON ae.store_affiliate_id = sa.id
  LEFT JOIN orders o ON o.id = ae.order_id
  WHERE sa.affiliate_account_id = p_affiliate_account_id
  AND sa.is_active = true
  GROUP BY sa.id, s.id, s.name, s.slug, s.logo_url, sa.default_commission_type, sa.default_commission_value, sa.status, s.affiliate_commission_maturity_days, legacy_c.id, legacy_c.code, legacy_c.discount_type, legacy_c.discount_value, legacy_c.applies_to, legacy_c.category_names, legacy_c.product_ids;
END;
$$;

-- Recriar função get_affiliate_orders com novos campos
CREATE FUNCTION public.get_affiliate_orders(p_affiliate_account_id uuid)
RETURNS TABLE(
  earning_id uuid, 
  order_id uuid, 
  order_number text, 
  customer_name text, 
  order_date timestamp with time zone, 
  store_id uuid, 
  store_name text, 
  store_affiliate_id uuid, 
  order_total numeric, 
  order_subtotal numeric, 
  coupon_discount numeric, 
  commission_amount numeric, 
  commission_status text, 
  coupon_code text,
  commission_available_at timestamp with time zone,
  maturity_days integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (combined.order_id)
    combined.earning_id,
    combined.order_id,
    combined.order_number,
    combined.customer_name,
    combined.order_date,
    combined.store_id,
    combined.store_name,
    combined.store_affiliate_id,
    combined.order_total,
    combined.order_subtotal,
    combined.coupon_discount,
    combined.commission_amount,
    combined.commission_status,
    combined.coupon_code,
    combined.commission_available_at,
    combined.maturity_days
  FROM (
    SELECT 
      ae.id as earning_id,
      ae.order_id,
      o.order_number::TEXT,
      o.customer_name::TEXT,
      o.created_at as order_date,
      o.store_id,
      s.name::TEXT as store_name,
      ae.store_affiliate_id,
      ae.order_total,
      o.subtotal as order_subtotal,
      COALESCE(o.coupon_discount, 0::NUMERIC) as coupon_discount,
      ae.commission_amount,
      ae.status::TEXT as commission_status,
      o.coupon_code::TEXT,
      CASE 
        WHEN o.status::TEXT IN ('entregue', 'delivered') THEN
          o.updated_at + (COALESCE(s.affiliate_commission_maturity_days, 7) || ' days')::INTERVAL
        ELSE NULL
      END as commission_available_at,
      COALESCE(s.affiliate_commission_maturity_days, 7) as maturity_days,
      1 as priority
    FROM affiliate_earnings ae
    JOIN store_affiliates sa ON sa.id = ae.store_affiliate_id
    JOIN orders o ON o.id = ae.order_id
    JOIN stores s ON s.id = o.store_id
    WHERE sa.affiliate_account_id = p_affiliate_account_id
    AND sa.is_active = true
    
    UNION ALL
    
    SELECT 
      ae.id as earning_id,
      ae.order_id,
      o.order_number::TEXT,
      o.customer_name::TEXT,
      o.created_at as order_date,
      o.store_id,
      s.name::TEXT as store_name,
      ae.store_affiliate_id,
      ae.order_total,
      o.subtotal as order_subtotal,
      COALESCE(o.coupon_discount, 0::NUMERIC) as coupon_discount,
      ae.commission_amount,
      ae.status::TEXT as commission_status,
      o.coupon_code::TEXT,
      CASE 
        WHEN o.status::TEXT IN ('entregue', 'delivered') THEN
          o.updated_at + (COALESCE(s.affiliate_commission_maturity_days, 7) || ' days')::INTERVAL
        ELSE NULL
      END as commission_available_at,
      COALESCE(s.affiliate_commission_maturity_days, 7) as maturity_days,
      2 as priority
    FROM affiliate_earnings ae
    JOIN affiliates a ON a.id = ae.affiliate_id
    JOIN orders o ON o.id = ae.order_id
    JOIN stores s ON s.id = o.store_id
    WHERE a.affiliate_account_id = p_affiliate_account_id
    AND a.is_active = true
    AND ae.store_affiliate_id IS NULL
    
    UNION ALL
    
    SELECT 
      ae.id as earning_id,
      ae.order_id,
      o.order_number::TEXT,
      o.customer_name::TEXT,
      o.created_at as order_date,
      o.store_id,
      s.name::TEXT as store_name,
      ae.store_affiliate_id,
      ae.order_total,
      o.subtotal as order_subtotal,
      COALESCE(o.coupon_discount, 0::NUMERIC) as coupon_discount,
      ae.commission_amount,
      ae.status::TEXT as commission_status,
      o.coupon_code::TEXT,
      CASE 
        WHEN o.status::TEXT IN ('entregue', 'delivered') THEN
          o.updated_at + (COALESCE(s.affiliate_commission_maturity_days, 7) || ' days')::INTERVAL
        ELSE NULL
      END as commission_available_at,
      COALESCE(s.affiliate_commission_maturity_days, 7) as maturity_days,
      3 as priority
    FROM affiliate_earnings ae
    JOIN affiliates a ON a.id = ae.affiliate_id
    JOIN orders o ON o.id = ae.order_id
    JOIN stores s ON s.id = o.store_id
    JOIN affiliate_accounts aa ON aa.id = p_affiliate_account_id
    WHERE a.affiliate_account_id IS NULL
    AND ae.store_affiliate_id IS NULL
    AND a.is_active = true
    AND a.cpf_cnpj IS NOT NULL 
    AND aa.cpf_cnpj IS NOT NULL
    AND REGEXP_REPLACE(a.cpf_cnpj, '[^0-9]', '', 'g') = REGEXP_REPLACE(aa.cpf_cnpj, '[^0-9]', '', 'g')
  ) combined
  ORDER BY combined.order_id, 
           CASE WHEN combined.commission_amount > 0 THEN 0 ELSE 1 END ASC,
           combined.priority ASC, 
           combined.order_date DESC;
END;
$$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION public.get_affiliate_stores(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_affiliate_orders(UUID) TO anon, authenticated, service_role;