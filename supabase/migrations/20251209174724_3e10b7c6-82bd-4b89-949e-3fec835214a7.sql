-- ============================================================================
-- LIMPEZA: Remover affiliate_accounts órfãos e adicionar constraint CPF único
-- ============================================================================

-- 1. Deletar sessões de accounts órfãos (por segurança)
DELETE FROM affiliate_sessions
WHERE affiliate_account_id IN (
  SELECT aa.id
  FROM affiliate_accounts aa
  LEFT JOIN store_affiliates sa ON sa.affiliate_account_id = aa.id
  WHERE sa.id IS NULL
);

-- 2. Deletar accounts órfãos (sem loja vinculada)
DELETE FROM affiliate_accounts
WHERE id IN (
  SELECT aa.id
  FROM affiliate_accounts aa
  LEFT JOIN store_affiliates sa ON sa.affiliate_account_id = aa.id
  WHERE sa.id IS NULL
);

-- 3. Criar índice único no CPF normalizado (ignorando nulos e vazios)
-- Isso previne duplicatas futuras de CPF
CREATE UNIQUE INDEX IF NOT EXISTS affiliate_accounts_cpf_unique 
ON affiliate_accounts (REGEXP_REPLACE(cpf_cnpj, '[^0-9]', '', 'g')) 
WHERE cpf_cnpj IS NOT NULL AND cpf_cnpj != '';