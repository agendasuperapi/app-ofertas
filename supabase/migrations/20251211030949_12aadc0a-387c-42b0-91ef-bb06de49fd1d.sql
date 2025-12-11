-- ============================================================
-- FASE 1: PREPARAÇÃO - Adicionar colunas store_affiliate_id
-- ============================================================

-- 1.1. Adicionar store_affiliate_id em affiliate_commission_rules
ALTER TABLE affiliate_commission_rules 
ADD COLUMN IF NOT EXISTS store_affiliate_id UUID REFERENCES store_affiliates(id);

-- 1.2. Adicionar store_affiliate_id em affiliate_payments
ALTER TABLE affiliate_payments 
ADD COLUMN IF NOT EXISTS store_affiliate_id UUID REFERENCES store_affiliates(id);

-- 1.3. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_affiliate_commission_rules_store_affiliate_id 
ON affiliate_commission_rules(store_affiliate_id);

CREATE INDEX IF NOT EXISTS idx_affiliate_payments_store_affiliate_id 
ON affiliate_payments(store_affiliate_id);

-- ============================================================
-- FASE 1.2: MIGRAR DADOS EXISTENTES
-- ============================================================

-- Migrar store_affiliate_id em affiliate_commission_rules
-- Usando affiliate_account_id como ponte
UPDATE affiliate_commission_rules acr
SET store_affiliate_id = sa.id
FROM affiliates a
JOIN store_affiliates sa ON sa.affiliate_account_id = a.affiliate_account_id
WHERE acr.affiliate_id = a.id
AND acr.store_affiliate_id IS NULL
AND a.affiliate_account_id IS NOT NULL;

-- Fallback: Se affiliate_account_id não está populado, usar CPF
UPDATE affiliate_commission_rules acr
SET store_affiliate_id = sa.id
FROM affiliates a
JOIN affiliate_accounts aa ON REGEXP_REPLACE(aa.cpf_cnpj, '[^0-9]', '', 'g') = REGEXP_REPLACE(a.cpf_cnpj, '[^0-9]', '', 'g')
JOIN store_affiliates sa ON sa.affiliate_account_id = aa.id AND sa.store_id = a.store_id
WHERE acr.affiliate_id = a.id
AND acr.store_affiliate_id IS NULL
AND a.cpf_cnpj IS NOT NULL;

-- Migrar store_affiliate_id em affiliate_payments
UPDATE affiliate_payments ap
SET store_affiliate_id = sa.id
FROM affiliates a
JOIN store_affiliates sa ON sa.affiliate_account_id = a.affiliate_account_id
WHERE ap.affiliate_id = a.id
AND ap.store_affiliate_id IS NULL
AND a.affiliate_account_id IS NOT NULL;

-- Fallback para affiliate_payments usando CPF
UPDATE affiliate_payments ap
SET store_affiliate_id = sa.id
FROM affiliates a
JOIN affiliate_accounts aa ON REGEXP_REPLACE(aa.cpf_cnpj, '[^0-9]', '', 'g') = REGEXP_REPLACE(a.cpf_cnpj, '[^0-9]', '', 'g')
JOIN store_affiliates sa ON sa.affiliate_account_id = aa.id AND sa.store_id = a.store_id
WHERE ap.affiliate_id = a.id
AND ap.store_affiliate_id IS NULL
AND a.cpf_cnpj IS NOT NULL;

-- ============================================================
-- VALIDAÇÃO: Verificar migração
-- ============================================================

-- Esta query será executada para verificar o status da migração
-- Os resultados aparecerão nos logs do Supabase
DO $$
DECLARE
  v_rules_total INT;
  v_rules_migrated INT;
  v_payments_total INT;
  v_payments_migrated INT;
BEGIN
  SELECT COUNT(*), COUNT(store_affiliate_id) 
  INTO v_rules_total, v_rules_migrated 
  FROM affiliate_commission_rules;
  
  SELECT COUNT(*), COUNT(store_affiliate_id) 
  INTO v_payments_total, v_payments_migrated 
  FROM affiliate_payments;
  
  RAISE NOTICE '=== FASE 1 VALIDAÇÃO ===';
  RAISE NOTICE 'affiliate_commission_rules: %/% migrados', v_rules_migrated, v_rules_total;
  RAISE NOTICE 'affiliate_payments: %/% migrados', v_payments_migrated, v_payments_total;
END $$;