import { CartItem } from '@/contexts/CartContext';

export interface CouponScope {
  appliesTo: 'all' | 'category' | 'product';
  categoryNames: string[];
  productIds: string[];
}

export interface CouponDiscountRule {
  id: string;
  coupon_id: string;
  rule_type: 'product' | 'category';
  product_id?: string | null;
  category_name?: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
}

/**
 * Calcula o subtotal dos itens elegíveis baseado no escopo do cupom
 */
export const calculateEligibleSubtotal = (
  items: CartItem[],
  scope: CouponScope
): { eligibleSubtotal: number; eligibleItems: CartItem[] } => {
  const { appliesTo, categoryNames, productIds } = scope;

  // Normalizar nomes de categorias para comparação (case-insensitive, sem espaços extras)
  const normalizedCategoryNames = categoryNames.map(cat => 
    cat.toLowerCase().trim()
  );

  // Se aplica a todos, retorna o subtotal total
  if (appliesTo === 'all') {
    const eligibleSubtotal = items.reduce((sum, item) => {
      return sum + calculateItemSubtotal(item);
    }, 0);
    return { eligibleSubtotal, eligibleItems: items };
  }

  // Filtrar itens elegíveis
  const eligibleItems = items.filter(item => {
    if (appliesTo === 'product') {
      const isEligible = productIds.includes(item.productId);
      return isEligible;
    }
    if (appliesTo === 'category') {
      const itemCategory = ((item as any).category || '').toLowerCase().trim();
      const isEligible = normalizedCategoryNames.includes(itemCategory);
      return isEligible;
    }
    return false;
  });

  const eligibleSubtotal = eligibleItems.reduce((sum, item) => {
    return sum + calculateItemSubtotal(item);
  }, 0);

  return { eligibleSubtotal, eligibleItems };
};

/**
 * Calcula o subtotal de um item individual
 */
export const calculateItemSubtotal = (item: CartItem): number => {
  const basePrice = item.size ? item.size.price : (item.promotionalPrice || item.price);
  const addonsPrice = item.addons?.reduce((s, a) => s + a.price * (a.quantity || 1), 0) || 0;
  const flavorsPrice = item.flavors?.reduce((s, f) => s + f.price * (f.quantity || 1), 0) || 0;
  const colorPrice = item.color?.price || 0;
  
  return (basePrice + addonsPrice + flavorsPrice + colorPrice) * item.quantity;
};

/**
 * Calcula o desconto baseado no tipo e valor do cupom
 */
export const calculateDiscount = (
  eligibleSubtotal: number,
  discountType: 'percentage' | 'fixed',
  discountValue: number
): number => {
  if (eligibleSubtotal <= 0) return 0;

  if (discountType === 'percentage') {
    const discount = (eligibleSubtotal * discountValue) / 100;
    return Math.min(discount, eligibleSubtotal);
  }

  return Math.min(discountValue, eligibleSubtotal);
};

/**
 * Verifica se um item é elegível para desconto com base no escopo do cupom
 */
export const isItemEligible = (
  item: CartItem,
  appliesTo: 'all' | 'category' | 'product',
  categoryNames: string[],
  productIds: string[]
): boolean => {
  if (appliesTo === 'all') return true;
  
  if (appliesTo === 'product') {
    return productIds.includes(item.productId);
  }
  
  if (appliesTo === 'category') {
    const itemCategory = ((item as any).category || '').toLowerCase().trim();
    const normalizedCategoryNames = categoryNames.map(cat => cat.toLowerCase().trim());
    return normalizedCategoryNames.includes(itemCategory);
  }
  
  return false;
};

/**
 * Busca a regra de desconto específica para um item
 * Hierarquia: regra do produto > regra da categoria > desconto padrão
 */
export const findItemDiscountRule = (
  item: CartItem,
  discountRules: CouponDiscountRule[]
): CouponDiscountRule | null => {
  // 1. Verificar regra específica do produto
  const productRule = discountRules.find(
    rule => rule.rule_type === 'product' && rule.product_id === item.productId
  );
  if (productRule) {
    return productRule;
  }

  // 2. Verificar regra de categoria
  const itemCategory = ((item as any).category || '').toLowerCase().trim();
  const categoryRule = discountRules.find(
    rule => rule.rule_type === 'category' && 
    rule.category_name?.toLowerCase().trim() === itemCategory
  );
  if (categoryRule) {
    return categoryRule;
  }

  // 3. Sem regra específica - usar desconto padrão
  return null;
};

/**
 * Calcula o desconto para um item específico do carrinho
 * Suporta regras de desconto personalizadas (coupon_discount_rules)
 */
export const calculateItemDiscount = (
  item: CartItem,
  totalDiscount: number,
  discountType: 'percentage' | 'fixed',
  discountValue: number,
  appliesTo: 'all' | 'category' | 'product',
  categoryNames: string[],
  productIds: string[],
  allItems: CartItem[],
  discountRules?: CouponDiscountRule[]
): { isEligible: boolean; discount: number; usedRule?: CouponDiscountRule } => {
  console.log('🔍 [calculateItemDiscount] Iniciando cálculo:', {
    productId: item.productId,
    productName: item.productName,
    category: (item as any).category,
    appliesTo,
    discountType,
    discountValue,
    hasDiscountRules: !!discountRules,
    rulesCount: discountRules?.length || 0
  });
  
  // Verificar se o item é elegível baseado no escopo do cupom
  const isEligible = isItemEligible(item, appliesTo, categoryNames, productIds);
  
  console.log('🔍 [calculateItemDiscount] Elegibilidade:', {
    productName: item.productName,
    isEligible,
    categoryNames,
    productIds
  });
  
  if (!isEligible) {
    console.log('❌ [calculateItemDiscount] Item NÃO elegível:', item.productName);
    return { isEligible: false, discount: 0 };
  }
  
  const itemSubtotal = calculateItemSubtotal(item);
  console.log('💰 [calculateItemDiscount] Subtotal do item:', itemSubtotal);
  
  // Verificar se existe uma regra específica para este item
  const specificRule = discountRules ? findItemDiscountRule(item, discountRules) : null;
  
  console.log('🎯 [calculateItemDiscount] Regra específica encontrada:', specificRule ? {
    ruleType: specificRule.rule_type,
    discountType: specificRule.discount_type,
    discountValue: specificRule.discount_value,
    productId: specificRule.product_id,
    categoryName: specificRule.category_name
  } : 'NENHUMA (usar padrão)');
  
  if (specificRule) {
    // Usar a regra específica
    if (specificRule.discount_type === 'percentage') {
      const discount = (itemSubtotal * specificRule.discount_value) / 100;
      console.log('✅ [calculateItemDiscount] Desconto com REGRA ESPECÍFICA (%):', {
        productName: item.productName,
        subtotal: itemSubtotal,
        discountValue: specificRule.discount_value,
        calculatedDiscount: discount
      });
      return { isEligible: true, discount, usedRule: specificRule };
    } else {
      // Para valor fixo em regra específica, aplicar proporcional
      const eligibleItems = allItems.filter(i => 
        isItemEligible(i, appliesTo, categoryNames, productIds) &&
        findItemDiscountRule(i, discountRules || [])?.id === specificRule.id
      );
      const totalEligibleSubtotal = eligibleItems.reduce((sum, i) => 
        sum + calculateItemSubtotal(i), 0
      );
      
      if (totalEligibleSubtotal <= 0) {
        return { isEligible: true, discount: 0, usedRule: specificRule };
      }
      
      const proportionalDiscount = (itemSubtotal / totalEligibleSubtotal) * Math.min(specificRule.discount_value, totalEligibleSubtotal);
      console.log('✅ [calculateItemDiscount] Desconto com REGRA ESPECÍFICA (fixo):', {
        productName: item.productName,
        subtotal: itemSubtotal,
        proportionalDiscount
      });
      return { isEligible: true, discount: proportionalDiscount, usedRule: specificRule };
    }
  }
  
  // Sem regra específica - usar desconto padrão do cupom
  console.log('📌 [calculateItemDiscount] Usando desconto PADRÃO do cupom:', {
    productName: item.productName,
    discountType,
    discountValue
  });
  
  // Para porcentagem: aplicar % diretamente ao subtotal do item
  if (discountType === 'percentage') {
    const discount = (itemSubtotal * discountValue) / 100;
    console.log('✅ [calculateItemDiscount] Desconto PADRÃO (%):', {
      productName: item.productName,
      subtotal: itemSubtotal,
      discountValue,
      calculatedDiscount: discount
    });
    return { isEligible: true, discount };
  }
  
  // Para valor fixo: distribuir proporcionalmente entre itens elegíveis sem regras específicas
  const eligibleItemsWithoutRules = allItems.filter(i => 
    isItemEligible(i, appliesTo, categoryNames, productIds) &&
    (!discountRules || !findItemDiscountRule(i, discountRules))
  );
  
  const totalEligibleSubtotal = eligibleItemsWithoutRules.reduce((sum, i) => 
    sum + calculateItemSubtotal(i), 0
  );
  
  if (totalEligibleSubtotal <= 0) {
    return { isEligible: true, discount: 0 };
  }
  
  // Desconto proporcional = (subtotal do item / subtotal total elegível) * desconto total
  const proportionalDiscount = (itemSubtotal / totalEligibleSubtotal) * Math.min(discountValue, totalEligibleSubtotal);
  
  return { isEligible: true, discount: proportionalDiscount };
};

/**
 * Calcula o desconto total considerando regras personalizadas
 */
export const calculateTotalDiscountWithRules = (
  items: CartItem[],
  scope: CouponScope,
  defaultDiscountType: 'percentage' | 'fixed',
  defaultDiscountValue: number,
  discountRules: CouponDiscountRule[]
): number => {
  let totalDiscount = 0;
  
  items.forEach(item => {
    const result = calculateItemDiscount(
      item,
      0, // totalDiscount não usado quando há regras
      defaultDiscountType,
      defaultDiscountValue,
      scope.appliesTo,
      scope.categoryNames,
      scope.productIds,
      items,
      discountRules
    );
    
    if (result.isEligible) {
      totalDiscount += result.discount;
    }
  });
  
  return totalDiscount;
};
