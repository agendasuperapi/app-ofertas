-- Limpar todos os triggers problemáticos relacionados a WhatsApp e HTTP
DROP TRIGGER IF EXISTS on_order_created ON public.orders;
DROP TRIGGER IF EXISTS notify_order_whatsapp_trigger ON public.orders;
DROP TRIGGER IF EXISTS send_whatsapp_on_order ON public.orders;
DROP TRIGGER IF EXISTS trg_orders_webhook ON public.orders;

-- Remover funções problemáticas
DROP FUNCTION IF EXISTS public.notify_order_whatsapp() CASCADE;
DROP FUNCTION IF EXISTS public.notify_order_created() CASCADE;
DROP FUNCTION IF EXISTS public.send_order_notification() CASCADE;

-- Garantir que o trigger de updated_at está correto
DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Verificar se a função create_order_rpc está funcionando corretamente
-- Recriar para garantir que não há problemas
CREATE OR REPLACE FUNCTION public.create_order_rpc(
  p_store_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_delivery_type text,
  p_order_number text,
  p_subtotal numeric,
  p_delivery_fee numeric,
  p_total numeric,
  p_payment_method text,
  p_delivery_street text DEFAULT NULL,
  p_delivery_number text DEFAULT NULL,
  p_delivery_neighborhood text DEFAULT NULL,
  p_delivery_complement text DEFAULT NULL,
  p_change_amount numeric DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_customer_id UUID;
  v_result jsonb;
BEGIN
  -- Get current user ID
  v_customer_id := auth.uid();
  
  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  -- Insert order
  INSERT INTO public.orders (
    store_id,
    customer_id,
    customer_name,
    customer_phone,
    delivery_type,
    order_number,
    subtotal,
    delivery_fee,
    total,
    status,
    payment_method,
    delivery_street,
    delivery_number,
    delivery_neighborhood,
    delivery_complement,
    change_amount,
    notes
  ) VALUES (
    p_store_id,
    v_customer_id,
    p_customer_name,
    p_customer_phone,
    p_delivery_type,
    p_order_number,
    p_subtotal,
    p_delivery_fee,
    p_total,
    'pending',
    p_payment_method,
    p_delivery_street,
    p_delivery_number,
    p_delivery_neighborhood,
    p_delivery_complement,
    p_change_amount,
    p_notes
  )
  RETURNING id INTO v_order_id;
  
  -- Return the created order as JSON
  SELECT to_jsonb(o.*) INTO v_result
  FROM public.orders o
  WHERE o.id = v_order_id;
  
  RETURN v_result;
END;
$$;