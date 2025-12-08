-- Migration: Alterar sistema de afiliados para usar CPF como identificador principal

-- 1. Remover constraint unique do email (se existir)
ALTER TABLE affiliate_accounts DROP CONSTRAINT IF EXISTS affiliate_accounts_email_key;

-- 2. Adicionar constraint unique no cpf_cnpj (se ainda não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'affiliate_accounts_cpf_cnpj_key'
  ) THEN
    -- Apenas adicionar constraint se não houver duplicatas
    -- Primeiro, verificar se há duplicatas
    IF NOT EXISTS (
      SELECT cpf_cnpj, COUNT(*) 
      FROM affiliate_accounts 
      WHERE cpf_cnpj IS NOT NULL AND cpf_cnpj != ''
      GROUP BY cpf_cnpj 
      HAVING COUNT(*) > 1
    ) THEN
      ALTER TABLE affiliate_accounts ADD CONSTRAINT affiliate_accounts_cpf_cnpj_key UNIQUE (cpf_cnpj);
    END IF;
  END IF;
END $$;

-- 3. Criar índice para busca por CPF (se não existir)
CREATE INDEX IF NOT EXISTS idx_affiliate_accounts_cpf_cnpj ON affiliate_accounts(cpf_cnpj);

-- 4. Atualizar a função get_affiliate_account_by_email para suportar busca por CPF
CREATE OR REPLACE FUNCTION public.get_affiliate_account_by_cpf(p_cpf TEXT)
RETURNS TABLE(id uuid, email text, name text, password_hash text, is_active boolean, is_verified boolean, cpf_cnpj text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  normalized_cpf TEXT;
BEGIN
  -- Normalizar CPF removendo caracteres não numéricos
  normalized_cpf := REGEXP_REPLACE(p_cpf, '[^0-9]', '', 'g');
  
  RETURN QUERY
  SELECT 
    aa.id,
    aa.email,
    aa.name,
    aa.password_hash,
    aa.is_active,
    aa.is_verified,
    aa.cpf_cnpj
  FROM affiliate_accounts aa
  WHERE REGEXP_REPLACE(aa.cpf_cnpj, '[^0-9]', '', 'g') = normalized_cpf
  LIMIT 1;
END;
$$;

-- 5. Garantir permissões
GRANT EXECUTE ON FUNCTION public.get_affiliate_account_by_cpf(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_affiliate_account_by_cpf(TEXT) TO authenticated;