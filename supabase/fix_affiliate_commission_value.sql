-- Script para corrigir comissão do afiliado que está como 0%
-- Execute após verificar que este é o problema

-- =====================================================
-- PASSO 1: Verificar configuração atual
-- =====================================================
SELECT 
  sa.id,
  aa.email,
  sa.default_commission_type,
  sa.default_commission_value,
  '⚠️ PROBLEMA: Comissão está como 0%' as diagnostico
FROM store_affiliates sa
JOIN affiliate_accounts aa ON aa.id = sa.affiliate_account_id
WHERE LOWER(aa.email) = 'luanateste04@gmail.com'
AND sa.default_commission_value = 0;

-- =====================================================
-- PASSO 2: Atualizar comissão para 10% (store_affiliates)
-- =====================================================
UPDATE store_affiliates sa
SET 
  default_commission_type = 'percentage',
  default_commission_value = 10
FROM affiliate_accounts aa
WHERE aa.id = sa.affiliate_account_id
AND LOWER(aa.email) = 'luanateste04@gmail.com'
AND sa.default_commission_value = 0;

-- =====================================================
-- PASSO 3: Atualizar comissão para 10% (affiliates - legado)
-- =====================================================
UPDATE affiliates
SET 
  default_commission_type = 'percentage',
  default_commission_value = 10
WHERE LOWER(email) = 'luanateste04@gmail.com'
AND default_commission_value = 0;

-- =====================================================
-- PASSO 4: Verificar se atualizou
-- =====================================================
SELECT 
  sa.id,
  aa.email,
  sa.default_commission_type,
  sa.default_commission_value,
  '✅ Comissão atualizada!' as status
FROM store_affiliates sa
JOIN affiliate_accounts aa ON aa.id = sa.affiliate_account_id
WHERE LOWER(aa.email) = 'luanateste04@gmail.com';
