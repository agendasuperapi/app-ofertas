-- Atualizar get_affiliate_orders para usar affiliate_account_id e CPF ao invés de email
-- Isso garante que mudanças no email não afetam a exibição de pedidos/comissões

DROP FUNCTION IF EXISTS public.get_affiliate_orders(UUID);

CREATE OR REPLACE FUNCTION public.get_affiliate_orders(p_affiliate_account_id UUID)
RETURNS TABLE (
  earning_id UUID,
  order_id UUID,
  order_number TEXT,
  customer_name TEXT,
  order_date TIMESTAMPTZ,
  store_id UUID,
  store_name TEXT,
  store_affiliate_id UUID,
  order_total NUMERIC,
  order_subtotal NUMERIC,
  coupon_discount NUMERIC,
  commission_amount NUMERIC,
  commission_status TEXT,
  coupon_code TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  
  -- Usar DISTINCT ON para eliminar duplicatas por order_id
  -- Prioriza: 1) registros com comissão > 0, 2) sistema novo, 3) data mais recente
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
    combined.coupon_code
  FROM (
    -- Sistema novo: via store_affiliates.affiliate_account_id (PRIORIDADE 1)
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
      1 as priority
    FROM affiliate_earnings ae
    JOIN store_affiliates sa ON sa.id = ae.store_affiliate_id
    JOIN orders o ON o.id = ae.order_id
    JOIN stores s ON s.id = o.store_id
    WHERE sa.affiliate_account_id = p_affiliate_account_id
    AND sa.is_active = true
    
    UNION ALL
    
    -- Sistema legado: via affiliates.affiliate_account_id (PRIORIDADE 2)
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
      2 as priority
    FROM affiliate_earnings ae
    JOIN affiliates a ON a.id = ae.affiliate_id
    JOIN orders o ON o.id = ae.order_id
    JOIN stores s ON s.id = o.store_id
    WHERE a.affiliate_account_id = p_affiliate_account_id
    AND a.is_active = true
    AND ae.store_affiliate_id IS NULL
    
    UNION ALL
    
    -- Fallback CPF: para registros antigos sem affiliate_account_id (PRIORIDADE 3)
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
  -- Prioriza registros com comissão > 0 antes da prioridade do sistema
  ORDER BY combined.order_id, 
           CASE WHEN combined.commission_amount > 0 THEN 0 ELSE 1 END ASC,
           combined.priority ASC, 
           combined.order_date DESC;
END;
$$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION public.get_affiliate_orders(UUID) TO anon, authenticated, service_role;