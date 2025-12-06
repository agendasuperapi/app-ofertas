-- Create table for coupon-specific discount rules (per product or category)
CREATE TABLE public.coupon_discount_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('product', 'category')),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  category_name TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL CHECK (discount_value >= 0),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure product_id is set for product rules, category_name for category rules
  CONSTRAINT valid_rule_target CHECK (
    (rule_type = 'product' AND product_id IS NOT NULL) OR
    (rule_type = 'category' AND category_name IS NOT NULL)
  )
);

-- Indexes for performance
CREATE INDEX idx_coupon_discount_rules_coupon_id ON public.coupon_discount_rules(coupon_id);
CREATE INDEX idx_coupon_discount_rules_product_id ON public.coupon_discount_rules(product_id);

-- Enable RLS
ALTER TABLE public.coupon_discount_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Store owners and employees can manage rules for their coupons
CREATE POLICY "Store owners and employees can manage coupon discount rules"
ON public.coupon_discount_rules
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM coupons c
    JOIN stores s ON s.id = c.store_id
    WHERE c.id = coupon_discount_rules.coupon_id
    AND (
      s.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM store_employees
        WHERE store_employees.store_id = s.id
        AND store_employees.user_id = auth.uid()
        AND store_employees.is_active = true
        AND ((store_employees.permissions -> 'coupons' ->> 'update')::boolean = true)
      )
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

-- Anyone can view rules for active coupons (needed for cart validation)
CREATE POLICY "Anyone can view coupon discount rules for active coupons"
ON public.coupon_discount_rules
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM coupons c
    WHERE c.id = coupon_discount_rules.coupon_id
    AND c.is_active = true
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_coupon_discount_rules_updated_at
BEFORE UPDATE ON public.coupon_discount_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();