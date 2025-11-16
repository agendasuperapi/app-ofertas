import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export const useOrderStatusNotification = (storeId: string | undefined) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!storeId) return;

    // Subscribe to order status changes (not creation)
    const channel = supabase
      .channel('order-status-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `store_id=eq.${storeId}`
        },
        async (payload) => {
          // Skip if it's a new insert (payload.old is null) - creation is handled by useOrders
          if (!payload.old) {
            console.log('Skipping WhatsApp for new order insert - already handled by useOrders');
            return;
          }

          // Only send WhatsApp if status actually changed
          if (payload.old.status === payload.new.status) return;

          console.log('Order status changed:', payload.old.status, '->', payload.new.status);
          
          // Invalidar queries para atualizar a lista automaticamente
          queryClient.invalidateQueries({ queryKey: ['store-orders'] });
          
          console.log('✅ Lista de pedidos atualizada após mudança de status');
          
          // WhatsApp: envio pelo cliente desativado. Banco de dados (trigger) fará o envio.
          console.log('🔕 WhatsApp via cliente desativado. Envio será feito pelo banco de dados.');

        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeId, toast, queryClient]);
};
