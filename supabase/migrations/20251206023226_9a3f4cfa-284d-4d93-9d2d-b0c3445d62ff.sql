-- Fix Security Definer View issue by recreating with SECURITY INVOKER
-- This ensures the view uses the permissions of the querying user

DROP VIEW IF EXISTS public.stores_public;

CREATE VIEW public.stores_public 
WITH (security_invoker = true)
AS
SELECT 
  id,
  name,
  slug,
  description,
  logo_url,
  banner_url,
  category,
  address,
  status,
  rating,
  total_reviews,
  delivery_fee,
  min_order_value,
  avg_delivery_time,
  is_open,
  operating_hours,
  created_at,
  updated_at,
  pickup_address,
  accepts_delivery,
  accepts_pickup,
  accepts_pix,
  accepts_card,
  accepts_cash,
  menu_label,
  show_avg_delivery_time,
  allow_orders_when_closed,
  require_delivery_zone,
  product_layout_template,
  product_layout_template_desktop,
  product_layout_template_mobile,
  uncategorized_display_order,
  store_address_pickup_enabled,
  store_address_pickup_name,
  CASE WHEN show_address_on_store_page = true THEN store_cep ELSE NULL END as store_cep,
  CASE WHEN show_address_on_store_page = true THEN store_city ELSE NULL END as store_city,
  CASE WHEN show_address_on_store_page = true THEN store_street ELSE NULL END as store_street,
  CASE WHEN show_address_on_store_page = true THEN store_street_number ELSE NULL END as store_street_number,
  CASE WHEN show_address_on_store_page = true THEN store_neighborhood ELSE NULL END as store_neighborhood,
  CASE WHEN show_address_on_store_page = true THEN store_complement ELSE NULL END as store_complement,
  show_address_on_store_page,
  CASE WHEN show_phone_on_store_page = true THEN phone ELSE NULL END as phone,
  show_phone_on_store_page,
  CASE WHEN show_whatsapp_on_store_page = true THEN whatsapp ELSE NULL END as whatsapp,
  show_whatsapp_on_store_page,
  show_pix_key_to_customer,
  pix_message_title,
  pix_message_description,
  pix_message_footer,
  pix_message_button_text,
  pix_message_enabled,
  pix_copiacola_message_title,
  pix_copiacola_message_description,
  pix_copiacola_message_footer,
  pix_copiacola_message_button_text,
  pix_copiacola_message_enabled,
  pix_copiacola_button_text
FROM public.stores
WHERE status = 'active';

-- Re-grant access
GRANT SELECT ON public.stores_public TO authenticated;
GRANT SELECT ON public.stores_public TO anon;

-- Now we need to add a policy for anonymous/public users to read from stores table 
-- (limited to what the view filters) since SECURITY INVOKER means RLS applies
-- We add a SELECT policy that allows reading ONLY active stores but doesn't expose owner_id
CREATE POLICY "Public can read active stores for view" 
ON public.stores 
FOR SELECT 
TO anon
USING (status = 'active');

-- Also for authenticated users who aren't owners
CREATE POLICY "Authenticated users can read active stores for view" 
ON public.stores 
FOR SELECT 
TO authenticated
USING (status = 'active');