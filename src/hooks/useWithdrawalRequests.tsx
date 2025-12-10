import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WithdrawalRequest {
  id: string;
  affiliate_id: string;
  store_affiliate_id: string | null;
  store_id: string;
  amount: number;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  pix_key: string | null;
  payment_method: string | null;
  payment_proof: string | null;
  notes: string | null;
  admin_notes: string | null;
  requested_at: string;
  processed_at: string | null;
  paid_at: string | null;
  created_at: string;
  // Joined fields
  affiliate_name?: string;
  affiliate_email?: string;
  affiliate_phone?: string;
}

interface UseWithdrawalRequestsOptions {
  storeId?: string;
  affiliateId?: string;
  storeAffiliateId?: string;
}

export function useWithdrawalRequests(options: UseWithdrawalRequestsOptions = {}) {
  const { storeId, affiliateId, storeAffiliateId } = options;
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('affiliate_withdrawal_requests')
        .select(`
          *,
          affiliates!inner(name, email, phone)
        `)
        .order('requested_at', { ascending: false });

      if (storeId) {
        query = query.eq('store_id', storeId);
      }

      if (affiliateId) {
        query = query.eq('affiliate_id', affiliateId);
      }

      if (storeAffiliateId) {
        query = query.eq('store_affiliate_id', storeAffiliateId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const formattedRequests: WithdrawalRequest[] = (data || []).map((req: any) => ({
        ...req,
        affiliate_name: req.affiliates?.name,
        affiliate_email: req.affiliates?.email,
        affiliate_phone: req.affiliates?.phone,
      }));

      setRequests(formattedRequests);
    } catch (err: any) {
      console.error('[useWithdrawalRequests] Erro ao buscar solicitações:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [storeId, affiliateId, storeAffiliateId]);

  // Criar solicitação de saque (afiliado)
  const createWithdrawalRequest = async (data: {
    affiliate_id: string;
    store_affiliate_id?: string;
    store_id: string;
    amount: number;
    pix_key?: string;
    notes?: string;
  }) => {
    try {
      // Verificar se já existe solicitação pendente para esta loja
      const { data: existingPending } = await supabase
        .from('affiliate_withdrawal_requests')
        .select('id')
        .eq('affiliate_id', data.affiliate_id)
        .eq('store_id', data.store_id)
        .eq('status', 'pending')
        .maybeSingle();

      if (existingPending) {
        toast.error('Já existe uma solicitação de saque pendente para esta loja');
        return null;
      }

      const { data: newRequest, error } = await supabase
        .from('affiliate_withdrawal_requests')
        .insert({
          affiliate_id: data.affiliate_id,
          store_affiliate_id: data.store_affiliate_id || null,
          store_id: data.store_id,
          amount: data.amount,
          pix_key: data.pix_key || null,
          notes: data.notes || null,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Solicitação de saque enviada com sucesso!');
      await fetchRequests();
      return newRequest;
    } catch (err: any) {
      console.error('[useWithdrawalRequests] Erro ao criar solicitação:', err);
      toast.error('Erro ao criar solicitação de saque');
      return null;
    }
  };

  // Marcar como pago (lojista)
  const markAsPaid = async (requestId: string, adminNotes?: string, paymentProof?: string) => {
    try {
      // Buscar a solicitação para obter store_affiliate_id e affiliate_id
      const request = requests.find(r => r.id === requestId);
      if (!request) {
        toast.error('Solicitação não encontrada');
        return false;
      }

      const paidAt = new Date().toISOString();

      // 1. Atualizar a solicitação de saque
      const { error: withdrawalError } = await supabase
        .from('affiliate_withdrawal_requests')
        .update({
          status: 'paid',
          paid_at: paidAt,
          processed_at: paidAt,
          admin_notes: adminNotes || null,
          payment_proof: paymentProof || null,
        })
        .eq('id', requestId);

      if (withdrawalError) throw withdrawalError;

      // 2. Marcar as comissões elegíveis como pagas
      // Buscar comissões de pedidos entregues que ainda estão pendentes
      let eligibleEarningsQuery = supabase
        .from('affiliate_earnings')
        .select('id, order_id')
        .eq('status', 'pending');

      // Filter by store_affiliate_id or affiliate_id
      if (request.store_affiliate_id) {
        eligibleEarningsQuery = eligibleEarningsQuery.eq('store_affiliate_id', request.store_affiliate_id);
      } else if (request.affiliate_id) {
        eligibleEarningsQuery = eligibleEarningsQuery.eq('affiliate_id', request.affiliate_id);
      }

      const { data: eligibleEarnings, error: fetchError } = await eligibleEarningsQuery;

      if (fetchError) {
        console.error('[useWithdrawalRequests] Erro ao buscar comissões:', fetchError);
      } else if (eligibleEarnings && eligibleEarnings.length > 0) {
        // Buscar quais desses pedidos estão entregues
        const orderIds = eligibleEarnings.map(e => e.order_id);
        const { data: deliveredOrders } = await supabase
          .from('orders')
          .select('id, status')
          .in('id', orderIds);

        // Filtrar apenas pedidos entregues (cast para string para evitar erros de tipo)
        const filteredDeliveredOrders = (deliveredOrders || []).filter(
          o => (o.status as string) === 'entregue' || (o.status as string) === 'delivered'
        );

        if (filteredDeliveredOrders.length > 0) {
          const deliveredOrderIds = filteredDeliveredOrders.map(o => o.id);
          const earningsToUpdate = eligibleEarnings
            .filter(e => deliveredOrderIds.includes(e.order_id))
            .map(e => e.id);

          if (earningsToUpdate.length > 0) {
            const { error: updateError } = await supabase
              .from('affiliate_earnings')
              .update({ status: 'paid', paid_at: paidAt })
              .in('id', earningsToUpdate);

            if (updateError) {
              console.error('[useWithdrawalRequests] Erro ao atualizar comissões:', updateError);
            } else {
              console.log(`[useWithdrawalRequests] ${earningsToUpdate.length} comissões marcadas como pagas`);
            }
          }
        }
      }

      toast.success('Saque marcado como pago!');
      await fetchRequests();
      return true;
    } catch (err: any) {
      console.error('[useWithdrawalRequests] Erro ao marcar como pago:', err);
      toast.error('Erro ao processar pagamento');
      return false;
    }
  };

  // Rejeitar solicitação (lojista)
  const rejectRequest = async (requestId: string, adminNotes: string) => {
    try {
      const { error } = await supabase
        .from('affiliate_withdrawal_requests')
        .update({
          status: 'rejected',
          processed_at: new Date().toISOString(),
          admin_notes: adminNotes,
        })
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Solicitação rejeitada');
      await fetchRequests();
      return true;
    } catch (err: any) {
      console.error('[useWithdrawalRequests] Erro ao rejeitar:', err);
      toast.error('Erro ao rejeitar solicitação');
      return false;
    }
  };

  // Stats
  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    paid: requests.filter(r => r.status === 'paid').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
    totalPendingAmount: requests
      .filter(r => r.status === 'pending')
      .reduce((sum, r) => sum + r.amount, 0),
    totalPaidAmount: requests
      .filter(r => r.status === 'paid')
      .reduce((sum, r) => sum + r.amount, 0),
  };

  useEffect(() => {
    if (storeId || affiliateId || storeAffiliateId) {
      fetchRequests();
    }
  }, [fetchRequests, storeId, affiliateId, storeAffiliateId]);

  return {
    requests,
    isLoading,
    error,
    stats,
    fetchRequests,
    createWithdrawalRequest,
    markAsPaid,
    rejectRequest,
  };
}
