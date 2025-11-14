import { supabase } from '@/integrations/supabase/client';

/**
 * Função para corrigir cupom de um pedido específico
 * Execute esta função no console do navegador uma vez
 */
export async function fixOrderCoupon() {
  try {
    const { data, error } = await supabase
      .from('orders')
      .update({
        coupon_code: 'promo10',
        coupon_discount: 6.90,
      } as any)
      .eq('order_number', '#96187023')
      .select();

    if (error) {
      console.error('❌ Erro ao atualizar pedido:', error);
      return { success: false, error };
    }

    console.log('✅ Pedido #96187023 atualizado com sucesso:', data);
    return { success: true, data };
  } catch (err) {
    console.error('❌ Erro inesperado:', err);
    return { success: false, error: err };
  }
}

// Para executar: abra o console e digite: fixOrderCoupon()
if (typeof window !== 'undefined') {
  (window as any).fixOrderCoupon = fixOrderCoupon;
}
