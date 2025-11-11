
-- Desabilitar temporariamente o trigger update_orders_updated_at durante INSERT
DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;

-- Recriar o trigger para disparar apenas em UPDATE (não em INSERT)
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
