-- Parte 1: Adicionar coluna coupon_id na tabela store_affiliates
ALTER TABLE public.store_affiliates 
ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_store_affiliates_coupon_id 
ON public.store_affiliates(coupon_id);

-- Migrar primeiro cupom de store_affiliate_coupons para coupon_id
UPDATE public.store_affiliates sa
SET coupon_id = (
  SELECT sac.coupon_id 
  FROM public.store_affiliate_coupons sac 
  WHERE sac.store_affiliate_id = sa.id 
  LIMIT 1
)
WHERE coupon_id IS NULL;

-- Parte 2: Inserir afiliados faltantes na tabela affiliates
INSERT INTO public.affiliates (
  store_id, name, email, phone, cpf_cnpj, pix_key,
  is_active, commission_enabled, default_commission_type,
  default_commission_value, use_default_commission,
  commission_maturity_days, affiliate_account_id
)
SELECT 
  sa.store_id,
  aa.name, aa.email, aa.phone, aa.cpf_cnpj, aa.pix_key,
  COALESCE(sa.is_active, true),
  COALESCE(sa.commission_enabled, true),
  COALESCE(sa.default_commission_type, 'percentage'),
  COALESCE(sa.default_commission_value, 0),
  COALESCE(sa.use_default_commission, true),
  COALESCE(sa.commission_maturity_days, 7),
  sa.affiliate_account_id
FROM public.store_affiliates sa
JOIN public.affiliate_accounts aa ON aa.id = sa.affiliate_account_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.affiliates a 
  WHERE a.store_id = sa.store_id 
  AND a.affiliate_account_id = sa.affiliate_account_id
)
AND sa.affiliate_account_id IS NOT NULL;

-- Parte 3: Sincronizar cupons para os novos afiliados
INSERT INTO public.affiliate_coupons (affiliate_id, coupon_id)
SELECT a.id, sac.coupon_id
FROM public.store_affiliate_coupons sac
JOIN public.store_affiliates sa ON sa.id = sac.store_affiliate_id
JOIN public.affiliates a ON a.affiliate_account_id = sa.affiliate_account_id 
                  AND a.store_id = sa.store_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.affiliate_coupons ac 
  WHERE ac.affiliate_id = a.id 
  AND ac.coupon_id = sac.coupon_id
)
ON CONFLICT (affiliate_id, coupon_id) DO NOTHING;

-- Atualizar coupon_id legacy dos novos afiliados
UPDATE public.affiliates a
SET coupon_id = (
  SELECT ac.coupon_id 
  FROM public.affiliate_coupons ac 
  WHERE ac.affiliate_id = a.id 
  LIMIT 1
)
WHERE a.coupon_id IS NULL
AND EXISTS (SELECT 1 FROM public.affiliate_coupons ac WHERE ac.affiliate_id = a.id);