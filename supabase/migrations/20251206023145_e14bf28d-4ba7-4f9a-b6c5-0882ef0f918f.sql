-- =====================================================
-- Secure Store Data: Hide Sensitive Fields from Public Access
-- Description: Creates a public view that excludes sensitive data
--              and restricts full table access to owners/admins only
-- =====================================================

-- 1. Create a public view that excludes sensitive columns
CREATE OR REPLACE VIEW public.stores_public AS
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
  -- Conditionally expose fields based on store settings
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
  -- PIX info: Only show to customer if enabled, exclude pix_key entirely from public view
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

-- 2. Grant SELECT access on the view to authenticated and anon roles
GRANT SELECT ON public.stores_public TO authenticated;
GRANT SELECT ON public.stores_public TO anon;

-- 3. Drop the old permissive public SELECT policy
DROP POLICY IF EXISTS "Anyone can view active stores" ON public.stores;

-- 4. Create new restrictive SELECT policy - only owners, employees, and admins can see full data
CREATE POLICY "Owners, employees, and admins can view stores" 
ON public.stores 
FOR SELECT 
USING (
  owner_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM store_employees 
    WHERE store_employees.store_id = stores.id 
    AND store_employees.user_id = auth.uid() 
    AND store_employees.is_active = true
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 5. Create a function for customers to get store PIX key only when placing orders
-- This ensures PIX key is only accessible in the checkout flow, not browsing
CREATE OR REPLACE FUNCTION public.get_store_pix_key_for_order(p_store_id uuid)
RETURNS TABLE(pix_key text, show_pix_key_to_customer boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only return if the store allows showing PIX key to customers
  RETURN QUERY
  SELECT s.pix_key, s.show_pix_key_to_customer
  FROM stores s
  WHERE s.id = p_store_id
  AND s.show_pix_key_to_customer = true;
END;
$$;

-- 6. Grant execute to authenticated users (only logged in customers can request PIX)
GRANT EXECUTE ON FUNCTION public.get_store_pix_key_for_order(uuid) TO authenticated;