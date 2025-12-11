-- Dropar função antiga e recriar com novo tipo de retorno
DROP FUNCTION IF EXISTS get_affiliate_order_items(UUID, UUID);

-- Recriar função get_affiliate_order_items com store_affiliate_id como prioridade
CREATE OR REPLACE FUNCTION public.get_affiliate_order_items(p_order_id UUID, p_affiliate_account_id UUID)
RETURNS TABLE(
  item_id UUID,
  product_name TEXT,
  product_category TEXT,
  quantity INT,
  unit_price NUMERIC,
  item_subtotal NUMERIC,
  item_discount NUMERIC,
  item_value_with_discount NUMERIC,
  is_coupon_eligible BOOLEAN,
  commission_type TEXT,
  commission_value NUMERIC,
  commission_amount NUMERIC,
  commission_source TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    aie.order_item_id as item_id,
    aie.product_name,
    aie.product_category,
    oi.quantity,
    oi.unit_price,
    aie.item_subtotal,
    COALESCE(aie.item_discount, 0::NUMERIC) as item_discount,
    aie.item_value_with_discount,
    COALESCE(aie.is_coupon_eligible, false) as is_coupon_eligible,
    aie.commission_type,
    aie.commission_value,
    aie.commission_amount,
    COALESCE(aie.commission_source, 'default'::TEXT) as commission_source
  FROM affiliate_item_earnings aie
  JOIN affiliate_earnings ae ON ae.id = aie.earning_id
  JOIN order_items oi ON oi.id = aie.order_item_id
  WHERE ae.order_id = p_order_id
  AND (
    -- Prioridade 1: Verificar via store_affiliate_id
    EXISTS (
      SELECT 1 FROM store_affiliates sa
      WHERE sa.id = ae.store_affiliate_id
      AND sa.affiliate_account_id = p_affiliate_account_id
    )
    OR
    -- Fallback: Verificar via affiliate_id (dados legados)
    EXISTS (
      SELECT 1 FROM affiliates a
      WHERE a.id = ae.affiliate_id
      AND a.affiliate_account_id = p_affiliate_account_id
    )
    OR
    -- Fallback 2: Verificar via CPF (dados muito antigos)
    EXISTS (
      SELECT 1 FROM affiliates a
      JOIN affiliate_accounts aa ON aa.id = p_affiliate_account_id
      WHERE a.id = ae.affiliate_id
      AND a.cpf_cnpj IS NOT NULL
      AND aa.cpf_cnpj IS NOT NULL
      AND REGEXP_REPLACE(a.cpf_cnpj, '[^0-9]', '', 'g') = REGEXP_REPLACE(aa.cpf_cnpj, '[^0-9]', '', 'g')
    )
  );
END;
$$;