// Mock data for commission tests

export const mockCartItems = [
  {
    productId: 'prod-1',
    productName: 'Produto A',
    price: 100,
    quantity: 2,
    category: 'categoria1',
    addons: [],
    flavors: [],
    selectedSize: null,
    selectedColor: null,
  },
  {
    productId: 'prod-2',
    productName: 'Produto B',
    price: 50,
    quantity: 1,
    category: 'categoria2',
    addons: [{ name: 'Extra', price: 10, quantity: 1 }],
    flavors: [],
    selectedSize: null,
    selectedColor: null,
  },
  {
    productId: 'prod-3',
    productName: 'Produto C',
    price: 200,
    promotionalPrice: 150,
    quantity: 1,
    category: 'categoria1',
    addons: [],
    flavors: [],
    selectedSize: { name: 'Grande', price: 20 },
    selectedColor: null,
  }
];

export const mockCoupon = {
  id: 'coupon-1',
  code: 'TEST10',
  discount_type: 'percentage' as const,
  discount_value: 10,
  applies_to: 'all' as const,
  category_names: [],
  product_ids: [],
  is_active: true
};

export const mockCouponWithRules = {
  ...mockCoupon,
  discount_rules: [
    {
      id: 'rule-1',
      rule_type: 'product',
      product_id: 'prod-1',
      category_name: null,
      discount_type: 'percentage',
      discount_value: 25
    },
    {
      id: 'rule-2',
      rule_type: 'category',
      product_id: null,
      category_name: 'categoria2',
      discount_type: 'fixed',
      discount_value: 15
    }
  ]
};

export const mockAffiliateEarnings = [
  {
    id: 'earning-1',
    order_id: 'order-1',
    affiliate_id: 'aff-1',
    store_affiliate_id: 'store-aff-1',
    commission_amount: 15.00,
    commission_type: 'percentage',
    commission_value: 10,
    order_total: 150.00,
    status: 'pending',
    created_at: '2024-01-15T10:00:00Z'
  },
  {
    id: 'earning-2',
    order_id: 'order-2',
    affiliate_id: 'aff-1',
    store_affiliate_id: 'store-aff-1',
    commission_amount: 25.00,
    commission_type: 'fixed',
    commission_value: 25,
    order_total: 200.00,
    status: 'pending',
    created_at: '2024-01-16T10:00:00Z'
  }
];

export const mockItemEarnings = [
  {
    id: 'item-earning-1',
    earning_id: 'earning-1',
    order_item_id: 'item-1',
    product_id: 'prod-1',
    product_name: 'Produto A',
    product_category: 'categoria1',
    item_subtotal: 100,
    item_discount: 10,
    item_value_with_discount: 90,
    commission_type: 'percentage',
    commission_value: 10,
    commission_amount: 9,
    commission_source: 'default',
    is_coupon_eligible: true,
    coupon_scope: 'all'
  }
];

export const mockWithdrawalRequest = {
  id: 'req-1',
  affiliate_id: 'aff-1',
  store_affiliate_id: 'store-aff-1',
  store_id: 'store-1',
  amount: 150.00,
  status: 'pending',
  requested_at: '2024-01-15T10:00:00Z',
  paid_at: null,
  pix_key: '12345678901',
  notes: null,
  admin_notes: null,
  payment_proof: null,
  affiliate_name: 'João Silva',
  affiliate_email: 'joao@test.com',
  affiliate_phone: '11999999999'
};

export const mockCommissionRules = [
  {
    id: 'rule-1',
    affiliate_id: 'aff-1',
    product_id: 'prod-1',
    category_name: null,
    applies_to: 'product',
    commission_type: 'percentage',
    commission_value: 20,
    is_active: true
  },
  {
    id: 'rule-2',
    affiliate_id: 'aff-1',
    product_id: null,
    category_name: 'categoria1',
    applies_to: 'category',
    commission_type: 'percentage',
    commission_value: 15,
    is_active: true
  }
];
