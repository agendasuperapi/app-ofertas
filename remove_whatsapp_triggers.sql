-- Remove triggers antigos que disparam antes dos items serem inseridos
DROP TRIGGER IF EXISTS send_whatsapp_on_order_insert ON public.orders;
DROP TRIGGER IF EXISTS send_whatsapp_on_order_update ON public.orders;

-- Agora o WhatsApp é enviado pela aplicação DEPOIS de inserir todos os items
