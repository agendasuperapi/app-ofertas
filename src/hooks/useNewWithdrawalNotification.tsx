import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseNewWithdrawalNotificationProps {
  storeId: string;
  onNewRequest?: () => void;
}

export function useNewWithdrawalNotification({ storeId, onNewRequest }: UseNewWithdrawalNotificationProps) {
  const handleNewRequest = useCallback((payload: any) => {
    const { new: newRecord } = payload;
    
    if (!newRecord) return;
    
    const formatCurrency = (value: number) => 
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    
    toast.info(
      `💸 Nova solicitação de saque: ${formatCurrency(newRecord.amount)}`,
      { 
        description: 'Acesse a aba de Saques para processar.',
        duration: 6000 
      }
    );
    
    onNewRequest?.();
  }, [onNewRequest]);

  useEffect(() => {
    if (!storeId) return;

    const channel = supabase
      .channel('new-withdrawal-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'affiliate_withdrawal_requests',
          filter: `store_id=eq.${storeId}`
        },
        handleNewRequest
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeId, handleNewRequest]);
}
