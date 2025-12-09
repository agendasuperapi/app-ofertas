import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseWithdrawalNotificationProps {
  affiliateId: string | null;
  onStatusChange?: () => void;
}

export function useWithdrawalNotification({ affiliateId, onStatusChange }: UseWithdrawalNotificationProps) {
  const handleStatusChange = useCallback((payload: any) => {
    const { new: newRecord, old: oldRecord } = payload;
    
    // Só notificar se o status mudou
    if (!oldRecord || !newRecord || oldRecord.status === newRecord.status) return;
    
    const formatCurrency = (value: number) => 
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    
    if (newRecord.status === 'paid') {
      toast.success(
        `💰 Saque de ${formatCurrency(newRecord.amount)} foi aprovado e pago!`,
        { duration: 6000 }
      );
    } else if (newRecord.status === 'rejected') {
      toast.warning(
        `❌ Saque de ${formatCurrency(newRecord.amount)} foi rejeitado`,
        { 
          description: newRecord.admin_notes || 'Entre em contato com o lojista para mais informações.',
          duration: 8000 
        }
      );
    }
    
    onStatusChange?.();
  }, [onStatusChange]);

  useEffect(() => {
    if (!affiliateId) return;

    const channel = supabase
      .channel('withdrawal-notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'affiliate_withdrawal_requests',
          filter: `affiliate_id=eq.${affiliateId}`
        },
        handleStatusChange
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [affiliateId, handleStatusChange]);
}
