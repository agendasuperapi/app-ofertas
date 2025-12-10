import { describe, it, expect } from 'vitest';

/**
 * Funções que simulam a lógica do trigger SQL de comissão
 * Estas funções replicam a lógica de process_affiliate_commission_for_order
 */

// Calcula a comissão para um item específico
export const calculateItemCommission = (
  itemValueWithDiscount: number,
  commissionType: string,
  commissionValue: number
): number => {
  if (commissionValue <= 0 || itemValueWithDiscount <= 0) return 0;
  
  if (commissionType === 'percentage') {
    return (itemValueWithDiscount * commissionValue) / 100;
  }
  return commissionValue; // fixed
};

// Aplica a hierarquia de comissão: específica > padrão > nenhuma
export const applyCommissionHierarchy = (
  productId: string,
  categoryName: string | null,
  specificRules: Array<{
    product_id: string | null;
    category_name: string | null;
    applies_to: string;
    commission_type: string;
    commission_value: number;
    is_active: boolean;
  }>,
  useDefaultCommission: boolean,
  defaultCommissionType: string,
  defaultCommissionValue: number
): { type: string; value: number; source: string } => {
  
  // 1. Verificar regra específica do produto (maior prioridade)
  const productRule = specificRules.find(
    r => r.applies_to === 'product' && r.product_id === productId && r.is_active
  );
  if (productRule) {
    return {
      type: productRule.commission_type,
      value: productRule.commission_value,
      source: 'specific_product'
    };
  }
  
  // 2. Verificar regra de categoria
  if (categoryName) {
    const categoryRule = specificRules.find(
      r => r.applies_to === 'category' && 
           r.category_name?.toLowerCase() === categoryName.toLowerCase() && 
           r.is_active
    );
    if (categoryRule) {
      return {
        type: categoryRule.commission_type,
        value: categoryRule.commission_value,
        source: 'specific_category'
      };
    }
  }
  
  // 3. Usar comissão padrão se habilitada
  if (useDefaultCommission && defaultCommissionValue > 0) {
    return {
      type: defaultCommissionType,
      value: defaultCommissionValue,
      source: 'default'
    };
  }
  
  // 4. Sem comissão
  return { type: 'percentage', value: 0, source: 'none' };
};

// Calcula desconto do item baseado nas regras do cupom
export const calculateItemCouponDiscount = (
  itemSubtotal: number,
  isEligible: boolean,
  discountRules: Array<{
    rule_type: string;
    product_id: string | null;
    category_name: string | null;
    discount_type: string;
    discount_value: number;
  }>,
  productId: string,
  categoryName: string | null,
  defaultDiscountType: string,
  defaultDiscountValue: number,
  totalEligibleSubtotal: number
): number => {
  if (!isEligible || itemSubtotal <= 0) return 0;
  
  // Verificar regra específica do produto
  const productRule = discountRules.find(r => r.rule_type === 'product' && r.product_id === productId);
  if (productRule) {
    if (productRule.discount_type === 'percentage') {
      return (itemSubtotal * productRule.discount_value) / 100;
    }
    return Math.min(productRule.discount_value, itemSubtotal);
  }
  
  // Verificar regra de categoria
  if (categoryName) {
    const categoryRule = discountRules.find(
      r => r.rule_type === 'category' && r.category_name?.toLowerCase() === categoryName.toLowerCase()
    );
    if (categoryRule) {
      if (categoryRule.discount_type === 'percentage') {
        return (itemSubtotal * categoryRule.discount_value) / 100;
      }
      return Math.min(categoryRule.discount_value, itemSubtotal);
    }
  }
  
  // Usar desconto padrão
  if (defaultDiscountType === 'percentage') {
    return (itemSubtotal * defaultDiscountValue) / 100;
  }
  
  // Desconto fixo proporcional
  const proportion = itemSubtotal / totalEligibleSubtotal;
  return Math.min(defaultDiscountValue * proportion, itemSubtotal);
};

describe('Commission Calculation', () => {
  describe('calculateItemCommission', () => {
    it('calcula comissão percentual corretamente', () => {
      expect(calculateItemCommission(100, 'percentage', 10)).toBe(10);
      expect(calculateItemCommission(250, 'percentage', 5)).toBe(12.5);
      expect(calculateItemCommission(1000, 'percentage', 15)).toBe(150);
    });

    it('calcula comissão fixa corretamente', () => {
      expect(calculateItemCommission(100, 'fixed', 15)).toBe(15);
      expect(calculateItemCommission(50, 'fixed', 25)).toBe(25);
    });

    it('retorna 0 quando commission_value é 0 ou negativo', () => {
      expect(calculateItemCommission(100, 'percentage', 0)).toBe(0);
      expect(calculateItemCommission(100, 'percentage', -5)).toBe(0);
    });

    it('retorna 0 quando item_value é 0 ou negativo', () => {
      expect(calculateItemCommission(0, 'percentage', 10)).toBe(0);
      expect(calculateItemCommission(-50, 'percentage', 10)).toBe(0);
    });

    it('lida com valores decimais', () => {
      expect(calculateItemCommission(99.99, 'percentage', 10)).toBeCloseTo(9.999, 2);
      expect(calculateItemCommission(150.50, 'percentage', 7.5)).toBeCloseTo(11.2875, 2);
    });
  });

  describe('applyCommissionHierarchy', () => {
    const baseRules = [
      {
        product_id: 'prod-1',
        category_name: null,
        applies_to: 'product',
        commission_type: 'percentage',
        commission_value: 20,
        is_active: true
      },
      {
        product_id: null,
        category_name: 'categoria1',
        applies_to: 'category',
        commission_type: 'percentage',
        commission_value: 15,
        is_active: true
      }
    ];

    it('prioridade 1: usa regra específica do produto', () => {
      const result = applyCommissionHierarchy(
        'prod-1', 'categoria1', baseRules, true, 'percentage', 10
      );
      expect(result.value).toBe(20);
      expect(result.source).toBe('specific_product');
    });

    it('prioridade 2: usa regra de categoria quando não há regra de produto', () => {
      const result = applyCommissionHierarchy(
        'prod-2', 'categoria1', baseRules, true, 'percentage', 10
      );
      expect(result.value).toBe(15);
      expect(result.source).toBe('specific_category');
    });

    it('prioridade 3: usa comissão padrão quando não há regras específicas', () => {
      const result = applyCommissionHierarchy(
        'prod-3', 'categoria2', baseRules, true, 'percentage', 10
      );
      expect(result.value).toBe(10);
      expect(result.source).toBe('default');
    });

    it('prioridade 4: sem comissão quando use_default_commission é false', () => {
      const result = applyCommissionHierarchy(
        'prod-3', 'categoria2', baseRules, false, 'percentage', 10
      );
      expect(result.value).toBe(0);
      expect(result.source).toBe('none');
    });

    it('ignora regras inativas', () => {
      const rulesWithInactive = [
        { ...baseRules[0], is_active: false }
      ];
      const result = applyCommissionHierarchy(
        'prod-1', 'categoria1', rulesWithInactive, true, 'percentage', 10
      );
      expect(result.value).toBe(10);
      expect(result.source).toBe('default');
    });

    it('compara categoria case-insensitive', () => {
      const result = applyCommissionHierarchy(
        'prod-2', 'CATEGORIA1', baseRules, true, 'percentage', 10
      );
      expect(result.value).toBe(15);
      expect(result.source).toBe('specific_category');
    });

    it('lida com categoria null', () => {
      const result = applyCommissionHierarchy(
        'prod-2', null, baseRules, true, 'percentage', 10
      );
      expect(result.value).toBe(10);
      expect(result.source).toBe('default');
    });
  });

  describe('calculateItemCouponDiscount', () => {
    const discountRules = [
      { rule_type: 'product', product_id: 'prod-1', category_name: null, discount_type: 'percentage', discount_value: 25 },
      { rule_type: 'category', product_id: null, category_name: 'categoria1', discount_type: 'percentage', discount_value: 15 }
    ];

    it('aplica regra específica de produto', () => {
      const discount = calculateItemCouponDiscount(
        100, true, discountRules, 'prod-1', 'categoria1', 'percentage', 10, 200
      );
      expect(discount).toBe(25); // 25% de 100
    });

    it('aplica regra de categoria quando não há regra de produto', () => {
      const discount = calculateItemCouponDiscount(
        100, true, discountRules, 'prod-2', 'categoria1', 'percentage', 10, 200
      );
      expect(discount).toBe(15); // 15% de 100
    });

    it('aplica desconto padrão quando não há regras específicas', () => {
      const discount = calculateItemCouponDiscount(
        100, true, discountRules, 'prod-3', 'categoria2', 'percentage', 10, 200
      );
      expect(discount).toBe(10); // 10% de 100
    });

    it('retorna 0 quando item não é elegível', () => {
      const discount = calculateItemCouponDiscount(
        100, false, discountRules, 'prod-1', 'categoria1', 'percentage', 10, 200
      );
      expect(discount).toBe(0);
    });

    it('aplica desconto fixo proporcional', () => {
      const discount = calculateItemCouponDiscount(
        100, true, [], 'prod-1', null, 'fixed', 50, 200
      );
      // 100/200 * 50 = 25
      expect(discount).toBe(25);
    });

    it('não excede subtotal do item para desconto fixo', () => {
      const discount = calculateItemCouponDiscount(
        20, true, [], 'prod-1', null, 'fixed', 50, 50
      );
      expect(discount).toBeLessThanOrEqual(20);
    });
  });

  describe('Cenário completo: Pedido com múltiplos itens', () => {
    it('calcula comissão total corretamente para pedido complexo', () => {
      const orderItems = [
        { product_id: 'prod-1', category: 'categoria1', subtotal: 100, item_discount: 10 }, // valor: 90
        { product_id: 'prod-2', category: 'categoria1', subtotal: 200, item_discount: 20 }, // valor: 180
        { product_id: 'prod-3', category: 'categoria2', subtotal: 50, item_discount: 0 }    // valor: 50
      ];
      
      const commissionRules = [
        { product_id: 'prod-1', category_name: null, applies_to: 'product', commission_type: 'percentage', commission_value: 20, is_active: true }
      ];
      
      const defaultCommission = { type: 'percentage', value: 10, use: true };
      
      let totalCommission = 0;
      
      orderItems.forEach(item => {
        const itemValue = item.subtotal - item.item_discount;
        const { type, value } = applyCommissionHierarchy(
          item.product_id, 
          item.category, 
          commissionRules, 
          defaultCommission.use, 
          defaultCommission.type, 
          defaultCommission.value
        );
        totalCommission += calculateItemCommission(itemValue, type, value);
      });
      
      // prod-1: 90 * 20% = 18 (regra específica)
      // prod-2: 180 * 10% = 18 (padrão - apenas regra de produto para prod-1)
      // prod-3: 50 * 10% = 5 (padrão)
      expect(totalCommission).toBe(41);
    });

    it('calcula corretamente quando todos os itens têm regras específicas', () => {
      const orderItems = [
        { product_id: 'prod-1', category: 'cat1', subtotal: 100, item_discount: 0 },
        { product_id: 'prod-2', category: 'cat2', subtotal: 100, item_discount: 0 }
      ];
      
      const commissionRules = [
        { product_id: 'prod-1', category_name: null, applies_to: 'product', commission_type: 'percentage', commission_value: 15, is_active: true },
        { product_id: 'prod-2', category_name: null, applies_to: 'product', commission_type: 'fixed', commission_value: 25, is_active: true }
      ];
      
      let totalCommission = 0;
      
      orderItems.forEach(item => {
        const itemValue = item.subtotal - item.item_discount;
        const { type, value } = applyCommissionHierarchy(
          item.product_id, item.category, commissionRules, false, 'percentage', 10
        );
        totalCommission += calculateItemCommission(itemValue, type, value);
      });
      
      // prod-1: 100 * 15% = 15
      // prod-2: 25 (fixo)
      expect(totalCommission).toBe(40);
    });

    it('calcula corretamente quando comissão padrão está desabilitada', () => {
      const orderItems = [
        { product_id: 'prod-1', category: 'cat1', subtotal: 100, item_discount: 0 },
        { product_id: 'prod-2', category: 'cat2', subtotal: 100, item_discount: 0 }
      ];
      
      const commissionRules = [
        { product_id: 'prod-1', category_name: null, applies_to: 'product', commission_type: 'percentage', commission_value: 10, is_active: true }
      ];
      
      let totalCommission = 0;
      
      orderItems.forEach(item => {
        const itemValue = item.subtotal - item.item_discount;
        const { type, value } = applyCommissionHierarchy(
          item.product_id, item.category, commissionRules, false, 'percentage', 10
        );
        totalCommission += calculateItemCommission(itemValue, type, value);
      });
      
      // prod-1: 100 * 10% = 10 (regra específica)
      // prod-2: 0 (sem comissão - padrão desabilitado)
      expect(totalCommission).toBe(10);
    });
  });
});
