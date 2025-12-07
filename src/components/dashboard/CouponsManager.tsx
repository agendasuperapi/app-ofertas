import { useState, useMemo, useEffect } from 'react';
import { useCoupons, Coupon, DiscountType } from '@/hooks/useCoupons';
import { useEmployeeAccess } from '@/hooks/useEmployeeAccess';
import { useCategories } from '@/hooks/useCategories';
import { useProducts } from '@/hooks/useProducts';
import { useAffiliates } from '@/hooks/useAffiliates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Pencil, Trash2, Ticket, Calendar, DollarSign, Users, Copy, BarChart3, Search, XCircle, UserCheck, Settings, ChevronDown, ChevronRight, Save, X, Package } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { CouponsReport } from './CouponsReport';
import { supabase } from '@/integrations/supabase/client';

interface CouponsManagerProps {
  storeId: string;
}

const couponSchema = z.object({
  code: z.string().min(3, 'Código deve ter no mínimo 3 caracteres').max(20, 'Código deve ter no máximo 20 caracteres').regex(/^[A-Z0-9]+$/, 'Use apenas letras maiúsculas e números'),
  discount_type: z.enum(['percentage', 'fixed']),
  discount_value: z.number().positive('Valor deve ser positivo'),
  min_order_value: z.number().min(0, 'Valor mínimo não pode ser negativo'),
  max_uses: z.number().nullable(),
  valid_from: z.string(),
  valid_until: z.string().nullable(),
});

export function CouponsManager({ storeId }: CouponsManagerProps) {
  const { coupons, isLoading, createCoupon, updateCoupon, deleteCoupon, toggleCouponStatus } = useCoupons(storeId);
  const { categories } = useCategories(storeId);
  const { data: products = [] } = useProducts(storeId);
  const { affiliates } = useAffiliates(storeId);
  const employeeAccess = useEmployeeAccess();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const { toast } = useToast();

  // Estados de busca e filtros
  const [categorySearch, setCategorySearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [couponSearch, setCouponSearch] = useState('');

  // Estados para regras específicas de desconto
  const [couponDiscountRules, setCouponDiscountRules] = useState<{
    product_id: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
  }[]>([]);
  const [couponCategoryRules, setCouponCategoryRules] = useState<{
    category_name: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
  }[]>([]);
  
  // Estados para modais de regras
  const [couponRulesModalOpen, setCouponRulesModalOpen] = useState(false);
  const [couponCategoryRulesModalOpen, setCouponCategoryRulesModalOpen] = useState(false);
  const [couponRuleProductSearch, setCouponRuleProductSearch] = useState('');
  const [collapsedCouponRuleCategories, setCollapsedCouponRuleCategories] = useState<Set<string>>(new Set());
  
  // Estados para edição inline de regras
  const [editingCouponRuleProductId, setEditingCouponRuleProductId] = useState<string | null>(null);
  const [editingCouponRuleCategoryName, setEditingCouponRuleCategoryName] = useState<string | null>(null);
  const [editingCouponRuleValue, setEditingCouponRuleValue] = useState<number>(0);
  const [editingCouponRuleType, setEditingCouponRuleType] = useState<'percentage' | 'fixed'>('percentage');
  
  // Estados para seleção em batch
  const [selectedCouponRuleProductIds, setSelectedCouponRuleProductIds] = useState<Set<string>>(new Set());
  const [selectedCouponRuleCategoryNames, setSelectedCouponRuleCategoryNames] = useState<Set<string>>(new Set());

  // Verificar permissões
  const hasPermission = (action: string): boolean => {
    if (!employeeAccess.isEmployee || !employeeAccess.permissions) return true;
    const modulePermissions = (employeeAccess.permissions as any)['coupons'];
    return modulePermissions?.[action] === true;
  };

  const canCreate = hasPermission('create');
  const canUpdate = hasPermission('update');
  const canDelete = hasPermission('delete');
  const canToggleStatus = hasPermission('toggle_status');

  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percentage' as DiscountType,
    discount_value: '',
    min_order_value: '0',
    max_uses: '',
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: '',
    is_active: true,
    applies_to: 'all' as 'all' | 'category' | 'product',
    category_names: [] as string[],
    product_ids: [] as string[],
  });

  // Filtros de busca
  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return categories;
    return categories.filter(c => c.name.toLowerCase().includes(categorySearch.toLowerCase()));
  }, [categories, categorySearch]);

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    return products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()));
  }, [products, productSearch]);

  const filteredCouponRuleProducts = useMemo(() => {
    if (!couponRuleProductSearch.trim()) return products;
    const search = couponRuleProductSearch.toLowerCase().trim();
    return products.filter(p => 
      p.name?.toLowerCase().includes(search) ||
      p.short_id?.toLowerCase().includes(search) ||
      p.external_code?.toLowerCase().includes(search)
    );
  }, [products, couponRuleProductSearch]);

  // Filtro de cupons por status e busca
  const filteredCoupons = useMemo(() => {
    let result = coupons;
    
    // Filtro por status
    if (statusFilter !== 'all') {
      result = result.filter(c => statusFilter === 'active' ? c.is_active : !c.is_active);
    }
    
    // Filtro por busca (código ou afiliado)
    if (couponSearch.trim()) {
      const searchLower = couponSearch.toLowerCase().trim();
      result = result.filter(coupon => {
        const codeMatch = coupon.code.toLowerCase().includes(searchLower);
        const linkedAffiliate = affiliates.find(affiliate => 
          affiliate.affiliate_coupons?.some((ac: any) => ac.coupon_id === coupon.id)
        );
        const affiliateMatch = linkedAffiliate?.name.toLowerCase().includes(searchLower);
        return codeMatch || affiliateMatch;
      });
    }
    
    return result;
  }, [coupons, statusFilter, couponSearch, affiliates]);

  // Função para encontrar o afiliado vinculado a um cupom
  const getLinkedAffiliate = (couponId: string) => {
    return affiliates.find(affiliate => 
      affiliate.affiliate_coupons?.some((ac: any) => ac.coupon_id === couponId)
    );
  };

  const resetForm = () => {
    setFormData({
      code: '',
      discount_type: 'percentage',
      discount_value: '',
      min_order_value: '0',
      max_uses: '',
      valid_from: new Date().toISOString().split('T')[0],
      valid_until: '',
      is_active: true,
      applies_to: 'all',
      category_names: [],
      product_ids: [],
    });
    setEditingCoupon(null);
    setCategorySearch('');
    setProductSearch('');
    setCouponDiscountRules([]);
    setCouponCategoryRules([]);
  };

  const handleOpenDialog = async (coupon?: Coupon) => {
    if (coupon) {
      setEditingCoupon(coupon);
      const couponAny = coupon as any;
      setFormData({
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value.toString(),
        min_order_value: coupon.min_order_value.toString(),
        max_uses: coupon.max_uses?.toString() || '',
        valid_from: coupon.valid_from.split('T')[0],
        valid_until: coupon.valid_until?.split('T')[0] || '',
        is_active: coupon.is_active,
        applies_to: couponAny.applies_to || 'all',
        category_names: couponAny.category_names || [],
        product_ids: couponAny.product_ids || [],
      });

      // Carregar regras específicas do banco de dados
      const { data: rules } = await supabase
        .from('coupon_discount_rules')
        .select('*')
        .eq('coupon_id', coupon.id);

      if (rules) {
        const productRules = rules
          .filter(r => r.rule_type === 'product' && r.product_id)
          .map(r => ({
            product_id: r.product_id!,
            discount_type: r.discount_type as 'percentage' | 'fixed',
            discount_value: r.discount_value,
          }));
        
        const categoryRules = rules
          .filter(r => r.rule_type === 'category' && r.category_name)
          .map(r => ({
            category_name: r.category_name!,
            discount_type: r.discount_type as 'percentage' | 'fixed',
            discount_value: r.discount_value,
          }));

        setCouponDiscountRules(productRules);
        setCouponCategoryRules(categoryRules);
      }
    } else {
      resetForm();
    }
    setCategorySearch('');
    setProductSearch('');
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validatedData = couponSchema.parse({
        code: formData.code.toUpperCase(),
        discount_type: formData.discount_type,
        discount_value: parseFloat(formData.discount_value),
        min_order_value: parseFloat(formData.min_order_value),
        max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
        valid_from: formData.valid_from,
        valid_until: formData.valid_until || null,
      });

      if (formData.discount_type === 'percentage' && validatedData.discount_value > 100) {
        toast({
          title: 'Valor inválido',
          description: 'Desconto percentual não pode ser maior que 100%',
          variant: 'destructive',
        });
        return;
      }

      // Validação de escopo
      if (formData.applies_to === 'category' && formData.category_names.length === 0) {
        toast({
          title: 'Selecione pelo menos uma categoria',
          description: 'Para cupom por categoria, selecione pelo menos uma categoria.',
          variant: 'destructive',
        });
        return;
      }

      if (formData.applies_to === 'product' && formData.product_ids.length === 0) {
        toast({
          title: 'Selecione pelo menos um produto',
          description: 'Para cupom por produto, selecione pelo menos um produto.',
          variant: 'destructive',
        });
        return;
      }

      const couponData = {
        ...validatedData,
        is_active: formData.is_active,
        applies_to: formData.applies_to,
        category_names: formData.category_names,
        product_ids: formData.product_ids,
      };

      let couponId: string | undefined;

      if (editingCoupon) {
        await updateCoupon(editingCoupon.id, couponData as any);
        couponId = editingCoupon.id;
      } else {
        const result = await createCoupon({
          store_id: storeId,
          ...couponData,
        } as any) as any;
        couponId = result?.id;
      }

      // Salvar regras específicas de desconto no banco de dados
      if (couponId) {
        // Deletar regras existentes
        await supabase
          .from('coupon_discount_rules')
          .delete()
          .eq('coupon_id', couponId);

        // Inserir regras de produto
        if (couponDiscountRules.length > 0) {
          const productRules = couponDiscountRules.map(rule => ({
            coupon_id: couponId,
            rule_type: 'product' as const,
            product_id: rule.product_id,
            discount_type: rule.discount_type,
            discount_value: rule.discount_value,
          }));
          
          const { error: productError } = await supabase
            .from('coupon_discount_rules')
            .insert(productRules);
          
          if (productError) {
            console.error('Error saving product rules:', productError);
          }
        }

        // Inserir regras de categoria
        if (couponCategoryRules.length > 0) {
          const categoryRules = couponCategoryRules.map(rule => ({
            coupon_id: couponId,
            rule_type: 'category' as const,
            category_name: rule.category_name,
            discount_type: rule.discount_type,
            discount_value: rule.discount_value,
          }));
          
          const { error: categoryError } = await supabase
            .from('coupon_discount_rules')
            .insert(categoryRules);
          
          if (categoryError) {
            console.error('Error saving category rules:', categoryError);
          }
        }
      }

      handleCloseDialog();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Erro de validação',
          description: error.issues[0].message,
          variant: 'destructive',
        });
      }
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: 'Código copiado',
      description: `O código ${code} foi copiado para a área de transferência`,
    });
  };

  const formatDiscount = (type: DiscountType, value: number) => {
    return type === 'percentage' ? `${value}%` : `R$ ${value.toFixed(2)}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Carregando cupons...</div>;
  }

  return (
    <div className="space-y-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-3xl font-bold gradient-text flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow">
              <Ticket className="h-5 w-5 text-white" />
            </div>
            Cupons de Desconto
          </h2>
          <p className="text-muted-foreground mt-1">Gerencie os cupons promocionais da sua loja</p>
        </div>
      </motion.div>

      <Tabs defaultValue="management" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 glass">
          <TabsTrigger value="management" className="gap-2">
            <Ticket className="h-4 w-4" />
            Gerenciar Cupons
          </TabsTrigger>
          <TabsTrigger value="report" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Relatório
          </TabsTrigger>
        </TabsList>

        <TabsContent value="management" className="space-y-6">
          <div className="flex justify-end">
            {canCreate && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => handleOpenDialog()} className="gap-2 bg-gradient-primary shadow-glow hover-lift">
                    <Plus className="h-4 w-4" />
                    Novo Cupom
                  </Button>
                </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] glass max-h-[90vh] overflow-hidden flex flex-col">
            <form onSubmit={handleSubmit} className="flex flex-col h-full">
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow">
                    <Ticket className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl gradient-text">
                      {editingCoupon ? 'Editar Cupom' : 'Criar Novo Cupom'}
                    </DialogTitle>
                    <DialogDescription>
                      Configure os detalhes do cupom de desconto
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <Tabs defaultValue="geral" className="flex-1 overflow-hidden flex flex-col mt-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="geral">Configurações Gerais</TabsTrigger>
                  <TabsTrigger value="regras">Regras Específicas</TabsTrigger>
                </TabsList>

                <TabsContent value="geral" className="flex-1 overflow-auto mt-4">
                  <ScrollArea className="h-[calc(60vh-120px)] pr-4">
                    <div className="grid gap-4 py-2">
                      <div className="grid gap-2">
                        <Label htmlFor="code">Código do Cupom *</Label>
                        <Input
                          id="code"
                          value={formData.code}
                          onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                          placeholder="Ex: PROMO10"
                          required
                          maxLength={20}
                          disabled={!!editingCoupon}
                        />
                        <p className="text-xs text-muted-foreground">Apenas letras maiúsculas e números</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="discount_type">Tipo de Desconto Padrão *</Label>
                          <Select
                            value={formData.discount_type}
                            onValueChange={(value: DiscountType) => setFormData({ ...formData, discount_type: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="percentage">Percentual (%)</SelectItem>
                              <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor="discount_value">
                            Valor Padrão {formData.discount_type === 'percentage' ? '(%)' : '(R$)'} *
                          </Label>
                          <Input
                            id="discount_value"
                            type="number"
                            step="0.01"
                            value={formData.discount_value}
                            onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                            placeholder="0.00"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="min_order_value">Pedido Mínimo (R$)</Label>
                          <Input
                            id="min_order_value"
                            type="number"
                            step="0.01"
                            value={formData.min_order_value}
                            onChange={(e) => setFormData({ ...formData, min_order_value: e.target.value })}
                            placeholder="0.00"
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor="max_uses">Usos Máximos</Label>
                          <Input
                            id="max_uses"
                            type="number"
                            value={formData.max_uses}
                            onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                            placeholder="Ilimitado"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="valid_from">Válido de *</Label>
                          <Input
                            id="valid_from"
                            type="date"
                            value={formData.valid_from}
                            onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                            required
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor="valid_until">Válido até</Label>
                          <Input
                            id="valid_until"
                            type="date"
                            value={formData.valid_until}
                            onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                            min={formData.valid_from}
                          />
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label>Cupom aplica-se a</Label>
                        <Select
                          value={formData.applies_to}
                          onValueChange={(value: 'all' | 'category' | 'product') => setFormData({ 
                            ...formData, 
                            applies_to: value,
                            category_names: [],
                            product_ids: []
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos os produtos</SelectItem>
                            <SelectItem value="category">Por Categoria</SelectItem>
                            <SelectItem value="product">Por Produto</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {formData.applies_to === 'category' && (
                        <div className="space-y-2">
                          <Label>Categorias ({formData.category_names.length} selecionadas)</Label>
                          {formData.category_names.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {formData.category_names.map((categoryName) => (
                                <Badge key={categoryName} variant="secondary" className="flex items-center gap-1">
                                  {categoryName}
                                  <XCircle 
                                    className="h-3 w-3 cursor-pointer hover:text-destructive" 
                                    onClick={() => setFormData({
                                      ...formData,
                                      category_names: formData.category_names.filter(c => c !== categoryName)
                                    })}
                                  />
                                </Badge>
                              ))}
                            </div>
                          )}
                          <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Buscar categoria..."
                              value={categorySearch}
                              onChange={(e) => setCategorySearch(e.target.value)}
                              className="pl-8"
                            />
                          </div>
                          <ScrollArea className="h-32 border rounded-md p-2">
                            <div className="space-y-2">
                              {filteredCategories.map((category) => (
                                <div key={category.id} className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id={`cat-${category.id}`}
                                    checked={formData.category_names.includes(category.name)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setFormData({
                                          ...formData,
                                          category_names: [...formData.category_names, category.name]
                                        });
                                      } else {
                                        setFormData({
                                          ...formData,
                                          category_names: formData.category_names.filter(c => c !== category.name)
                                        });
                                      }
                                    }}
                                    className="rounded border-input"
                                  />
                                  <Label htmlFor={`cat-${category.id}`} className="text-sm font-normal cursor-pointer">
                                    {category.name}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      )}

                      {formData.applies_to === 'product' && (
                        <div className="space-y-2">
                          <Label>Produtos ({formData.product_ids.length} selecionados)</Label>
                          {formData.product_ids.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {formData.product_ids.map((productId) => {
                                const product = products.find(p => p.id === productId);
                                return (
                                  <Badge key={productId} variant="secondary" className="flex items-center gap-1">
                                    {product?.name || productId}
                                    <XCircle 
                                      className="h-3 w-3 cursor-pointer hover:text-destructive" 
                                      onClick={() => setFormData({
                                        ...formData,
                                        product_ids: formData.product_ids.filter(p => p !== productId)
                                      })}
                                    />
                                  </Badge>
                                );
                              })}
                            </div>
                          )}
                          <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Buscar produto..."
                              value={productSearch}
                              onChange={(e) => setProductSearch(e.target.value)}
                              className="pl-8"
                            />
                          </div>
                          <ScrollArea className="h-32 border rounded-md p-2">
                            <div className="space-y-2">
                              {filteredProducts.map((product) => (
                                <div key={product.id} className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id={`prod-${product.id}`}
                                    checked={formData.product_ids.includes(product.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setFormData({
                                          ...formData,
                                          product_ids: [...formData.product_ids, product.id]
                                        });
                                      } else {
                                        setFormData({
                                          ...formData,
                                          product_ids: formData.product_ids.filter(p => p !== product.id)
                                        });
                                      }
                                    }}
                                    className="rounded border-input"
                                  />
                                  <Label htmlFor={`prod-${product.id}`} className="text-sm font-normal cursor-pointer">
                                    {product.name}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      )}

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="is_active"
                          checked={formData.is_active}
                          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                        />
                        <Label htmlFor="is_active">Cupom ativo</Label>
                      </div>

                      <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
                        O desconto padrão será aplicado a todos os produtos que não tiverem regras específicas configuradas na aba "Regras Específicas".
                      </p>
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="regras" className="flex-1 overflow-hidden mt-4">
                  <ScrollArea className="h-[calc(60vh-120px)] pr-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Settings className="h-4 w-4 text-primary" />
                          <Label className="font-medium">Regras Específicas de Desconto</Label>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            type="button" 
                            size="sm"
                            variant="outline"
                            onClick={() => setCouponCategoryRulesModalOpen(true)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Por Categoria
                          </Button>
                          <Button 
                            type="button" 
                            size="sm"
                            variant="outline"
                            onClick={() => setCouponRulesModalOpen(true)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Por Produto
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Defina descontos por categoria (novos produtos herdam automaticamente) ou por produto específico.
                      </p>
                      
                      {couponCategoryRules.length === 0 && couponDiscountRules.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm border rounded-md bg-muted/30">
                          Nenhuma regra específica. O desconto padrão será aplicado a todos os produtos.
                        </div>
                      ) : (
                        <ScrollArea className="max-h-64 border rounded-md">
                          <div className="divide-y">
                            {/* Regras por Categoria */}
                            {couponCategoryRules.map((rule) => {
                              const isEditing = editingCouponRuleCategoryName === rule.category_name;
                              const productsInCategory = products.filter(p => p.category === rule.category_name);
                              
                              return (
                                <div key={`cat-${rule.category_name}`} className="flex items-center gap-2 p-2 bg-primary/5">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="secondary" className="text-xs shrink-0">Categoria</Badge>
                                      <span className="text-sm font-medium truncate">{rule.category_name}</span>
                                    </div>
                                    <span className="text-[10px] text-muted-foreground">
                                      {productsInCategory.length} produto(s) • Novos produtos herdam automaticamente
                                    </span>
                                  </div>
                                  
                                  {isEditing ? (
                                    <div className="flex items-center gap-2">
                                      <Input
                                        type="number"
                                        value={editingCouponRuleValue}
                                        onChange={(e) => setEditingCouponRuleValue(Number(e.target.value))}
                                        className="w-16 h-7 text-sm"
                                        min={0}
                                      />
                                      <Select
                                        value={editingCouponRuleType}
                                        onValueChange={(v) => setEditingCouponRuleType(v as 'percentage' | 'fixed')}
                                      >
                                        <SelectTrigger className="w-14 h-7">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="percentage">%</SelectItem>
                                          <SelectItem value="fixed">R$</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-green-600"
                                        onClick={() => {
                                          setCouponCategoryRules(rules => 
                                            rules.map(r => r.category_name === rule.category_name 
                                              ? { ...r, discount_type: editingCouponRuleType, discount_value: editingCouponRuleValue }
                                              : r
                                            )
                                          );
                                          setEditingCouponRuleCategoryName(null);
                                        }}
                                      >
                                        <Save className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => setEditingCouponRuleCategoryName(null)}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <>
                                      <Badge variant="outline" className="shrink-0">
                                        {rule.discount_type === 'percentage' 
                                          ? `${rule.discount_value}%` 
                                          : `R$ ${rule.discount_value.toFixed(2)}`}
                                      </Badge>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-muted-foreground hover:text-primary"
                                        onClick={() => {
                                          setEditingCouponRuleCategoryName(rule.category_name);
                                          setEditingCouponRuleValue(rule.discount_value);
                                          setEditingCouponRuleType(rule.discount_type);
                                        }}
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-destructive"
                                        onClick={() => setCouponCategoryRules(rules => rules.filter(r => r.category_name !== rule.category_name))}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              );
                            })}

                            {/* Regras por Produto */}
                            {couponDiscountRules.map((rule) => {
                              const product = products.find(p => p.id === rule.product_id);
                              const isEditing = editingCouponRuleProductId === rule.product_id;
                              
                              return (
                                <div key={rule.product_id} className="flex items-center gap-2 p-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <Badge variant="outline" className="text-xs shrink-0">Produto</Badge>
                                      <span className="text-sm break-words">{product?.name || 'Produto'}</span>
                                    </div>
                                    {(product?.short_id || product?.external_code) && (
                                      <div className="flex items-center gap-2 mt-0.5">
                                        {product?.short_id && (
                                          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                            #{product.short_id}
                                          </span>
                                        )}
                                        {product?.external_code && (
                                          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                            Ext: {product.external_code}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  
                                  {isEditing ? (
                                    <div className="flex items-center gap-2">
                                      <Input
                                        type="number"
                                        value={editingCouponRuleValue}
                                        onChange={(e) => setEditingCouponRuleValue(Number(e.target.value))}
                                        className="w-16 h-7 text-sm"
                                        min={0}
                                      />
                                      <Select
                                        value={editingCouponRuleType}
                                        onValueChange={(v) => setEditingCouponRuleType(v as 'percentage' | 'fixed')}
                                      >
                                        <SelectTrigger className="w-14 h-7">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="percentage">%</SelectItem>
                                          <SelectItem value="fixed">R$</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-green-600"
                                        onClick={() => {
                                          setCouponDiscountRules(rules => 
                                            rules.map(r => r.product_id === rule.product_id 
                                              ? { ...r, discount_type: editingCouponRuleType, discount_value: editingCouponRuleValue }
                                              : r
                                            )
                                          );
                                          setEditingCouponRuleProductId(null);
                                        }}
                                      >
                                        <Save className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => setEditingCouponRuleProductId(null)}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <>
                                      <Badge variant="outline" className="shrink-0">
                                        {rule.discount_type === 'percentage' 
                                          ? `${rule.discount_value}%` 
                                          : `R$ ${rule.discount_value.toFixed(2)}`}
                                      </Badge>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-muted-foreground hover:text-primary"
                                        onClick={() => {
                                          setEditingCouponRuleProductId(rule.product_id);
                                          setEditingCouponRuleValue(rule.discount_value);
                                          setEditingCouponRuleType(rule.discount_type);
                                        }}
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-destructive"
                                        onClick={() => setCouponDiscountRules(rules => rules.filter(r => r.product_id !== rule.product_id))}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>

              <DialogFooter className="mt-4 pt-4 border-t">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingCoupon ? 'Salvar Alterações' : 'Criar Cupom'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        )}
      </div>

      {/* Modal para adicionar regras por Categoria */}
      <Dialog open={couponCategoryRulesModalOpen} onOpenChange={(open) => {
        setCouponCategoryRulesModalOpen(open);
        if (open) {
          setEditingCouponRuleType(formData.discount_type);
          setEditingCouponRuleValue(parseFloat(formData.discount_value) || 0);
        }
        if (!open) {
          setSelectedCouponRuleCategoryNames(new Set());
        }
      }}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Adicionar Regra por Categoria</DialogTitle>
            <DialogDescription>
              Todos os produtos da categoria terão o mesmo desconto. Novos produtos adicionados herdam automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Configuração de desconto */}
            <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
              <div>
                <Label className="text-sm">Tipo de Desconto</Label>
                <Select
                  value={editingCouponRuleType}
                  onValueChange={(v) => setEditingCouponRuleType(v as 'percentage' | 'fixed')}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                    <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Valor do Desconto</Label>
                <Input
                  type="number"
                  value={editingCouponRuleValue}
                  onChange={(e) => setEditingCouponRuleValue(Number(e.target.value))}
                  className="mt-1"
                  min={0}
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{selectedCouponRuleCategoryNames.size} categoria(s) selecionada(s)</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => {
                  const existingNames = new Set(couponCategoryRules.map(r => r.category_name));
                  setSelectedCouponRuleCategoryNames(new Set(
                    categories.filter(c => !existingNames.has(c.name)).map(c => c.name)
                  ));
                }}>
                  Selecionar Todas
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedCouponRuleCategoryNames(new Set())}>
                  Limpar
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[250px] border rounded-md">
              {(() => {
                const existingNames = new Set(couponCategoryRules.map(r => r.category_name));
                const availableCategories = categories.filter(c => !existingNames.has(c.name));

                if (availableCategories.length === 0) {
                  return (
                    <p className="text-center text-muted-foreground py-8">
                      Todas as categorias já têm regra
                    </p>
                  );
                }

                return (
                  <div className="p-2 space-y-1">
                    {availableCategories.map((category) => {
                      const productsInCategory = products.filter(p => p.category === category.name);
                      const isSelected = selectedCouponRuleCategoryNames.has(category.name);
                      
                      return (
                        <div
                          key={category.id}
                          className={`flex items-center gap-3 p-3 rounded-md cursor-pointer transition-colors ${
                            isSelected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted/50 border border-transparent'
                          }`}
                          onClick={() => {
                            setSelectedCouponRuleCategoryNames(prev => {
                              const next = new Set(prev);
                              if (next.has(category.name)) next.delete(category.name);
                              else next.add(category.name);
                              return next;
                            });
                          }}
                        >
                          <Checkbox checked={isSelected} />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{category.name}</p>
                            <p className="text-xs text-muted-foreground">{productsInCategory.length} produto(s)</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </ScrollArea>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setCouponCategoryRulesModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                if (selectedCouponRuleCategoryNames.size === 0 || editingCouponRuleValue <= 0) {
                  toast({
                    title: 'Selecione categorias e defina o valor',
                    variant: 'destructive',
                  });
                  return;
                }
                const newRules = Array.from(selectedCouponRuleCategoryNames).map(categoryName => ({
                  category_name: categoryName,
                  discount_type: editingCouponRuleType,
                  discount_value: editingCouponRuleValue,
                }));
                setCouponCategoryRules([...couponCategoryRules, ...newRules]);
                setCouponCategoryRulesModalOpen(false);
                setSelectedCouponRuleCategoryNames(new Set());
                toast({
                  title: 'Regras adicionadas',
                  description: `${newRules.length} regra(s) de desconto por categoria adicionada(s)`,
                });
              }}
              disabled={selectedCouponRuleCategoryNames.size === 0}
            >
              Adicionar ({selectedCouponRuleCategoryNames.size})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para adicionar regras por Produto */}
      <Dialog open={couponRulesModalOpen} onOpenChange={(open) => {
        setCouponRulesModalOpen(open);
        if (open) {
          setEditingCouponRuleType(formData.discount_type);
          setEditingCouponRuleValue(parseFloat(formData.discount_value) || 0);
        }
        if (!open) {
          setSelectedCouponRuleProductIds(new Set());
          setCouponRuleProductSearch('');
          setCollapsedCouponRuleCategories(new Set());
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Adicionar Regra por Produto</DialogTitle>
            <DialogDescription>
              Defina o desconto e selecione os produtos que receberão a regra.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Configuração de desconto */}
            <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
              <div>
                <Label className="text-sm">Tipo de Desconto</Label>
                <Select
                  value={editingCouponRuleType}
                  onValueChange={(v) => setEditingCouponRuleType(v as 'percentage' | 'fixed')}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                    <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Valor do Desconto</Label>
                <div className="relative mt-1">
                  <Input
                    type="number"
                    value={editingCouponRuleValue}
                    onChange={(e) => setEditingCouponRuleValue(Number(e.target.value))}
                    className="pr-8"
                    min={0}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    {editingCouponRuleType === 'percentage' ? '%' : 'R$'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Barra de busca e ações */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={couponRuleProductSearch}
                  onChange={(e) => setCouponRuleProductSearch(e.target.value)}
                  placeholder="Buscar por nome, código interno ou externo..."
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const existingIds = new Set(couponDiscountRules.map(r => r.product_id));
                    const allProductIds = filteredCouponRuleProducts
                      .filter(p => !existingIds.has(p.id))
                      .map(p => p.id);
                    setSelectedCouponRuleProductIds(new Set(allProductIds));
                  }}
                >
                  Selecionar Todos
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCouponRuleProductIds(new Set())}
                >
                  Limpar
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{selectedCouponRuleProductIds.size} produto(s) selecionado(s)</span>
            </div>

            {/* Lista de produtos por categoria */}
            <ScrollArea className="flex-1 border rounded-md">
              {(() => {
                const existingIds = new Set(couponDiscountRules.map(r => r.product_id));
                const availableProducts = filteredCouponRuleProducts.filter(p => !existingIds.has(p.id));

                if (availableProducts.length === 0) {
                  return (
                    <div className="py-8 text-center text-muted-foreground">
                      <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Nenhum produto encontrado</p>
                    </div>
                  );
                }

                // Group by category
                const grouped = availableProducts.reduce((acc, product) => {
                  const category = product.category || 'Sem Categoria';
                  if (!acc[category]) acc[category] = [];
                  acc[category].push(product);
                  return acc;
                }, {} as Record<string, typeof availableProducts>);

                const categoryNames = Object.keys(grouped).sort();

                return (
                  <div className="p-2 space-y-2">
                    {categoryNames.map((category) => {
                      const categoryProducts = grouped[category];
                      const isCollapsed = collapsedCouponRuleCategories.has(category);
                      const allSelected = categoryProducts.every(p => selectedCouponRuleProductIds.has(p.id));
                      const someSelected = categoryProducts.some(p => selectedCouponRuleProductIds.has(p.id));

                      return (
                        <div key={category} className="border rounded-lg overflow-hidden">
                          <div
                            className="flex items-center gap-2 p-2 bg-muted/50 cursor-pointer hover:bg-muted/70"
                            onClick={(e) => {
                              if ((e.target as HTMLElement).closest('[data-checkbox]')) return;
                              setCollapsedCouponRuleCategories(prev => {
                                const next = new Set(prev);
                                if (next.has(category)) next.delete(category);
                                else next.add(category);
                                return next;
                              });
                            }}
                          >
                            <div data-checkbox onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={allSelected}
                                onCheckedChange={(checked) => {
                                  setSelectedCouponRuleProductIds(prev => {
                                    const next = new Set(prev);
                                    categoryProducts.forEach(p => {
                                      if (checked) next.add(p.id);
                                      else next.delete(p.id);
                                    });
                                    return next;
                                  });
                                }}
                                className={someSelected && !allSelected ? 'data-[state=checked]:bg-primary/50' : ''}
                              />
                            </div>
                            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            <span className="font-medium flex-1 text-sm">{category}</span>
                            <Badge variant="secondary" className="text-xs">{categoryProducts.length}</Badge>
                          </div>
                          {!isCollapsed && (
                            <div className="divide-y">
                              {categoryProducts.map((product) => (
                                <div
                                  key={product.id}
                                  className={`flex items-center gap-2 p-2 cursor-pointer hover:bg-muted/30 ${
                                    selectedCouponRuleProductIds.has(product.id) ? 'bg-primary/5' : ''
                                  }`}
                                  onClick={() => {
                                    setSelectedCouponRuleProductIds(prev => {
                                      const next = new Set(prev);
                                      if (next.has(product.id)) next.delete(product.id);
                                      else next.add(product.id);
                                      return next;
                                    });
                                  }}
                                >
                                  <Checkbox checked={selectedCouponRuleProductIds.has(product.id)} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm truncate">{product.name}</p>
                                    <div className="flex gap-2 text-xs text-muted-foreground">
                                      {product.short_id && <span>#{product.short_id}</span>}
                                      <span className="text-primary">R$ {product.price?.toFixed(2)}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </ScrollArea>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setCouponRulesModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                if (selectedCouponRuleProductIds.size === 0 || editingCouponRuleValue <= 0) {
                  toast({
                    title: 'Selecione produtos e defina o valor',
                    variant: 'destructive',
                  });
                  return;
                }
                const newRules = Array.from(selectedCouponRuleProductIds).map(productId => ({
                  product_id: productId,
                  discount_type: editingCouponRuleType,
                  discount_value: editingCouponRuleValue,
                }));
                setCouponDiscountRules([...couponDiscountRules, ...newRules]);
                setCouponRulesModalOpen(false);
                setSelectedCouponRuleProductIds(new Set());
                toast({
                  title: 'Regras adicionadas',
                  description: `${newRules.length} regra(s) de desconto adicionada(s)`,
                });
              }}
              disabled={selectedCouponRuleProductIds.size === 0}
            >
              Adicionar ({selectedCouponRuleProductIds.size})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filtro de status e busca */}
      {coupons.length > 0 && (
        <div className="mb-4 flex gap-3 items-center">
          {/* Campo de busca */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código ou afiliado..."
              value={couponSearch}
              onChange={(e) => setCouponSearch(e.target.value)}
              className="pl-9 pr-9"
            />
            {couponSearch && (
              <button
                type="button"
                onClick={() => setCouponSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <XCircle className="h-4 w-4" />
              </button>
            )}
          </div>
          
          {/* Dropdown de status */}
          <Select
            value={statusFilter}
            onValueChange={(value: 'all' | 'active' | 'inactive') => setStatusFilter(value)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos ({coupons.length})</SelectItem>
              <SelectItem value="active">Ativos ({coupons.filter(c => c.is_active).length})</SelectItem>
              <SelectItem value="inactive">Inativos ({coupons.filter(c => !c.is_active).length})</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {coupons.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Ticket className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center mb-4">
              Você ainda não criou nenhum cupom de desconto
            </p>
            {canCreate && (
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Cupom
              </Button>
            )}
          </CardContent>
        </Card>
      ) : filteredCoupons.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Ticket className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center mb-4">
              Nenhum cupom encontrado com o filtro selecionado
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCoupons.map((coupon, index) => (
            <motion.div
              key={coupon.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className={!coupon.is_active ? 'opacity-60' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Ticket className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg font-mono">{coupon.code}</CardTitle>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyCode(coupon.code)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      {canUpdate && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(coupon)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir cupom?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. O cupom {coupon.code} será permanentemente removido.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteCoupon(coupon.id)}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Badge variant={coupon.is_active ? 'default' : 'secondary'}>
                      {coupon.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                    <Badge variant="outline">
                      {formatDiscount(coupon.discount_type, coupon.discount_value)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    <span>Pedido mínimo: R$ {coupon.min_order_value.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>
                      Usos: {coupon.used_count}
                      {coupon.max_uses ? ` / ${coupon.max_uses}` : ' (ilimitado)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {formatDate(coupon.valid_from)} até{' '}
                      {coupon.valid_until ? formatDate(coupon.valid_until) : 'Sem data limite'}
                    </span>
                  </div>
                  {(() => {
                    const linkedAffiliate = getLinkedAffiliate(coupon.id);
                    return linkedAffiliate ? (
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-primary" />
                        <span className="text-sm">
                          Afiliado: <span className="font-medium">{linkedAffiliate.name}</span>
                        </span>
                      </div>
                    ) : null;
                  })()}
                  <div className="pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Status</span>
                      {canToggleStatus ? (
                        <Switch
                          checked={coupon.is_active}
                          onCheckedChange={(checked) => toggleCouponStatus(coupon.id, checked)}
                        />
                      ) : (
                        <Badge variant={coupon.is_active ? 'default' : 'secondary'} className="text-xs">
                          {coupon.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
        </TabsContent>

        <TabsContent value="report">
          <CouponsReport storeId={storeId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
