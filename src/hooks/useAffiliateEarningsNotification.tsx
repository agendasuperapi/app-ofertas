import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Som de notificação para ganhos do afiliado
const playEarningsSound = () => {
  const soundEnabled = localStorage.getItem('notification-sound-enabled');
  if (soundEnabled !== null && !JSON.parse(soundEnabled)) {
    return;
  }

  const volumeString = localStorage.getItem('notification-volume');
  const volume = volumeString !== null ? JSON.parse(volumeString) / 100 : 0.7;

  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Som de "dinheiro" - dois toques ascendentes
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(1200, audioContext.currentTime + 0.15);
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(volume * 0.6, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    console.error('Erro ao tocar som de ganhos:', error);
  }
};

interface UseAffiliateEarningsNotificationOptions {
  storeAffiliateIds: string[];
  onNewEarning?: () => void;
}

export const useAffiliateEarningsNotification = ({
  storeAffiliateIds,
  onNewEarning
}: UseAffiliateEarningsNotificationOptions) => {
  const channelRef = useRef<any>(null);
  const lastProcessedRef = useRef<string>('');
  const onNewEarningRef = useRef(onNewEarning);

  useEffect(() => {
    onNewEarningRef.current = onNewEarning;
  }, [onNewEarning]);

  useEffect(() => {
    // Limpar canal anterior antes de qualquer coisa
    if (channelRef.current) {
      console.log('🔕 Limpando canal anterior de ganhos');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    if (!storeAffiliateIds.length) {
      console.log('💰 Sem IDs de afiliado para escutar');
      return;
    }

    console.log('💰 Iniciando escuta de ganhos para afiliado:', storeAffiliateIds);

    // Criar canal com nome único baseado nos IDs
    const channelName = `affiliate-earnings-${storeAffiliateIds.join('-').slice(0, 50)}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'affiliate_earnings'
        },
        async (payload) => {
          const earning = payload.new as any;
          
          console.log('💰 Novo registro de comissão criado:', earning);
          
          // Verificar se é para este afiliado
          if (!earning.store_affiliate_id || !storeAffiliateIds.includes(earning.store_affiliate_id)) {
            console.log('💰 Evento não é para este afiliado, ignorando');
            return;
          }

          // Evitar duplicatas usando order_id e updated_at
          const eventId = `${earning.order_id}-${earning.commission_amount}`;
          if (lastProcessedRef.current === eventId) {
            console.log('💰 Evento duplicado, ignorando');
            return;
          }
          lastProcessedRef.current = eventId;

          const commissionAmount = earning.commission_amount || 0;

          // Só notificar se a comissão for maior que 0
          if (commissionAmount <= 0) {
            console.log('💰 Comissão com valor 0 - ignorando notificação');
            return;
          }

          // Buscar nome do cliente do pedido
          let customerName = 'Cliente';
          if (earning.order_id) {
            const { data: orderData } = await supabase
              .from('orders')
              .select('customer_name, order_number')
              .eq('id', earning.order_id)
              .single();
            
            if (orderData?.customer_name) {
              customerName = orderData.customer_name;
            }
          }

          console.log('💰 Nova comissão recebida:', {
            customerName,
            commissionAmount,
            orderId: earning.order_id
          });

          // Tocar som
          playEarningsSound();

          // Mostrar toast com sonner
          toast.success('💰 Nova Comissão Gerada!', {
            description: `${customerName} - R$ ${commissionAmount.toFixed(2)}`,
            duration: 8000,
          });

          // Callback para atualizar dados
          if (onNewEarningRef.current) {
            onNewEarningRef.current();
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Status da subscrição de ganhos:', status);
      });

    channelRef.current = channel;

    return () => {
      console.log('🔕 Encerrando escuta de ganhos (cleanup)');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [storeAffiliateIds.join(',')]); // Dependência como string para evitar re-renders desnecessários
};
