-- 1. First, create the order_complete_view (if not exists)
DROP VIEW IF EXISTS public.order_complete_view;

CREATE VIEW public.order_complete_view
WITH (security_invoker = true)
AS
SELECT 
  o.id,
  o.customer_id,
  o.store_id,
  o.status,
  o.total,
  o.subtotal,
  o.delivery_fee,
  o.change_amount,
  o.created_at,
  o.updated_at,
  o.notes,
  o.delivery_complement,
  o.delivery_neighborhood,
  o.delivery_number,
  o.delivery_street,
  o.customer_phone,
  o.customer_name,
  o.payment_method,
  o.delivery_type,
  o.order_number,
  COALESCE(
    json_agg(
      json_build_object(
        'id', oi.id,
        'product_id', oi.product_id,
        'product_name', oi.product_name,
        'product_slug', oi.product_slug,
        'quantity', oi.quantity,
        'unit_price', oi.unit_price,
        'subtotal', oi.subtotal,
        'observation', oi.observation,
        'flavors', (
          SELECT COALESCE(json_agg(
            json_build_object(
              'flavor_name', oif.flavor_name,
              'flavor_price', oif.flavor_price
            )
          ), '[]'::json)
          FROM order_item_flavors oif
          WHERE oif.order_item_id = oi.id
        ),
        'addons', (
          SELECT COALESCE(json_agg(
            json_build_object(
              'addon_name', oia.addon_name,
              'addon_price', oia.addon_price
            )
          ), '[]'::json)
          FROM order_item_addons oia
          WHERE oia.order_item_id = oi.id
        )
      )
    ) FILTER (WHERE oi.id IS NOT NULL),
    '[]'::json
  ) AS items
FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id
GROUP BY o.id;

-- Grant access
GRANT SELECT ON public.order_complete_view TO authenticated;
GRANT SELECT ON public.order_complete_view TO service_role;

-- 2. Create or replace the trigger function (already exists, but ensuring it's correct)
-- The function notify_order_whatsapp() already exists in the database

-- 3. Drop existing trigger if exists
DROP TRIGGER IF EXISTS send_whatsapp_on_order_insert ON public.orders;
DROP TRIGGER IF EXISTS send_whatsapp_on_order_update ON public.orders;

-- 4. Create trigger for INSERT (when order is created)
CREATE TRIGGER send_whatsapp_on_order_insert
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_order_whatsapp();

-- 5. Create trigger for UPDATE (when order status changes)
CREATE TRIGGER send_whatsapp_on_order_update
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.notify_order_whatsapp();
