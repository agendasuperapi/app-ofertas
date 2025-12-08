import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CartItem } from '@/contexts/CartContext';
import { calculateEligibleSubtotal, calculateDiscount, calculateTotalDiscountWithRules, CouponDiscountRule } from '@/lib/couponUtils';

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
  applies_to?: 'all' | 'category' | 'product';
  category_names?: string[];
  product_ids?: string[];
}

export interface CouponValidation {
  is_valid: boolean;
  discount_type: DiscountType | null;
  discount_value: number | null;
  discount_amount: number;
  error_message: string | null;
  applies_to?: 'all' | 'category' | 'product';
  category_names?: string[];
  product_ids?: string[];
  has_no_eligible_items?: boolean;
  discount_rules?: CouponDiscountRule[];
}

export const useCoupons = (storeId: string | undefined) => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Load coupons when store ID is available
  useEffect(() => {
    if (storeId) {
      fetchCoupons();
    }
  }, [storeId]);

  const fetchCoupons = async () => {
    if (!storeId) return;
    
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('coupons' as any)
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCoupons((data as unknown as Coupon[]) || []);
    } catch (error: any) {
      console.warn('Cupons table not available yet. Please run create_coupons_system.sql migration.');
      setCoupons([]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Validação de cupom com escopo (categoria/produto)
   * Usa os itens do carrinho para calcular o desconto correto
   */
  const validateCouponWithScope = async (
    code: string,
    items: CartItem[]
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
      // 1. Buscar cupom completo com dados de escopo
      const { data: coupon, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('store_id', storeId)
        .ilike('code', code)
        .eq('is_active', true)
        .single();

      if (error || !coupon) {
        toast({
          title: 'Cupom inválido',
          description: 'Cupom não encontrado ou inativo',
          variant: 'destructive',
        });
        return {
          is_valid: false,
          discount_type: null,
          discount_value: null,
          discount_amount: 0,
          error_message: 'Cupom não encontrado ou inativo',
        };
      }

      // 1.1 Buscar regras de desconto personalizadas do cupom
      const { data: discountRulesData } = await supabase
        .from('coupon_discount_rules')
        .select('*')
        .eq('coupon_id', coupon.id);

      const discountRules: CouponDiscountRule[] = (discountRulesData || []).map(rule => ({
        id: rule.id,
        coupon_id: rule.coupon_id,
        rule_type: rule.rule_type as 'product' | 'category',
        product_id: rule.product_id,
        category_name: rule.category_name,
        discount_type: rule.discount_type as 'percentage' | 'fixed',
        discount_value: rule.discount_value
      }));

      console.log('📜 Regras de desconto personalizadas:', discountRules.length > 0 ? discountRules : 'Nenhuma');

      // 2. Validar período
      const now = new Date();
      if (new Date(coupon.valid_from) > now) {
        toast({
          title: 'Cupom inválido',
          description: 'Este cupom ainda não está ativo',
          variant: 'destructive',
        });
        return {
          is_valid: false,
          discount_type: null,
          discount_value: null,
          discount_amount: 0,
          error_message: 'Este cupom ainda não está ativo',
        };
      }

      if (coupon.valid_until && new Date(coupon.valid_until) < now) {
        toast({
          title: 'Cupom expirado',
          description: 'Este cupom já expirou',
          variant: 'destructive',
        });
        return {
          is_valid: false,
          discount_type: null,
          discount_value: null,
          discount_amount: 0,
          error_message: 'Este cupom já expirou',
        };
      }

      // 3. Validar usos máximos
      if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
        toast({
          title: 'Cupom esgotado',
          description: 'Este cupom atingiu o limite de usos',
          variant: 'destructive',
        });
        return {
          is_valid: false,
          discount_type: null,
          discount_value: null,
          discount_amount: 0,
          error_message: 'Este cupom atingiu o limite de usos',
        };
      }

      // 4. Buscar categorias dos produtos se necessário
      let itemsWithCategory = items;
      const appliesTo = (coupon.applies_to || 'all') as 'all' | 'category' | 'product';
      
      console.log('🎫 ═══════════════════════════════════════════════');
      console.log('🎫 VALIDAÇÃO DE CUPOM INICIADA');
      console.log('🎫 ═══════════════════════════════════════════════');
      console.log('📋 Código do cupom:', code.toUpperCase());
      console.log('🏷️ Tipo de desconto:', coupon.discount_type);
      console.log('💰 Valor do desconto:', coupon.discount_value, coupon.discount_type === 'percentage' ? '%' : 'R$');
      console.log('🎯 Escopo do cupom:', appliesTo);
      console.log('📦 Total de itens no carrinho:', items.length);
      
      if (appliesTo === 'category') {
        console.log('📂 Categorias elegíveis:', coupon.category_names?.join(', ') || 'Nenhuma');
      }
      if (appliesTo === 'product') {
        console.log('🛍️ Produtos elegíveis (IDs):', coupon.product_ids?.join(', ') || 'Nenhum');
      }
      
      if (appliesTo === 'category' && items.length > 0) {
        const productIds = items.map(item => item.productId);
        const { data: products } = await supabase
          .from('products')
          .select('id, category')
          .in('id', productIds);

        console.log('🔍 Categorias buscadas do banco:', products?.map(p => `${p.id}: "${p.category}"`));

        if (products) {
          itemsWithCategory = items.map(item => ({
            ...item,
            category: products.find(p => p.id === item.productId)?.category || ''
          }));
        }
      }

      // Log detalhado de cada item
      console.log('');
      console.log('📦 ─────────────────────────────────────────────');
      console.log('📦 ANÁLISE DE CADA ITEM:');
      console.log('📦 ─────────────────────────────────────────────');
      
      const normalizedCouponCategories = (coupon.category_names || []).map(c => c.toLowerCase().trim());
      
      itemsWithCategory.forEach((item, index) => {
        const itemCategory = ((item as any).category || '').toLowerCase().trim();
        let isEligible = false;
        let reason = '';
        
        if (appliesTo === 'all') {
          isEligible = true;
          reason = 'Cupom aplica a todos os produtos';
        } else if (appliesTo === 'product') {
          isEligible = (coupon.product_ids || []).includes(item.productId);
          reason = isEligible 
            ? 'Product ID está na lista de elegíveis' 
            : `Product ID "${item.productId}" NÃO está na lista`;
        } else if (appliesTo === 'category') {
          isEligible = normalizedCouponCategories.includes(itemCategory);
          reason = isEligible 
            ? `Categoria "${itemCategory}" está na lista de elegíveis` 
            : `Categoria "${itemCategory}" NÃO está em [${normalizedCouponCategories.join(', ')}]`;
        }
        
        const itemSubtotal = (item.size ? item.size.price : (item.promotionalPrice || item.price)) * item.quantity;
        
        console.log(`  📍 Item ${index + 1}: ${item.productName}`);
        console.log(`     └─ Categoria: "${(item as any).category || 'N/A'}"`);
        console.log(`     └─ Product ID: ${item.productId}`);
        console.log(`     └─ Quantidade: ${item.quantity}`);
        console.log(`     └─ Subtotal: R$ ${itemSubtotal.toFixed(2)}`);
        console.log(`     └─ Elegível: ${isEligible ? '✅ SIM' : '❌ NÃO'}`);
        console.log(`     └─ Motivo: ${reason}`);
        console.log('');
      });

      // 5. Calcular subtotal elegível
      const { eligibleSubtotal, eligibleItems } = calculateEligibleSubtotal(
        itemsWithCategory,
        {
          appliesTo,
          categoryNames: coupon.category_names || [],
          productIds: coupon.product_ids || []
        }
      );

      console.log('💰 ─────────────────────────────────────────────');
      console.log('💰 RESUMO DA ELEGIBILIDADE:');
      console.log('💰 ─────────────────────────────────────────────');
      console.log(`   Itens elegíveis: ${eligibleItems.length} de ${items.length}`);
      console.log(`   Subtotal elegível: R$ ${eligibleSubtotal.toFixed(2)}`);
      console.log(`   Subtotal total: R$ ${items.reduce((sum, item) => {
        return sum + (item.size ? item.size.price : (item.promotionalPrice || item.price)) * item.quantity;
      }, 0).toFixed(2)}`);

      if (eligibleSubtotal === 0) {
        // Cupom é válido mas nenhum item é elegível - retornar com flag
        return {
          is_valid: true,
          discount_type: coupon.discount_type as DiscountType,
          discount_value: coupon.discount_value,
          discount_amount: 0,
          error_message: null,
          applies_to: appliesTo,
          category_names: coupon.category_names || [],
          product_ids: coupon.product_ids || [],
          has_no_eligible_items: true,
          discount_rules: discountRules
        };
      }

      // 6. Validar valor mínimo (baseado no subtotal elegível)
      const minOrderValue = coupon.min_order_value || 0;
      if (eligibleSubtotal < minOrderValue) {
        toast({
          title: 'Valor mínimo não atingido',
          description: `Valor mínimo de R$ ${minOrderValue.toFixed(2)} para itens elegíveis`,
          variant: 'destructive',
        });
        return {
          is_valid: false,
          discount_type: null,
          discount_value: null,
          discount_amount: 0,
          error_message: `Valor mínimo de R$ ${minOrderValue.toFixed(2)} para itens elegíveis`,
        };
      }

      // 7. Calcular desconto - usar regras personalizadas se existirem
      let discountAmount: number;
      
      if (discountRules.length > 0) {
        // Calcular com regras personalizadas
        discountAmount = calculateTotalDiscountWithRules(
          itemsWithCategory,
          {
            appliesTo,
            categoryNames: coupon.category_names || [],
            productIds: coupon.product_ids || []
          },
          coupon.discount_type as DiscountType,
          coupon.discount_value,
          discountRules
        );
        
        console.log('');
        console.log('🧮 ─────────────────────────────────────────────');
        console.log('🧮 CÁLCULO DO DESCONTO (COM REGRAS PERSONALIZADAS):');
        console.log('🧮 ─────────────────────────────────────────────');
        console.log(`   Regras personalizadas: ${discountRules.length}`);
        discountRules.forEach(rule => {
          console.log(`     - ${rule.rule_type === 'product' ? 'Produto' : 'Categoria'}: ${rule.discount_value}${rule.discount_type === 'percentage' ? '%' : ' R$'}`);
        });
        console.log(`   Desconto total calculado: R$ ${discountAmount.toFixed(2)}`);
      } else {
        // Calcular desconto padrão
        discountAmount = calculateDiscount(
          eligibleSubtotal,
          coupon.discount_type as DiscountType,
          coupon.discount_value
        );
        
        console.log('');
        console.log('🧮 ─────────────────────────────────────────────');
        console.log('🧮 CÁLCULO DO DESCONTO:');
        console.log('🧮 ─────────────────────────────────────────────');
        console.log(`   Tipo: ${coupon.discount_type}`);
        console.log(`   Valor configurado: ${coupon.discount_value}${coupon.discount_type === 'percentage' ? '%' : ' R$'}`);
        console.log(`   Base de cálculo (subtotal elegível): R$ ${eligibleSubtotal.toFixed(2)}`);
        if (coupon.discount_type === 'percentage') {
          console.log(`   Cálculo: R$ ${eligibleSubtotal.toFixed(2)} × ${coupon.discount_value}% = R$ ${discountAmount.toFixed(2)}`);
        } else {
          console.log(`   Desconto fixo aplicado: R$ ${discountAmount.toFixed(2)}`);
        }
      }
      
      console.log('');
      console.log('✅ ═══════════════════════════════════════════════');
      console.log('✅ CUPOM VÁLIDO - DESCONTO FINAL: R$', discountAmount.toFixed(2));
      console.log('✅ ═══════════════════════════════════════════════');

      return {
        is_valid: true,
        discount_type: coupon.discount_type as DiscountType,
        discount_value: coupon.discount_value,
        discount_amount: discountAmount,
        error_message: null,
        applies_to: appliesTo,
        category_names: coupon.category_names || [],
        product_ids: coupon.product_ids || [],
        discount_rules: discountRules
      };

    } catch (error: any) {
      console.error('Erro ao validar cupom:', error);
      toast({
        title: 'Erro ao validar cupom',
        description: 'Tente novamente mais tarde',
        variant: 'destructive',
      });
      return {
        is_valid: false,
        discount_type: null,
        discount_value: null,
        discount_amount: 0,
        error_message: 'Erro ao validar cupom',
      };
    }
  };

  /**
   * Validação simples de cupom (legado - usa apenas o total)
   * Mantido para compatibilidade com código existente
   */
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
      const { data, error } = await supabase.rpc('validate_coupon' as any, {
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
      console.warn('Coupon validation not available yet. Please run create_coupons_system.sql migration.');
      return {
        is_valid: false,
        discount_type: null,
        discount_value: null,
        discount_amount: 0,
        error_message: 'Sistema de cupons ainda não configurado',
      };
    }
  };

  const createCoupon = async (couponData: Omit<Coupon, 'id' | 'created_at' | 'updated_at' | 'used_count'>) => {
    try {
      console.log('Creating coupon with data:', couponData);
      
      const { data, error } = await supabase
        .from('coupons' as any)
        .insert([couponData])
        .select()
        .single();

      if (error) {
        console.error('Supabase error creating coupon:', error);
        throw error;
      }

      toast({
        title: 'Cupom criado com sucesso',
        description: `O cupom ${couponData.code} foi criado`,
      });

      await fetchCoupons();
      return data;
    } catch (error: any) {
      console.error('Error creating coupon:', error);
      
      const errorMessage = error.message || error.hint || 'Erro desconhecido';
      
      toast({
        title: 'Erro ao criar cupom',
        description: errorMessage,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updateCoupon = async (id: string, updates: Partial<Coupon>) => {
    try {
      console.log('Updating coupon:', id, updates);
      
      const { data, error } = await supabase
        .from('coupons' as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Supabase error updating coupon:', error);
        throw error;
      }

      toast({
        title: 'Cupom atualizado',
        description: 'As alterações foram salvas com sucesso',
      });

      await fetchCoupons();
      return data;
    } catch (error: any) {
      console.error('Error updating coupon:', error);
      
      const errorMessage = error.message || error.hint || 'Erro desconhecido';
      
      toast({
        title: 'Erro ao atualizar cupom',
        description: errorMessage,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const deleteCoupon = async (id: string) => {
    try {
      console.log('Deleting coupon:', id);
      
      const { error } = await supabase
        .from('coupons' as any)
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Supabase error deleting coupon:', error);
        throw error;
      }

      toast({
        title: 'Cupom excluído',
        description: 'O cupom foi removido com sucesso',
      });

      await fetchCoupons();
    } catch (error: any) {
      console.error('Error deleting coupon:', error);
      
      const errorMessage = error.message || error.hint || 'Erro desconhecido';
      
      toast({
        title: 'Erro ao excluir cupom',
        description: errorMessage,
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
    validateCouponWithScope,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    toggleCouponStatus,
  };
};
