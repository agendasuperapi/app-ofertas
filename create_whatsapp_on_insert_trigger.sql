-- Ensure only DB triggers send WhatsApp on order creation with a small delay handled by Edge Function

-- Drop status-change trigger to avoid duplicate sends
DROP TRIGGER IF EXISTS send_whatsapp_on_status_change_only ON public.orders;
DROP TRIGGER IF EXISTS send_whatsapp_on_order_update ON public.orders;

-- Recreate insert trigger to notify Edge Function via http extension
DROP TRIGGER IF EXISTS send_whatsapp_on_order_insert ON public.orders;
CREATE TRIGGER send_whatsapp_on_order_insert
    AFTER INSERT ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_order_whatsapp();
