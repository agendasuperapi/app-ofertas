-- Criar trigger para enviar notificação WhatsApp após INSERT ou UPDATE de pedidos
CREATE TRIGGER trigger_send_order_whatsapp
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_order_whatsapp();