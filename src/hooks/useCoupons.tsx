import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type DiscountType = 'percentage' | 'fixed';

export interface Coupon {
  id: string;
  store_id: string;
  code: string;
  discount_type: DiscountType;
  discount_value: number;
  min_order_value: number;
  max_uses: number | null;
  used_count: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CouponValidation {
  is_valid: boolean;
  discount_type: DiscountType | null;
  discount_value: number | null;
  discount_amount: number;
  error_message: string | null;
}

export const useCoupons = (storeId: string | undefined) => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (storeId) {
      fetchCoupons();
    }
  }, [storeId]);

  const fetchCoupons = async () => {
    if (!storeId) return;
    
    try {
      setIsLoading(true);
      // @ts-ignore - Table will exist after SQL migration
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      // @ts-ignore - Type will be available after migration
      setCoupons(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar cupons',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const validateCoupon = async (
    code: string,
    orderTotal: number
  ): Promise<CouponValidation> => {
    if (!storeId) {
      return {
        is_valid: false,
        discount_type: null,
        discount_value: null,
        discount_amount: 0,
        error_message: 'Loja não identificada',
      };
    }

    try {
      // @ts-ignore - RPC function will exist after SQL migration
      const { data, error } = await supabase.rpc('validate_coupon', {
        p_store_id: storeId,
        p_code: code,
        p_order_total: orderTotal,
      });

      if (error) throw error;

      const result = data[0] as CouponValidation;
      
      if (!result.is_valid) {
        toast({
          title: 'Cupom inválido',
          description: result.error_message || 'Este cupom não pode ser aplicado',
          variant: 'destructive',
        });
      }

      return result;
    } catch (error: any) {
      toast({
        title: 'Erro ao validar cupom',
        description: error.message,
        variant: 'destructive',
      });
      return {
        is_valid: false,
        discount_type: null,
        discount_value: null,
        discount_amount: 0,
        error_message: error.message,
      };
    }
  };

  const createCoupon = async (couponData: Omit<Coupon, 'id' | 'created_at' | 'updated_at' | 'used_count'>) => {
    try {
      // @ts-ignore - Table will exist after SQL migration
      const { data, error } = await supabase
        .from('coupons')
        .insert([couponData])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Cupom criado com sucesso',
        description: `O cupom ${couponData.code} foi criado`,
      });

      await fetchCoupons();
      return data;
    } catch (error: any) {
      toast({
        title: 'Erro ao criar cupom',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updateCoupon = async (id: string, updates: Partial<Coupon>) => {
    try {
      // @ts-ignore - Table will exist after SQL migration
      const { data, error } = await supabase
        .from('coupons')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Cupom atualizado',
        description: 'As alterações foram salvas com sucesso',
      });

      await fetchCoupons();
      return data;
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar cupom',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const deleteCoupon = async (id: string) => {
    try {
      // @ts-ignore - Table will exist after SQL migration
      const { error } = await supabase
        .from('coupons')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Cupom excluído',
        description: 'O cupom foi removido com sucesso',
      });

      await fetchCoupons();
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir cupom',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const toggleCouponStatus = async (id: string, isActive: boolean) => {
    return updateCoupon(id, { is_active: isActive });
  };

  return {
    coupons,
    isLoading,
    fetchCoupons,
    validateCoupon,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    toggleCouponStatus,
  };
};
