import { describe, it, expect } from 'vitest';
import {
  calculateItemSubtotal,
  calculateDiscount,
  isItemEligible,
  calculateItemDiscount,
  findItemDiscountRule,
  calculateEligibleSubtotal,
  calculateTotalDiscountWithRules
} from '../couponUtils';

describe('couponUtils', () => {
  describe('calculateItemSubtotal', () => {
    it('calcula subtotal básico corretamente', () => {
      const item = { price: 100, quantity: 2 } as any;
      expect(calculateItemSubtotal(item)).toBe(200);
    });

    it('calcula subtotal com quantidade 1', () => {
      const item = { price: 50, quantity: 1 } as any;
      expect(calculateItemSubtotal(item)).toBe(50);
    });

    it('inclui preço de adicionais', () => {
      const item = {
        price: 100,
        quantity: 1,
        addons: [{ price: 10, quantity: 2 }]
      } as any;
      expect(calculateItemSubtotal(item)).toBe(120);
    });

    it('inclui múltiplos adicionais', () => {
      const item = {
        price: 100,
        quantity: 1,
        addons: [
          { price: 10, quantity: 1 },
          { price: 5, quantity: 2 }
        ]
      } as any;
      expect(calculateItemSubtotal(item)).toBe(120);
    });

    it('inclui preço de tamanho selecionado', () => {
      const item = {
        price: 100,
        quantity: 1,
        selectedSize: { price: 20 }
      } as any;
      expect(calculateItemSubtotal(item)).toBe(120);
    });

    it('inclui preço de sabores', () => {
      const item = {
        price: 100,
        quantity: 1,
        flavors: [{ price: 5 }, { price: 3 }]
      } as any;
      expect(calculateItemSubtotal(item)).toBe(108);
    });

    it('inclui preço de cor selecionada', () => {
      const item = {
        price: 100,
        quantity: 1,
        selectedColor: { price: 15 }
      } as any;
      expect(calculateItemSubtotal(item)).toBe(115);
    });

    it('calcula subtotal completo com todos os extras', () => {
      const item = {
        price: 100,
        quantity: 2,
        addons: [{ price: 10, quantity: 1 }],
        selectedSize: { price: 20 },
        flavors: [{ price: 5 }],
        selectedColor: { price: 10 }
      } as any;
      // (100 + 10 + 20 + 5 + 10) * 2 = 290
      expect(calculateItemSubtotal(item)).toBe(290);
    });
  });

  describe('calculateDiscount', () => {
    it('calcula desconto percentual corretamente', () => {
      expect(calculateDiscount(200, 'percentage', 10)).toBe(20);
      expect(calculateDiscount(100, 'percentage', 25)).toBe(25);
      expect(calculateDiscount(150, 'percentage', 50)).toBe(75);
    });

    it('calcula desconto fixo corretamente', () => {
      expect(calculateDiscount(200, 'fixed', 30)).toBe(30);
      expect(calculateDiscount(100, 'fixed', 50)).toBe(50);
    });

    it('não excede o subtotal elegível para desconto fixo', () => {
      expect(calculateDiscount(50, 'fixed', 100)).toBe(50);
      expect(calculateDiscount(20, 'fixed', 50)).toBe(20);
    });

    it('retorna 0 para subtotal <= 0', () => {
      expect(calculateDiscount(0, 'percentage', 10)).toBe(0);
      expect(calculateDiscount(-10, 'percentage', 10)).toBe(0);
    });

    it('retorna 0 para desconto value <= 0', () => {
      expect(calculateDiscount(100, 'percentage', 0)).toBe(0);
      expect(calculateDiscount(100, 'percentage', -5)).toBe(0);
    });
  });

  describe('isItemEligible', () => {
    const baseItem = { 
      productId: 'prod-1', 
      category: 'categoria1' 
    } as any;

    it('retorna true quando applies_to é "all"', () => {
      expect(isItemEligible(baseItem, 'all', [], [])).toBe(true);
    });

    it('verifica elegibilidade por produto - elegível', () => {
      expect(isItemEligible(baseItem, 'product', [], ['prod-1'])).toBe(true);
    });

    it('verifica elegibilidade por produto - não elegível', () => {
      expect(isItemEligible(baseItem, 'product', [], ['prod-2', 'prod-3'])).toBe(false);
    });

    it('verifica elegibilidade por categoria - elegível', () => {
      expect(isItemEligible(baseItem, 'category', ['categoria1'], [])).toBe(true);
    });

    it('verifica elegibilidade por categoria - não elegível', () => {
      expect(isItemEligible(baseItem, 'category', ['categoria2'], [])).toBe(false);
    });

    it('verifica elegibilidade por categoria case-insensitive', () => {
      expect(isItemEligible(baseItem, 'category', ['CATEGORIA1'], [])).toBe(true);
      expect(isItemEligible(baseItem, 'category', ['Categoria1'], [])).toBe(true);
    });

    it('retorna false para item sem categoria quando scope é category', () => {
      const itemSemCategoria = { productId: 'prod-1' } as any;
      expect(isItemEligible(itemSemCategoria, 'category', ['categoria1'], [])).toBe(false);
    });
  });

  describe('findItemDiscountRule - Hierarquia', () => {
    it('prioriza regra de produto sobre categoria', () => {
      const rules = [
        { rule_type: 'product', product_id: 'prod-1', category_name: null, discount_type: 'percentage', discount_value: 20 },
        { rule_type: 'category', product_id: null, category_name: 'categoria1', discount_type: 'percentage', discount_value: 10 }
      ] as any;
      const item = { productId: 'prod-1', category: 'categoria1' } as any;
      
      const rule = findItemDiscountRule(item, rules);
      expect(rule?.discount_value).toBe(20);
      expect(rule?.rule_type).toBe('product');
    });

    it('usa regra de categoria quando não há regra de produto específica', () => {
      const rules = [
        { rule_type: 'category', product_id: null, category_name: 'categoria1', discount_type: 'percentage', discount_value: 15 }
      ] as any;
      const item = { productId: 'prod-2', category: 'categoria1' } as any;
      
      const rule = findItemDiscountRule(item, rules);
      expect(rule?.discount_value).toBe(15);
      expect(rule?.rule_type).toBe('category');
    });

    it('retorna undefined quando não há regra específica', () => {
      const rules = [
        { rule_type: 'product', product_id: 'prod-other', category_name: null, discount_value: 20 }
      ] as any;
      const item = { productId: 'prod-1', category: 'categoria3' } as any;
      
      expect(findItemDiscountRule(item, rules)).toBeUndefined();
    });

    it('retorna undefined para array vazio de regras', () => {
      const item = { productId: 'prod-1', category: 'categoria1' } as any;
      expect(findItemDiscountRule(item, [])).toBeUndefined();
    });

    it('compara categoria case-insensitive', () => {
      const rules = [
        { rule_type: 'category', product_id: null, category_name: 'CATEGORIA1', discount_value: 10 }
      ] as any;
      const item = { productId: 'prod-1', category: 'categoria1' } as any;
      
      const rule = findItemDiscountRule(item, rules);
      expect(rule?.discount_value).toBe(10);
    });
  });

  describe('calculateEligibleSubtotal', () => {
    const items = [
      { productId: 'prod-1', category: 'cat1', price: 100, quantity: 1 },
      { productId: 'prod-2', category: 'cat2', price: 50, quantity: 2 },
      { productId: 'prod-3', category: 'cat1', price: 75, quantity: 1 }
    ] as any;

    it('retorna total quando scope é all', () => {
      const scope = { appliesTo: 'all' as const, categoryNames: [], productIds: [] };
      expect(calculateEligibleSubtotal(items, scope)).toBe(275); // 100 + 100 + 75
    });

    it('filtra por categoria', () => {
      const scope = { appliesTo: 'category' as const, categoryNames: ['cat1'], productIds: [] };
      expect(calculateEligibleSubtotal(items, scope)).toBe(175); // 100 + 75
    });

    it('filtra por produto', () => {
      const scope = { appliesTo: 'product' as const, categoryNames: [], productIds: ['prod-1', 'prod-3'] };
      expect(calculateEligibleSubtotal(items, scope)).toBe(175); // 100 + 75
    });
  });

  describe('calculateItemDiscount', () => {
    const baseItem = { 
      productId: 'prod-1', 
      category: 'categoria1',
      price: 100, 
      quantity: 1 
    } as any;

    it('aplica regra específica de produto quando disponível', () => {
      const rules = [
        { rule_type: 'product', product_id: 'prod-1', discount_type: 'percentage', discount_value: 25 }
      ] as any;
      
      const result = calculateItemDiscount(
        baseItem, 0, 'percentage', 10, 'all', [], [], [baseItem], rules
      );
      
      expect(result.isEligible).toBe(true);
      expect(result.discount).toBe(25); // 25% de 100
    });

    it('usa desconto padrão quando não há regra específica', () => {
      const result = calculateItemDiscount(
        baseItem, 0, 'percentage', 10, 'all', [], [], [baseItem], []
      );
      
      expect(result.isEligible).toBe(true);
      expect(result.discount).toBe(10); // 10% de 100
    });

    it('retorna isEligible false para item não elegível', () => {
      const result = calculateItemDiscount(
        baseItem, 0, 'percentage', 10, 'product', [], ['prod-2'], [baseItem], []
      );
      
      expect(result.isEligible).toBe(false);
      expect(result.discount).toBe(0);
    });

    it('aplica desconto fixo corretamente', () => {
      const result = calculateItemDiscount(
        baseItem, 0, 'fixed', 30, 'all', [], [], [baseItem], []
      );
      
      expect(result.isEligible).toBe(true);
      expect(result.discount).toBe(30);
    });

    it('não excede subtotal do item para desconto fixo', () => {
      const smallItem = { ...baseItem, price: 20 };
      const result = calculateItemDiscount(
        smallItem, 0, 'fixed', 50, 'all', [], [], [smallItem], []
      );
      
      expect(result.discount).toBeLessThanOrEqual(20);
    });
  });

  describe('calculateTotalDiscountWithRules', () => {
    const items = [
      { productId: 'prod-1', category: 'cat1', price: 100, quantity: 1 },
      { productId: 'prod-2', category: 'cat2', price: 50, quantity: 1 }
    ] as any;

    it('calcula desconto total sem regras específicas', () => {
      const scope = { appliesTo: 'all' as const, categoryNames: [], productIds: [] };
      const total = calculateTotalDiscountWithRules(items, scope, 'percentage', 10, []);
      
      expect(total).toBe(15); // 10% de 150
    });

    it('aplica regras específicas quando disponíveis', () => {
      const scope = { appliesTo: 'all' as const, categoryNames: [], productIds: [] };
      const rules = [
        { rule_type: 'product', product_id: 'prod-1', discount_type: 'percentage', discount_value: 20 }
      ] as any;
      
      const total = calculateTotalDiscountWithRules(items, scope, 'percentage', 10, rules);
      
      // prod-1: 20% de 100 = 20
      // prod-2: 10% de 50 = 5
      expect(total).toBe(25);
    });
  });
});
