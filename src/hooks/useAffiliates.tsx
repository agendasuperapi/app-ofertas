import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// Normaliza CPF removendo caracteres não numéricos
const normalizeCpf = (cpf: string | undefined | null): string | null => {
  if (!cpf) return null;
  return cpf.replace(/\D/g, '');
};

export interface Affiliate {
  id: string;
  store_id: string;
  user_id?: string | null;
  name: string;
  email: string;
  phone?: string | null;
  cpf_cnpj?: string | null;
  pix_key?: string | null;
  coupon_id?: string | null; // Legacy field
  is_active: boolean;
  commission_enabled: boolean;
  default_commission_type: 'percentage' | 'fixed';
  default_commission_value: number;
  use_default_commission: boolean; // When true, applies default commission to products without specific rules
  commission_maturity_days: number; // Days before commission becomes available for withdrawal
  created_at: string;
  updated_at: string;
  coupon?: {
    id: string;
    code: string;
    discount_type: string;
    discount_value: number;
  } | null;
  // Multiple coupons
  affiliate_coupons?: Array<{
    coupon_id: string;
    coupon: {
      id: string;
      code: string;
      discount_type: string;
      discount_value: number;
    };
  }>;
}

export interface AffiliateCommissionRule {
  id: string;
  affiliate_id: string;
  commission_type: 'percentage' | 'fixed';
  commission_value: number;
  applies_to: 'all' | 'category' | 'product';
  category_name?: string | null;
  product_id?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  product?: { id: string; name: string; short_id?: string | null; external_code?: string | null } | null;
}

export interface AffiliateEarning {
  id: string;
  affiliate_id: string;
  order_id: string;
  order_item_id?: string | null;
  order_total: number;
  commission_amount: number;
  commission_type: string;
  commission_value: number;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  paid_at?: string | null;
  created_at: string;
  order?: {
    order_number: string;
    customer_name: string;
    total: number;
    created_at: string;
    status: string;
  } | null;
}

export interface AffiliatePayment {
  id: string;
  affiliate_id: string;
  amount: number;
  payment_method?: string | null;
  payment_proof?: string | null;
  notes?: string | null;
  paid_at: string;
  created_at: string;
}

export interface AffiliateStats {
  totalEarnings: number;
  pendingEarnings: number;
  paidEarnings: number;
  cancelledEarnings: number;
  totalSales: number;
  totalOrders: number;
  cancelledOrders: number;
}

// Query keys for cache management
export const affiliateKeys = {
  all: ['affiliates'] as const,
  lists: () => [...affiliateKeys.all, 'list'] as const,
  list: (storeId: string) => [...affiliateKeys.lists(), storeId] as const,
};

const fetchAffiliatesFromDB = async (storeId: string): Promise<Affiliate[]> => {
  const { data, error } = await (supabase as any)
    .from('affiliates')
    .select(`*, coupon:coupons(id, code, discount_type, discount_value), affiliate_coupons(coupon_id, coupon:coupons(id, code, discount_type, discount_value))`)
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const useAffiliates = (storeId?: string) => {
  const queryClient = useQueryClient();

  // Use React Query for fetching affiliates
  const { data: affiliates = [], isLoading, refetch } = useQuery({
    queryKey: affiliateKeys.list(storeId || ''),
    queryFn: () => fetchAffiliatesFromDB(storeId!),
    enabled: !!storeId,
    staleTime: 30000,
  });

  const fetchAffiliates = useCallback(() => {
    if (storeId) {
      refetch();
    }
  }, [storeId, refetch]);

  // Create affiliate mutation
  const createAffiliateMutation = useMutation({
    mutationFn: async (affiliateData: Partial<Affiliate> & { coupon_ids?: string[] }) => {
      if (!storeId) throw new Error('Store ID required');
      
      const { coupon_ids, ...rest } = affiliateData;
      const normalizedCpf = normalizeCpf(rest.cpf_cnpj);
      
      const { data, error } = await (supabase as any)
        .from('affiliates')
        .insert({
          store_id: storeId,
          name: rest.name,
          email: rest.email,
          phone: rest.phone,
          cpf_cnpj: normalizedCpf, // CPF normalizado (apenas números)
          pix_key: rest.pix_key,
          coupon_id: coupon_ids?.[0] || rest.coupon_id,
          is_active: rest.is_active ?? true,
          commission_enabled: rest.commission_enabled ?? true,
          default_commission_type: rest.default_commission_type || 'percentage',
          default_commission_value: rest.default_commission_value || 0,
          use_default_commission: rest.use_default_commission ?? true,
          commission_maturity_days: rest.commission_maturity_days ?? 7,
        })
        .select()
        .single();

      if (error) throw error;

      // Insert multiple coupons into junction table
      if (coupon_ids && coupon_ids.length > 0) {
        const couponInserts = coupon_ids.map(couponId => ({
          affiliate_id: data.id,
          coupon_id: couponId,
        }));
        await (supabase as any).from('affiliate_coupons').insert(couponInserts);
        
        // Sync with store_affiliates system if affiliate_account exists (busca por CPF)
        let affiliateAccount = null;
        if (normalizedCpf) {
          const { data: account } = await supabase
            .from('affiliate_accounts')
            .select('id')
            .eq('cpf_cnpj', normalizedCpf)
            .maybeSingle();
          affiliateAccount = account;
        }

        if (affiliateAccount) {
          const { data: storeAffiliate } = await (supabase as any)
            .from('store_affiliates')
            .select('id')
            .eq('affiliate_account_id', affiliateAccount.id)
            .eq('store_id', storeId)
            .maybeSingle();

          if (storeAffiliate) {
            await (supabase as any)
              .from('store_affiliates')
              .update({ 
                coupon_id: coupon_ids[0],
                default_commission_type: rest.default_commission_type || 'percentage',
                default_commission_value: rest.default_commission_value || 0,
                use_default_commission: rest.use_default_commission ?? true,
                commission_maturity_days: rest.commission_maturity_days ?? 7
              })
              .eq('id', storeAffiliate.id);

            const storeAffiliateInserts = coupon_ids.map(couponId => ({
              store_affiliate_id: storeAffiliate.id,
              coupon_id: couponId,
            }));
            await (supabase as any).from('store_affiliate_coupons').insert(storeAffiliateInserts);
            console.log('✅ Synced coupons and commission to store_affiliates');
          }
        }
      }

      return data;
    },
    onSuccess: () => {
      toast({ title: 'Afiliado criado!' });
      // Invalidate all affiliates queries to ensure all components get updated
      queryClient.invalidateQueries({ queryKey: ['affiliates'] });
      // Invalidate coupons to update available coupons list
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao criar afiliado', description: error.message, variant: 'destructive' });
    },
  });

  // Update affiliate mutation
  const updateAffiliateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Affiliate> & { coupon_ids?: string[] } }) => {
      const { coupon_ids, ...rest } = updates;
      const normalizedCpf = rest.cpf_cnpj !== undefined ? normalizeCpf(rest.cpf_cnpj) : undefined;
      
      const updateData: any = { ...rest };
      if (normalizedCpf !== undefined) {
        updateData.cpf_cnpj = normalizedCpf; // CPF normalizado (apenas números)
      }
      if (coupon_ids) {
        updateData.coupon_id = coupon_ids[0] || null;
      }
      
      const { data, error } = await (supabase as any)
        .from('affiliates')
        .update(updateData)
        .eq('id', id)
        .select('*, email, store_id, cpf_cnpj')
        .single();

      if (error) throw error;

      // Update junction table if coupon_ids provided
      if (coupon_ids !== undefined) {
        await (supabase as any).from('affiliate_coupons').delete().eq('affiliate_id', id);
        if (coupon_ids.length > 0) {
          const couponInserts = coupon_ids.map(couponId => ({
            affiliate_id: id,
            coupon_id: couponId,
          }));
          await (supabase as any).from('affiliate_coupons').insert(couponInserts);
        }
      }

      // Sync with store_affiliates when relevant fields are updated
      const needsStoreAffiliateSync = 
        rest.is_active !== undefined ||
        rest.commission_enabled !== undefined ||
        rest.commission_maturity_days !== undefined ||
        rest.use_default_commission !== undefined ||
        rest.default_commission_type !== undefined ||
        rest.default_commission_value !== undefined ||
        coupon_ids !== undefined;

      // Sync personal data with affiliate_accounts when name, phone, or pix_key are updated
      const needsAccountSync = 
        rest.name !== undefined ||
        rest.phone !== undefined ||
        rest.pix_key !== undefined;

      const cpfToSearch = normalizedCpf || normalizeCpf(data?.cpf_cnpj);
      let affiliateAccount = null;
      if (cpfToSearch) {
        const { data: account } = await supabase
          .from('affiliate_accounts')
          .select('id')
          .eq('cpf_cnpj', cpfToSearch)
          .maybeSingle();
        affiliateAccount = account;
      }

      // Sync personal data to affiliate_accounts
      if (needsAccountSync && affiliateAccount) {
        const accountUpdate: any = {};
        if (rest.name !== undefined) accountUpdate.name = rest.name;
        if (rest.phone !== undefined) accountUpdate.phone = rest.phone;
        if (rest.pix_key !== undefined) accountUpdate.pix_key = rest.pix_key;
        
        await supabase
          .from('affiliate_accounts')
          .update(accountUpdate)
          .eq('id', affiliateAccount.id);
        
        console.log('✅ Synced personal data to affiliate_accounts:', accountUpdate);
      }

      if (needsStoreAffiliateSync && affiliateAccount && data?.store_id) {
        const { data: storeAffiliate } = await (supabase as any)
          .from('store_affiliates')
          .select('id')
          .eq('affiliate_account_id', affiliateAccount.id)
          .eq('store_id', data.store_id)
          .maybeSingle();

        if (storeAffiliate) {
          // Always update commission configuration fields including is_active and commission_enabled
          const storeAffiliateUpdate: any = {
            is_active: rest.is_active ?? data.is_active ?? true,
            commission_enabled: rest.commission_enabled ?? data.commission_enabled ?? true,
            default_commission_type: rest.default_commission_type || data.default_commission_type || 'percentage',
            default_commission_value: rest.default_commission_value ?? data.default_commission_value ?? 0,
            use_default_commission: rest.use_default_commission ?? data.use_default_commission ?? true,
            commission_maturity_days: rest.commission_maturity_days ?? data.commission_maturity_days ?? 7
          };
          
          // Only update coupon_id if coupon_ids was explicitly provided
          if (coupon_ids !== undefined) {
            storeAffiliateUpdate.coupon_id = coupon_ids[0] || null;
          }

          await (supabase as any)
            .from('store_affiliates')
            .update(storeAffiliateUpdate)
            .eq('id', storeAffiliate.id);

          console.log('✅ Synced commission settings to store_affiliates:', storeAffiliateUpdate);

          // Sync coupons only if coupon_ids was explicitly provided
          if (coupon_ids !== undefined) {
            await (supabase as any)
              .from('store_affiliate_coupons')
              .delete()
              .eq('store_affiliate_id', storeAffiliate.id);

            if (coupon_ids.length > 0) {
              const storeAffiliateInserts = coupon_ids.map(couponId => ({
                store_affiliate_id: storeAffiliate.id,
                coupon_id: couponId,
              }));
              await (supabase as any).from('store_affiliate_coupons').insert(storeAffiliateInserts);
            }
          }
        }
      }

      return data;
    },
    onSuccess: () => {
      toast({ title: 'Afiliado atualizado!' });
      // Invalidate all affiliates queries to ensure all components get updated
      queryClient.invalidateQueries({ queryKey: ['affiliates'] });
      // Invalidate coupons to update available coupons list
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    },
  });

  // Delete affiliate mutation
  const deleteAffiliateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('affiliates').delete().eq('id', id);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      toast({ title: 'Afiliado removido!' });
      // Invalidate all affiliates queries to ensure all components get updated
      queryClient.invalidateQueries({ queryKey: ['affiliates'] });
      // Invalidate coupons to update available coupons list
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao remover', description: error.message, variant: 'destructive' });
    },
  });

  // Wrapper functions for backwards compatibility
  const createAffiliate = async (affiliateData: Partial<Affiliate> & { coupon_ids?: string[] }) => {
    try {
      return await createAffiliateMutation.mutateAsync(affiliateData);
    } catch {
      return null;
    }
  };

  const updateAffiliate = async (id: string, updates: Partial<Affiliate> & { coupon_ids?: string[] }) => {
    try {
      return await updateAffiliateMutation.mutateAsync({ id, updates });
    } catch {
      return null;
    }
  };

  const deleteAffiliate = async (id: string) => {
    try {
      await deleteAffiliateMutation.mutateAsync(id);
      return true;
    } catch {
      return false;
    }
  };

  const toggleAffiliateStatus = (id: string, isActive: boolean) => updateAffiliate(id, { is_active: isActive });
  const toggleCommission = (id: string, enabled: boolean) => updateAffiliate(id, { commission_enabled: enabled });

  const getCommissionRules = async (affiliateId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from('affiliate_commission_rules')
        .select(`*, product:products!inner(id, name, short_id, external_code, deleted_at)`)
        .eq('affiliate_id', affiliateId)
        .is('product.deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch { return []; }
  };

  const createCommissionRule = async (ruleData: Partial<AffiliateCommissionRule>) => {
    try {
      const { data, error } = await (supabase as any)
        .from('affiliate_commission_rules')
        .insert({
          affiliate_id: ruleData.affiliate_id,
          commission_type: ruleData.commission_type || 'percentage',
          commission_value: ruleData.commission_value || 0,
          applies_to: ruleData.applies_to || 'all',
          category_name: ruleData.category_name,
          product_id: ruleData.product_id,
          is_active: ruleData.is_active ?? true,
        })
        .select()
        .single();
      if (error) throw error;
      toast({ title: 'Regra criada!' });
      return data;
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return null;
    }
  };

  const deleteCommissionRule = async (id: string) => {
    try {
      const { error } = await (supabase as any).from('affiliate_commission_rules').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Regra removida!' });
      return true;
    } catch { return false; }
  };

  const updateCommissionRule = async (id: string, updates: Partial<AffiliateCommissionRule>) => {
    try {
      const { data, error } = await (supabase as any)
        .from('affiliate_commission_rules')
        .update({
          commission_type: updates.commission_type,
          commission_value: updates.commission_value,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      toast({ title: 'Regra atualizada!' });
      return data;
    } catch (error: any) {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
      return null;
    }
  };

  const getAffiliateEarnings = async (affiliateId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from('affiliate_earnings')
        .select(`*, order:orders(order_number, customer_name, total, created_at, status)`)
        .eq('affiliate_id', affiliateId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch { return []; }
  };

  const updateEarningStatus = async (id: string, status: AffiliateEarning['status']) => {
    try {
      const updateData: any = { status };
      if (status === 'paid') updateData.paid_at = new Date().toISOString();
      const { data, error } = await (supabase as any)
        .from('affiliate_earnings')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      toast({ title: 'Status atualizado!' });
      return data;
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return null;
    }
  };

  const getAffiliatePayments = async (affiliateId: string): Promise<AffiliatePayment[]> => {
    try {
      const { data, error } = await (supabase as any)
        .from('affiliate_payments')
        .select('*')
        .eq('affiliate_id', affiliateId)
        .order('paid_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch { return []; }
  };

  const createPayment = async (paymentData: Partial<AffiliatePayment>) => {
    try {
      const { data, error } = await (supabase as any)
        .from('affiliate_payments')
        .insert({
          affiliate_id: paymentData.affiliate_id,
          amount: paymentData.amount || 0,
          payment_method: paymentData.payment_method,
          notes: paymentData.notes,
          paid_at: paymentData.paid_at || new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      toast({ title: 'Pagamento registrado!' });
      return data;
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return null;
    }
  };

  const getAffiliateStats = async (affiliateId: string): Promise<AffiliateStats> => {
    try {
      const { data: earnings } = await (supabase as any)
        .from('affiliate_earnings')
        .select('commission_amount, order_total, order:orders(status)')
        .eq('affiliate_id', affiliateId);

      const stats: AffiliateStats = { totalEarnings: 0, pendingEarnings: 0, paidEarnings: 0, cancelledEarnings: 0, totalSales: 0, totalOrders: 0, cancelledOrders: 0 };
      earnings?.forEach((e: any) => {
        const orderStatus = e.order?.status;
        const amount = Number(e.commission_amount) || 0;
        
        // Pedidos cancelados
        if (orderStatus === 'cancelado' || orderStatus === 'cancelled') {
          stats.cancelledOrders += 1;
          stats.cancelledEarnings += amount;
          return;
        }
        
        stats.totalOrders += 1;
        stats.totalSales += Number(e.order_total) || 0;
        
        if (orderStatus === 'entregue' || orderStatus === 'delivered') {
          // Concluído - pedidos entregues
          stats.totalEarnings += amount;
          stats.paidEarnings += amount;
        } else {
          // Pendente - todos os outros status
          stats.pendingEarnings += amount;
        }
      });
      return stats;
    } catch { return { totalEarnings: 0, pendingEarnings: 0, paidEarnings: 0, cancelledEarnings: 0, totalSales: 0, totalOrders: 0, cancelledOrders: 0 }; }
  };

  const getAllStoreEarnings = async () => {
    if (!storeId) return [];
    try {
      const { data } = await (supabase as any)
        .from('affiliate_earnings')
        .select(`*, affiliate:affiliates!inner(id, name, email, store_id), order:orders(order_number, customer_name, total, created_at)`)
        .eq('affiliate.store_id', storeId)
        .order('created_at', { ascending: false });
      return data || [];
    } catch { return []; }
  };

  // Function to invalidate queries (for external use)
  const invalidateAffiliates = () => {
    if (storeId) {
      queryClient.invalidateQueries({ queryKey: affiliateKeys.list(storeId) });
    }
  };

  return {
    affiliates, isLoading, fetchAffiliates, createAffiliate, updateAffiliate, deleteAffiliate,
    toggleAffiliateStatus, toggleCommission, getCommissionRules, createCommissionRule, deleteCommissionRule,
    updateCommissionRule, getAffiliateEarnings, updateEarningStatus, getAffiliatePayments, createPayment, 
    getAffiliateStats, getAllStoreEarnings, invalidateAffiliates,
  };
};

export const useMyAffiliateData = () => {
  const { data: affiliate = null, isLoading: affiliateLoading } = useQuery({
    queryKey: ['myAffiliate'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return null;

      const { data, error } = await (supabase as any)
        .from('affiliates')
        .select(`*, coupon:coupons(id, code, discount_type, discount_value)`)
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error) throw error;
      return data as Affiliate | null;
    },
    staleTime: 60000,
  });

  const affiliateId = affiliate?.id;

  const { data: earnings = [] } = useQuery({
    queryKey: ['myAffiliateEarnings', affiliateId],
    queryFn: async () => {
      if (!affiliateId) return [];
      const { data, error } = await (supabase as any)
        .from('affiliate_earnings')
        .select(`*, order:orders(order_number, customer_name, total, created_at, status)`)
        .eq('affiliate_id', affiliateId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!affiliateId,
    staleTime: 30000,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['myAffiliatePayments', affiliateId],
    queryFn: async () => {
      if (!affiliateId) return [];
      const { data, error } = await (supabase as any)
        .from('affiliate_payments')
        .select('*')
        .eq('affiliate_id', affiliateId)
        .order('paid_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!affiliateId,
    staleTime: 30000,
  });

  const stats: AffiliateStats = {
    totalEarnings: 0,
    pendingEarnings: 0,
    paidEarnings: 0,
    cancelledEarnings: 0,
    totalSales: 0,
    totalOrders: 0,
    cancelledOrders: 0,
  };

  earnings?.forEach((e: any) => {
    const orderStatus = e.order?.status;
    const amount = Number(e.commission_amount) || 0;
    
    // Pedidos cancelados
    if (orderStatus === 'cancelado' || orderStatus === 'cancelled') {
      stats.cancelledOrders += 1;
      stats.cancelledEarnings += amount;
      return;
    }
    
    stats.totalOrders += 1;
    stats.totalSales += Number(e.order_total) || 0;
    
    if (orderStatus === 'entregue' || orderStatus === 'delivered') {
      stats.totalEarnings += amount;
      stats.paidEarnings += amount;
    } else {
      stats.pendingEarnings += amount;
    }
  });

  const queryClient = useQueryClient();
  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['myAffiliate'] });
    if (affiliateId) {
      queryClient.invalidateQueries({ queryKey: ['myAffiliateEarnings', affiliateId] });
      queryClient.invalidateQueries({ queryKey: ['myAffiliatePayments', affiliateId] });
    }
  }, [queryClient, affiliateId]);

  return {
    affiliate,
    earnings,
    payments,
    stats,
    isLoading: affiliateLoading,
    refetch,
  };
};
