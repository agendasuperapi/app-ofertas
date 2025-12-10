import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseAffiliateOrderStatusNotificationOptions {
  orderIds: string[];
  storeAffiliateIds?: string[];
  storeIds?: string[];
  onStatusChange?: () => void;
}

// Som de notificação para pedido entregue
const playDeliveredSound = () => {
  try {
    const soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
    const volume = parseFloat(localStorage.getItem('soundVolume') || '0.7');
    
    if (!soundEnabled) return;
    
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Som de "sucesso" - duas notas subindo
    const playNote = (frequency: number, startTime: number, duration: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(volume * 0.3, startTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };
    
    const now = audioContext.currentTime;
    playNote(523.25, now, 0.15); // C5
    playNote(659.25, now + 0.15, 0.2); // E5
  } catch (error) {
    console.log('Não foi possível tocar o som');
  }
};

// Som de notificação para novo pedido
const playNewOrderSound = () => {
  try {
    const soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
    const volume = parseFloat(localStorage.getItem('soundVolume') || '0.7');
    
    if (!soundEnabled) return;
    
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Som de "novo pedido" - três notas rápidas subindo
    const playNote = (frequency: number, startTime: number, duration: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(volume * 0.25, startTime + 0.03);
      gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };
    
    const now = audioContext.currentTime;
    playNote(440, now, 0.1); // A4
    playNote(523.25, now + 0.1, 0.1); // C5
    playNote(659.25, now + 0.2, 0.15); // E5
  } catch (error) {
    console.log('Não foi possível tocar o som');
  }
};

export const useAffiliateOrderStatusNotification = ({
  orderIds,
  storeAffiliateIds,
  storeIds,
  onStatusChange
}: UseAffiliateOrderStatusNotificationOptions) => {
  const lastProcessedEventRef = useRef<string>('');
  const lastProcessedNewOrderRef = useRef<string>('');
  const channelRef = useRef<any>(null);
  const earningsChannelRef = useRef<any>(null);
  const newOrdersChannelRef = useRef<any>(null);
  const onStatusChangeRef = useRef(onStatusChange);
  const location = useLocation();
  const isAffiliateDashboard = location.pathname.startsWith('/afiliado');
  
  // Manter ref atualizado
  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  }, [onStatusChange]);

  const handleStatusChange = useCallback((oldStatus: string, newStatus: string, orderNumber: string) => {
    const isDelivered = newStatus === 'entregue' || newStatus === 'delivered';
    const isCancelled = newStatus === 'cancelado' || newStatus === 'cancelled';
    
    if (isDelivered) {
      playDeliveredSound();
      toast.success('Pedido Entregue! 🎉', {
        description: `Pedido #${orderNumber} - Sua comissão foi confirmada!`,
        duration: 5000
      });
    } else if (isCancelled) {
      toast.error('Pedido Cancelado', {
        description: `Pedido #${orderNumber} foi cancelado`,
        duration: 5000
      });
    } else {
      // Status intermediário mudou
      toast.info('Status do Pedido Atualizado', {
        description: `Pedido #${orderNumber}: ${newStatus}`,
        duration: 3000
      });
    }
    
    // Atualizar dados do dashboard
    if (onStatusChangeRef.current) {
      onStatusChangeRef.current();
    }
  }, []);

  // Monitor order status changes
  useEffect(() => {
    // Limpar canal anterior
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Só criar canal se estiver no dashboard do afiliado
    if (!isAffiliateDashboard) {
      console.log('[AffiliateOrderStatus] Não está no dashboard do afiliado - notificações desabilitadas');
      return;
    }

    // Não criar canal se não há pedidos para monitorar
    if (!orderIds || orderIds.length === 0) {
      return;
    }

    console.log('[AffiliateOrderStatus] 📡 Iniciando monitoramento de', orderIds.length, 'pedidos');

    const channel = supabase
      .channel('affiliate-order-status-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          // Verificar se é um pedido do afiliado
          const orderId = payload.new?.id;
          if (!orderId || !orderIds.includes(orderId)) {
            return;
          }

          // Verificar se o status realmente mudou
          const oldStatus = payload.old?.status;
          const newStatus = payload.new?.status;
          
          if (!oldStatus || !newStatus || oldStatus === newStatus) {
            return;
          }

          // Prevenir processamento duplicado
          const eventId = `${orderId}-${newStatus}-${payload.new.updated_at}`;
          if (lastProcessedEventRef.current === eventId) {
            console.log('[AffiliateOrderStatus] ⏭️ Evento duplicado ignorado');
            return;
          }
          lastProcessedEventRef.current = eventId;

          console.log('[AffiliateOrderStatus] ✅ Status mudou:', oldStatus, '->', newStatus, 'Pedido:', payload.new.order_number);
          
          handleStatusChange(oldStatus, newStatus, payload.new.order_number || orderId);
        }
      )
      .subscribe((status) => {
        console.log('[AffiliateOrderStatus] Subscription status:', status);
      });
    
    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        console.log('[AffiliateOrderStatus] 🔌 Removendo canal');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [orderIds, handleStatusChange, isAffiliateDashboard]);

  // Monitor affiliate_earnings for commission updates (INSERT and UPDATE)
  useEffect(() => {
    // Limpar canal anterior
    if (earningsChannelRef.current) {
      supabase.removeChannel(earningsChannelRef.current);
      earningsChannelRef.current = null;
    }

    // Só criar canal se estiver no dashboard do afiliado
    if (!isAffiliateDashboard) {
      return;
    }

    if (!storeAffiliateIds || storeAffiliateIds.length === 0) {
      return;
    }

    console.log('[AffiliateOrderStatus] 📡 Monitorando earnings para', storeAffiliateIds.length, 'store_affiliates');

    const channel = supabase
      .channel('affiliate-earnings-status-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'affiliate_earnings'
        },
        (payload) => {
          const newRecord = payload.new as Record<string, any> | null;
          const oldRecord = payload.old as Record<string, any> | null;
          const storeAffiliateId = newRecord?.store_affiliate_id || oldRecord?.store_affiliate_id;
          
          if (!storeAffiliateId || !storeAffiliateIds.includes(storeAffiliateId)) {
            return;
          }

          console.log('[AffiliateOrderStatus] 💰 Earnings atualizado:', payload.eventType);
          
          // Atualizar dados do dashboard
          if (onStatusChangeRef.current) {
            onStatusChangeRef.current();
          }
        }
      )
      .subscribe((status) => {
        console.log('[AffiliateOrderStatus] Earnings subscription status:', status);
      });

    earningsChannelRef.current = channel;

    return () => {
      if (earningsChannelRef.current) {
        console.log('[AffiliateOrderStatus] 🔌 Removendo canal de earnings');
        supabase.removeChannel(earningsChannelRef.current);
        earningsChannelRef.current = null;
      }
    };
  }, [storeAffiliateIds, isAffiliateDashboard]);

  // Monitor NEW orders for affiliate's stores
  useEffect(() => {
    // Limpar canal anterior
    if (newOrdersChannelRef.current) {
      supabase.removeChannel(newOrdersChannelRef.current);
      newOrdersChannelRef.current = null;
    }

    // Só criar canal se estiver no dashboard do afiliado
    if (!isAffiliateDashboard) {
      return;
    }

    if (!storeIds || storeIds.length === 0) {
      return;
    }

    console.log('[AffiliateOrderStatus] 📡 Monitorando novos pedidos para', storeIds.length, 'lojas');

    const channel = supabase
      .channel('affiliate-new-orders')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          const newOrder = payload.new as Record<string, any>;
          
          // Verificar se é um pedido de uma das lojas do afiliado
          if (!newOrder?.store_id || !storeIds.includes(newOrder.store_id)) {
            return;
          }

          // Verificar se o pedido tem cupom (indica que pode ter comissão)
          if (!newOrder.coupon_code) {
            return;
          }

          // Prevenir processamento duplicado
          const eventId = `new-${newOrder.id}-${newOrder.created_at}`;
          if (lastProcessedNewOrderRef.current === eventId) {
            console.log('[AffiliateOrderStatus] ⏭️ Novo pedido duplicado ignorado');
            return;
          }
          lastProcessedNewOrderRef.current = eventId;

          console.log('[AffiliateOrderStatus] 🆕 Novo pedido detectado:', newOrder.order_number, 'Cupom:', newOrder.coupon_code);
          
          // Tocar som e mostrar notificação
          playNewOrderSound();
          toast.success('Novo Pedido! 🛒', {
            description: `Pedido #${newOrder.order_number} com cupom ${newOrder.coupon_code}`,
            duration: 5000
          });
          
          // Atualizar dados do dashboard
          if (onStatusChangeRef.current) {
            onStatusChangeRef.current();
          }
        }
      )
      .subscribe((status) => {
        console.log('[AffiliateOrderStatus] New orders subscription status:', status);
      });

    newOrdersChannelRef.current = channel;

    return () => {
      if (newOrdersChannelRef.current) {
        console.log('[AffiliateOrderStatus] 🔌 Removendo canal de novos pedidos');
        supabase.removeChannel(newOrdersChannelRef.current);
        newOrdersChannelRef.current = null;
      }
    };
  }, [storeIds, isAffiliateDashboard]);
};
