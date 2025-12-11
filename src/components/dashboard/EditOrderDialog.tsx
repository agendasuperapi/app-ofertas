import React, { useState, useEffect, useCallback, useRef } from "react";
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogFooter } from "@/components/ui/responsive-dialog";
import { ResponsiveDialog as ObservationDialog, ResponsiveDialogContent as ObservationDialogContent, ResponsiveDialogHeader as ObservationDialogHeader, ResponsiveDialogTitle as ObservationDialogTitle, ResponsiveDialogDescription as ObservationDialogDescription } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ImageUpload } from "./ImageUpload";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, MapPin, CreditCard, History, Trash2, Plus, Tag, X, RefreshCw } from "lucide-react";
import { useOrderHistory } from "@/hooks/useOrderHistory";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { useCoupons } from "@/hooks/useCoupons";
import { useQueryClient } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import { CouponDiscountRule } from "@/lib/couponUtils";

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  observation?: string;
  pendingRemoval?: boolean;
  deleted_at?: string | null;
}

interface EditOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
  onUpdate: () => void;
  initialTab?: string;
}

export const EditOrderDialog = ({ open, onOpenChange, order, onUpdate, initialTab = "items" }: EditOrderDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [originalOrderItems, setOriginalOrderItems] = useState<OrderItem[]>([]);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const { history, addHistory } = useOrderHistory(order?.id);
  const { validateCoupon } = useCoupons(order?.store_id);
  const queryClient = useQueryClient();
  
  // Estados para o modal de observação
  const [observationModalOpen, setObservationModalOpen] = useState(false);
  const [editingObservationItem, setEditingObservationItem] = useState<OrderItem | null>(null);
  const [tempObservation, setTempObservation] = useState('');
  
  // Garante que initialTab não seja "notes" ou "receipt" (agora são diálogos separados)
  const safeInitialTab = initialTab === "notes" || initialTab === "receipt" ? "items" : initialTab;
  
  const [couponCode, setCouponCode] = useState(order?.coupon_code || '');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponDiscount, setCouponDiscount] = useState(order?.coupon_discount || 0);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [couponDiscountRules, setCouponDiscountRules] = useState<CouponDiscountRule[]>([]);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const recalculateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Estado para descontos individuais por item
  const [itemDiscounts, setItemDiscounts] = useState<Record<string, {
    discount: number;
    ruleType: 'product' | 'category' | 'default' | null;
    discountPercent?: number;
  }>>({});
  
  const [storePaymentMethods, setStorePaymentMethods] = useState({
    accepts_pix: true,
    accepts_card: true,
    accepts_cash: true,
  });
  
  const [formData, setFormData] = useState({
    payment_method: order?.payment_method || 'pix',
    payment_received: (order as any)?.payment_received || false,
    change_amount: order?.change_amount || 0,
    delivery_type: order?.delivery_type || 'delivery',
    delivery_street: order?.delivery_street || '',
    delivery_number: order?.delivery_number || '',
    delivery_neighborhood: order?.delivery_neighborhood || '',
    delivery_complement: order?.delivery_complement || '',
    delivery_fee: order?.delivery_fee || 0,
    store_image_url: order?.store_image_url || '',
  });

  useEffect(() => {
    if (order) {
      setFormData({
        payment_method: order.payment_method || 'pix',
        payment_received: (order as any).payment_received || false,
        change_amount: order.change_amount || 0,
        delivery_type: order.delivery_type || 'delivery',
        delivery_street: order.delivery_street || '',
        delivery_number: order.delivery_number || '',
        delivery_neighborhood: order.delivery_neighborhood || '',
        delivery_complement: order.delivery_complement || '',
        delivery_fee: order.delivery_fee || 0,
        store_image_url: order.store_image_url || '',
      });
      setCouponCode(order.coupon_code || '');
      setCouponDiscount(order.coupon_discount || 0);
      if (order.coupon_code) {
        setAppliedCoupon({
          code: order.coupon_code,
          discount: order.coupon_discount
        });
        // Carregar regras de desconto do cupom
        loadCouponDiscountRules(order.coupon_code);
      } else {
        setCouponDiscountRules([]);
      }
      loadOrderItems();
      loadAvailableProducts();
      loadStorePaymentMethods();
    }
  }, [order]);

  const loadStorePaymentMethods = async () => {
    if (!order?.store_id) return;
    
    const { data, error } = await supabase
      .from('stores')
      .select('accepts_pix, accepts_card, accepts_cash')
      .eq('id', order.store_id)
      .single();
    
    if (data && !error) {
      setStorePaymentMethods({
        accepts_pix: (data as any).accepts_pix ?? true,
        accepts_card: (data as any).accepts_card ?? true,
        accepts_cash: (data as any).accepts_cash ?? true,
      });
    }
  };

  const loadAvailableProducts = async () => {
    if (!order?.store_id) return;
    
    const { data, error } = await supabase
      .from('products')
      .select('id, name, price, is_available')
      .eq('store_id', order.store_id)
      .eq('is_available', true)
      .order('name');

    if (!error && data) {
      setAvailableProducts(data);
    }
  };

  const loadOrderItems = async () => {
    if (!order?.id) return;
    
    const { data, error } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', order.id);

    if (error) {
      toast({
        title: 'Erro ao carregar itens',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    // Marcar itens deletados como pendingRemoval
    const itemsWithStatus = (data || []).map((item: any) => ({
      ...item,
      pendingRemoval: !!item.deleted_at
    }));

    setOrderItems(itemsWithStatus);
    setOriginalOrderItems(itemsWithStatus);
  };

  // Carregar regras de desconto do cupom
  const loadCouponDiscountRules = async (couponCodeToLoad: string) => {
    if (!order?.store_id || !couponCodeToLoad) {
      setCouponDiscountRules([]);
      return;
    }

    // Buscar cupom
    const { data: couponData } = await supabase
      .from('coupons')
      .select('id, discount_type, discount_value, applies_to, category_names, product_ids')
      .eq('store_id', order.store_id)
      .ilike('code', couponCodeToLoad)
      .single();

    if (!couponData) {
      setCouponDiscountRules([]);
      return;
    }

    // Buscar regras de desconto
    const { data: rules } = await supabase
      .from('coupon_discount_rules')
      .select('*')
      .eq('coupon_id', couponData.id);

    setCouponDiscountRules((rules || []) as CouponDiscountRule[]);
    
    // Atualizar dados do cupom aplicado
    setAppliedCoupon(prev => ({
      ...prev,
      id: couponData.id,
      discountType: couponData.discount_type,
      discountValue: couponData.discount_value,
      appliesTo: couponData.applies_to,
      categoryNames: couponData.category_names || [],
      productIds: couponData.product_ids || []
    }));
  };

  // Recalcular desconto do cupom quando itens mudam
  const recalculateCouponDiscount = useCallback(async () => {
    if (!appliedCoupon?.code || orderItems.length === 0) return;
    
    setIsRecalculating(true);
    
    try {
      // Calcular subtotal dos itens ativos
      const activeItems = orderItems.filter(item => !item.pendingRemoval);
      const subtotal = activeItems.reduce((sum, item) => sum + item.subtotal, 0);
      
      // Buscar informações atualizadas do cupom
      const { data: couponData } = await supabase
        .from('coupons')
        .select('id, discount_type, discount_value, applies_to, category_names, product_ids')
        .eq('store_id', order?.store_id)
        .ilike('code', appliedCoupon.code)
        .single();

      if (!couponData) {
        setIsRecalculating(false);
        setItemDiscounts({});
        return;
      }

      // Buscar regras específicas
      const { data: rules } = await supabase
        .from('coupon_discount_rules')
        .select('*')
        .eq('coupon_id', couponData.id);

      const discountRules = (rules || []) as CouponDiscountRule[];
      setCouponDiscountRules(discountRules);

      // Calcular desconto baseado no escopo e regras
      let totalDiscount = 0;
      const appliesTo = couponData.applies_to as 'all' | 'category' | 'product';
      const categoryNames = couponData.category_names || [];
      const productIds = couponData.product_ids || [];
      
      // Novo: armazenar descontos individuais
      const newItemDiscounts: Record<string, { discount: number; ruleType: 'product' | 'category' | 'default' | null; discountPercent?: number }> = {};

      // Para cada item ativo, calcular desconto
      for (const item of activeItems) {
        // Buscar categoria do produto
        let productCategory = '';
        let productId = '';
        
        if (item.id.startsWith('temp_')) {
          // Novo item - buscar categoria do produto
          const product = availableProducts.find(p => p.name === item.product_name);
          if (product?.id) {
            productId = product.id;
            const { data: productData } = await supabase
              .from('products')
              .select('category')
              .eq('id', product.id)
              .single();
            productCategory = productData?.category || '';
          }
        } else {
          // Item existente - buscar categoria via product_id no order_items
          const { data: orderItemData } = await supabase
            .from('order_items')
            .select('product_id')
            .eq('id', item.id)
            .single();
          
          if (orderItemData?.product_id) {
            productId = orderItemData.product_id;
            const { data: productData } = await supabase
              .from('products')
              .select('category')
              .eq('id', orderItemData.product_id)
              .single();
            productCategory = productData?.category || '';
          }
        }

        // Verificar elegibilidade
        let isEligible = false;
        if (appliesTo === 'all') {
          isEligible = true;
        } else if (appliesTo === 'category') {
          isEligible = categoryNames.some((cat: string) => 
            cat.toLowerCase().trim() === productCategory.toLowerCase().trim()
          );
        } else if (appliesTo === 'product') {
          // Para novos itens, buscar ID pelo nome
          const product = availableProducts.find(p => p.name === item.product_name);
          isEligible = product?.id && productIds.includes(product.id);
        }

        if (!isEligible) {
          newItemDiscounts[item.id] = { discount: 0, ruleType: null };
          continue;
        }

        // Verificar regra específica
        const productRule = discountRules.find(r => {
          if (r.rule_type === 'product') {
            const product = availableProducts.find(p => p.name === item.product_name);
            return (product?.id && r.product_id === product.id) || (productId && r.product_id === productId);
          }
          return false;
        });

        const categoryRule = discountRules.find(r => 
          r.rule_type === 'category' && 
          r.category_name?.toLowerCase().trim() === productCategory.toLowerCase().trim()
        );

        const ruleToApply = productRule || categoryRule;
        let itemDiscount = 0;
        let ruleType: 'product' | 'category' | 'default' | null = null;
        let discountPercent: number | undefined;

        // Calcular desconto
        if (ruleToApply) {
          ruleType = productRule ? 'product' : 'category';
          if (ruleToApply.discount_type === 'percentage') {
            itemDiscount = (item.subtotal * ruleToApply.discount_value) / 100;
            discountPercent = ruleToApply.discount_value;
          } else {
            // Valor fixo proporcional
            itemDiscount = Math.min(ruleToApply.discount_value, item.subtotal);
          }
        } else {
          // Desconto padrão do cupom
          ruleType = 'default';
          if (couponData.discount_type === 'percentage') {
            itemDiscount = (item.subtotal * couponData.discount_value) / 100;
            discountPercent = couponData.discount_value;
          } else {
            // Valor fixo proporcional ao subtotal total elegível
            const eligibleSubtotal = activeItems.reduce((sum, i) => sum + i.subtotal, 0);
            if (eligibleSubtotal > 0) {
              itemDiscount = (item.subtotal / eligibleSubtotal) * Math.min(couponData.discount_value, eligibleSubtotal);
            }
          }
        }
        
        totalDiscount += itemDiscount;
        newItemDiscounts[item.id] = { discount: itemDiscount, ruleType, discountPercent };
      }

      // Limitar desconto ao subtotal
      totalDiscount = Math.min(totalDiscount, subtotal);
      setCouponDiscount(totalDiscount);
      setItemDiscounts(newItemDiscounts);
      
      // Atualizar appliedCoupon com novo desconto
      setAppliedCoupon(prev => ({
        ...prev,
        discount: totalDiscount
      }));

    } catch (error) {
      console.error('Erro ao recalcular desconto:', error);
    } finally {
      setIsRecalculating(false);
    }
  }, [appliedCoupon?.code, orderItems, order?.store_id, availableProducts]);

  // Recalcular desconto quando itens mudam (com debounce)
  useEffect(() => {
    if (!appliedCoupon?.code || orderItems.length === 0) return;

    // Limpar timeout anterior
    if (recalculateTimeoutRef.current) {
      clearTimeout(recalculateTimeoutRef.current);
    }

    // Debounce de 500ms para evitar recálculos excessivos
    recalculateTimeoutRef.current = setTimeout(() => {
      recalculateCouponDiscount();
    }, 500);

    return () => {
      if (recalculateTimeoutRef.current) {
        clearTimeout(recalculateTimeoutRef.current);
      }
    };
  }, [orderItems, recalculateCouponDiscount]);

  const updateLocalOrderItem = (itemId: string, updates: Partial<OrderItem>) => {
    setOrderItems(items => 
      items.map(item => 
        item.id === itemId 
          ? { ...item, ...updates }
          : item
      )
    );
  };

  const removeLocalOrderItem = (itemId: string) => {
    setOrderItems(items => 
      items.map(item => 
        item.id === itemId 
          ? { ...item, pendingRemoval: true }
          : item
      )
    );
  };

  const restoreOrderItem = (itemId: string) => {
    setOrderItems(items => 
      items.map(item => 
        item.id === itemId 
          ? { ...item, pendingRemoval: false }
          : item
      )
    );
  };

  const addNewProduct = (product: any) => {
    const newItem: OrderItem = {
      id: `temp_${Date.now()}`,
      product_name: product.name,
      quantity: 1,
      unit_price: product.price,
      subtotal: product.price,
      observation: '',
    };
    setOrderItems(items => [...items, newItem]);
    setShowAddProduct(false);
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast({
        title: 'Código inválido',
        description: 'Por favor, insira um código de cupom',
        variant: 'destructive',
      });
      return;
    }

    setValidatingCoupon(true);
    
    const subtotal = orderItems
      .filter(item => !item.pendingRemoval)
      .reduce((sum, item) => sum + item.subtotal, 0);

    const validation = await validateCoupon(couponCode, subtotal);
    setValidatingCoupon(false);

    if (validation.is_valid) {
      setAppliedCoupon({
        code: couponCode,
        discount: validation.discount_amount,
        discountType: validation.discount_type
      });
      setCouponDiscount(validation.discount_amount || 0);
      // Carregar regras de desconto do cupom
      await loadCouponDiscountRules(couponCode);
      toast({
        title: 'Cupom aplicado!',
        description: `Desconto de R$ ${(validation.discount_amount || 0).toFixed(2)} aplicado`,
      });
    } else {
      toast({
        title: 'Cupom inválido',
        description: validation.error_message || 'Este cupom não pode ser usado',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode('');
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponDiscountRules([]);
    setItemDiscounts({});
    toast({
      title: 'Cupom removido',
      description: 'O desconto foi removido do pedido',
    });
  };

  const handleSubmit = async () => {
    setLoading(true);
    
    try {
      // Primeiro, buscar os IDs dos itens existentes no banco
      const { data: existingItems } = await supabase
        .from('order_items')
        .select('id')
        .eq('order_id', order.id);

      const existingItemIds = new Set(existingItems?.map(item => item.id) || []);

      // Deletar/marcar itens como removidos
      const itemsToDelete = orderItems
        .filter(item => item.pendingRemoval && !item.id.startsWith('temp_'))
        .map(item => item.id);

      for (const itemId of itemsToDelete) {
        await supabase
          .from('order_items')
          .update({ deleted_at: new Date().toISOString() } as any)
          .eq('id', itemId);
      }

      // Restaurar itens (remover marca de deleção)
      const itemsToRestore = orderItems
        .filter(item => !item.pendingRemoval && item.deleted_at)
        .map(item => item.id);

      for (const itemId of itemsToRestore) {
        await supabase
          .from('order_items')
          .update({ deleted_at: null } as any)
          .eq('id', itemId);
      }

      // Salvar itens existentes modificados e inserir novos (excluir os marcados para remoção)
      for (const item of orderItems.filter(i => !i.pendingRemoval)) {
        if (item.id.startsWith('temp_')) {
          // Novo item
          const { error: insertError } = await supabase
            .from('order_items')
            .insert({
              order_id: order.id,
              product_name: item.product_name,
              quantity: item.quantity,
              unit_price: item.unit_price,
              subtotal: item.subtotal,
              observation: item.observation,
            });

          if (insertError) throw insertError;
        } else {
          // Item existente
          const { error: updateError } = await supabase
            .from('order_items')
            .update({
              quantity: item.quantity,
              unit_price: item.unit_price,
              subtotal: item.subtotal,
              observation: item.observation,
            })
            .eq('id', item.id);

          if (updateError) throw updateError;
        }
      }

      // Calculate new total (excluir itens pendentes de remoção)
      const subtotal = orderItems
        .filter(item => !item.pendingRemoval)
        .reduce((sum, item) => sum + item.subtotal, 0);
      const total = subtotal + (formData.delivery_fee || 0) - couponDiscount;

      // Detectar mudanças
      const changes: Record<string, any> = {};
      
      // Detectar itens removidos (com pendingRemoval = true)
      const removedItems = orderItems.filter(item => item.pendingRemoval);
      if (removedItems.length > 0) {
        changes.items_removed = removedItems.map(item => ({
          name: item.product_name,
          quantity: item.quantity,
          price: item.unit_price
        }));
      }

      // Detectar itens adicionados
      const addedItems = orderItems.filter(item => item.id.startsWith('temp_'));
      if (addedItems.length > 0) {
        changes.items_added = addedItems.map(item => ({
          name: item.product_name,
          quantity: item.quantity,
          price: item.unit_price
        }));
      }
      
      if (order.payment_method !== formData.payment_method) {
        changes.payment_method = { before: order.payment_method, after: formData.payment_method };
      }
      if (order.delivery_type !== formData.delivery_type) {
        changes.delivery_type = { before: order.delivery_type, after: formData.delivery_type };
      }
      if (order.delivery_fee !== formData.delivery_fee) {
        changes.delivery_fee = { before: order.delivery_fee, after: formData.delivery_fee };
      }
      if (order.delivery_street !== formData.delivery_street) {
        changes.delivery_street = { before: order.delivery_street, after: formData.delivery_street };
      }
      
      // Mudanças no cupom
      if (order.coupon_code !== (appliedCoupon?.code || null)) {
        changes.coupon = {
          before: order.coupon_code || 'Nenhum',
          after: appliedCoupon?.code || 'Nenhum'
        };
      }
      if (order.coupon_discount !== couponDiscount) {
        changes.coupon_discount = {
          before: order.coupon_discount || 0,
          after: couponDiscount
        };
      }
      
      
      if (order.subtotal !== subtotal) {
        changes.subtotal = { before: order.subtotal, after: subtotal };
      }
      if (order.total !== total) {
        changes.total = { before: order.total, after: total };
      }

      // Monta payload base
      const baseUpdate: any = {
        payment_method: formData.payment_method,
        payment_received: formData.payment_received,
        change_amount: formData.change_amount,
        delivery_type: formData.delivery_type,
        delivery_street: formData.delivery_street,
        delivery_number: formData.delivery_number,
        delivery_neighborhood: formData.delivery_neighborhood,
        delivery_complement: formData.delivery_complement,
        delivery_fee: formData.delivery_fee,
        subtotal,
        total,
        coupon_code: appliedCoupon?.code || null,
        coupon_discount: couponDiscount,
        store_image_url: formData.store_image_url,
      };

      const { error } = await supabase
        .from('orders')
        .update(baseUpdate)
        .eq('id', order.id);

      if (error) throw error;

      // Buscar nome do usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user?.id)
        .single();

      const editorName = profile?.full_name || user?.email || 'Usuário desconhecido';

      // Salvar no histórico apenas se houve mudanças
      if (Object.keys(changes).length > 0) {
        await addHistory({
          orderId: order.id,
          editorName,
          changes,
        });
      }

      // Reprocessar comissão do afiliado se houver cupom e mudanças nos itens/valores
      const itemsChanged = changes.items_added || changes.items_removed || changes.subtotal;
      const couponChanged = changes.coupon || changes.coupon_discount;
      
      if (order.coupon_code && (itemsChanged || couponChanged)) {
        console.log('[EDIT ORDER] Reprocessando comissão do afiliado para pedido:', order.id);
        try {
          const { error: rpcError } = await supabase.rpc('reprocess_affiliate_commission_for_order', {
            p_order_id: order.id,
            p_editor_id: user?.id || null,
            p_editor_name: editorName,
            p_editor_email: user?.email || null
          });
          
          if (rpcError) {
            console.error('[EDIT ORDER] Erro ao reprocessar comissão:', rpcError);
          } else {
            console.log('[EDIT ORDER] Comissão reprocessada com sucesso');
          }
        } catch (commissionError) {
          console.error('[EDIT ORDER] Erro ao chamar reprocessamento de comissão:', commissionError);
        }
      }

      toast({
        title: 'Pedido atualizado!',
        description: 'As alterações foram salvas com sucesso.',
      });

      // Recarregar itens do pedido antes de fechar
      await loadOrderItems();
      
      // Invalidar query de orders para atualização automática
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      
      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar pedido',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const isMobile = useIsMobile();

  if (!order) return null;

  return (
    <>
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className={isMobile ? "p-0" : "w-full max-w-full md:max-w-[80vw] lg:max-w-[50vw] max-h-[87vh] md:max-h-[90vh] flex flex-col bg-background z-50"}>
        <ResponsiveDialogHeader className="flex-shrink-0">
          <ResponsiveDialogTitle>Editar Pedido #{order.order_number}</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <Tabs defaultValue={safeInitialTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className={isMobile ? "grid w-full grid-cols-2 text-xs" : "grid w-full grid-cols-4 flex-shrink-0"}>
            <TabsTrigger value="items" className={isMobile ? "px-2" : ""}>
              <Package className="w-4 h-4 mr-1" />
              {isMobile ? "Itens" : "Itens"}
            </TabsTrigger>
            <TabsTrigger value="payment" className={isMobile ? "px-2" : ""}>
              <CreditCard className="w-4 h-4 mr-1" />
              {isMobile ? "Pag." : "Pagamento"}
            </TabsTrigger>
            <TabsTrigger value="delivery" className={isMobile ? "px-2" : ""}>
              <MapPin className="w-4 h-4 mr-1" />
              {isMobile ? "Entrega" : "Entrega"}
            </TabsTrigger>
            {!isMobile && (
              <TabsTrigger value="history">
                <History className="w-4 h-4 mr-2" />
                Histórico
              </TabsTrigger>
            )}
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            <TabsContent value="items" className="space-y-4 pr-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium">Itens do Pedido</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddProduct(!showAddProduct)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Produto
                </Button>
              </div>

              {showAddProduct && (
                <div className="border rounded-lg p-4 mb-4 bg-muted/50">
                  <h4 className="font-medium mb-3 text-sm">Produtos Disponíveis</h4>
                  <div className="grid gap-2 max-h-[200px] overflow-y-auto">
                    {availableProducts.map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between p-2 border rounded hover:bg-background cursor-pointer"
                        onClick={() => addNewProduct(product)}
                      >
                        <div className="flex-1">
                          <div className="font-medium text-sm">{product.name}</div>
                          <div className="text-xs text-muted-foreground">
                            R$ {product.price.toFixed(2)}
                          </div>
                        </div>
                        <Button type="button" size="sm" variant="ghost">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    {availableProducts.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum produto disponível
                      </p>
                    )}
                  </div>
                </div>
              )}

              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4">
                  {orderItems.map((item, index) => (
                <React.Fragment key={item.id}>
                  <div 
                    className={`border rounded-lg p-4 space-y-3 ${
                      item.pendingRemoval ? 'opacity-50 bg-destructive/5 border-destructive' : ''
                    }`}
                  >
                  <div className="flex items-center justify-between">
                    <div className="font-medium">
                      {item.product_name}
                      {item.pendingRemoval && (
                        <span className="ml-2 text-xs text-destructive">(removido)</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {item.pendingRemoval ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => restoreOrderItem(item.id)}
                          className="text-green-600 hover:text-green-600"
                        >
                          Restaurar
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLocalOrderItem(item.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {!item.pendingRemoval && (
                    <>
                      <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label>Quantidade</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => {
                          const newQuantity = parseInt(e.target.value) || 1;
                          const newSubtotal = item.unit_price * newQuantity;
                          updateLocalOrderItem(item.id, { 
                            quantity: newQuantity,
                            subtotal: newSubtotal 
                          });
                        }}
                      />
                    </div>
                    <div>
                      <Label>Preço Unit.</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => {
                          const newPrice = parseFloat(e.target.value) || 0;
                          const newSubtotal = newPrice * item.quantity;
                          updateLocalOrderItem(item.id, { 
                            unit_price: newPrice,
                            subtotal: newSubtotal 
                          });
                        }}
                      />
                    </div>
                    <div>
                      <Label>Subtotal</Label>
                      <Input
                        type="text"
                        value={`R$ ${item.subtotal.toFixed(2)}`}
                        disabled
                      />
                    </div>
                  </div>
                  
                  {/* Exibir desconto do item se houver cupom aplicado */}
                  {itemDiscounts[item.id]?.discount > 0 && (
                    <div className="mt-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Tag className="h-3.5 w-3.5 text-emerald-600" />
                          <span className="text-emerald-700 font-medium">
                            {appliedCoupon?.code}:
                          </span>
                          {itemDiscounts[item.id].ruleType === 'product' && (
                            <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700 border-purple-200">
                              Regra Produto
                            </Badge>
                          )}
                          {itemDiscounts[item.id].ruleType === 'category' && (
                            <Badge variant="outline" className="text-xs bg-orange-100 text-orange-700 border-orange-200">
                              Regra Categoria
                            </Badge>
                          )}
                          {itemDiscounts[item.id].ruleType === 'default' && (
                            <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-200">
                              Cupom Padrão
                            </Badge>
                          )}
                          {isRecalculating && (
                            <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
                          )}
                        </div>
                        <span className="text-emerald-600 font-semibold">
                          - R$ {itemDiscounts[item.id].discount.toFixed(2)}
                          {itemDiscounts[item.id].discountPercent && (
                            <span className="text-xs text-muted-foreground ml-1">
                              ({itemDiscounts[item.id].discountPercent}%)
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm mt-2 pt-2 border-t border-emerald-500/20">
                        <span className="font-medium text-foreground">Valor c/ Desconto:</span>
                        <span className="font-bold text-foreground">
                          R$ {(item.subtotal - itemDiscounts[item.id].discount).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <Label>Observação</Label>
                    <Button
                      variant="outline"
                      className="w-full justify-start h-auto min-h-[60px] text-left"
                      onClick={() => {
                        setEditingObservationItem(item);
                        setTempObservation(item.observation || '');
                        setObservationModalOpen(true);
                      }}
                    >
                      {item.observation || 'Clique para adicionar observação...'}
                    </Button>
                  </div>
                    </>
                  )}
                  </div>
                  {index < orderItems.length - 1 && (
                    <Separator className="bg-orange-500 h-[3px] my-4" />
                  )}
                </React.Fragment>
              ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="payment" className="space-y-4 pr-4">
              <div className="space-y-2">
                <Label>Forma de Pagamento</Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {storePaymentMethods.accepts_pix && (
                      <SelectItem value="pix">PIX</SelectItem>
                    )}
                    {storePaymentMethods.accepts_card && (
                      <>
                        <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                        <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                      </>
                    )}
                    {storePaymentMethods.accepts_cash && (
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {formData.payment_method === 'dinheiro' && (
                <div>
                  <Label>Troco para</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.change_amount}
                    onChange={(e) => setFormData({ ...formData, change_amount: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                </div>
              )}

              <Separator />

              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Cupom de Desconto
                </Label>
                
                {appliedCoupon ? (
                  <div className="flex items-center gap-2 p-3 bg-success/10 border border-success/20 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-sm flex items-center gap-2">
                        {appliedCoupon.code}
                        {isRecalculating && (
                          <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Desconto: R$ {couponDiscount.toFixed(2)}
                        {couponDiscount !== order?.coupon_discount && (
                          <span className="ml-1 text-warning">
                            (era R$ {(order?.coupon_discount || 0).toFixed(2)})
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveCoupon}
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Código do cupom"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      disabled={validatingCoupon}
                    />
                    <Button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={validatingCoupon || !couponCode.trim()}
                    >
                      {validatingCoupon ? 'Validando...' : 'Aplicar'}
                    </Button>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>R$ {orderItems
                    .filter(item => !item.pendingRemoval)
                    .reduce((sum, item) => sum + item.subtotal, 0)
                    .toFixed(2)}
                  </span>
                </div>
                {formData.delivery_fee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Taxa de entrega:</span>
                    <span>R$ {formData.delivery_fee.toFixed(2)}</span>
                  </div>
                )}
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-sm text-success">
                    <span className="flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      Desconto ({appliedCoupon?.code}):
                      {isRecalculating && (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      )}
                    </span>
                    <span>- R$ {couponDiscount.toFixed(2)}</span>
                  </div>
                )}
                {couponDiscount !== order?.coupon_discount && order?.coupon_discount > 0 && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Desconto original:</span>
                    <span>- R$ {order.coupon_discount.toFixed(2)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>Total:</span>
                  <span>R$ {(
                    orderItems
                      .filter(item => !item.pendingRemoval)
                      .reduce((sum, item) => sum + item.subtotal, 0) +
                    (formData.delivery_fee || 0) -
                    couponDiscount
                  ).toFixed(2)}</span>
                </div>
              </div>

            </TabsContent>

            <TabsContent value="delivery" className="space-y-4 pr-4">
              <div>
                <Label>Tipo de Entrega</Label>
                <Select
                  value={formData.delivery_type}
                  onValueChange={(value) => setFormData({ ...formData, delivery_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="delivery">Entrega</SelectItem>
                    <SelectItem value="pickup">Retirada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Taxa de Entrega</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.delivery_fee}
                  onChange={(e) => setFormData({ ...formData, delivery_fee: parseFloat(e.target.value) || 0 })}
                />
              </div>

              {formData.delivery_type === 'delivery' && (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Label>Rua</Label>
                      <Input
                        value={formData.delivery_street}
                        onChange={(e) => setFormData({ ...formData, delivery_street: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Número</Label>
                      <Input
                        value={formData.delivery_number}
                        onChange={(e) => setFormData({ ...formData, delivery_number: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Bairro</Label>
                      <Input
                        value={formData.delivery_neighborhood}
                        onChange={(e) => setFormData({ ...formData, delivery_neighborhood: e.target.value })}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Complemento</Label>
                      <Input
                        value={formData.delivery_complement}
                        onChange={(e) => setFormData({ ...formData, delivery_complement: e.target.value })}
                        placeholder="Apartamento, bloco, referência..."
                      />
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-4 pr-4">
              {history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma edição registrada ainda
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map((entry) => (
                    <div key={entry.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-sm">{entry.editor_name}</div>
                        <Badge variant="outline" className="text-xs">
                          {format(new Date(entry.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </Badge>
                      </div>
                      <Separator />
                      <div className="space-y-1 text-sm">
                        {Object.entries(entry.changes).map(([field, change]: [string, any]) => {
                          const fieldLabels: Record<string, string> = {
                            payment_method: 'Forma de Pagamento',
                            delivery_type: 'Tipo de Entrega',
                            delivery_fee: 'Taxa de Entrega',
                            delivery_street: 'Rua',
                            subtotal: 'Subtotal',
                            total: 'Total',
                          };
                          
                          // Renderizar itens removidos
                          if (field === 'items_removed' && Array.isArray(change)) {
                            return (
                              <div key={field} className="space-y-1">
                                <span className="font-medium text-destructive">Itens Removidos:</span>
                                {change.map((item: any, idx: number) => (
                                  <div key={idx} className="ml-4 text-destructive text-xs">
                                    - {item.name} (Qtd: {item.quantity}, R$ {item.price.toFixed(2)})
                                  </div>
                                ))}
                              </div>
                            );
                          }

                          // Renderizar itens adicionados
                          if (field === 'items_added' && Array.isArray(change)) {
                            return (
                              <div key={field} className="space-y-1">
                                <span className="font-medium text-green-600">Itens Adicionados:</span>
                                {change.map((item: any, idx: number) => (
                                  <div key={idx} className="ml-4 text-green-600 text-xs">
                                    + {item.name} (Qtd: {item.quantity}, R$ {item.price.toFixed(2)})
                                  </div>
                                ))}
                              </div>
                            );
                          }

                          // Renderizar mudanças normais
                          return (
                            <div key={field} className="flex items-center gap-2 text-xs">
                              <span className="font-medium">{fieldLabels[field] || field}:</span>
                              <span className="text-muted-foreground line-through">
                                {typeof change.before === 'number' 
                                  ? `R$ ${change.before.toFixed(2)}` 
                                  : change.before || '-'}
                              </span>
                              <span>→</span>
                              <span className="text-primary font-medium">
                                {typeof change.after === 'number' 
                                  ? `R$ ${change.after.toFixed(2)}` 
                                  : change.after || '-'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <ResponsiveDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="flex-1 sm:flex-initial">
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>

    {/* Modal de Observação */}
    <ObservationDialog open={observationModalOpen} onOpenChange={setObservationModalOpen}>
      <ObservationDialogContent className="max-w-lg w-[96vw] sm:w-full">
        <ObservationDialogHeader>
          <ObservationDialogTitle>Observação do Produto</ObservationDialogTitle>
          <ObservationDialogDescription>
            Edite a observação deste item do pedido
          </ObservationDialogDescription>
        </ObservationDialogHeader>
        <div className="space-y-4 mt-2 px-4">
          <div>
            <Label>Produto: {editingObservationItem?.product_name}</Label>
          </div>
          <div>
            <Label>Observação</Label>
            <Textarea
              value={tempObservation}
              onChange={(e) => setTempObservation(e.target.value)}
              placeholder="Digite a observação do produto..."
              className="resize-none min-h-[60px] sm:min-h-[120px]"
            />
          </div>
        </div>
        <div className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 p-4">
          <Button
            variant="outline"
            onClick={() => {
              setObservationModalOpen(false);
              setEditingObservationItem(null);
              setTempObservation("");
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={() => {
              if (editingObservationItem) {
                updateLocalOrderItem(editingObservationItem.id, { observation: tempObservation });
              }
              setObservationModalOpen(false);
              setEditingObservationItem(null);
              setTempObservation("");
            }}
          >
            Salvar
          </Button>
        </div>
      </ObservationDialogContent>
    </ObservationDialog>
    </>
  );
};
