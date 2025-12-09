-- Enable Realtime for coupon_discount_rules table
ALTER TABLE public.coupon_discount_rules REPLICA IDENTITY FULL;

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.coupon_discount_rules;

-- Also enable for coupons table if not already enabled
ALTER TABLE public.coupons REPLICA IDENTITY FULL;

-- Check if coupons is already in publication, if not add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'coupons'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.coupons;
  END IF;
END $$;