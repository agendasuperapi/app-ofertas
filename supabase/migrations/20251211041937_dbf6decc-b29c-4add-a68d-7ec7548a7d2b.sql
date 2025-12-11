-- 1. Adicionar coluna coupon_id na tabela affiliates (se não existir)
ALTER TABLE public.affiliates 
ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL;

-- 2. Criar tabela affiliate_coupons (junction table para múltiplos cupons)
CREATE TABLE IF NOT EXISTS public.affiliate_coupons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(affiliate_id, coupon_id)
);

-- 3. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_affiliate_coupons_affiliate ON public.affiliate_coupons(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_coupons_coupon ON public.affiliate_coupons(coupon_id);

-- 4. Habilitar RLS
ALTER TABLE public.affiliate_coupons ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS - Store owners podem gerenciar
DROP POLICY IF EXISTS "Store owners can manage affiliate coupons" ON public.affiliate_coupons;
CREATE POLICY "Store owners can manage affiliate coupons" ON public.affiliate_coupons
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.affiliates a
    JOIN public.stores s ON s.id = a.store_id
    WHERE a.id = affiliate_coupons.affiliate_id
    AND (s.owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);

-- 6. Políticas RLS - Afiliados podem visualizar seus cupons
DROP POLICY IF EXISTS "Affiliates can view their coupons" ON public.affiliate_coupons;
CREATE POLICY "Affiliates can view their coupons" ON public.affiliate_coupons
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.affiliates a
    WHERE a.id = affiliate_coupons.affiliate_id
    AND a.user_id = auth.uid()
  )
);

-- 7. Migrar dados existentes de store_affiliate_coupons para affiliate_coupons
INSERT INTO public.affiliate_coupons (affiliate_id, coupon_id)
SELECT DISTINCT a.id, sac.coupon_id
FROM public.store_affiliate_coupons sac
JOIN public.store_affiliates sa ON sa.id = sac.store_affiliate_id
JOIN public.affiliates a ON a.affiliate_account_id = sa.affiliate_account_id AND a.store_id = sa.store_id
WHERE sac.coupon_id IS NOT NULL
ON CONFLICT (affiliate_id, coupon_id) DO NOTHING;

-- 8. Atualizar coupon_id legacy na tabela affiliates com o primeiro cupom disponível
UPDATE public.affiliates a
SET coupon_id = (
  SELECT ac.coupon_id 
  FROM public.affiliate_coupons ac 
  WHERE ac.affiliate_id = a.id 
  ORDER BY ac.created_at ASC
  LIMIT 1
)
WHERE a.coupon_id IS NULL
AND EXISTS (SELECT 1 FROM public.affiliate_coupons ac WHERE ac.affiliate_id = a.id);