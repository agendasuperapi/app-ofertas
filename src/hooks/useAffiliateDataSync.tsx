import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseAffiliateDataSyncOptions {
  affiliateAccountId?: string;
  storeAffiliateIds: string[];
  onDataChange?: () => void;
  enabled?: boolean;
}

export const useAffiliateDataSync = ({
  affiliateAccountId,
  storeAffiliateIds,
  onDataChange,
  enabled = true
}: UseAffiliateDataSyncOptions) => {
  const channelRef = useRef<any>(null);
  const onDataChangeRef = useRef(onDataChange);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastEventRef = useRef<string>('');
  const location = useLocation();
  const isAffiliateDashboard = location.pathname.startsWith('/afiliado');
  
  useEffect(() => {
    onDataChangeRef.current = onDataChange;
  }, [onDataChange]);

  const handleDataChange = useCallback((source: string, eventKey?: string) => {
    // Evitar eventos duplicados
    if (eventKey && lastEventRef.current === eventKey) {
      return;
    }
    if (eventKey) {
      lastEventRef.current = eventKey;
    }

    // Debounce para evitar múltiplas chamadas
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      // Mostrar toast informativo
      if (source === 'store_affiliates') {
        toast.info('⚙️ Configurações atualizadas', {
          description: 'Suas configurações de comissão foram atualizadas pela loja',
          duration: 4000
        });
      } else if (source === 'store_affiliate_coupons') {
        toast.info('🎫 Cupons atualizados', {
          description: 'Seus cupons foram atualizados pela loja',
          duration: 4000
        });
      } else if (source === 'affiliate_commission_rules') {
        toast.info('📋 Regras atualizadas', {
          description: 'Suas regras de comissão foram atualizadas',
          duration: 4000
        });
      } else if (source === 'coupon_discount_rules') {
        toast.info('🏷️ Descontos atualizados', {
          description: 'As regras de desconto dos cupons foram atualizadas',
          duration: 4000
        });
      }
      
      // Atualizar dados
      if (onDataChangeRef.current) {
        console.log('[AffiliateDataSync] 🔄 Refreshing data due to:', source);
        onDataChangeRef.current();
      }
    }, 500);
  }, []);

  useEffect(() => {
    // Limpar canal anterior
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Só criar canal se estiver no dashboard do afiliado
    if (!isAffiliateDashboard) {
      console.log('[AffiliateDataSync] Não está no dashboard do afiliado - sincronização desabilitada');
      return;
    }

    if (!enabled || !storeAffiliateIds.length) return;

    console.log('[AffiliateDataSync] 📡 Iniciando sincronização para', storeAffiliateIds.length, 'lojas');

    const channel = supabase
      .channel('affiliate-data-sync-' + storeAffiliateIds[0])
      // Monitorar store_affiliates (comissão padrão, maturidade, etc)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'store_affiliates'
      }, (payload) => {
        if (storeAffiliateIds.includes(payload.new?.id)) {
          const eventKey = `store_affiliates-${payload.new.id}-${JSON.stringify(payload.new)}`;
          console.log('[AffiliateDataSync] Store affiliate atualizado:', payload.new.id);
          handleDataChange('store_affiliates', eventKey);
        }
      })
      // Monitorar store_affiliate_coupons (cupons vinculados)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'store_affiliate_coupons'
      }, (payload) => {
        if (storeAffiliateIds.includes(payload.new?.store_affiliate_id)) {
          const eventKey = `sac-insert-${payload.new.id}`;
          console.log('[AffiliateDataSync] Cupom vinculado:', payload.new.coupon_id);
          handleDataChange('store_affiliate_coupons', eventKey);
        }
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'store_affiliate_coupons'
      }, (payload) => {
        if (storeAffiliateIds.includes(payload.old?.store_affiliate_id)) {
          const eventKey = `sac-delete-${payload.old.id}`;
          console.log('[AffiliateDataSync] Cupom desvinculado:', payload.old.coupon_id);
          handleDataChange('store_affiliate_coupons', eventKey);
        }
      })
      // Monitorar affiliate_commission_rules (regras específicas)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'affiliate_commission_rules'
      }, (payload) => {
        // Verificar se a regra pertence a um afiliado que está nas lojas monitoradas
        const newData = payload.new as Record<string, any> | null;
        const oldData = payload.old as Record<string, any> | null;
        const eventKey = `acr-${payload.eventType}-${newData?.id || oldData?.id}`;
        console.log('[AffiliateDataSync] Regra de comissão alterada:', payload.eventType);
        handleDataChange('affiliate_commission_rules', eventKey);
      })
      // Monitorar coupon_discount_rules (regras de desconto de cupons)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'coupon_discount_rules'
      }, (payload) => {
        const newData = payload.new as Record<string, any> | null;
        const oldData = payload.old as Record<string, any> | null;
        const eventKey = `cdr-${payload.eventType}-${newData?.id || oldData?.id}`;
        console.log('[AffiliateDataSync] Regra de desconto alterada:', payload.eventType);
        handleDataChange('coupon_discount_rules', eventKey);
      })
      .subscribe((status) => {
        console.log('[AffiliateDataSync] Subscription status:', status);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        console.log('[AffiliateDataSync] 🔌 Desconectando canal');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [enabled, storeAffiliateIds, handleDataChange, isAffiliateDashboard]);
};
