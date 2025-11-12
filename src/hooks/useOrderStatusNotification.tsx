import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useOrderStatusNotification = (storeId: string | undefined) => {
  const { toast } = useToast();

  useEffect(() => {
    if (!storeId) return;

    // Subscribe to order updates
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
          console.log('Order status changed:', payload);
          
          // Send WhatsApp notification
          try {
            const { data, error } = await supabase.functions.invoke('send-order-whatsapp', {
              body: { record: payload.new }
            });

            if (error) {
              console.error('Error sending WhatsApp notification:', error);
              return;
            }

            if (data?.success) {
              console.log('WhatsApp notification sent successfully');
              toast({
                title: "Mensagem enviada",
                description: `WhatsApp enviado para o cliente sobre o pedido #${payload.new.order_number}`,
              });
            }
          } catch (error) {
            console.error('Failed to send WhatsApp:', error);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeId, toast]);
};
