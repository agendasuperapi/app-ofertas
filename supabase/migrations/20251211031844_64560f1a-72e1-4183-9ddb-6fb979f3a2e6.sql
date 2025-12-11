-- 1. Corrigir afiliado Felipe - vincular affiliate_account_id
UPDATE affiliates 
SET affiliate_account_id = 'ed3c8238-0ff5-45c0-b170-f9a100113f08'
WHERE id = '161c1fe5-3618-48de-a001-5c3618f3eb73'
AND affiliate_account_id IS NULL;

-- 2. Criar função de validação de integridade de dados de afiliados
CREATE OR REPLACE FUNCTION public.validate_affiliate_data_integrity()
RETURNS TABLE(
  issue_type TEXT,
  table_name TEXT,
  record_id UUID,
  description TEXT,
  suggested_fix TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar affiliate_earnings sem store_affiliate_id
  RETURN QUERY
  SELECT 
    'missing_store_affiliate_id'::TEXT as issue_type,
    'affiliate_earnings'::TEXT as table_name,
    ae.id as record_id,
    format('Earning para order_id %s não tem store_affiliate_id', ae.order_id)::TEXT as description,
    'Executar process_affiliate_commission_for_order ou vincular manualmente'::TEXT as suggested_fix
  FROM affiliate_earnings ae
  WHERE ae.store_affiliate_id IS NULL;

  -- Verificar affiliates sem affiliate_account_id
  RETURN QUERY
  SELECT 
    'missing_affiliate_account_id'::TEXT as issue_type,
    'affiliates'::TEXT as table_name,
    a.id as record_id,
    format('Afiliado %s (email: %s) sem affiliate_account_id', a.name, a.email)::TEXT as description,
    'Vincular affiliate_account_id baseado em CPF ou criar nova conta'::TEXT as suggested_fix
  FROM affiliates a
  WHERE a.affiliate_account_id IS NULL;

  -- Verificar store_affiliates sem affiliate_account_id
  RETURN QUERY
  SELECT 
    'missing_affiliate_account_id'::TEXT as issue_type,
    'store_affiliates'::TEXT as table_name,
    sa.id as record_id,
    format('Store affiliate para store_id %s sem affiliate_account_id', sa.store_id)::TEXT as description,
    'Vincular affiliate_account_id ou remover registro órfão'::TEXT as suggested_fix
  FROM store_affiliates sa
  WHERE sa.affiliate_account_id IS NULL;

  -- Verificar affiliates com CPF que não tem conta correspondente
  RETURN QUERY
  SELECT 
    'orphan_cpf'::TEXT as issue_type,
    'affiliates'::TEXT as table_name,
    a.id as record_id,
    format('Afiliado %s tem CPF %s mas não encontra affiliate_account', a.name, a.cpf_cnpj)::TEXT as description,
    'Criar affiliate_account para este CPF ou vincular existente'::TEXT as suggested_fix
  FROM affiliates a
  WHERE a.cpf_cnpj IS NOT NULL
  AND a.affiliate_account_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM affiliate_accounts aa
    WHERE REGEXP_REPLACE(aa.cpf_cnpj, '[^0-9]', '', 'g') = REGEXP_REPLACE(a.cpf_cnpj, '[^0-9]', '', 'g')
  );

  -- Verificar dessincronia entre affiliates e store_affiliates (comissão)
  RETURN QUERY
  SELECT 
    'commission_desync'::TEXT as issue_type,
    'affiliates/store_affiliates'::TEXT as table_name,
    a.id as record_id,
    format('Afiliado %s: affiliates tem %s%% mas store_affiliates tem %s%%', 
      a.name, a.default_commission_value, sa.default_commission_value)::TEXT as description,
    'Sincronizar valores de comissão entre as tabelas'::TEXT as suggested_fix
  FROM affiliates a
  JOIN store_affiliates sa ON sa.affiliate_account_id = a.affiliate_account_id AND sa.store_id = a.store_id
  WHERE a.default_commission_value != sa.default_commission_value
  OR a.default_commission_type != sa.default_commission_type;
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION public.validate_affiliate_data_integrity() TO authenticated;