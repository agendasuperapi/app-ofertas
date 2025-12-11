
-- FASE B: Remoção das estruturas legadas de vinculação de cupom

-- 1. Remover coluna coupon_id da tabela affiliates
ALTER TABLE public.affiliates DROP COLUMN IF EXISTS coupon_id;

-- 2. Remover coluna coupon_id da tabela store_affiliates
ALTER TABLE public.store_affiliates DROP COLUMN IF EXISTS coupon_id;

-- 3. Remover tabela affiliate_coupons (legada)
DROP TABLE IF EXISTS public.affiliate_coupons;

-- 4. Remover arquivo SQL de referência (não necessário em produção)
-- O arquivo supabase/affiliate_coupons_junction.sql será removido manualmente do projeto
