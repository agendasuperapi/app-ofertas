import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogDescription, ResponsiveDialogFooter } from '@/components/ui/responsive-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CPFInput } from '@/components/ui/cpf-input';
import { PhoneInput } from '@/components/ui/phone-input';
import { EmailInput } from '@/components/ui/email-input';
import { useAffiliates, Affiliate, AffiliateEarning, AffiliateCommissionRule, AffiliateStats } from '@/hooks/useAffiliates';
import { useCoupons } from '@/hooks/useCoupons';
import { useCategories } from '@/hooks/useCategories';
import { useProducts } from '@/hooks/useProducts';
import { InviteAffiliateDialog } from './InviteAffiliateDialog';
import { 
  Users, Plus, Edit, Trash2, DollarSign, TrendingUp, 
  Copy, Check, Tag, Percent, Settings, Eye, 
  Clock, CheckCircle, XCircle, CreditCard, Loader2, AlertCircle, Search, Mail, Link2, Package, ChevronDown, ChevronRight, Pencil, X, Save, UserCheck, UserX, Lock
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import { validatePixKey, detectPixKeyType } from '@/lib/pixValidation';
import { supabase } from '@/integrations/supabase/client';

interface AffiliatesManagerProps {
  storeId: string;
  storeName?: string;
}

export const AffiliatesManager = ({ storeId, storeName = 'Loja' }: AffiliatesManagerProps) => {
  const { 
    affiliates, 
    isLoading, 
    createAffiliate, 
    updateAffiliate, 
    deleteAffiliate, 
    toggleAffiliateStatus,
    toggleCommission,
    getCommissionRules,
    createCommissionRule,
    deleteCommissionRule,
    updateCommissionRule,
    getAffiliateEarnings,
    updateEarningStatus,
    getAffiliateStats,
    getAllStoreEarnings,
    createPayment,
  } = useAffiliates(storeId);
  
  const { coupons, createCoupon, updateCoupon } = useCoupons(storeId);
  const { categories } = useCategories(storeId);
  const productsQuery = useProducts(storeId);
  const products = productsQuery.data || [];

  const [activeTab, setActiveTab] = useState('gerenciar');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editingAffiliate, setEditingAffiliate] = useState<Affiliate | null>(null);
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null);

  // Filter coupons: only show coupons not linked to other affiliates
  const availableCoupons = coupons.filter((coupon) => {
    // Check if coupon is linked via legacy field (coupon_id)
    const linkedViaLegacy = affiliates.find(a => a.coupon_id === coupon.id);
    
    // Check if coupon is linked via junction table (affiliate_coupons)
    const linkedViaJunction = affiliates.find(a => 
      a.affiliate_coupons?.some(ac => ac.coupon_id === coupon.id)
    );
    
    const linkedAffiliate = linkedViaLegacy || linkedViaJunction;
    
    // If not linked to any affiliate, it's available
    if (!linkedAffiliate) return true;
    
    // Get current affiliate being edited (from edit mode or details modal)
    const currentAffiliateId = editingAffiliate?.id || selectedAffiliate?.id;
    
    // If we're creating a new affiliate (no editingAffiliate and no selectedAffiliate in edit context),
    // exclude coupons already linked to other affiliates
    if (!currentAffiliateId) return false;
    
    // Allow if linked to the affiliate being edited/viewed
    return linkedAffiliate.id === currentAffiliateId;
  });
  const [commissionRules, setCommissionRules] = useState<AffiliateCommissionRule[]>([]);
  const [affiliateEarnings, setAffiliateEarnings] = useState<AffiliateEarning[]>([]);
  const [affiliateStats, setAffiliateStats] = useState<AffiliateStats | null>(null);
  const [allEarnings, setAllEarnings] = useState<any[]>([]);
  const [salesChartData, setSalesChartData] = useState<{ date: string; vendas: number; comissao: number }[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [ruleProductsModalOpen, setRuleProductsModalOpen] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [collapsedRuleCategories, setCollapsedRuleCategories] = useState<Set<string>>(new Set());
  const [selectedRuleIds, setSelectedRuleIds] = useState<Set<string>>(new Set());
  const [rulesSearchTerm, setRulesSearchTerm] = useState('');
  const [commissionValueError, setCommissionValueError] = useState(false);
  const [defaultCommissionValueError, setDefaultCommissionValueError] = useState(false);
  
  // Estados para edição de regra inline
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editingRuleValue, setEditingRuleValue] = useState<number>(0);
  const [editingRuleType, setEditingRuleType] = useState<'percentage' | 'fixed'>('percentage');
  
  // Default Commission states
  const [defaultCommissionEnabled, setDefaultCommissionEnabled] = useState(true);
  const [defaultCommissionType, setDefaultCommissionType] = useState<'percentage' | 'fixed'>('percentage');
  const [defaultCommissionValue, setDefaultCommissionValue] = useState(0);
  const [savingDefaultCommission, setSavingDefaultCommission] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [inviteLinkDialogOpen, setInviteLinkDialogOpen] = useState(false);
  const [productsModalOpen, setProductsModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [generatedInviteLink, setGeneratedInviteLink] = useState<string | null>(null);
  const [createdAffiliateName, setCreatedAffiliateName] = useState<string>('');
  const [newCouponDialogOpen, setNewCouponDialogOpen] = useState(false);
  const [affiliateSearchTerm, setAffiliateSearchTerm] = useState('');
  const [affiliateStatusFilter, setAffiliateStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [toggleStatusAffiliate, setToggleStatusAffiliate] = useState<Affiliate | null>(null);
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);
  const [couponProductsModalOpen, setCouponProductsModalOpen] = useState(false);

  const [newCouponData, setNewCouponData] = useState({
    code: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: 0,
    min_order_value: 0,
    max_uses: null as number | null,
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: '',
    applies_to: 'all' as 'all' | 'category' | 'product',
    category_names: [] as string[],
    product_ids: [] as string[],
  });

  // Estados para regras específicas de desconto do cupom
  const [couponDiscountRules, setCouponDiscountRules] = useState<{
    product_id: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
  }[]>([]);
  // Estados para regras de desconto por categoria
  const [couponCategoryRules, setCouponCategoryRules] = useState<{
    category_name: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
  }[]>([]);
  const [couponRulesModalOpen, setCouponRulesModalOpen] = useState(false);
  const [couponCategoryRulesModalOpen, setCouponCategoryRulesModalOpen] = useState(false);
  const [couponRuleProductSearch, setCouponRuleProductSearch] = useState('');
  const [collapsedCouponRuleCategories, setCollapsedCouponRuleCategories] = useState<Set<string>>(new Set());
  const [editingCouponRuleProductId, setEditingCouponRuleProductId] = useState<string | null>(null);
  const [editingCouponRuleCategoryName, setEditingCouponRuleCategoryName] = useState<string | null>(null);
  const [editingCouponRuleValue, setEditingCouponRuleValue] = useState<number>(0);
  const [editingCouponRuleType, setEditingCouponRuleType] = useState<'percentage' | 'fixed'>('percentage');
  const [selectedCouponRuleProductIds, setSelectedCouponRuleProductIds] = useState<Set<string>>(new Set());
  const [selectedCouponRuleCategoryNames, setSelectedCouponRuleCategoryNames] = useState<Set<string>>(new Set());

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    cpf_cnpj: '',
    pix_key: '',
    coupon_ids: [] as string[],
    commission_enabled: true,
    default_commission_type: 'percentage' as 'percentage' | 'fixed',
    default_commission_value: 0,
    commission_products: [] as { id: string; type: 'percentage' | 'fixed'; value: number }[],
  });

  const [ruleFormData, setRuleFormData] = useState({
    commission_type: 'percentage' as 'percentage' | 'fixed',
    commission_value: 0,
    applies_to: 'product' as 'product',
    product_ids: [] as string[],
  });

  const [paymentFormData, setPaymentFormData] = useState({
    amount: 0,
    payment_method: 'pix',
    notes: '',
  });

  // Product search states
  const [productSearch, setProductSearch] = useState('');
  const [ruleProductSearch, setRuleProductSearch] = useState('');
  const [couponProductSearch, setCouponProductSearch] = useState('');
  const [couponCategorySearch, setCouponCategorySearch] = useState('');

  // Filter products by search term
  const filteredProducts = products.filter((product) => {
    if (!productSearch.trim()) return true;
    const search = productSearch.toLowerCase().trim();
    return (
      product.name?.toLowerCase().includes(search) ||
      product.id?.toLowerCase().includes(search) ||
      product.short_id?.toLowerCase().includes(search) ||
      product.external_code?.toLowerCase().includes(search)
    );
  });

  const filteredRuleProducts = products.filter((product) => {
    if (!ruleProductSearch.trim()) return true;
    const search = ruleProductSearch.toLowerCase().trim();
    return (
      product.name?.toLowerCase().includes(search) ||
      product.id?.toLowerCase().includes(search) ||
      product.short_id?.toLowerCase().includes(search) ||
      product.external_code?.toLowerCase().includes(search)
    );
  });

  const filteredCouponProducts = products.filter((product) => {
    if (!couponProductSearch.trim()) return true;
    const search = couponProductSearch.toLowerCase().trim();
    return (
      product.name?.toLowerCase().includes(search) ||
      product.id?.toLowerCase().includes(search) ||
      product.short_id?.toLowerCase().includes(search) ||
      product.external_code?.toLowerCase().includes(search)
    );
  });

  const filteredCouponCategories = categories.filter((category) => {
    if (!couponCategorySearch.trim()) return true;
    return category.name?.toLowerCase().includes(couponCategorySearch.toLowerCase().trim());
  });

  const filteredCouponRuleProducts = products.filter((product) => {
    if (!couponRuleProductSearch.trim()) return true;
    const search = couponRuleProductSearch.toLowerCase().trim();
    return (
      product.name?.toLowerCase().includes(search) ||
      product.id?.toLowerCase().includes(search) ||
      product.short_id?.toLowerCase().includes(search) ||
      product.external_code?.toLowerCase().includes(search)
    );
  });

  // Load all earnings for reports tab
  useEffect(() => {
    if (activeTab === 'relatorios') {
      getAllStoreEarnings().then(setAllEarnings);
    }
  }, [activeTab, getAllStoreEarnings]);


  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      cpf_cnpj: '',
      pix_key: '',
      coupon_ids: [],
      commission_enabled: true,
      default_commission_type: 'percentage',
      default_commission_value: 0,
      commission_products: [],
    });
    setProductSearch('');
    setEditingAffiliate(null);
  };

  const handleOpenDialog = async (affiliate?: Affiliate) => {
    if (affiliate) {
      setEditingAffiliate(affiliate);
      // Get coupon IDs from junction table or legacy field - filter out deleted coupons
      const couponIds = affiliate.affiliate_coupons
        ?.filter(ac => ac.coupon !== null && ac.coupon !== undefined)
        .map(ac => ac.coupon_id) || 
        (affiliate.coupon_id && affiliate.coupon ? [affiliate.coupon_id] : []);
      
      // Load existing commission rules
      const existingRules = await getCommissionRules(affiliate.id);
      const categoryRules = existingRules
        .filter(r => r.applies_to === 'category' && r.category_name)
        .map(r => ({
          name: r.category_name!,
          type: r.commission_type as 'percentage' | 'fixed',
          value: r.commission_value,
        }));
      
      const productRules = existingRules
        .filter(r => r.applies_to === 'product' && r.product_id)
        .map(r => ({
          id: r.product_id!,
          type: r.commission_type as 'percentage' | 'fixed',
          value: r.commission_value,
        }));
      
      setFormData({
        name: affiliate.name,
        email: affiliate.email,
        phone: affiliate.phone || '',
        cpf_cnpj: affiliate.cpf_cnpj || '',
        pix_key: affiliate.pix_key || '',
        coupon_ids: couponIds,
        commission_enabled: affiliate.use_default_commission ?? true,
        default_commission_type: affiliate.default_commission_type,
        default_commission_value: affiliate.default_commission_value,
        commission_products: productRules,
      });
    } else {
      resetForm();
    }
    setProductSearch('');
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.cpf_cnpj) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Nome e CPF são obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    // Validar valor da comissão padrão se estiver habilitada
    if (formData.commission_enabled && formData.default_commission_value <= 0 && formData.commission_products.length === 0) {
      toast({
        title: 'Configuração de comissão incompleta',
        description: 'Defina um valor para a comissão padrão ou adicione regras específicas por produto.',
        variant: 'destructive',
      });
      return;
    }

    const affiliateData = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      cpf_cnpj: formData.cpf_cnpj,
      pix_key: formData.pix_key,
      coupon_ids: formData.coupon_ids,
      commission_enabled: formData.commission_enabled,
      default_commission_type: formData.default_commission_type,
      default_commission_value: formData.default_commission_value,
      use_default_commission: formData.commission_enabled && formData.default_commission_value > 0,
    };

    let result;
    const isNewAffiliate = !editingAffiliate;
    if (editingAffiliate) {
      result = await updateAffiliate(editingAffiliate.id, affiliateData);
    } else {
      result = await createAffiliate(affiliateData);
    }

    // Se a comissão é por categoria ou produto, criar regra específica
    if (result && formData.commission_enabled) {
      // Delete existing rules first when editing
      if (editingAffiliate) {
        const existingRules = await getCommissionRules(editingAffiliate.id);
        for (const rule of existingRules) {
          await deleteCommissionRule(rule.id);
        }
      }
      
      // Criar regra para cada produto com sua comissão específica
      for (const product of formData.commission_products) {
        await createCommissionRule({
          affiliate_id: result.id,
          commission_type: product.type,
          commission_value: product.value,
          applies_to: 'product',
          category_name: null,
          product_id: product.id,
        });
      }
    }

    // Salvar dados antes de resetar o form
    const affiliateName = formData.name;
    const affiliateEmail = formData.email;
    const affiliateCpf = formData.cpf_cnpj;
    const affiliateCouponId = formData.coupon_ids[0] || null;

    setDialogOpen(false);
    resetForm();

    // Gerar link de convite automaticamente para novos afiliados
    if (isNewAffiliate && result) {
      try {
        // Remove formatação do CPF antes de enviar
        const cpfNumbers = affiliateCpf?.replace(/\D/g, '') || '';
        
        const { data, error } = await supabase.functions.invoke('affiliate-invite', {
          body: {
            action: 'send',
            store_id: storeId,
            store_name: storeName,
            cpf: cpfNumbers,
            email: affiliateEmail,
            name: affiliateName,
            coupon_id: affiliateCouponId,
          }
        });

        if (data?.success && data?.invite_token) {
          const link = `${window.location.origin}/afiliado/cadastro?token=${data.invite_token}`;
          setGeneratedInviteLink(link);
          setCreatedAffiliateName(affiliateName);
          setInviteLinkDialogOpen(true);
        }
      } catch (err) {
        console.error('Error generating invite link:', err);
      }
    }
  };

  const handleViewDetails = async (affiliate: Affiliate) => {
    setSelectedAffiliate(affiliate);
    setDetailsModalOpen(true);
    
    // Load default commission settings
    setDefaultCommissionEnabled(affiliate.use_default_commission ?? true);
    setDefaultCommissionType(affiliate.default_commission_type || 'percentage');
    setDefaultCommissionValue(affiliate.default_commission_value || 0);
    
    const [rules, earnings, stats] = await Promise.all([
      getCommissionRules(affiliate.id),
      getAffiliateEarnings(affiliate.id),
      getAffiliateStats(affiliate.id),
    ]);
    setCommissionRules(rules);
    setAffiliateEarnings(earnings);
    setAffiliateStats(stats);
    
    // Process earnings data for the chart (last 30 days)
    const chartData = processEarningsForChart(earnings);
    setSalesChartData(chartData);
  };

  // Process earnings into chart data grouped by date
  const processEarningsForChart = (earnings: AffiliateEarning[]) => {
    const last30Days: { [key: string]: { vendas: number; comissao: number } } = {};
    
    // Initialize last 30 days
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = format(date, 'dd/MM', { locale: ptBR });
      last30Days[dateKey] = { vendas: 0, comissao: 0 };
    }
    
    // Aggregate earnings by date
    earnings.forEach((earning) => {
      const date = new Date(earning.created_at);
      const dateKey = format(date, 'dd/MM', { locale: ptBR });
      if (last30Days[dateKey]) {
        last30Days[dateKey].vendas += Number(earning.order_total) || 0;
        last30Days[dateKey].comissao += Number(earning.commission_amount) || 0;
      }
    });
    
    return Object.entries(last30Days).map(([date, data]) => ({
      date,
      vendas: data.vendas,
      comissao: data.comissao,
    }));
  };

  const handleSaveDefaultCommission = async () => {
    if (!selectedAffiliate) return;
    
    // Validar valor da comissão quando ativada
    if (defaultCommissionEnabled && (!defaultCommissionValue || defaultCommissionValue <= 0)) {
      toast({
        title: 'Digite o valor da comissão',
        description: 'O valor da comissão padrão é obrigatório quando está ativada.',
        variant: 'destructive',
      });
      setDefaultCommissionValueError(true);
      setTimeout(() => setDefaultCommissionValueError(false), 2000);
      return;
    }
    
    setSavingDefaultCommission(true);
    try {
      await updateAffiliate(selectedAffiliate.id, {
        use_default_commission: defaultCommissionEnabled,
        default_commission_type: defaultCommissionType,
        default_commission_value: defaultCommissionValue,
      });
      
      // Update local state
      setSelectedAffiliate({
        ...selectedAffiliate,
        use_default_commission: defaultCommissionEnabled,
        default_commission_type: defaultCommissionType,
        default_commission_value: defaultCommissionValue,
      });
      
      toast({
        title: 'Comissão padrão salva!',
        description: defaultCommissionEnabled 
          ? `Produtos sem regra específica receberão ${defaultCommissionType === 'percentage' ? `${defaultCommissionValue}%` : formatCurrency(defaultCommissionValue)} de comissão.`
          : 'Comissão padrão desativada.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar a comissão padrão.',
        variant: 'destructive',
      });
    } finally {
      setSavingDefaultCommission(false);
    }
  };

  const handleShowInviteLink = async (affiliate: Affiliate) => {
    try {
      const { data, error } = await supabase.functions.invoke('affiliate-invite', {
        body: {
          action: 'get-invite-link',
          store_id: storeId,
          affiliate_email: affiliate.email,
        }
      });

      if (data?.already_verified) {
        toast({ 
          title: 'Afiliado já cadastrado', 
          description: 'Este afiliado já completou o cadastro e não precisa de link de convite.',
        });
        return;
      }

      if (data?.success && data?.invite_token) {
        const link = `${window.location.origin}/afiliado/cadastro?token=${data.invite_token}`;
        setGeneratedInviteLink(link);
        setCreatedAffiliateName(affiliate.name);
        setInviteLinkDialogOpen(true);
      } else {
        toast({ title: 'Erro ao gerar link', description: data?.error || 'Tente novamente.', variant: 'destructive' });
      }
    } catch (err) {
      console.error('Error generating invite link:', err);
      toast({ title: 'Erro ao gerar link', variant: 'destructive' });
    }
  };

  const handleCopyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({ title: 'Código copiado!' });
  };

  const handleAddRule = async () => {
    // Validar valor da comissão
    if (!ruleFormData.commission_value || ruleFormData.commission_value <= 0) {
      toast({
        title: 'Digite o valor da comissão',
        description: 'O valor da comissão é obrigatório.',
        variant: 'destructive',
      });
      setCommissionValueError(true);
      setTimeout(() => setCommissionValueError(false), 2000);
      return;
    }
    
    if (!selectedAffiliate || ruleFormData.product_ids.length === 0) {
      toast({
        title: 'Selecione pelo menos um produto',
        variant: 'destructive',
      });
      return;
    }

    let createdCount = 0;
    for (const productId of ruleFormData.product_ids) {
      await createCommissionRule({
        affiliate_id: selectedAffiliate.id,
        commission_type: ruleFormData.commission_type,
        commission_value: ruleFormData.commission_value,
        applies_to: 'product',
        category_name: null,
        product_id: productId,
      });
      createdCount++;
    }

    const rules = await getCommissionRules(selectedAffiliate.id);
    setCommissionRules(rules);
    setRuleDialogOpen(false);
    setRuleFormData({
      commission_type: 'percentage',
      commission_value: 0,
      applies_to: 'product',
      product_ids: [],
    });
    setRuleProductSearch('');
    
    toast({
      title: 'Regras criadas com sucesso',
      description: `${createdCount} regra(s) de comissão adicionada(s)`,
    });
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!selectedAffiliate) return;
    await deleteCommissionRule(ruleId);
    const rules = await getCommissionRules(selectedAffiliate.id);
    setCommissionRules(rules);
  };

  const handleSaveRuleEdit = async (ruleId: string) => {
    if (editingRuleValue <= 0) {
      toast({
        title: "Valor inválido",
        description: "O valor da comissão deve ser maior que zero.",
        variant: "destructive",
      });
      return;
    }
    
    const result = await updateCommissionRule(ruleId, {
      commission_type: editingRuleType,
      commission_value: editingRuleValue,
    });
    
    if (result && selectedAffiliate) {
      const rules = await getCommissionRules(selectedAffiliate.id);
      setCommissionRules(rules);
      setEditingRuleId(null);
    }
  };

  const handleSaveCoupon = async () => {
    if (!newCouponData.code.trim()) {
      toast({
        title: 'Código obrigatório',
        description: 'Informe o código do cupom',
        variant: 'destructive',
      });
      return;
    }

    try {
      let couponId = editingCouponId;
      
      if (editingCouponId) {
        // Atualizar cupom existente
        await updateCoupon(editingCouponId, {
          code: newCouponData.code.toUpperCase(),
          discount_type: newCouponData.discount_type,
          discount_value: newCouponData.discount_value,
          min_order_value: newCouponData.min_order_value,
          max_uses: newCouponData.max_uses,
          valid_from: newCouponData.valid_from,
          valid_until: newCouponData.valid_until || null,
          applies_to: newCouponData.applies_to,
          category_names: newCouponData.category_names,
          product_ids: newCouponData.product_ids,
        });
        
        toast({
          title: 'Cupom atualizado',
          description: `O cupom ${newCouponData.code} foi atualizado com sucesso.`,
        });
      } else {
        // Criar novo cupom
        const couponResult = await createCoupon({
          store_id: storeId,
          code: newCouponData.code.toUpperCase(),
          discount_type: newCouponData.discount_type,
          discount_value: newCouponData.discount_value,
          min_order_value: newCouponData.min_order_value,
          max_uses: newCouponData.max_uses,
          valid_from: newCouponData.valid_from,
          valid_until: newCouponData.valid_until || null,
          is_active: true,
          applies_to: newCouponData.applies_to,
          category_names: newCouponData.category_names,
          product_ids: newCouponData.product_ids,
        }) as any;

        if (couponResult?.id) {
          couponId = couponResult.id;
          // Aplicar automaticamente as configurações de escopo do cupom à comissão do afiliado
          const productConfigs = newCouponData.product_ids.map(id => ({
            id,
            type: 'percentage' as const,
            value: 10,
          }));
          setFormData({ 
            ...formData, 
            coupon_ids: [...formData.coupon_ids, couponResult.id],
            commission_products: productConfigs,
          });
        }
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
      
      setNewCouponDialogOpen(false);
      setEditingCouponId(null);
      setNewCouponData({
        code: '',
        discount_type: 'percentage',
        discount_value: 0,
        min_order_value: 0,
        max_uses: null,
        valid_from: new Date().toISOString().split('T')[0],
        valid_until: '',
        applies_to: 'all',
        category_names: [],
        product_ids: [],
      });
      setCouponDiscountRules([]);
      setCouponCategoryRules([]);
    } catch (error) {
      console.error('Error saving coupon:', error);
    }
  };

  const handleRegisterPayment = async () => {
    if (!selectedAffiliate || paymentFormData.amount <= 0) return;

    await createPayment({
      affiliate_id: selectedAffiliate.id,
      amount: paymentFormData.amount,
      payment_method: paymentFormData.payment_method,
      notes: paymentFormData.notes,
    });

    setPaymentDialogOpen(false);
    setPaymentFormData({ amount: 0, payment_method: 'pix', notes: '' });
    
    // Refresh stats
    const stats = await getAffiliateStats(selectedAffiliate.id);
    setAffiliateStats(stats);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pending: { label: 'Pendente', variant: 'outline' },
      approved: { label: 'Aprovada', variant: 'secondary' },
      paid: { label: 'Paga', variant: 'default' },
      cancelled: { label: 'Cancelada', variant: 'destructive' },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Calculate totals for summary cards
  const totalAffiliates = affiliates.length;
  const activeAffiliates = affiliates.filter(a => a.is_active).length;
  const totalPendingEarnings = allEarnings
    .filter(e => e.status === 'pending' || e.status === 'approved')
    .reduce((sum, e) => sum + Number(e.commission_amount), 0);
  const totalPaidEarnings = allEarnings
    .filter(e => e.status === 'paid')
    .reduce((sum, e) => sum + Number(e.commission_amount), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h2 className="text-3xl font-bold gradient-text flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow">
              <Users className="h-5 w-5 text-white" />
            </div>
            Afiliados
          </h2>
          <p className="text-muted-foreground mt-1">
            Gerencie seus afiliados e comissões
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="hover-lift" onClick={() => setInviteDialogOpen(true)}>
            <Mail className="h-4 w-4 mr-2" />
            Convidar Afiliado
          </Button>
          <Button className="bg-gradient-primary shadow-glow hover-lift" onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Afiliado
          </Button>
        </div>
      </motion.div>
      
      {/* Invite Dialog */}
      <InviteAffiliateDialog
        storeId={storeId}
        storeName={storeName}
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
      />

      {/* Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <motion.div whileHover={{ y: -4, scale: 1.02 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
          <Card className="glass-card overflow-hidden border-primary/10 hover:border-primary/30 transition-all">
            <CardContent className="pt-6 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
              <div className="flex items-center justify-between relative">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Total</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">{totalAffiliates}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div whileHover={{ y: -4, scale: 1.02 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
          <Card className="glass-card overflow-hidden border-green-500/10 hover:border-green-500/30 transition-all">
            <CardContent className="pt-6 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent pointer-events-none" />
              <div className="flex items-center justify-between relative">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Ativos</p>
                  <p className="text-3xl font-bold text-green-600">{activeAffiliates}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500/20 to-green-500/5 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div whileHover={{ y: -4, scale: 1.02 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
          <Card className="glass-card overflow-hidden border-amber-500/10 hover:border-amber-500/30 transition-all">
            <CardContent className="pt-6 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
              <div className="flex items-center justify-between relative">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Pendente</p>
                  <p className="text-3xl font-bold text-amber-600">{formatCurrency(totalPendingEarnings)}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-500/5 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div whileHover={{ y: -4, scale: 1.02 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
          <Card className="glass-card overflow-hidden border-green-500/10 hover:border-green-500/30 transition-all">
            <CardContent className="pt-6 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent pointer-events-none" />
              <div className="flex items-center justify-between relative">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Pago</p>
                  <p className="text-3xl font-bold text-green-600">{formatCurrency(totalPaidEarnings)}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500/20 to-green-500/5 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Lista de Afiliados */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="space-y-4"
      >
        {/* Campo de Busca e Filtros */}
        {affiliates.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou CPF/CNPJ..."
                value={affiliateSearchTerm}
                onChange={(e) => setAffiliateSearchTerm(e.target.value)}
                className="pl-10 glass"
              />
            </div>
            <Select value={affiliateStatusFilter} onValueChange={(value: 'all' | 'active' | 'inactive') => setAffiliateStatusFilter(value)}>
              <SelectTrigger className="w-full sm:w-[180px] glass">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {affiliates.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Nenhum afiliado cadastrado</h3>
              <p className="text-muted-foreground mb-4">
                Cadastre seu primeiro afiliado para começar a gerar comissões.
              </p>
              <Button className="bg-gradient-primary shadow-glow hover-lift" onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar Afiliado
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {affiliates
              .filter((affiliate) => {
                // Filtro de status
                if (affiliateStatusFilter === 'active' && !affiliate.is_active) return false;
                if (affiliateStatusFilter === 'inactive' && affiliate.is_active) return false;
                
                // Filtro de busca
                if (!affiliateSearchTerm.trim()) return true;
                const searchLower = affiliateSearchTerm.toLowerCase().trim();
                const nameMatch = affiliate.name?.toLowerCase().includes(searchLower);
                const emailMatch = affiliate.email?.toLowerCase().includes(searchLower);
                const cpfMatch = affiliate.cpf_cnpj?.replace(/\D/g, '').includes(searchLower.replace(/\D/g, '')) ||
                                 affiliate.cpf_cnpj?.toLowerCase().includes(searchLower);
                return nameMatch || emailMatch || cpfMatch;
              })
              .map((affiliate, index) => (
              <motion.div
                key={affiliate.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                whileHover={{ y: -4 }}
              >
                <Card className="glass-card overflow-hidden hover:border-primary/30 transition-all group">
                  <CardContent className="p-4 relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative">
                      <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0 shadow-glow">
                          <span className="text-lg font-bold text-white">
                            {affiliate.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold truncate">{affiliate.name}</h3>
                          <Badge 
                            variant={affiliate.is_active ? 'default' : 'secondary'}
                            className={affiliate.is_active ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
                          >
                            {affiliate.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                          {affiliate.commission_enabled && (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              <DollarSign className="h-3 w-3 mr-1" />
                              Comissão Ativa
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{affiliate.email}</p>
                        {(() => {
                          // Filter out deleted coupons (null references)
                          const affiliateCoupons = (affiliate.affiliate_coupons
                            ?.map(ac => ac.coupon)
                            .filter(coupon => coupon !== null && coupon !== undefined) || [])
                            .concat(affiliate.coupon && !affiliate.affiliate_coupons?.some(ac => ac.coupon?.id === affiliate.coupon?.id) 
                              ? [affiliate.coupon] 
                              : [])
                            .filter(coupon => coupon !== null && coupon !== undefined);
                          if (affiliateCoupons.length === 0) return null;
                          return (
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <Tag className="h-3 w-3 text-muted-foreground" />
                              {affiliateCoupons.map((coupon) => (
                                <div key={coupon.id} className="flex items-center gap-1">
                                  <span className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
                                    {coupon.code}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    onClick={() => handleCopyCode(coupon.code)}
                                  >
                                    {copiedCode === coupon.code ? (
                                      <Check className="h-3 w-3 text-green-600" />
                                    ) : (
                                      <Copy className="h-3 w-3" />
                                    )}
                                  </Button>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button variant="outline" size="sm" onClick={() => handleViewDetails(affiliate)}>
                        <Eye className="h-4 w-4 mr-1" />
                        Detalhes
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className={affiliate.is_active ? "text-destructive hover:text-destructive" : "text-green-600 hover:text-green-700"}
                        onClick={() => setToggleStatusAffiliate(affiliate)}
                      >
                        {affiliate.is_active ? (
                          <>
                            <UserX className="h-4 w-4 mr-1" />
                            Inativar
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-4 w-4 mr-1" />
                            Ativar
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Dialog: Criar/Editar Afiliado */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[95vw] max-w-3xl h-[90vh] overflow-hidden flex flex-col glass p-3 sm:p-6">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow">
                <Users className="h-5 w-5 text-white" />
              </div>
              <DialogTitle className="text-xl gradient-text">
                {editingAffiliate ? 'Editar Afiliado' : 'Novo Afiliado'}
              </DialogTitle>
            </div>
          </DialogHeader>
          
          <Tabs defaultValue="dados" className="flex-1 flex flex-col overflow-hidden mt-4">
            <div className="w-full overflow-x-auto pb-2">
              <TabsList className="w-max justify-start glass mb-2">
                <TabsTrigger value="dados" className="text-xs sm:text-sm px-2 sm:px-3">Dados</TabsTrigger>
                <TabsTrigger value="cupons" className="text-xs sm:text-sm px-2 sm:px-3">Cupons</TabsTrigger>
                <TabsTrigger value="regras" className="text-xs sm:text-sm px-2 sm:px-3">Regras Comissões</TabsTrigger>
              </TabsList>
            </div>
            
            {/* Aba Dados */}
            <TabsContent value="dados" className="flex-1 overflow-auto mt-2 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>CPF/CNPJ *</Label>
                  <CPFInput
                    value={formData.cpf_cnpj}
                    onChange={(value) => setFormData({ ...formData, cpf_cnpj: value })}
                  />
                </div>
                <div className="col-span-2">
                  <Label>Nome *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome completo"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Email</Label>
                  <EmailInput
                    value={formData.email}
                    onChange={(value) => setFormData({ ...formData, email: value })}
                  />
                </div>
                <div className="col-span-2">
                  <Label>Telefone</Label>
                  <PhoneInput
                    value={formData.phone}
                    onChange={(value) => setFormData({ ...formData, phone: value })}
                  />
                </div>
                <div className="col-span-2">
                  <Label>Chave PIX</Label>
                  <Input
                    value={formData.pix_key}
                    onChange={(e) => setFormData({ ...formData, pix_key: e.target.value })}
                    placeholder="CPF, CNPJ, Email, Telefone ou Chave Aleatória"
                  />
                  {formData.pix_key && (() => {
                    const validation = validatePixKey(formData.pix_key);
                    if (validation.type === 'invalid') {
                      return (
                        <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                          <XCircle className="h-3 w-3" />
                          {validation.message}
                        </p>
                      );
                    }
                    if (validation.type !== 'empty') {
                      return (
                        <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          {validation.message}
                        </p>
                      );
                    }
                    return null;
                })()}
                </div>
              </div>
              
              {/* Seção Comissão Padrão */}
              <div className="pt-4 border-t border-border/50">
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg">
                  <div>
                    <Label className="font-semibold">Comissão Padrão Ativada</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Aplicar comissão automática para produtos sem regra específica
                    </p>
                  </div>
                  <Switch
                    checked={formData.commission_enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, commission_enabled: checked })}
                  />
                </div>
                
                {formData.commission_enabled && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 mt-4"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Tipo de Comissão</Label>
                        <Select
                          value={formData.default_commission_type}
                          onValueChange={(value: 'percentage' | 'fixed') => 
                            setFormData({ ...formData, default_commission_type: value })
                          }
                        >
                          <SelectTrigger className="glass">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">
                              <div className="flex items-center gap-2">
                                <Percent className="h-4 w-4" />
                                Porcentagem (%)
                              </div>
                            </SelectItem>
                            <SelectItem value="fixed">
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4" />
                                Valor Fixo (R$)
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Valor</Label>
                        <div className="relative">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={formData.default_commission_value || ''}
                            onChange={(e) => setFormData({ 
                              ...formData, 
                              default_commission_value: Number(e.target.value) 
                            })}
                            className={`pr-8 glass ${!formData.default_commission_value && formData.commission_enabled ? 'border-destructive' : ''}`}
                            placeholder="0"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                            {formData.default_commission_type === 'percentage' ? '%' : 'R$'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-3 bg-muted/50 rounded-lg border border-border/50">
                      <p className="text-sm text-muted-foreground">
                        <strong>Como funciona:</strong> Produtos sem regra de comissão específica receberão automaticamente{' '}
                        {formData.default_commission_type === 'percentage' 
                          ? `${formData.default_commission_value || 0}% de comissão`
                          : formatCurrency(formData.default_commission_value || 0) + ' de comissão'
                        }.
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>
            </TabsContent>
            
            {/* Aba Cupons */}
            <TabsContent value="cupons" className="flex-1 overflow-auto mt-2 space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Cupons Vinculados</Label>
                  <Button variant="outline" size="sm" onClick={() => {
                    setEditingCouponId(null);
                    setNewCouponData({
                      code: '',
                      discount_type: 'percentage',
                      discount_value: 0,
                      min_order_value: 0,
                      max_uses: null,
                      valid_from: new Date().toISOString().split('T')[0],
                      valid_until: '',
                      applies_to: 'all',
                      category_names: [],
                      product_ids: [],
                    });
                    setCouponDiscountRules([]);
                    setCouponCategoryRules([]);
                    setNewCouponDialogOpen(true);
                  }}>
                    <Plus className="h-4 w-4 mr-1" />
                    Novo Cupom
                  </Button>
                </div>
                
                {/* Cupons Vinculados */}
                {formData.coupon_ids.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground border rounded-lg bg-muted/30">
                    <Tag className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhum cupom vinculado</p>
                    <p className="text-xs mt-1">Selecione um cupom existente ou crie um novo</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Cupons Vinculados</Label>
                    {formData.coupon_ids.map(couponId => {
                      const coupon = coupons.find(c => c.id === couponId);
                      if (!coupon) return null;
                      // Check if this coupon was already linked before editing (for existing affiliates)
                      const wasAlreadyLinked = editingAffiliate?.affiliate_coupons?.some(ac => ac.coupon_id === couponId);
                      return (
                        <div key={couponId} className="flex items-center justify-between p-3 border rounded-lg border-primary/50 bg-primary/5">
                          <div className="flex items-center gap-3">
                            {wasAlreadyLinked ? (
                              <div className="flex items-center justify-center h-4 w-4 text-primary" title="Cupom vinculado permanentemente">
                                <Lock className="h-4 w-4" />
                              </div>
                            ) : (
                              <Checkbox
                                checked={true}
                                onCheckedChange={() => {
                                  setFormData({
                                    ...formData,
                                    coupon_ids: formData.coupon_ids.filter(id => id !== couponId)
                                  });
                                }}
                              />
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-medium">{coupon.code}</span>
                                <Badge 
                                  variant={coupon.is_active ? "default" : "destructive"} 
                                  className={coupon.is_active ? "bg-green-600 text-white text-xs" : "text-xs"}
                                >
                                  {coupon.is_active ? "Ativo" : "Inativo"}
                                </Badge>
                                {wasAlreadyLinked && (
                                  <Badge variant="secondary" className="text-xs">
                                    Permanente
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : formatCurrency(coupon.discount_value)} de desconto
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={async () => {
                                setEditingCouponId(coupon.id);
                                setNewCouponData({
                                  code: coupon.code,
                                  discount_type: coupon.discount_type,
                                  discount_value: coupon.discount_value,
                                  min_order_value: coupon.min_order_value || 0,
                                  max_uses: coupon.max_uses || null,
                                  valid_from: coupon.valid_from || new Date().toISOString().split('T')[0],
                                  valid_until: coupon.valid_until || '',
                                  applies_to: (coupon.applies_to as 'all' | 'category' | 'product') || 'all',
                                  category_names: coupon.category_names || [],
                                  product_ids: coupon.product_ids || [],
                                });
                                // Carregar regras de desconto do banco
                                const { data: rules } = await supabase
                                  .from('coupon_discount_rules')
                                  .select('*')
                                  .eq('coupon_id', coupon.id);
                                if (rules && rules.length > 0) {
                                  const productRulesArray: { product_id: string; discount_type: 'percentage' | 'fixed'; discount_value: number }[] = [];
                                  const categoryRulesArray: { category_name: string; discount_type: 'percentage' | 'fixed'; discount_value: number }[] = [];
                                  rules.forEach(rule => {
                                    if (rule.rule_type === 'product' && rule.product_id) {
                                      productRulesArray.push({
                                        product_id: rule.product_id,
                                        discount_type: rule.discount_type as 'percentage' | 'fixed',
                                        discount_value: rule.discount_value
                                      });
                                    } else if (rule.rule_type === 'category' && rule.category_name) {
                                      categoryRulesArray.push({
                                        category_name: rule.category_name,
                                        discount_type: rule.discount_type as 'percentage' | 'fixed',
                                        discount_value: rule.discount_value
                                      });
                                    }
                                  });
                                  setCouponDiscountRules(productRulesArray);
                                  setCouponCategoryRules(categoryRulesArray);
                                } else {
                                  setCouponDiscountRules([]);
                                  setCouponCategoryRules([]);
                                }
                                setNewCouponDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Badge variant="default" className="bg-primary text-primary-foreground">Vinculado</Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {/* Cupons Disponíveis */}
                {availableCoupons.filter(c => !formData.coupon_ids.includes(c.id)).length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Cupons Disponíveis</Label>
                    <div className="max-h-[200px] overflow-y-auto space-y-2 border rounded-lg p-2">
                      {availableCoupons.filter(c => !formData.coupon_ids.includes(c.id)).map(coupon => (
                        <div 
                          key={coupon.id} 
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={false}
                              onCheckedChange={() => {
                                setFormData({
                                  ...formData,
                                  coupon_ids: [...formData.coupon_ids, coupon.id]
                                });
                              }}
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-medium">{coupon.code}</span>
                                <Badge 
                                  variant={coupon.is_active ? "default" : "destructive"} 
                                  className={coupon.is_active ? "bg-green-600 text-white text-xs" : "text-xs"}
                                >
                                  {coupon.is_active ? "Ativo" : "Inativo"}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : formatCurrency(coupon.discount_value)} de desconto
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={async () => {
                                setEditingCouponId(coupon.id);
                                setNewCouponData({
                                  code: coupon.code,
                                  discount_type: coupon.discount_type,
                                  discount_value: coupon.discount_value,
                                  min_order_value: coupon.min_order_value || 0,
                                  max_uses: coupon.max_uses || null,
                                  valid_from: coupon.valid_from || new Date().toISOString().split('T')[0],
                                  valid_until: coupon.valid_until || '',
                                  applies_to: (coupon.applies_to as 'all' | 'category' | 'product') || 'all',
                                  category_names: coupon.category_names || [],
                                  product_ids: coupon.product_ids || [],
                                });
                                // Carregar regras de desconto do banco
                                const { data: rules } = await supabase
                                  .from('coupon_discount_rules')
                                  .select('*')
                                  .eq('coupon_id', coupon.id);
                                if (rules && rules.length > 0) {
                                  const productRulesArray: { product_id: string; discount_type: 'percentage' | 'fixed'; discount_value: number }[] = [];
                                  const categoryRulesArray: { category_name: string; discount_type: 'percentage' | 'fixed'; discount_value: number }[] = [];
                                  rules.forEach(rule => {
                                    if (rule.rule_type === 'product' && rule.product_id) {
                                      productRulesArray.push({
                                        product_id: rule.product_id,
                                        discount_type: rule.discount_type as 'percentage' | 'fixed',
                                        discount_value: rule.discount_value
                                      });
                                    } else if (rule.rule_type === 'category' && rule.category_name) {
                                      categoryRulesArray.push({
                                        category_name: rule.category_name,
                                        discount_type: rule.discount_type as 'percentage' | 'fixed',
                                        discount_value: rule.discount_value
                                      });
                                    }
                                  });
                                  setCouponDiscountRules(productRulesArray);
                                  setCouponCategoryRules(categoryRulesArray);
                                } else {
                                  setCouponDiscountRules([]);
                                  setCouponCategoryRules([]);
                                }
                                setNewCouponDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Badge variant="outline">Não vinculado</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
            
            {/* Aba Regras Específicas */}
            <TabsContent value="regras" className="flex-1 overflow-auto mt-2 space-y-4">
              <Card className="glass-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Settings className="h-4 w-4 text-primary" />
                        Regras por Produto
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">
                        Defina comissões específicas para produtos (sobrescreve a comissão padrão)
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setProductsModalOpen(true)}>
                      <Plus className="h-4 w-4 mr-1" />
                      Selecionar Produtos
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {formData.commission_products.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground border rounded-lg border-dashed">
                      <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Nenhuma regra específica</p>
                      <p className="text-xs mt-1">Clique em "Selecionar Produtos" para adicionar</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {formData.commission_products.map((productConfig) => {
                        const product = products.find(p => p.id === productConfig.id);
                        if (!product) return null;
                        return (
                          <div key={productConfig.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{product.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {productConfig.type === 'percentage' 
                                  ? `${productConfig.value}%` 
                                  : formatCurrency(productConfig.value)
                                } de comissão
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Select
                                value={productConfig.type}
                                onValueChange={(value: 'percentage' | 'fixed') => {
                                  setFormData({
                                    ...formData,
                                    commission_products: formData.commission_products.map(p =>
                                      p.id === productConfig.id ? { ...p, type: value } : p
                                    )
                                  });
                                }}
                              >
                                <SelectTrigger className="w-[80px] h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="percentage">%</SelectItem>
                                  <SelectItem value="fixed">R$</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={productConfig.value}
                                onChange={(e) => {
                                  setFormData({
                                    ...formData,
                                    commission_products: formData.commission_products.map(p =>
                                      p.id === productConfig.id ? { ...p, value: Number(e.target.value) } : p
                                    )
                                  });
                                }}
                                className="w-[80px] h-8"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive h-8 w-8 p-0"
                                onClick={() => setFormData({
                                  ...formData,
                                  commission_products: formData.commission_products.filter(p => p.id !== productConfig.id)
                                })}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} className="bg-gradient-primary">
              {editingAffiliate ? 'Salvar' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Dialog: Registrar Pagamento */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-md glass">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
                <CreditCard className="h-5 w-5 text-white" />
              </div>
              <DialogTitle className="text-xl gradient-text">Registrar Pagamento</DialogTitle>
            </div>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Valor</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={paymentFormData.amount}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: Number(e.target.value) })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Método de Pagamento</Label>
              <Select
                value={paymentFormData.payment_method}
                onValueChange={(value) => setPaymentFormData({ ...paymentFormData, payment_method: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Observações</Label>
              <Input
                value={paymentFormData.notes}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                placeholder="Observações do pagamento"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRegisterPayment}>
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Link de Convite Gerado */}
      <Dialog open={inviteLinkDialogOpen} onOpenChange={setInviteLinkDialogOpen}>
        <DialogContent className="max-w-md glass">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg animate-pulse">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
              <DialogTitle className="text-xl gradient-text">
                Afiliado Cadastrado!
              </DialogTitle>
            </div>
          </DialogHeader>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-500/10 to-green-600/5 border border-green-500/20 rounded-lg">
              <div>
                <p className="font-medium text-green-700 dark:text-green-300">Convite criado com sucesso!</p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  Envie o link abaixo para {createdAffiliateName}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Link de convite</Label>
              <div className="flex gap-2">
                <Input
                  value={generatedInviteLink || ''}
                  readOnly
                  className="font-mono text-xs glass"
                />
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => {
                    if (generatedInviteLink) {
                      navigator.clipboard.writeText(generatedInviteLink);
                      toast({ title: 'Link copiado!' });
                    }
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Este link expira em 7 dias
              </p>
            </div>
          </motion.div>
          <DialogFooter>
            <Button 
              className="w-full bg-gradient-primary shadow-glow hover-lift"
              onClick={() => {
                setInviteLinkDialogOpen(false);
                setGeneratedInviteLink(null);
                setCreatedAffiliateName('');
              }}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Selecionar Produtos */}
      <Dialog open={productsModalOpen} onOpenChange={setProductsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] glass">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow">
                <Package className="h-5 w-5 text-white" />
              </div>
              <DialogTitle className="text-xl gradient-text">Selecionar Produtos e Comissões</DialogTitle>
            </div>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Buscar por nome, código interno ou externo..."
                className="pl-9"
              />
            </div>
            <ScrollArea className="h-[400px] border rounded-md p-2">
              {filteredProducts.length === 0 ? (
                <div className="py-4 text-sm text-muted-foreground text-center">
                  Nenhum produto encontrado
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredProducts.map((product) => {
                    const productConfig = formData.commission_products.find(p => p.id === product.id);
                    const isSelected = !!productConfig;
                    return (
                      <div
                        key={product.id}
                        className={`p-3 rounded-md border ${isSelected ? 'bg-primary/5 border-primary/30' : 'border-border hover:bg-muted/50'}`}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFormData({
                                  ...formData,
                                  commission_products: [
                                    ...formData.commission_products,
                                    { id: product.id, type: 'percentage', value: 10 }
                                  ]
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  commission_products: formData.commission_products.filter(p => p.id !== product.id)
                                });
                              }
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{product.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {product.external_code && `Cód: ${product.external_code}`}
                              {product.external_code && product.short_id && ' • '}
                              {product.short_id && `ID: ${product.short_id}`}
                            </p>
                          </div>
                        </div>
                        {isSelected && productConfig && (
                          <div className="mt-3 ml-7 flex items-center gap-2">
                            <Select
                              value={productConfig.type}
                              onValueChange={(value: 'percentage' | 'fixed') => {
                                setFormData({
                                  ...formData,
                                  commission_products: formData.commission_products.map(p =>
                                    p.id === product.id ? { ...p, type: value } : p
                                  )
                                });
                              }}
                            >
                              <SelectTrigger className="w-[120px] h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="percentage">%</SelectItem>
                                <SelectItem value="fixed">R$</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={productConfig.value}
                              onChange={(e) => {
                                setFormData({
                                  ...formData,
                                  commission_products: formData.commission_products.map(p =>
                                    p.id === product.id ? { ...p, value: Number(e.target.value) } : p
                                  )
                                });
                              }}
                              className="w-[100px] h-8"
                              placeholder="Valor"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProductsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setProductsModalOpen(false)}>
              Confirmar ({formData.commission_products.length} selecionados)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Detalhes do Afiliado */}
      <ResponsiveDialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <ResponsiveDialogContent className="w-full sm:w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col glass p-3 sm:p-6">
          <ResponsiveDialogHeader className="space-y-3 pr-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {selectedAffiliate && (
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow flex-shrink-0">
                    <span className="text-base sm:text-lg font-bold text-white">
                      {selectedAffiliate.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <ResponsiveDialogTitle className="text-lg sm:text-xl gradient-text truncate">Detalhes do Afiliado</ResponsiveDialogTitle>
                  {selectedAffiliate && (
                    <ResponsiveDialogDescription className="flex flex-col sm:flex-row sm:items-center gap-0 sm:gap-2 text-xs sm:text-sm truncate">
                      <span className="truncate">{selectedAffiliate.name}</span>
                      <span className="hidden sm:inline">-</span>
                      <span className="truncate text-muted-foreground">{selectedAffiliate.email}</span>
                    </ResponsiveDialogDescription>
                  )}
                </div>
              </div>
              {selectedAffiliate && (
                <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg flex-shrink-0 mr-4 sm:mr-0">
                  <Switch
                    checked={selectedAffiliate.commission_enabled}
                    onCheckedChange={async (checked) => {
                      await updateAffiliate(selectedAffiliate.id, { commission_enabled: checked });
                      setSelectedAffiliate({ ...selectedAffiliate, commission_enabled: checked });
                    }}
                  />
                  <div className="text-left">
                    <Label className="text-xs font-medium">Comissão Ativa</Label>
                  </div>
                </div>
              )}
            </div>
          </ResponsiveDialogHeader>
          
          {selectedAffiliate && (
            <Tabs defaultValue="resumo" className="flex-1 flex flex-col overflow-hidden">
              <div className="w-full overflow-x-auto pb-2">
                <TabsList className="w-max justify-start glass mb-2">
                  <TabsTrigger value="resumo" className="text-xs sm:text-sm px-2 sm:px-3">Resumo</TabsTrigger>
                  <TabsTrigger value="dados" className="text-xs sm:text-sm px-2 sm:px-3">Dados</TabsTrigger>
                  <TabsTrigger value="cupons" className="text-xs sm:text-sm px-2 sm:px-3">Cupons</TabsTrigger>
                  <TabsTrigger value="regras-especificas" className="text-xs sm:text-sm px-2 sm:px-3">Regras Comissões</TabsTrigger>
                  <TabsTrigger value="historico" className="text-xs sm:text-sm px-2 sm:px-3">Histórico</TabsTrigger>
                </TabsList>
              </div>
              
              {/* Aba Resumo */}
              <TabsContent value="resumo" className="flex-1 overflow-auto mt-4 space-y-4">
                {affiliateStats && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="grid grid-cols-2 gap-2 sm:gap-4"
                  >
                    <motion.div whileHover={{ y: -4, scale: 1.02 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
                      <Card className="glass-card overflow-hidden border-primary/10 hover:border-primary/30 transition-all">
                        <CardContent className="p-3 sm:pt-4 relative">
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
                          <div className="flex items-center justify-between relative gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs sm:text-sm text-muted-foreground font-medium">Total Vendas</p>
                              <p className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent truncate">{formatCurrency(affiliateStats.totalSales)}</p>
                            </div>
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0">
                              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                    <motion.div whileHover={{ y: -4, scale: 1.02 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
                      <Card className="glass-card overflow-hidden border-green-500/10 hover:border-green-500/30 transition-all">
                        <CardContent className="p-3 sm:pt-4 relative">
                          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent pointer-events-none" />
                          <div className="flex items-center justify-between relative gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs sm:text-sm text-muted-foreground font-medium">Total Comissões</p>
                              <p className="text-lg sm:text-2xl font-bold text-green-600 truncate">{formatCurrency(affiliateStats.totalEarnings)}</p>
                            </div>
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-green-500/20 to-green-500/5 flex items-center justify-center flex-shrink-0">
                              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                    <motion.div whileHover={{ y: -4, scale: 1.02 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
                      <Card className="glass-card overflow-hidden border-amber-500/10 hover:border-amber-500/30 transition-all">
                        <CardContent className="p-3 sm:pt-4 relative">
                          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
                          <div className="flex items-center justify-between relative gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs sm:text-sm text-muted-foreground font-medium">Pendente</p>
                              <p className="text-lg sm:text-2xl font-bold text-amber-600 truncate">{formatCurrency(affiliateStats.pendingEarnings)}</p>
                            </div>
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-500/5 flex items-center justify-center flex-shrink-0">
                              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                    <motion.div whileHover={{ y: -4, scale: 1.02 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
                      <Card className="glass-card overflow-hidden border-blue-500/10 hover:border-blue-500/30 transition-all">
                        <CardContent className="p-3 sm:pt-4 relative">
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
                          <div className="flex items-center justify-between relative gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs sm:text-sm text-muted-foreground font-medium">Pedidos</p>
                              <p className="text-lg sm:text-2xl font-bold text-blue-600">{affiliateStats.totalOrders}</p>
                            </div>
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-500/5 flex items-center justify-center flex-shrink-0">
                              <Package className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </motion.div>
                )}
                
                {/* Gráfico de Evolução de Vendas */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                >
                  <Card className="glass-card overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center">
                          <TrendingUp className="h-4 w-4 text-white" />
                        </div>
                        <CardTitle className="text-base">Evolução de Vendas (Últimos 30 dias)</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {salesChartData.length > 0 ? (
                        <div className="h-[250px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={salesChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                              <defs>
                                <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorComissao" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="hsl(142 76% 36%)" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="hsl(142 76% 36%)" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                              <XAxis 
                                dataKey="date" 
                                tick={{ fontSize: 10 }} 
                                tickLine={false}
                                axisLine={false}
                                interval="preserveStartEnd"
                                className="text-muted-foreground"
                              />
                              <YAxis 
                                tick={{ fontSize: 10 }} 
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`}
                                width={80}
                                className="text-muted-foreground"
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: 'hsl(var(--background))',
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '8px',
                                  fontSize: '12px',
                                }}
                                formatter={(value: number, name: string) => [
                                  formatCurrency(value),
                                  name === 'vendas' ? 'Vendas' : 'Comissão'
                                ]}
                                labelStyle={{ fontWeight: 'bold' }}
                              />
                              <Area
                                type="monotone"
                                dataKey="vendas"
                                stroke="hsl(var(--primary))"
                                fillOpacity={1}
                                fill="url(#colorVendas)"
                                strokeWidth={2}
                                name="vendas"
                              />
                              <Area
                                type="monotone"
                                dataKey="comissao"
                                stroke="hsl(142 76% 36%)"
                                fillOpacity={1}
                                fill="url(#colorComissao)"
                                strokeWidth={2}
                                name="comissao"
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                          <p>Nenhum dado de vendas disponível</p>
                        </div>
                      )}
                      
                      {/* Legenda */}
                      <div className="flex items-center justify-center gap-6 mt-4 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-gradient-primary shadow-glow" />
                          <span className="text-muted-foreground">Vendas</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(142 76% 36%)' }} />
                          <span className="text-muted-foreground">Comissão</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>
              
              {/* Aba Dados */}
              <TabsContent value="dados" className="flex-1 overflow-auto mt-4 space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Dados do Afiliado</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <Label>Nome *</Label>
                        <Input
                          value={selectedAffiliate.name}
                          onChange={async (e) => {
                            const newName = e.target.value;
                            setSelectedAffiliate({ ...selectedAffiliate, name: newName });
                          }}
                          onBlur={async () => {
                            await updateAffiliate(selectedAffiliate.id, { name: selectedAffiliate.name });
                          }}
                          placeholder="Nome completo"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Email *</Label>
                        <Input
                          type="email"
                          value={selectedAffiliate.email}
                          onChange={async (e) => {
                            const newEmail = e.target.value;
                            setSelectedAffiliate({ ...selectedAffiliate, email: newEmail });
                          }}
                          onBlur={async () => {
                            await updateAffiliate(selectedAffiliate.id, { email: selectedAffiliate.email });
                          }}
                          placeholder="email@exemplo.com"
                        />
                      </div>
                      <div>
                        <Label>Telefone</Label>
                        <Input
                          value={selectedAffiliate.phone || ''}
                          onChange={(e) => {
                            let value = e.target.value.replace(/\D/g, '');
                            if (value.length > 11) value = value.slice(0, 11);
                            if (value.length > 0) {
                              value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
                              value = value.replace(/(\d{5})(\d)/, '$1-$2');
                            }
                            setSelectedAffiliate({ ...selectedAffiliate, phone: value });
                          }}
                          onBlur={async () => {
                            await updateAffiliate(selectedAffiliate.id, { phone: selectedAffiliate.phone });
                          }}
                          placeholder="(00) 00000-0000"
                          maxLength={15}
                        />
                        {selectedAffiliate.phone && selectedAffiliate.phone.replace(/\D/g, '').length > 0 && selectedAffiliate.phone.replace(/\D/g, '').length < 10 && (
                          <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Telefone incompleto
                          </p>
                        )}
                      </div>
                      <div>
                        <Label>CPF/CNPJ</Label>
                        <Input
                          value={selectedAffiliate.cpf_cnpj || ''}
                          onChange={(e) => {
                            let value = e.target.value.replace(/\D/g, '');
                            if (value.length > 14) value = value.slice(0, 14);
                            if (value.length <= 11) {
                              value = value.replace(/(\d{3})(\d)/, '$1.$2');
                              value = value.replace(/(\d{3})(\d)/, '$1.$2');
                              value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                            } else {
                              value = value.replace(/^(\d{2})(\d)/, '$1.$2');
                              value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
                              value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
                              value = value.replace(/(\d{4})(\d)/, '$1-$2');
                            }
                            setSelectedAffiliate({ ...selectedAffiliate, cpf_cnpj: value });
                          }}
                          onBlur={async () => {
                            await updateAffiliate(selectedAffiliate.id, { cpf_cnpj: selectedAffiliate.cpf_cnpj });
                          }}
                          placeholder="000.000.000-00"
                          maxLength={18}
                        />
                        {selectedAffiliate.cpf_cnpj && (() => {
                          const digits = selectedAffiliate.cpf_cnpj.replace(/\D/g, '');
                          if (digits.length > 0 && digits.length < 11) {
                            return (
                              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                CPF incompleto
                              </p>
                            );
                          }
                          if (digits.length > 11 && digits.length < 14) {
                            return (
                              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                CNPJ incompleto
                              </p>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      <div className="col-span-2">
                        <Label>Chave PIX</Label>
                        <Input
                          value={selectedAffiliate.pix_key || ''}
                          onChange={(e) => setSelectedAffiliate({ ...selectedAffiliate, pix_key: e.target.value })}
                          onBlur={async () => {
                            await updateAffiliate(selectedAffiliate.id, { pix_key: selectedAffiliate.pix_key });
                          }}
                          placeholder="CPF, CNPJ, Email, Telefone ou Chave Aleatória"
                        />
                        {selectedAffiliate.pix_key && (() => {
                          const validation = validatePixKey(selectedAffiliate.pix_key);
                          if (validation.type === 'invalid') {
                            return (
                              <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                                <XCircle className="h-3 w-3" />
                                {validation.message}
                              </p>
                            );
                          }
                          if (validation.type !== 'empty') {
                            return (
                              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                {validation.message}
                              </p>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Seção Comissão Padrão */}
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader className="py-2 px-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-primary" />
                        <CardTitle className="text-sm">Comissão Padrão</CardTitle>
                      </div>
                      <Switch
                        checked={defaultCommissionEnabled}
                        onCheckedChange={setDefaultCommissionEnabled}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {defaultCommissionEnabled 
                        ? 'Aplicada a produtos sem regra específica'
                        : 'Desativada'}
                    </p>
                  </CardHeader>
                  
                  {defaultCommissionEnabled && (
                    <CardContent className="pt-0 px-3 pb-3 space-y-2">
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Label className="text-xs">Tipo</Label>
                          <Select
                            value={defaultCommissionType}
                            onValueChange={(v) => setDefaultCommissionType(v as 'percentage' | 'fixed')}
                          >
                            <SelectTrigger className="h-8 mt-1 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="percentage">
                                <span className="text-xs">Porcentagem (%)</span>
                              </SelectItem>
                              <SelectItem value="fixed">
                                <span className="text-xs">Valor Fixo (R$)</span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="flex-1">
                          <Label className="text-xs">
                            Valor {defaultCommissionType === 'percentage' ? '(%)' : '(R$)'}
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            step={defaultCommissionType === 'percentage' ? '0.5' : '0.01'}
                            max={defaultCommissionType === 'percentage' ? '100' : undefined}
                            value={defaultCommissionValue}
                            onChange={(e) => {
                              setDefaultCommissionValue(Number(e.target.value));
                              setDefaultCommissionValueError(false);
                            }}
                            className={`h-8 mt-1 text-xs ${
                              defaultCommissionValueError 
                                ? 'border-destructive ring-2 ring-destructive/50' 
                                : ''
                            }`}
                            placeholder={defaultCommissionType === 'percentage' ? '10' : '5.00'}
                          />
                        </div>
                        
                        <Button 
                          onClick={handleSaveDefaultCommission}
                          disabled={savingDefaultCommission}
                          size="sm"
                          className="self-end h-8"
                        >
                          {savingDefaultCommission ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                      
                      {/* Overview Stats - compact */}
                      <div className="flex items-center justify-between text-xs p-2 bg-background rounded border">
                        <div className="text-center">
                          <span className="font-bold text-primary">{products.length}</span>
                          <span className="text-muted-foreground ml-1">Total</span>
                        </div>
                        <div className="text-center border-x px-3">
                          <span className="font-bold text-amber-600">{commissionRules.length}</span>
                          <span className="text-muted-foreground ml-1">Específica</span>
                        </div>
                        <div className="text-center">
                          <span className="font-bold text-emerald-600">{Math.max(0, products.length - commissionRules.length)}</span>
                          <span className="text-muted-foreground ml-1">Padrão</span>
                        </div>
                      </div>
                    </CardContent>
                  )}
                  
                  {!defaultCommissionEnabled && (
                    <CardContent className="py-2 px-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <AlertCircle className="h-4 w-4" />
                        <span>Ative para aplicar comissão em produtos sem regra específica</span>
                      </div>
                    </CardContent>
                  )}
                </Card>
              </TabsContent>
              
              {/* Aba Cupons */}
              <TabsContent value="cupons" className="flex-1 overflow-auto mt-4 space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Tag className="h-5 w-5 text-primary" />
                        <CardTitle className="text-base">Cupons Vinculados</CardTitle>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => {
                        setEditingCouponId(null);
                        setNewCouponData({
                          code: '',
                          discount_type: 'percentage',
                          discount_value: 0,
                          min_order_value: 0,
                          max_uses: null,
                          valid_from: new Date().toISOString().split('T')[0],
                          valid_until: '',
                          applies_to: 'all',
                          category_names: [],
                          product_ids: [],
                        });
                        setCouponDiscountRules([]);
                        setCouponCategoryRules([]);
                        setNewCouponDialogOpen(true);
                      }}>
                        <Plus className="h-4 w-4 mr-1" />
                        Novo Cupom
                      </Button>
                    </div>
                    <CardDescription>
                      Cupons de desconto vinculados a este afiliado
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {availableCoupons.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground">
                          Nenhum cupom disponível
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                          {availableCoupons.map((coupon) => {
                            const linkedCouponIds = selectedAffiliate?.affiliate_coupons?.map(ac => ac.coupon_id) || [];
                            const isLinked = linkedCouponIds.includes(coupon.id);
                            return (
                              <div 
                                key={coupon.id} 
                                className={`flex items-center justify-between p-3 border rounded-lg ${isLinked ? 'border-primary/50 bg-primary/5' : ''}`}
                              >
                                <div className="flex items-center gap-3">
                                  {isLinked ? (
                                    <div className="flex items-center justify-center h-4 w-4 text-primary" title="Cupom vinculado permanentemente">
                                      <Lock className="h-4 w-4" />
                                    </div>
                                  ) : (
                                    <Checkbox
                                      id={`detail-coupon-${coupon.id}`}
                                      checked={false}
                                      onCheckedChange={async (checked) => {
                                        if (!selectedAffiliate || !checked) return;
                                        const currentIds = selectedAffiliate?.affiliate_coupons?.map(ac => ac.coupon_id) || [];
                                        const newCouponIds = [...currentIds, coupon.id];
                                        
                                        await updateAffiliate(selectedAffiliate.id, { coupon_ids: newCouponIds });
                                        
                                        // Update local state with new affiliate_coupons structure
                                        const newAffiliateCoupons = newCouponIds.map(id => {
                                          const existingCoupon = availableCoupons.find(c => c.id === id);
                                          return {
                                            coupon_id: id,
                                            coupon: existingCoupon ? {
                                              id: existingCoupon.id,
                                              code: existingCoupon.code,
                                              discount_type: existingCoupon.discount_type,
                                              discount_value: existingCoupon.discount_value,
                                            } : { id, code: '', discount_type: 'percentage', discount_value: 0 }
                                          };
                                        });
                                        
                                        setSelectedAffiliate({ 
                                          ...selectedAffiliate, 
                                          affiliate_coupons: newAffiliateCoupons 
                                        });
                                        
                                        toast({
                                          title: 'Cupom vinculado',
                                          description: `${coupon.code} foi vinculado ao afiliado.`,
                                        });
                                      }}
                                    />
                                  )}
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium">{coupon.code}</p>
                                      <Badge 
                                        variant={coupon.is_active ? "default" : "destructive"}
                                        className={coupon.is_active ? "bg-green-600 text-white text-xs" : "text-xs"}
                                      >
                                        {coupon.is_active ? "Ativo" : "Inativo"}
                                      </Badge>
                                      {isLinked && (
                                        <Badge variant="secondary" className="text-xs">
                                          Permanente
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                      {coupon.discount_type === 'percentage' 
                                        ? `${coupon.discount_value}% de desconto` 
                                        : `${formatCurrency(coupon.discount_value)} de desconto`}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8"
                                    onClick={async () => {
                                      setEditingCouponId(coupon.id);
                                      setNewCouponData({
                                        code: coupon.code,
                                        discount_type: coupon.discount_type as 'percentage' | 'fixed',
                                        discount_value: coupon.discount_value,
                                        min_order_value: coupon.min_order_value || 0,
                                        max_uses: coupon.max_uses || null,
                                        valid_from: coupon.valid_from ? new Date(coupon.valid_from).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                                        valid_until: coupon.valid_until ? new Date(coupon.valid_until).toISOString().split('T')[0] : '',
                                        applies_to: (coupon as any).applies_to || 'all',
                                        category_names: (coupon as any).category_names || [],
                                        product_ids: (coupon as any).product_ids || [],
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
                                      } else {
                                        setCouponDiscountRules([]);
                                        setCouponCategoryRules([]);
                                      }
                                      
                                      setNewCouponDialogOpen(true);
                                    }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Badge variant={isLinked ? 'default' : 'outline'}>
                                    {isLinked ? 'Vinculado' : 'Não vinculado'}
                                  </Badge>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Aba Regras Específicas */}
              <TabsContent value="regras-especificas" className="flex-1 overflow-auto mt-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Regras Específicas
                      </CardTitle>
                      <CardDescription>
                        Regras que sobrescrevem a comissão padrão para produtos específicos
                      </CardDescription>
                    </div>
                    <Button size="sm" onClick={() => setRuleDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar Regra
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {/* Search and Actions Bar */}
                    <div className="flex flex-col sm:flex-row gap-3 mb-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Pesquisar por código interno, externo ou nome..."
                          value={rulesSearchTerm}
                          onChange={(e) => setRulesSearchTerm(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                      {selectedRuleIds.size > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground whitespace-nowrap">
                            {selectedRuleIds.size} selecionado(s)
                          </span>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={async () => {
                              const idsToDelete = Array.from(selectedRuleIds);
                              for (const id of idsToDelete) {
                                await handleDeleteRule(id);
                              }
                              setSelectedRuleIds(new Set());
                              toast({
                                title: "Regras excluídas",
                                description: `${idsToDelete.length} regra(s) excluída(s) com sucesso.`,
                              });
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Excluir Selecionados
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedRuleIds(new Set())}
                          >
                            Limpar Seleção
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Grouped Rules by Category */}
                    {(() => {
                      // Create product map to get category
                      const productMap = new Map(products.map(p => [p.id, p]));
                      
                      // Helper to get category for a rule
                      const getRuleCategory = (rule: typeof commissionRules[0]) => {
                        if (rule.product_id) {
                          const product = productMap.get(rule.product_id);
                          return product?.category || 'Sem Categoria';
                        }
                        return 'Sem Categoria';
                      };
                      
                      // Filter rules by search term
                      const filteredRules = commissionRules.filter(rule => {
                        const productCategory = getRuleCategory(rule);
                        const searchLower = rulesSearchTerm.toLowerCase();
                        return rule.product?.name?.toLowerCase().includes(searchLower) ||
                          rule.product?.short_id?.toLowerCase().includes(searchLower) ||
                          rule.product?.external_code?.toLowerCase().includes(searchLower) ||
                          productCategory.toLowerCase().includes(searchLower);
                      });

                      // Group by category
                      const groupedRules = filteredRules.reduce((acc, rule) => {
                        const category = getRuleCategory(rule);
                        if (!acc[category]) acc[category] = [];
                        acc[category].push(rule);
                        return acc;
                      }, {} as Record<string, typeof commissionRules>);

                      const categoryNames = Object.keys(groupedRules).sort();

                      if (categoryNames.length === 0) {
                        return (
                          <p className="text-sm text-muted-foreground text-center py-8">
                            {rulesSearchTerm 
                              ? 'Nenhuma regra encontrada para a busca'
                              : 'Nenhuma regra de comissão específica configurada'}
                          </p>
                        );
                      }

                      return (
                        <div className="space-y-3">
                          {/* Select All */}
                          <div className="flex items-center gap-2 pb-2 border-b">
                            <Checkbox
                              checked={filteredRules.length > 0 && filteredRules.every(r => selectedRuleIds.has(r.id))}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedRuleIds(new Set(filteredRules.map(r => r.id)));
                                } else {
                                  setSelectedRuleIds(new Set());
                                }
                              }}
                            />
                            <span className="text-sm font-medium">Selecionar todos ({filteredRules.length})</span>
                          </div>

                          {categoryNames.map((category) => {
                            const categoryRules = groupedRules[category];
                            const isCollapsed = collapsedRuleCategories.has(category);
                            const allSelected = categoryRules.every(r => selectedRuleIds.has(r.id));
                            const someSelected = categoryRules.some(r => selectedRuleIds.has(r.id));

                            return (
                              <div key={category} className="border rounded-lg overflow-hidden">
                                {/* Category Header */}
                                <div
                                  className="flex items-center gap-2 p-3 bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors"
                                  onClick={(e) => {
                                    if ((e.target as HTMLElement).closest('[data-checkbox]')) return;
                                    setCollapsedRuleCategories(prev => {
                                      const next = new Set(prev);
                                      if (next.has(category)) {
                                        next.delete(category);
                                      } else {
                                        next.add(category);
                                      }
                                      return next;
                                    });
                                  }}
                                >
                                  <div data-checkbox onClick={(e) => e.stopPropagation()}>
                                    <Checkbox
                                      checked={allSelected}
                                      onCheckedChange={(checked) => {
                                        setSelectedRuleIds(prev => {
                                          const next = new Set(prev);
                                          categoryRules.forEach(r => {
                                            if (checked) {
                                              next.add(r.id);
                                            } else {
                                              next.delete(r.id);
                                            }
                                          });
                                          return next;
                                        });
                                      }}
                                      className={someSelected && !allSelected ? 'data-[state=checked]:bg-primary/50' : ''}
                                    />
                                  </div>
                                  {isCollapsed ? (
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  )}
                                  <Package className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium flex-1">{category}</span>
                                  <Badge variant="secondary" className="text-xs">
                                    {categoryRules.length} {categoryRules.length === 1 ? 'regra' : 'regras'}
                                  </Badge>
                                  {someSelected && (
                                    <Badge variant="outline" className="text-xs">
                                      {categoryRules.filter(r => selectedRuleIds.has(r.id)).length} selecionado(s)
                                    </Badge>
                                  )}
                                </div>

                                {/* Category Rules */}
                                {!isCollapsed && (
                                  <div className="divide-y">
                                    {categoryRules.map((rule) => (
                                      <div
                                        key={rule.id}
                                        className={`flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors ${
                                          selectedRuleIds.has(rule.id) ? 'bg-primary/5' : ''
                                        }`}
                                      >
                                        <Checkbox
                                          checked={selectedRuleIds.has(rule.id)}
                                          onCheckedChange={(checked) => {
                                            setSelectedRuleIds(prev => {
                                              const next = new Set(prev);
                                              if (checked) {
                                                next.add(rule.id);
                                              } else {
                                                next.delete(rule.id);
                                              }
                                              return next;
                                            });
                                          }}
                                        />
                                        <div className="flex-1 min-w-0">
                                          <span className="text-sm truncate block">
                                            {rule.product?.name || 'Produto'}
                                          </span>
                                          {(rule.product?.short_id || rule.product?.external_code) && (
                                            <div className="flex items-center gap-2 mt-0.5">
                                              {rule.product?.short_id && (
                                                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                  ID: {rule.product.short_id}
                                                </span>
                                              )}
                                              {rule.product?.external_code && (
                                                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                  Ext: {rule.product.external_code}
                                                </span>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                        
                                        {/* Modo de Edição ou Visualização */}
                                        {editingRuleId === rule.id ? (
                                          <div className="flex items-center gap-2">
                                            <Input
                                              type="number"
                                              value={editingRuleValue}
                                              onChange={(e) => setEditingRuleValue(Number(e.target.value))}
                                              className="w-20 h-8 text-sm"
                                              min={0}
                                              step={editingRuleType === 'percentage' ? 1 : 0.01}
                                            />
                                            <Select
                                              value={editingRuleType}
                                              onValueChange={(v) => setEditingRuleType(v as 'percentage' | 'fixed')}
                                            >
                                              <SelectTrigger className="w-16 h-8">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="percentage">%</SelectItem>
                                                <SelectItem value="fixed">R$</SelectItem>
                                              </SelectContent>
                                            </Select>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-8 text-green-600"
                                              onClick={() => handleSaveRuleEdit(rule.id)}
                                            >
                                              <Save className="h-4 w-4 mr-1" />
                                              Salvar
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-8 w-8"
                                              onClick={() => setEditingRuleId(null)}
                                            >
                                              <X className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        ) : (
                                          <>
                                            <Badge variant="outline" className="shrink-0">
                                              {rule.commission_type === 'percentage'
                                                ? `${rule.commission_value}%`
                                                : formatCurrency(rule.commission_value)}
                                            </Badge>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-8 w-8 text-muted-foreground hover:text-primary shrink-0"
                                              onClick={() => {
                                                setEditingRuleId(rule.id);
                                                setEditingRuleValue(rule.commission_value);
                                                setEditingRuleType(rule.commission_type as 'percentage' | 'fixed');
                                              }}
                                            >
                                              <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-8 w-8 text-destructive shrink-0"
                                              onClick={() => handleDeleteRule(rule.id)}
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </>
                                        )}
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
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Aba Histórico */}
              <TabsContent value="historico" className="flex-1 overflow-auto mt-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Histórico de Comissões</CardTitle>
                      <CardDescription>Todas as comissões geradas</CardDescription>
                    </div>
                    <Button size="sm" onClick={() => setPaymentDialogOpen(true)}>
                      <CreditCard className="h-4 w-4 mr-1" />
                      Registrar Pagamento
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[400px] overflow-auto">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Pedido</TableHead>
                              <TableHead>Data</TableHead>
                              <TableHead>Valor Venda</TableHead>
                              <TableHead>Comissão</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Ações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {affiliateEarnings.map((earning) => (
                              <TableRow key={earning.id}>
                                <TableCell className="font-mono text-sm">
                                  #{earning.order?.order_number || '-'}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {format(new Date(earning.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                                </TableCell>
                                <TableCell>{formatCurrency(earning.order_total)}</TableCell>
                                <TableCell className="font-semibold text-green-600">
                                  {formatCurrency(earning.commission_amount)}
                                </TableCell>
                                <TableCell>{getStatusBadge(earning.status)}</TableCell>
                                <TableCell>
                                  <Select
                                    value={earning.status}
                                    onValueChange={(value) => updateEarningStatus(earning.id, value as any)}
                                  >
                                    <SelectTrigger className="w-[120px] h-8">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="pending">Pendente</SelectItem>
                                      <SelectItem value="approved">Aprovada</SelectItem>
                                      <SelectItem value="paid">Paga</SelectItem>
                                      <SelectItem value="cancelled">Cancelada</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                              </TableRow>
                            ))}
                            {affiliateEarnings.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                  Nenhuma comissão registrada
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
          
          <ResponsiveDialogFooter>
            <Button variant="outline" onClick={() => handleShowInviteLink(selectedAffiliate!)}>
              <Link2 className="h-4 w-4 mr-1" />
              Link de Convite
            </Button>
            <Button onClick={() => setDetailsModalOpen(false)}>
              Fechar
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Dialog: Adicionar Regra de Comissão - Movido para o final para ficar acima do modal de detalhes */}
      <Dialog open={ruleDialogOpen} onOpenChange={(open) => {
        setRuleDialogOpen(open);
        if (!open) {
          setRuleFormData({
            commission_type: 'percentage',
            commission_value: 0,
            applies_to: 'product',
            product_ids: [],
          });
          setRuleProductSearch('');
        }
      }}>
        <DialogContent className="max-w-md h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Nova Regra de Comissão</DialogTitle>
            <DialogDescription>
              Defina a comissão e selecione os produtos.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Commission Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Comissão</Label>
                <Select
                  value={ruleFormData.commission_type}
                  onValueChange={(value: 'percentage' | 'fixed') => setRuleFormData({ ...ruleFormData, commission_type: value })}
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
              <div className="space-y-2">
                <Label>Valor</Label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={ruleFormData.commission_value}
                    onChange={(e) => {
                      setRuleFormData({ ...ruleFormData, commission_value: Number(e.target.value) });
                      setCommissionValueError(false);
                    }}
                    className={`pr-8 transition-all ${
                      commissionValueError 
                        ? 'border-destructive ring-2 ring-destructive/50 animate-pulse' 
                        : ''
                    }`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    {ruleFormData.commission_type === 'percentage' ? '%' : 'R$'}
                  </span>
                </div>
                {commissionValueError && (
                  <p className="text-xs text-destructive animate-pulse">Digite o valor da comissão</p>
                )}
              </div>
            </div>

            {/* Product Selection Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Produtos</Label>
                <span className="text-sm text-muted-foreground">
                  {ruleFormData.product_ids.length} selecionado(s)
                </span>
              </div>
              
              {/* Button to open product selection modal */}
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start h-auto min-h-10 py-2"
                onClick={() => setRuleProductsModalOpen(true)}
              >
                <Package className="h-4 w-4 mr-2 shrink-0" />
                <span className="truncate">
                  {ruleFormData.product_ids.length === 0 
                    ? 'Selecionar produtos...' 
                    : `${ruleFormData.product_ids.length} produto(s) selecionado(s)`}
                </span>
              </Button>

              {/* Selected Products Badges */}
              {ruleFormData.product_ids.length > 0 && (
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-muted/50 rounded-md">
                  {ruleFormData.product_ids.map((productId) => {
                    const product = products.find(p => p.id === productId);
                    return (
                      <Badge 
                        key={productId} 
                        variant="secondary" 
                        className="text-xs flex items-center gap-1 pr-1"
                      >
                        {product?.name || 'Produto'}
                        <button
                          type="button"
                          onClick={() => setRuleFormData({
                            ...ruleFormData,
                            product_ids: ruleFormData.product_ids.filter(id => id !== productId)
                          })}
                          className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                        >
                          <XCircle className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Info Message */}
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-md text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>A mesma comissão será aplicada a todos os produtos selecionados.</span>
            </div>
          </div>
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setRuleDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAddRule}
              disabled={ruleFormData.product_ids.length === 0}
            >
              <Plus className="h-4 w-4 mr-1" />
              Adicionar {ruleFormData.product_ids.length > 0 && `(${ruleFormData.product_ids.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Selecionar Produtos para Regra de Comissão */}
      <Dialog open={ruleProductsModalOpen} onOpenChange={setRuleProductsModalOpen}>
        <DialogContent className="max-w-2xl h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Selecionar Produtos</DialogTitle>
            <DialogDescription>
              Escolha os produtos que receberão a regra de comissão.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={ruleProductSearch}
                onChange={(e) => setRuleProductSearch(e.target.value)}
                placeholder="Buscar por nome, código interno ou externo..."
                className="pl-9"
              />
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const allProductIds = filteredRuleProducts
                      .filter(p => !commissionRules.some(r => r.product_id === p.id))
                      .map(p => p.id);
                    setRuleFormData({ ...ruleFormData, product_ids: allProductIds });
                  }}
                >
                  <Check className="h-3.5 w-3.5 mr-1" />
                  Selecionar Todos
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRuleFormData({ ...ruleFormData, product_ids: [] })}
                >
                  <XCircle className="h-3.5 w-3.5 mr-1" />
                  Limpar
                </Button>
              </div>
              <span className="text-sm text-muted-foreground">
                {ruleFormData.product_ids.length} selecionado(s)
              </span>
            </div>

            {/* Products List by Category */}
            <ScrollArea className="flex-1 border rounded-md">
              <div className="p-2 space-y-3">
                {filteredRuleProducts.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhum produto encontrado</p>
                  </div>
                ) : (
                  // Group products by category
                  (() => {
                    const productsByCategory = filteredRuleProducts.reduce((acc, product) => {
                      const category = product.category || 'Sem Categoria';
                      if (!acc[category]) {
                        acc[category] = [];
                      }
                      acc[category].push(product);
                      return acc;
                    }, {} as Record<string, typeof filteredRuleProducts>);

                    return Object.entries(productsByCategory).map(([category, categoryProducts]) => {
                      const selectableProducts = categoryProducts.filter(p => !commissionRules.some(r => r.product_id === p.id));
                      const selectedInCategory = categoryProducts.filter(p => ruleFormData.product_ids.includes(p.id)).length;
                      const allSelectableSelected = selectableProducts.length > 0 && selectableProducts.every(p => ruleFormData.product_ids.includes(p.id));

                      return (
                        <div key={category} className="border rounded-lg overflow-hidden">
                          {/* Category Header */}
                          <div 
                            className="flex items-center gap-3 p-3 bg-muted/50 border-b cursor-pointer"
                            onClick={() => {
                              setCollapsedCategories(prev => {
                                const newSet = new Set(prev);
                                if (newSet.has(category)) {
                                  newSet.delete(category);
                                } else {
                                  newSet.add(category);
                                }
                                return newSet;
                              });
                            }}
                          >
                            <button
                              type="button"
                              className="p-0.5 hover:bg-muted rounded transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCollapsedCategories(prev => {
                                  const newSet = new Set(prev);
                                  if (newSet.has(category)) {
                                    newSet.delete(category);
                                  } else {
                                    newSet.add(category);
                                  }
                                  return newSet;
                                });
                              }}
                            >
                              {collapsedCategories.has(category) ? (
                                <ChevronRight className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>
                            <Checkbox
                              checked={allSelectableSelected}
                              disabled={selectableProducts.length === 0}
                              onClick={(e) => e.stopPropagation()}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  const newIds = [...new Set([...ruleFormData.product_ids, ...selectableProducts.map(p => p.id)])];
                                  setRuleFormData({ ...ruleFormData, product_ids: newIds });
                                } else {
                                  const categoryIds = categoryProducts.map(p => p.id);
                                  setRuleFormData({
                                    ...ruleFormData,
                                    product_ids: ruleFormData.product_ids.filter(id => !categoryIds.includes(id))
                                  });
                                }
                              }}
                            />
                            <div className="flex-1 flex items-center justify-between">
                              <span className="font-semibold text-sm">{category}</span>
                              <Badge variant="secondary" className="text-xs">
                                {selectedInCategory}/{categoryProducts.length} selecionados
                              </Badge>
                            </div>
                          </div>
                          
                          {/* Category Products */}
                          {!collapsedCategories.has(category) && (
                            <div className="p-1.5 space-y-0.5">
                              {categoryProducts.map((product) => {
                                const isSelected = ruleFormData.product_ids.includes(product.id);
                                const hasExistingRule = commissionRules.some(r => r.product_id === product.id);
                                
                                return (
                                  <label
                                    key={product.id}
                                    className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                                      isSelected 
                                        ? 'bg-primary/10 border border-primary/30' 
                                        : 'hover:bg-muted/50 border border-transparent'
                                    } ${hasExistingRule ? 'opacity-50' : ''}`}
                                  >
                                    <Checkbox
                                      checked={isSelected}
                                      disabled={hasExistingRule}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setRuleFormData({
                                            ...ruleFormData,
                                            product_ids: [...ruleFormData.product_ids, product.id]
                                          });
                                        } else {
                                          setRuleFormData({
                                            ...ruleFormData,
                                            product_ids: ruleFormData.product_ids.filter(id => id !== product.id)
                                          });
                                        }
                                      }}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm truncate">{product.name}</span>
                                        {hasExistingRule && (
                                          <Badge variant="outline" className="text-xs">Já tem regra</Badge>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        {product.external_code && <span>Cód: {product.external_code}</span>}
                                        {product.external_code && product.short_id && <span>•</span>}
                                        {product.short_id && <span>ID: {product.short_id}</span>}
                                        <span>•</span>
                                        <span className="font-medium text-foreground">
                                          R$ {(product.promotional_price || product.price).toFixed(2)}
                                        </span>
                                      </div>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()
                )}
              </div>
            </ScrollArea>
          </div>
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setRuleProductsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setRuleProductsModalOpen(false)}>
              <Check className="h-4 w-4 mr-1" />
              Confirmar ({ruleFormData.product_ids.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog: Confirmar Ativação/Inativação de Afiliado */}
      <AlertDialog open={!!toggleStatusAffiliate} onOpenChange={(open) => !open && setToggleStatusAffiliate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggleStatusAffiliate?.is_active ? 'Inativar afiliado?' : 'Ativar afiliado?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggleStatusAffiliate?.is_active 
                ? `Deseja inativar o afiliado "${toggleStatusAffiliate?.name}"? Ele não receberá mais comissões enquanto estiver inativo.`
                : `Deseja ativar o afiliado "${toggleStatusAffiliate?.name}"? Ele voltará a receber comissões normalmente.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className={toggleStatusAffiliate?.is_active ? "bg-destructive hover:bg-destructive/90" : "bg-green-600 hover:bg-green-700"}
              onClick={() => {
                if (toggleStatusAffiliate) {
                  toggleAffiliateStatus(toggleStatusAffiliate.id, !toggleStatusAffiliate.is_active);
                  setToggleStatusAffiliate(null);
                }
              }}
            >
              {toggleStatusAffiliate?.is_active ? 'Inativar' : 'Ativar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog: Novo/Editar Cupom (independente) */}
      <Dialog open={newCouponDialogOpen} onOpenChange={(open) => {
        setNewCouponDialogOpen(open);
        if (!open) {
          setEditingCouponId(null);
          setNewCouponData({
            code: '',
            discount_type: 'percentage',
            discount_value: 0,
            min_order_value: 0,
            max_uses: null,
            valid_from: new Date().toISOString().split('T')[0],
            valid_until: '',
            applies_to: 'all',
            category_names: [],
            product_ids: [],
          });
          setCouponDiscountRules([]);
          setCouponCategoryRules([]);
        }
      }}>
        <DialogContent className="w-[95vw] max-w-[600px] glass max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow shrink-0">
                <Tag className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-xl gradient-text">
                  {editingCouponId ? 'Editar Cupom' : 'Criar Novo Cupom'}
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  Configure os detalhes do cupom de desconto
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <Tabs defaultValue="geral" className="flex-1 overflow-hidden flex flex-col mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="geral" className="text-xs sm:text-sm">Configurações</TabsTrigger>
              <TabsTrigger value="regras" className="text-xs sm:text-sm">Regras de Desconto</TabsTrigger>
            </TabsList>

            <TabsContent value="geral" className="flex-1 overflow-auto mt-4">
              <ScrollArea className="h-[calc(60vh-120px)] pr-4">
                <div className="grid gap-4 py-2">
                  <div className="grid gap-2">
                    <Label>Código do Cupom *</Label>
                    <Input
                      value={newCouponData.code}
                      onChange={(e) => setNewCouponData({ ...newCouponData, code: e.target.value.toUpperCase() })}
                      placeholder="Ex: PROMO10"
                      maxLength={20}
                      disabled={!!editingCouponId}
                    />
                    <p className="text-xs text-muted-foreground">Apenas letras maiúsculas e números</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label className="text-xs sm:text-sm">Tipo de Desconto Padrão *</Label>
                      <Select
                        value={newCouponData.discount_type}
                        onValueChange={(value: 'percentage' | 'fixed') => setNewCouponData({ ...newCouponData, discount_type: value })}
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
                      <Label className="text-xs sm:text-sm">
                        Valor Padrão {newCouponData.discount_type === 'percentage' ? '(%)' : '(R$)'} *
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={newCouponData.discount_value}
                        onChange={(e) => setNewCouponData({ ...newCouponData, discount_value: Number(e.target.value) })}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label className="text-xs sm:text-sm">Pedido Mínimo (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={newCouponData.min_order_value}
                        onChange={(e) => setNewCouponData({ ...newCouponData, min_order_value: Number(e.target.value) })}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label className="text-xs sm:text-sm">Usos Máximos</Label>
                      <Input
                        type="number"
                        value={newCouponData.max_uses || ''}
                        onChange={(e) => setNewCouponData({ ...newCouponData, max_uses: e.target.value ? Number(e.target.value) : null })}
                        placeholder="Ilimitado"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label className="text-xs sm:text-sm">Válido de *</Label>
                      <Input
                        type="date"
                        value={newCouponData.valid_from}
                        onChange={(e) => setNewCouponData({ ...newCouponData, valid_from: e.target.value })}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label className="text-xs sm:text-sm">Válido até</Label>
                      <Input
                        type="date"
                        value={newCouponData.valid_until}
                        onChange={(e) => setNewCouponData({ ...newCouponData, valid_until: e.target.value })}
                        min={newCouponData.valid_from}
                      />
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
                    O desconto padrão será aplicado a todos os produtos que não tiverem regras específicas configuradas na aba "Regras de Desconto".
                  </p>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="regras" className="flex-1 overflow-hidden mt-4">
              <div className="h-[calc(60vh-120px)] overflow-auto pr-2">
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4 text-primary shrink-0" />
                      <Label className="font-medium text-xs sm:text-sm">Regras Específicas de Desconto</Label>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        type="button" 
                        size="sm"
                        variant="outline"
                        className="text-xs px-2 sm:px-3"
                        onClick={() => setCouponCategoryRulesModalOpen(true)}
                      >
                        <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        Categoria
                      </Button>
                      <Button 
                        type="button" 
                        size="sm"
                        variant="outline"
                        className="text-xs px-2 sm:px-3"
                        onClick={() => setCouponRulesModalOpen(true)}
                      >
                        <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        Produto
                      </Button>
                    </div>
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    Defina descontos por categoria (novos produtos herdam automaticamente) ou por produto específico.
                  </p>
                  
                  {couponCategoryRules.length === 0 && couponDiscountRules.length === 0 ? (
                    <div className="text-center py-6 sm:py-8 text-muted-foreground text-xs sm:text-sm border rounded-md bg-muted/30">
                      Nenhuma regra específica. O desconto padrão será aplicado a todos os produtos.
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-auto border rounded-md">
                      <div className="divide-y">
                        {/* Regras por Categoria */}
                        {couponCategoryRules.map((rule) => {
                          const isEditing = editingCouponRuleCategoryName === rule.category_name;
                          const productsInCategory = products.filter(p => p.category === rule.category_name);
                          
                          return (
                            <div key={`cat-${rule.category_name}`} className="flex flex-col sm:flex-row sm:items-center gap-2 p-2 bg-primary/5">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="secondary" className="text-[10px] sm:text-xs shrink-0">Categoria</Badge>
                                  <span className="text-xs sm:text-sm font-medium break-words">{rule.category_name}</span>
                                </div>
                                <span className="text-[9px] sm:text-[10px] text-muted-foreground">
                                  {productsInCategory.length} produto(s) • Novos produtos herdam
                                </span>
                              </div>
                              
                              {isEditing ? (
                                <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                                  <Input
                                    type="number"
                                    value={editingCouponRuleValue}
                                    onChange={(e) => setEditingCouponRuleValue(Number(e.target.value))}
                                    className="w-14 sm:w-16 h-7 text-xs sm:text-sm"
                                    min={0}
                                  />
                                  <Select
                                    value={editingCouponRuleType}
                                    onValueChange={(v) => setEditingCouponRuleType(v as 'percentage' | 'fixed')}
                                  >
                                    <SelectTrigger className="w-12 sm:w-14 h-7 text-xs">
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
                                <div className="flex items-center gap-1 sm:gap-2 ml-auto sm:ml-0">
                                  <Badge variant="outline" className="shrink-0 text-[10px] sm:text-xs">
                                    {rule.discount_type === 'percentage' 
                                      ? `${rule.discount_value}%` 
                                      : `R$ ${rule.discount_value.toFixed(2)}`}
                                  </Badge>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 sm:h-7 sm:w-7 text-muted-foreground hover:text-primary"
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
                                    className="h-6 w-6 sm:h-7 sm:w-7 text-destructive"
                                    onClick={() => setCouponCategoryRules(rules => rules.filter(r => r.category_name !== rule.category_name))}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        
                        {/* Regras por Produto */}
                        {couponDiscountRules.map((rule) => {
                          const product = products.find(p => p.id === rule.product_id);
                          const isEditing = editingCouponRuleProductId === rule.product_id;
                          
                          return (
                            <div key={`prod-${rule.product_id}`} className="flex flex-col sm:flex-row sm:items-center gap-2 p-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="outline" className="text-[10px] sm:text-xs shrink-0">Produto</Badge>
                                  <span className="text-xs sm:text-sm font-medium truncate">{product?.name || 'Produto não encontrado'}</span>
                                </div>
                                {product && (
                                  <span className="text-[9px] sm:text-[10px] text-muted-foreground">
                                    {product.short_id && `#${product.short_id}`} {product.external_code && `• ${product.external_code}`}
                                  </span>
                                )}
                              </div>
                              
                              {isEditing ? (
                                <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                                  <Input
                                    type="number"
                                    value={editingCouponRuleValue}
                                    onChange={(e) => setEditingCouponRuleValue(Number(e.target.value))}
                                    className="w-14 sm:w-16 h-7 text-xs sm:text-sm"
                                    min={0}
                                  />
                                  <Select
                                    value={editingCouponRuleType}
                                    onValueChange={(v) => setEditingCouponRuleType(v as 'percentage' | 'fixed')}
                                  >
                                    <SelectTrigger className="w-12 sm:w-14 h-7 text-xs">
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
                                <div className="flex items-center gap-1 sm:gap-2 ml-auto sm:ml-0">
                                  <Badge variant="outline" className="shrink-0 text-[10px] sm:text-xs">
                                    {rule.discount_type === 'percentage' 
                                      ? `${rule.discount_value}%` 
                                      : `R$ ${rule.discount_value.toFixed(2)}`}
                                  </Badge>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 sm:h-7 sm:w-7 text-muted-foreground hover:text-primary"
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
                                    className="h-6 w-6 sm:h-7 sm:w-7 text-destructive"
                                    onClick={() => setCouponDiscountRules(rules => rules.filter(r => r.product_id !== rule.product_id))}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setNewCouponDialogOpen(false);
              setEditingCouponId(null);
              setNewCouponData({
                code: '',
                discount_type: 'percentage',
                discount_value: 0,
                min_order_value: 0,
                max_uses: null,
                valid_from: new Date().toISOString().split('T')[0],
                valid_until: '',
                applies_to: 'all',
                category_names: [],
                product_ids: [],
              });
              setCouponDiscountRules([]);
              setCouponCategoryRules([]);
            }}>
              Cancelar
            </Button>
            <Button onClick={handleSaveCoupon}>
              {editingCouponId ? 'Salvar' : 'Criar Cupom'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para adicionar regras por Categoria */}
      <Dialog open={couponCategoryRulesModalOpen} onOpenChange={(open) => {
        setCouponCategoryRulesModalOpen(open);
        if (open) {
          setEditingCouponRuleType(newCouponData.discount_type as 'percentage' | 'fixed');
          setEditingCouponRuleValue(newCouponData.discount_value || 0);
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
          setEditingCouponRuleType(newCouponData.discount_type as 'percentage' | 'fixed');
          setEditingCouponRuleValue(newCouponData.discount_value || 0);
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
                    const filteredProducts = products.filter(p => {
                      if (!couponRuleProductSearch.trim()) return true;
                      const search = couponRuleProductSearch.toLowerCase().trim();
                      return p.name?.toLowerCase().includes(search) ||
                        p.short_id?.toLowerCase().includes(search) ||
                        p.external_code?.toLowerCase().includes(search);
                    });
                    const allProductIds = filteredProducts
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
                const filteredProducts = products.filter(p => {
                  if (!couponRuleProductSearch.trim()) return true;
                  const search = couponRuleProductSearch.toLowerCase().trim();
                  return p.name?.toLowerCase().includes(search) ||
                    p.short_id?.toLowerCase().includes(search) ||
                    p.external_code?.toLowerCase().includes(search);
                });
                const availableProducts = filteredProducts.filter(p => !existingIds.has(p.id));

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
    </div>
  );
};
