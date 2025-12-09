import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAffiliateAuth, AffiliateOrderItem, AffiliateOrder } from '@/hooks/useAffiliateAuth';
import { useAffiliateEarningsNotification } from '@/hooks/useAffiliateEarningsNotification';
import { useAffiliateOrderStatusNotification } from '@/hooks/useAffiliateOrderStatusNotification';
import { useWithdrawalNotification } from '@/hooks/useWithdrawalNotification';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollableTable } from '@/components/ui/scrollable-table';
import { AffiliateDashboardSidebar } from '@/components/dashboard/AffiliateDashboardSidebar';
import { AffiliateDashboardBottomNav } from '@/components/dashboard/AffiliateDashboardBottomNav';
import { RequestWithdrawalDialog } from '@/components/dashboard/RequestWithdrawalDialog';
import { AffiliateWithdrawalHistory } from '@/components/dashboard/AffiliateWithdrawalHistory';
import { AffiliatePendingInvites } from '@/components/dashboard/AffiliatePendingInvites';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AffiliateStoreProductsTab } from '@/components/dashboard/AffiliateStoreProductsTab';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogDescription, ResponsiveDialogFooter } from '@/components/ui/responsive-dialog';
import { Users, DollarSign, Store, TrendingUp, Copy, LogOut, Loader2, Clock, CheckCircle, Building2, Wallet, BarChart3, User, Link, Ticket, ShoppingBag, Package, Target, Ban, Calculator, Home, ExternalLink, ChevronRight, Grid3X3, X, Calendar as CalendarIcon, Filter, ChevronDown, XCircle } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';

// Cores para gráfico de pizza
const COLORS = ['hsl(var(--primary))', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
export default function AffiliateDashboardNew() {
  const {
    affiliateUser,
    affiliateStores,
    affiliateStats,
    affiliateOrders,
    pendingInvites,
    isLoading,
    affiliateLogout,
    refreshData,
    fetchOrderItems,
    acceptInvite,
    rejectInvite
  } = useAffiliateAuth();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('home');
  const [selectedOrder, setSelectedOrder] = useState<AffiliateOrder | null>(null);
  const [orderModalItems, setOrderModalItems] = useState<AffiliateOrderItem[]>([]);
  const [loadingModalItems, setLoadingModalItems] = useState(false);

  // Store modal state
  const [selectedStore, setSelectedStore] = useState<typeof affiliateStores[0] | null>(null);

  // Withdrawal state
  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false);
  const [withdrawalStore, setWithdrawalStore] = useState<typeof affiliateStores[0] | null>(null);
  const [affiliateDbId, setAffiliateDbId] = useState<string | null>(null);
  const [withdrawalRequests, setWithdrawalRequests] = useState<any[]>([]);
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(false);

  // Buscar affiliate_id do banco
  useEffect(() => {
    const fetchAffiliateId = async () => {
      if (!affiliateUser?.email) return;
      const { data } = await supabase
        .from('affiliates')
        .select('id')
        .eq('email', affiliateUser.email)
        .limit(1)
        .maybeSingle();
      if (data) setAffiliateDbId(data.id);
    };
    fetchAffiliateId();
  }, [affiliateUser?.email]);

  // Buscar solicitações de saque
  const fetchWithdrawalRequests = useCallback(async () => {
    if (!affiliateDbId) return;
    setLoadingWithdrawals(true);
    try {
      const { data } = await supabase
        .from('affiliate_withdrawal_requests')
        .select(`
          *,
          stores!inner(name)
        `)
        .eq('affiliate_id', affiliateDbId)
        .order('requested_at', { ascending: false });
      
      const formatted = (data || []).map((req: any) => ({
        ...req,
        store_name: req.stores?.name,
      }));
      setWithdrawalRequests(formatted);
    } catch (err) {
      console.error('Erro ao buscar saques:', err);
    } finally {
      setLoadingWithdrawals(false);
    }
  }, [affiliateDbId]);

  useEffect(() => {
    if (affiliateDbId) {
      fetchWithdrawalRequests();
    }
  }, [affiliateDbId, fetchWithdrawalRequests]);

  // Criar solicitação de saque
  const handleCreateWithdrawal = async (data: {
    affiliate_id: string;
    store_affiliate_id?: string;
    store_id: string;
    amount: number;
    pix_key?: string;
    notes?: string;
  }) => {
    try {
      // Verificar se já existe pendente
      const { data: existing } = await supabase
        .from('affiliate_withdrawal_requests')
        .select('id')
        .eq('affiliate_id', data.affiliate_id)
        .eq('store_id', data.store_id)
        .eq('status', 'pending')
        .maybeSingle();

      if (existing) {
        toast.error('Já existe uma solicitação pendente para esta loja');
        return null;
      }

      const { data: newRequest, error } = await supabase
        .from('affiliate_withdrawal_requests')
        .insert({
          affiliate_id: data.affiliate_id,
          store_affiliate_id: data.store_affiliate_id || null,
          store_id: data.store_id,
          amount: data.amount,
          pix_key: data.pix_key || null,
          notes: data.notes || null,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Solicitação de saque enviada!');
      await fetchWithdrawalRequests();
      setWithdrawalDialogOpen(false);
      return newRequest;
    } catch (err: any) {
      console.error('Erro ao criar solicitação:', err);
      toast.error('Erro ao solicitar saque');
      return null;
    }
  };

  // Verificar se tem solicitação pendente para uma loja
  const hasPendingWithdrawal = (storeId: string) => {
    return withdrawalRequests.some(r => r.store_id === storeId && r.status === 'pending');
  };

  // Filter states
  const [periodFilter, setPeriodFilter] = useState<string>('all');
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [customDateRange, setCustomDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined
  });
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  // Extrair IDs dos store_affiliates para notificações em tempo real
  const storeAffiliateIds = useMemo(() => affiliateStores.map(s => s.store_affiliate_id).filter(Boolean), [affiliateStores]);

  // Hook de notificação de ganhos em tempo real
  const handleNewEarning = useCallback(() => {
    refreshData();
  }, [refreshData]);
  useAffiliateEarningsNotification({
    storeAffiliateIds,
    onNewEarning: handleNewEarning
  });

  // Extrair order_ids dos pedidos do afiliado para monitorar mudanças de status
  const affiliateOrderIds = useMemo(() => 
    affiliateOrders?.map(o => o.order_id).filter(Boolean) || [], 
    [affiliateOrders]
  );

  // Hook de notificação de mudança de status do pedido (atualiza dashboard quando lojista muda status)
  useAffiliateOrderStatusNotification({
    orderIds: affiliateOrderIds,
    onStatusChange: refreshData
  });

  // Hook de notificação de status de saque (notifica quando lojista aprova ou rejeita)
  useWithdrawalNotification({
    affiliateId: affiliateDbId,
    onStatusChange: fetchWithdrawalRequests
  });

  // Filtered orders based on period and store
  const filteredAffiliateOrders = useMemo(() => {
    if (!affiliateOrders || affiliateOrders.length === 0) return [];
    return affiliateOrders.filter(order => {
      const orderDate = new Date(order.order_date);
      const now = new Date();

      // Period filter
      let passesDateFilter = true;
      switch (periodFilter) {
        case 'today':
          passesDateFilter = isWithinInterval(orderDate, {
            start: startOfDay(now),
            end: endOfDay(now)
          });
          break;
        case '7days':
          passesDateFilter = isWithinInterval(orderDate, {
            start: startOfDay(subDays(now, 7)),
            end: endOfDay(now)
          });
          break;
        case 'week':
          passesDateFilter = isWithinInterval(orderDate, {
            start: startOfWeek(now, {
              locale: ptBR
            }),
            end: endOfWeek(now, {
              locale: ptBR
            })
          });
          break;
        case '30days':
          passesDateFilter = isWithinInterval(orderDate, {
            start: startOfDay(subDays(now, 30)),
            end: endOfDay(now)
          });
          break;
        case 'month':
          passesDateFilter = isWithinInterval(orderDate, {
            start: startOfMonth(now),
            end: endOfMonth(now)
          });
          break;
        case 'custom':
          if (customDateRange.from && customDateRange.to) {
            passesDateFilter = isWithinInterval(orderDate, {
              start: startOfDay(customDateRange.from),
              end: endOfDay(customDateRange.to)
            });
          }
          break;
        case 'all':
        default:
          passesDateFilter = true;
      }

      // Store filter
      let passesStoreFilter = true;
      if (storeFilter !== 'all') {
        passesStoreFilter = order.store_affiliate_id === storeFilter;
      }
      return passesDateFilter && passesStoreFilter;
    });
  }, [affiliateOrders, periodFilter, storeFilter, customDateRange]);

  // Filtered stats based on filtered orders - Baseado no status do PEDIDO (não da comissão)
  const filteredStats = useMemo(() => {
    // Pedidos válidos: não cancelados
    const validOrders = filteredAffiliateOrders.filter(
      order => order.order_status !== 'cancelado' && order.order_status !== 'cancelled'
    );
    
    // Pedidos cancelados
    const cancelledOrders = filteredAffiliateOrders.filter(
      order => order.order_status === 'cancelado' || order.order_status === 'cancelled'
    );
    
    const totalOrders = validOrders.length;
    const totalSales = validOrders.reduce((sum, order) => sum + (order.order_total || 0), 0);
    
    // Ganhos: SOMENTE pedidos ENTREGUES
    const earnedCommission = validOrders
      .filter(order => order.order_status === 'entregue' || order.order_status === 'delivered')
      .reduce((sum, order) => sum + (order.commission_amount || 0), 0);
    
    // Pendente: pedidos que NÃO são "entregue" nem "cancelado"
    const pendingCommission = validOrders
      .filter(order => {
        const status = order.order_status;
        return status !== 'entregue' && status !== 'delivered' && 
               status !== 'cancelado' && status !== 'cancelled';
      })
      .reduce((sum, order) => sum + (order.commission_amount || 0), 0);
    
    const cancelledCount = cancelledOrders.length;
    const cancelledCommission = cancelledOrders.reduce((sum, order) => sum + (order.commission_amount || 0), 0);
    
    return {
      total_orders: totalOrders,
      total_sales: totalSales,
      total_commission: earnedCommission, // Apenas entregues
      pending_commission: pendingCommission, // Em processamento
      paid_commission: earnedCommission, // Alias para compatibilidade
      cancelled_count: cancelledCount,
      cancelled_commission: cancelledCommission
    };
  }, [filteredAffiliateOrders]);

  // Dados para gráficos - Comissões ao longo do tempo (excluindo cancelados)
  const commissionsOverTime = useMemo(() => {
    if (!filteredAffiliateOrders || filteredAffiliateOrders.length === 0) return [];
    
    // Filtrar pedidos não cancelados para os gráficos
    const validOrdersForChart = filteredAffiliateOrders.filter(
      order => order.order_status !== 'cancelado' && order.order_status !== 'cancelled'
    );
    
    const ordersByDate: Record<string, {
      pedidos: number;
      comissao: number;
    }> = {};
    validOrdersForChart.forEach(order => {
      const date = format(new Date(order.order_date), 'dd/MM', {
        locale: ptBR
      });
      if (!ordersByDate[date]) {
        ordersByDate[date] = {
          pedidos: 0,
          comissao: 0
        };
      }
      ordersByDate[date].pedidos += 1;
      // Só somar comissão de pedidos entregues
      if (order.order_status === 'entregue' || order.order_status === 'delivered') {
        ordersByDate[date].comissao += order.commission_amount || 0;
      }
    });
    return Object.entries(ordersByDate).map(([date, data]) => ({
      date,
      ...data
    })).slice(-14); // Últimos 14 dias
  }, [filteredAffiliateOrders]);

  // Dados para gráfico de pizza - Comissões por loja (apenas pedidos entregues)
  const commissionsByStore = useMemo(() => {
    if (!filteredAffiliateOrders || filteredAffiliateOrders.length === 0) return [];
    
    // Filtrar apenas pedidos entregues para comissões
    const deliveredOrders = filteredAffiliateOrders.filter(
      order => order.order_status === 'entregue' || order.order_status === 'delivered'
    );
    
    const storeCommissions: Record<string, {
      name: string;
      value: number;
    }> = {};
    deliveredOrders.forEach(order => {
      const storeName = order.store_name || 'Loja';
      if (!storeCommissions[storeName]) {
        storeCommissions[storeName] = {
          name: storeName,
          value: 0
        };
      }
      storeCommissions[storeName].value += order.commission_amount || 0;
    });
    return Object.values(storeCommissions).filter(store => store.value > 0).sort((a, b) => b.value - a.value).slice(0, 6); // Top 6 lojas
  }, [filteredAffiliateOrders]);

  // Helper para obter badge de status do pedido
  const getOrderStatusBadge = (order: AffiliateOrder) => {
    const status = order.order_status;
    
    // Concluído: pedidos entregues
    if (status === 'entregue' || status === 'delivered') {
      return (
        <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
          <CheckCircle className="h-3 w-3 mr-1" /> Concluído
        </Badge>
      );
    }
    
    // Cancelado
    if (status === 'cancelado' || status === 'cancelled') {
      return (
        <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
          <Ban className="h-3 w-3 mr-1" /> Cancelado
        </Badge>
      );
    }
    
    // Pendente: todos os outros status
    return (
      <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
        <Clock className="h-3 w-3 mr-1" /> Pendente
      </Badge>
    );
  };

  // Helper para exibir ganhos condicionalmente baseado no status
  const getCommissionDisplay = (order: AffiliateOrder) => {
    const status = order.order_status;
    const isDelivered = status === 'entregue' || status === 'delivered';
    const isCancelled = status === 'cancelado' || status === 'cancelled';
    
    if (isDelivered) {
      return (
        <span className="font-semibold text-green-600">
          {formatCurrency(order.commission_amount)}
        </span>
      );
    }
    
    if (isCancelled) {
      return (
        <span className="text-muted-foreground line-through">
          {formatCurrency(order.commission_amount)}
        </span>
      );
    }
    
    // Pendente: mostrar valor em amarelo
    return (
      <span className="font-medium text-yellow-600">
        {formatCurrency(order.commission_amount)}
      </span>
    );
  };
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  const handleLogout = async () => {
    await affiliateLogout();
    toast.success('Logout realizado com sucesso');
  };
  const openOrderModal = async (order: AffiliateOrder) => {
    setSelectedOrder(order);
    setLoadingModalItems(true);
    setOrderModalItems([]);
    try {
      const items = await fetchOrderItems(order.order_id, order.store_affiliate_id || null);
      setOrderModalItems(items);
    } catch (err) {
      console.error('Erro ao carregar itens:', err);
      toast.error('Erro ao carregar itens do pedido');
    } finally {
      setLoadingModalItems(false);
    }
  };
  const closeOrderModal = () => {
    setSelectedOrder(null);
    setOrderModalItems([]);
  };

  // Calcula comissões canceladas por loja
  const getStoreCancelledCommission = useCallback((storeAffiliateId: string) => {
    return affiliateOrders
      .filter(order => 
        order.store_affiliate_id === storeAffiliateId && 
        (order.order_status === 'cancelado' || order.order_status === 'cancelled')
      )
      .reduce((sum, order) => sum + (order.commission_amount || 0), 0);
  }, [affiliateOrders]);

  // Renderiza o conteúdo das abas do modal da loja
  const renderStoreModalContent = (store: typeof affiliateStores[0]) => <Tabs defaultValue="overview" className="mt-4 flex-1 flex flex-col min-h-0 px-4">
      <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
        <TabsTrigger value="overview">Resumo</TabsTrigger>
        <TabsTrigger value="coupons">Cupons</TabsTrigger>
      </TabsList>
      
      {/* Tab Resumo */}
      <TabsContent value="overview" className="space-y-6 mt-4 flex-1 overflow-y-auto">
        {/* Stats */}
        <div className="grid grid-cols-2 xs:grid-cols-4 gap-2 sm:gap-3">
          <motion.div initial={{
          opacity: 0,
          y: 10
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: 0.1
        }} className="p-3 sm:p-4 bg-muted/50 rounded-lg border border-border/50 text-center">
            <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 mx-auto text-muted-foreground mb-1" />
            <p className="text-[10px] sm:text-xs text-muted-foreground">Total Vendas</p>
            <p className="font-bold text-sm sm:text-lg">{formatCurrency(store.total_sales)}</p>
          </motion.div>
          <motion.div initial={{
          opacity: 0,
          y: 10
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: 0.2
        }} className="p-3 sm:p-4 bg-green-500/10 rounded-lg border border-green-500/20 text-center">
            <Wallet className="h-4 w-4 sm:h-5 sm:w-5 mx-auto text-green-600 mb-1" />
            <p className="text-[10px] sm:text-xs text-muted-foreground">Ganhos</p>
            <p className="font-bold text-sm sm:text-lg text-green-600">{formatCurrency(store.total_commission)}</p>
          </motion.div>
          <motion.div initial={{
          opacity: 0,
          y: 10
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: 0.3
        }} className="p-3 sm:p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20 text-center">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5 mx-auto text-yellow-600 mb-1" />
            <p className="text-[10px] sm:text-xs text-muted-foreground">Pendente</p>
            <p className="font-bold text-sm sm:text-lg text-yellow-600">{formatCurrency(store.pending_commission)}</p>
          </motion.div>
          <motion.div initial={{
          opacity: 0,
          y: 10
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: 0.4
        }} className="p-3 sm:p-4 bg-red-500/10 rounded-lg border border-red-500/20 text-center">
            <XCircle className="h-4 w-4 sm:h-5 sm:w-5 mx-auto text-red-600 mb-1" />
            <p className="text-[10px] sm:text-xs text-muted-foreground">Cancelados</p>
            <p className="font-bold text-sm sm:text-lg text-red-600">{formatCurrency(getStoreCancelledCommission(store.store_affiliate_id))}</p>
          </motion.div>
        </div>

        {/* Commission Config */}
        <motion.div initial={{
        opacity: 0,
        y: 10
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        delay: 0.4
      }} className="p-4 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Configuração de Comissão</span>
          </div>
          <p className="text-2xl font-bold gradient-text">
            {store.commission_type === 'percentage' ? `${store.commission_value}%` : formatCurrency(store.commission_value)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {store.commission_type === 'percentage' ? 'Percentual sobre cada venda' : 'Valor fixo por venda'}
          </p>
        </motion.div>

        {/* Solicitar Saque */}
        <motion.div initial={{
        opacity: 0,
        y: 10
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        delay: 0.5
      }} className="p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg border border-green-500/20">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Saque de Comissões</span>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(store.total_commission)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Disponível para saque
              </p>
            </div>
            <div>
              {hasPendingWithdrawal(store.store_id) ? (
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                  <Clock className="h-3 w-3 mr-1" />
                  Saque Pendente
                </Badge>
              ) : (
                <Button
                  onClick={() => {
                    setWithdrawalStore(store);
                    setWithdrawalDialogOpen(true);
                  }}
                  disabled={store.total_commission <= 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  Solicitar Saque
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </TabsContent>

      {/* Tab Cupons */}
      <TabsContent value="coupons" className="space-y-3 mt-4 flex-1 overflow-y-auto">
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-primary" />
            <span className="font-medium">
              {(store.coupons?.length || (store.coupon_code ? 1 : 0)) > 1 ? `Seus cupons de desconto (${store.coupons?.length})` : 'Seu cupom de desconto'}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1 ml-7">
            Expanda "Ver Produtos" para ver os produtos elegíveis de cada cupom.
          </p>
        </div>
        
        {store.coupons && store.coupons.length > 0 || store.coupon_code ? <div className="space-y-3">
            {(store.coupons && store.coupons.length > 0 ? store.coupons : store.coupon_code ? [{
          code: store.coupon_code,
          discount_type: store.coupon_discount_type || '',
          discount_value: store.coupon_discount_value || 0
        }] : []).map((coupon, idx) => <motion.div key={idx} initial={{
          opacity: 0,
          x: -10
        }} animate={{
          opacity: 1,
          x: 0
        }} transition={{
          delay: 0.1 + idx * 0.1
        }} className="p-4 bg-gradient-to-br from-muted/30 to-muted/60 rounded-xl border border-orange-400 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono font-bold text-2xl gradient-text">{coupon.code}</p>
                    {coupon.discount_type && (
                      <Badge variant="secondary" className="mt-1">
                        {coupon.discount_type === 'percentage' ? `${coupon.discount_value}% OFF` : `R$ ${coupon.discount_value} OFF`}
                      </Badge>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={e => {
              e.stopPropagation();
              copyToClipboard(coupon.code, 'Cupom');
            }} className="shrink-0">
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar
                  </Button>
                </div>
                
                {coupon.discount_type && <div className="text-xs text-muted-foreground">
                    {coupon.applies_to === 'all' || !coupon.applies_to ? <span className="inline-flex items-center gap-1">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">Geral</Badge>
                      </span> : coupon.applies_to === 'categories' && coupon.category_names?.length ? <span className="inline-flex items-center gap-1 flex-wrap">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">Categorias</Badge>
                        <span>{coupon.category_names.join(', ')}</span>
                      </span> : coupon.applies_to === 'products' && coupon.product_ids?.length ? <span className="inline-flex items-center gap-1">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">Produtos</Badge>
                        <span>{coupon.product_ids.length} produto(s) específico(s)</span>
                      </span> : null}
                  </div>}
                
                <div className="pt-3 border-t border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <Link className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Link de afiliado</span>
                  </div>
                  <div className="flex gap-2">
                    <Input value={`https://ofertas.app/${store.store_slug}?cupom=${coupon.code}`} readOnly className="font-mono text-xs" onClick={e => e.stopPropagation()} />
                    <Button variant="default" size="sm" onClick={e => {
                e.stopPropagation();
                copyToClipboard(`https://ofertas.app/${store.store_slug}?cupom=${coupon.code}`, 'Link de afiliado');
              }} className="shrink-0">
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar
                    </Button>
                  </div>
                </div>

                {/* Produtos do Cupom - Expandir/Colapsar */}
                <Collapsible className="pt-3 border-t border-border">
                  <CollapsibleTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full justify-between bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20 hover:border-primary/40 hover:from-primary/10 hover:to-primary/20 transition-all duration-300"
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold text-primary">
                        <Package className="h-4 w-4" />
                        Ver Produtos
                      </span>
                      <ChevronDown className="h-4 w-4 text-primary transition-transform duration-200" />
                    </Button>
                  </CollapsibleTrigger>
                  <p className="text-xs text-muted-foreground mt-2 text-center italic">
                    O cupom <span className="font-semibold text-primary">{coupon.code}</span> já está embutido no link dos produtos, é só divulgar que o desconto será aplicado automaticamente!
                  </p>
                  <CollapsibleContent className="pt-3">
                    <AffiliateStoreProductsTab 
                      storeId={store.store_id} 
                      storeSlug={store.store_slug} 
                      storeAffiliateId={store.store_affiliate_id} 
                      defaultCommissionType={store.commission_type} 
                      defaultCommissionValue={store.commission_value} 
                      couponCode={coupon.code}
                      couponScope={coupon.applies_to as 'all' | 'category' | 'product' | 'categories' | 'products'}
                      couponCategoryNames={coupon.category_names || []}
                      couponProductIds={coupon.product_ids || []}
                    />
                  </CollapsibleContent>
                </Collapsible>
              </motion.div>)}
            
            <p className="text-xs text-muted-foreground text-center py-2">
              Compartilhe o link. O cupom será aplicado automaticamente!
            </p>
          </div> : <div className="p-6 bg-muted/50 rounded-lg text-center border border-border/50">
            <Ticket className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Aguardando vinculação de cupom pelo lojista
            </p>
          </div>}
      </TabsContent>
    </Tabs>;
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando painel...</p>
        </div>
      </div>;
  }

  // Render Stats Cards (reusable) - using filtered data
  const renderStatsCards = () => {
    // Determine if we should show filtered data or all data
    const showFilteredData = periodFilter !== 'all' || storeFilter !== 'all';
    const displayStats = showFilteredData ? filteredStats : affiliateStats;
    return <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 sm:gap-4">
        <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        delay: 0.1
      }} whileHover={{
        scale: 1.02
      }}>
          <Card className="glass border-border/50 overflow-hidden relative h-full">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
            <CardContent className="p-2.5 sm:p-4 md:pt-6 md:px-6 relative">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-blue-500 to-blue-600 shadow-[0_0_20px_hsl(217_91%_60%/0.4)]">
                  <Building2 className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground truncate">Lojas</p>
                  <p className="text-base sm:text-lg md:text-2xl font-bold gradient-text">{affiliateStats?.total_stores || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        delay: 0.2
      }} whileHover={{
        scale: 1.02
      }}>
          <Card className="glass border-border/50 overflow-hidden relative h-full">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent pointer-events-none" />
            <CardContent className="p-2.5 sm:p-4 md:pt-6 md:px-6 relative">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-green-500 to-emerald-600 shadow-[0_0_20px_hsl(142_76%_36%/0.4)]">
                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground truncate">Vendas</p>
                  <p className="text-sm sm:text-base md:text-2xl font-bold text-green-600 truncate">{formatCurrency(displayStats?.total_sales || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        delay: 0.3
      }} whileHover={{
        scale: 1.02
      }}>
          <Card className="glass border-border/50 overflow-hidden relative h-full">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent pointer-events-none" />
            <CardContent className="p-2.5 sm:p-4 md:pt-6 md:px-6 relative">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-yellow-500 to-amber-600 shadow-[0_0_20px_hsl(45_93%_47%/0.4)]">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground truncate">Pendente</p>
                  <p className="text-sm sm:text-base md:text-2xl font-bold text-yellow-600 truncate">{formatCurrency(displayStats?.pending_commission || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        delay: 0.4
      }} whileHover={{
        scale: 1.02
      }}>
          <Card className="glass border-border/50 overflow-hidden relative h-full">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
            <CardContent className="p-2.5 sm:p-4 md:pt-6 md:px-6 relative">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-primary to-primary-glow shadow-glow">
                  <Wallet className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground truncate">Ganhos</p>
                  <p className="text-sm sm:text-base md:text-2xl font-bold gradient-text truncate">{formatCurrency(displayStats?.total_commission || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>;
  };

  // Render Filters Section
  const renderFiltersSection = () => <motion.div initial={{
    opacity: 0,
    y: 10
  }} animate={{
    opacity: 1,
    y: 0
  }} className="flex flex-col gap-2 p-3 sm:p-4 bg-muted/30 rounded-lg border border-border/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs sm:text-sm font-medium">Filtros</span>
          {(periodFilter !== 'all' || storeFilter !== 'all') && <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 py-0.5">
              {filteredAffiliateOrders.length}
            </Badge>}
        </div>
        
        {/* Clear Filters - moved to top right */}
        {(periodFilter !== 'all' || storeFilter !== 'all') && <Button variant="ghost" size="sm" onClick={() => {
        setPeriodFilter('all');
        setStoreFilter('all');
        setCustomDateRange({
          from: undefined,
          to: undefined
        });
      }} className="h-7 px-2 text-xs text-muted-foreground">
            <X className="h-3 w-3 mr-1" />
            Limpar
          </Button>}
      </div>
      
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {/* Period Filter */}
        <Select value={periodFilter} onValueChange={value => {
        setPeriodFilter(value);
        if (value === 'custom') {
          setShowCustomDatePicker(true);
        }
      }}>
          <SelectTrigger className="w-[110px] sm:w-[140px] h-8 text-xs sm:text-sm">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todo período</SelectItem>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="7days">Últimos 7 dias</SelectItem>
            <SelectItem value="week">Esta semana</SelectItem>
            <SelectItem value="30days">Últimos 30 dias</SelectItem>
            <SelectItem value="month">Este mês</SelectItem>
            <SelectItem value="custom">Personalizado</SelectItem>
          </SelectContent>
        </Select>

        {/* Store Filter */}
        <Select value={storeFilter} onValueChange={setStoreFilter}>
          <SelectTrigger className="w-[110px] sm:w-[160px] h-8 text-xs sm:text-sm">
            <SelectValue placeholder="Loja" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as lojas</SelectItem>
            {affiliateStores.map(store => <SelectItem key={store.store_affiliate_id} value={store.store_affiliate_id}>
                {store.store_name}
              </SelectItem>)}
          </SelectContent>
        </Select>

        {/* Custom Date Range Button */}
        {periodFilter === 'custom' && customDateRange.from && customDateRange.to && <Button variant="outline" size="sm" onClick={() => setShowCustomDatePicker(true)} className="h-8 px-2 gap-1 text-xs">
            <CalendarIcon className="h-3 w-3" />
            <span className="hidden xs:inline">{format(customDateRange.from, 'dd/MM', {
            locale: ptBR
          })}</span>
            <span className="xs:hidden">{format(customDateRange.from, 'dd/MM', {
            locale: ptBR
          })}</span>
            <span>-</span>
            <span>{format(customDateRange.to, 'dd/MM', {
            locale: ptBR
          })}</span>
          </Button>}
      </div>
    </motion.div>;

  // Home Tab Content
  const renderHomeContent = () => <motion.div className="space-y-4 sm:space-y-6" initial={{
    opacity: 0
  }} animate={{
    opacity: 1
  }} transition={{
    duration: 0.3
  }}>
      {/* Filters Section */}
      {renderFiltersSection()}
      
      {renderStatsCards()}
      
      {/* Quick Summary */}
      <motion.div initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} transition={{
      delay: 0.5
    }}>
        <Card className="glass border-border/50 overflow-hidden">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-lg">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-glow">
                <Home className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
              </div>
              <span className="gradient-text truncate">Bem-vindo, {affiliateUser?.name?.split(' ')[0]}!</span>
            </CardTitle>
            <CardDescription className="text-[10px] sm:text-sm">
              Resumo rápido do seu desempenho
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0 space-y-3 sm:space-y-4">
            <div className="grid grid-cols-2 gap-1.5 sm:gap-4">
              <div className="p-2.5 sm:p-4 bg-muted/50 rounded-lg border border-border/50">
                <div className="flex items-center gap-1 sm:gap-2 text-muted-foreground mb-1">
                  <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="text-[10px] sm:text-sm truncate">Pedidos</span>
                </div>
                <p className="text-lg sm:text-2xl font-bold">
                  {periodFilter !== 'all' || storeFilter !== 'all' ? filteredStats.total_orders : affiliateStats?.total_orders || 0}
                </p>
              </div>
              <div className="p-2.5 sm:p-4 bg-muted/50 rounded-lg border border-border/50">
                <div className="flex items-center gap-1 sm:gap-2 text-muted-foreground mb-1">
                  <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="text-[10px] sm:text-sm truncate">Pago</span>
                </div>
                <p className="text-base sm:text-2xl font-bold text-green-600 truncate">
                  {formatCurrency(periodFilter !== 'all' || storeFilter !== 'all' ? filteredStats.paid_commission : affiliateStats?.paid_commission || 0)}
                </p>
              </div>
            </div>

            {affiliateStores.length > 0 && <>
                <Separator />
                <div>
                  <h4 className="font-medium mb-3">Suas Lojas</h4>
                  <div className="space-y-2">
                    {affiliateStores.slice(0, 3).map(store => <motion.div key={store.store_affiliate_id} whileHover={{
                  scale: 1.01
                }} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border/50">
                        <div className="flex items-center gap-3">
                          {store.store_logo ? <img src={store.store_logo} alt={store.store_name} className="w-8 h-8 rounded object-cover" /> : <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                              <Store className="h-4 w-4 text-muted-foreground" />
                            </div>}
                          <span className="font-medium">{store.store_name}</span>
                        </div>
                        <span className="font-semibold text-green-600">
                          {formatCurrency(store.total_commission)}
                        </span>
                      </motion.div>)}
                    {affiliateStores.length > 3 && <Button variant="ghost" className="w-full" onClick={() => setActiveTab('stores')}>
                        Ver todas as {affiliateStores.length} lojas
                      </Button>}
                  </div>
                </div>
              </>}
        </CardContent>
      </Card>
      </motion.div>

      {/* Charts Section */}
      {affiliateOrders.length > 0 && <div className="grid gap-4 md:gap-6 md:grid-cols-2">
          {/* Comissões ao Longo do Tempo */}
          <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        delay: 0.6
      }}>
            <Card className="glass border-border/50 overflow-hidden">
              <CardHeader className="p-4 sm:p-6 bg-gradient-to-r from-primary/5 to-transparent">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Pedidos ao Longo do Tempo
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-2 sm:pt-4">
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={commissionsOverTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }} labelStyle={{
                  color: 'hsl(var(--foreground))'
                }} />
                    <Line type="monotone" dataKey="pedidos" stroke="hsl(var(--primary))" strokeWidth={3} dot={{
                  fill: 'hsl(var(--primary))',
                  r: 4
                }} name="Pedidos" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Comissões Recebidas */}
          <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        delay: 0.7
      }}>
            <Card className="glass border-border/50 overflow-hidden">
              <CardHeader className="p-4 sm:p-6 bg-gradient-to-r from-green-500/5 to-transparent">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                  Comissões Recebidas
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-2 sm:pt-4">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={commissionsOverTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }} labelStyle={{
                  color: 'hsl(var(--foreground))'
                }} formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Comissão']} />
                    <Bar dataKey="comissao" fill="hsl(142 76% 36%)" radius={[8, 8, 0, 0]} name="Comissão" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Comissões por Loja */}
          {commissionsByStore.length > 0 && <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        delay: 0.8
      }} className="md:col-span-2">
              <Card className="glass border-border/50 overflow-hidden">
                <CardHeader className="p-4 sm:p-6 bg-gradient-to-r from-blue-500/5 to-transparent">
                  <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                    <Store className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                    Comissões por Loja
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-2 sm:pt-4">
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={commissionsByStore} cx="50%" cy="50%" labelLine={false} label={({
                  name,
                  percent
                }) => `${name.slice(0, 15)}${name.length > 15 ? '...' : ''} (${(percent * 100).toFixed(0)}%)`} outerRadius={100} fill="hsl(var(--primary))" dataKey="value">
                        {commissionsByStore.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }} formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Comissão']} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>}
        </div>}
    </motion.div>;

  // Stores Tab Content
  const renderStoresContent = () => <div className="space-y-4">
      <Card className="glass border-border/50">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            Minhas Lojas
          </CardTitle>
          <CardDescription>
            Lojas parceiras onde você é afiliado
          </CardDescription>
        </CardHeader>
      </Card>

      {affiliateStores.length === 0 ? <Card>
          <CardContent className="py-12 text-center">
            <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma loja vinculada</h3>
            <p className="text-muted-foreground">
              Aguarde um convite de uma loja parceira para começar a ganhar comissões.
            </p>
          </CardContent>
        </Card> : <div className="grid gap-4 md:grid-cols-2">
          {affiliateStores.map(store => <motion.div key={store.store_affiliate_id} whileHover={{
        scale: 1.02
      }} whileTap={{
        scale: 0.98
      }}>
              <Card className="glass border-border/50 overflow-hidden cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedStore(store)}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {store.store_logo ? <div className="w-12 h-12 rounded-lg overflow-hidden ring-2 ring-primary/20 shadow-glow">
                          <img src={store.store_logo} alt={store.store_name} className="w-full h-full object-cover" />
                        </div> : <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-glow rounded-lg flex items-center justify-center shadow-glow">
                          <Store className="h-6 w-6 text-white" />
                        </div>}
                      <div>
                        <CardTitle className="text-base">{store.store_name}</CardTitle>
                        <CardDescription>
                          {store.coupons?.length ? `${store.coupons.length} cupom(s) vinculado(s)` : store.coupon_code ? `Cupom: ${store.coupon_code}` : 'Sem cupom vinculado'}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={store.status === 'active' ? 'default' : 'secondary'}>
                        {store.status === 'active' ? 'Ativo' : 'Pendente'}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-2 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Vendas</p>
                      <p className="font-semibold text-sm">{formatCurrency(store.total_sales)}</p>
                    </div>
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <p className="text-xs text-muted-foreground">Ganhos</p>
                      <p className="font-semibold text-sm text-green-600">{formatCurrency(store.total_commission)}</p>
                    </div>
                    <div className="p-2 bg-yellow-500/10 rounded-lg">
                      <p className="text-xs text-muted-foreground">Pendente</p>
                      <p className="font-semibold text-sm text-yellow-600">{formatCurrency(store.pending_commission)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>)}
        </div>}
    </div>;

  // Orders Tab Content
  const renderOrdersContent = () => <Card>
      <CardHeader>
        <CardTitle>Meus Pedidos</CardTitle>
        <CardDescription>
          Pedidos realizados com seus cupons e comissões ganhas
        </CardDescription>
      </CardHeader>
      <CardContent>
        {affiliateOrders.length === 0 ? <div className="py-12 text-center">
            <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum pedido ainda</h3>
            <p className="text-muted-foreground">
              Quando clientes usarem seus cupons, os pedidos aparecerão aqui.
            </p>
          </div> : <ScrollableTable>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Loja</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Cupom</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Comissão</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {affiliateOrders.map(order => <TableRow key={order.earning_id} className="cursor-pointer hover:bg-muted/50" onClick={() => openOrderModal(order)}>
                    <TableCell className="font-mono font-medium">
                      #{order.order_number}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(order.order_date)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {order.store_name}
                    </TableCell>
                    <TableCell>
                      {order.customer_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {order.coupon_code || '-'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {formatCurrency(order.order_total)}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {getCommissionDisplay(order)}
                    </TableCell>
                    <TableCell>
                      {getOrderStatusBadge(order)}
                    </TableCell>
                  </TableRow>)}
              </TableBody>
            </Table>
          </ScrollableTable>}
      </CardContent>
    </Card>;

  // Commissions Tab Content
  const renderCommissionsContent = () => <Card>
      <CardHeader>
        <CardTitle>Resumo de Comissões</CardTitle>
        <CardDescription>
          Acompanhe seus ganhos em todas as lojas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">Total de Pedidos</span>
              </div>
              <p className="text-2xl font-bold">{affiliateStats?.total_orders || 0}</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">Total Pago</span>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(affiliateStats?.paid_commission || 0)}
              </p>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="font-medium mb-3">Por Loja</h4>
            <div className="space-y-2">
              {affiliateStores.map(store => <div key={store.store_affiliate_id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {store.store_logo ? <img src={store.store_logo} alt={store.store_name} className="w-8 h-8 rounded object-cover" /> : <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                        <Store className="h-4 w-4 text-muted-foreground" />
                      </div>}
                    <span className="font-medium">{store.store_name}</span>
                  </div>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(store.total_commission)}
                  </span>
                </div>)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>;

  // Profile Tab Content
  const renderProfileContent = () => <Card>
      <CardHeader>
        <CardTitle>Meus Dados</CardTitle>
        <CardDescription>
          Informações da sua conta de afiliado
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Nome</p>
            <p className="font-medium">{affiliateUser?.name || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">E-mail</p>
            <p className="font-medium">{affiliateUser?.email || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Telefone</p>
            <p className="font-medium">{affiliateUser?.phone || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">CPF/CNPJ</p>
            <p className="font-medium">{affiliateUser?.cpf_cnpj || '-'}</p>
          </div>
        </div>

        <Separator />

        <div>
          <p className="text-sm text-muted-foreground mb-1">Chave PIX para recebimento</p>
          {affiliateUser?.pix_key ? <div className="flex items-center gap-2">
              <code className="flex-1 p-2 bg-muted rounded text-sm font-mono">
                {affiliateUser.pix_key}
              </code>
              <Button variant="outline" size="sm" onClick={() => copyToClipboard(affiliateUser.pix_key!, 'Chave PIX')}>
                <Copy className="h-4 w-4" />
              </Button>
            </div> : <p className="text-muted-foreground italic">Nenhuma chave PIX cadastrada</p>}
        </div>
      </CardContent>
    </Card>;

  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return renderHomeContent();
      case 'stores':
        return renderStoresContent();
      case 'orders':
        return renderOrdersContent();
      case 'commissions':
        return renderCommissionsContent();
      case 'invites':
        return (
          <div className="space-y-6">
            <AffiliatePendingInvites
              invites={pendingInvites}
              onAccept={acceptInvite}
              onReject={rejectInvite}
            />
          </div>
        );
      case 'withdrawals':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Wallet className="h-6 w-6 text-primary" />
              <div>
                <h2 className="text-xl font-semibold">Meus Saques</h2>
                <p className="text-sm text-muted-foreground">Histórico de solicitações de saque</p>
              </div>
            </div>
            <AffiliateWithdrawalHistory requests={withdrawalRequests} isLoading={loadingWithdrawals} stores={affiliateStores} />
          </div>
        );
      case 'profile':
        return renderProfileContent();
      default:
        return renderHomeContent();
    }
  };
  return <div className="min-h-screen bg-background">
      {/* Header - Mobile Only */}
      <header className="md:hidden border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold text-lg">Painel do Afiliado</h1>
              <p className="text-sm text-muted-foreground">{affiliateUser?.name}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="flex h-full w-full">
        {/* Desktop Sidebar */}
        <AffiliateDashboardSidebar 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
          affiliateName={affiliateUser?.name} 
          onSignOut={handleLogout}
          pendingInvitesCount={pendingInvites.length}
        />

        {/* Main Content */}
        <main className="flex-1 w-full max-w-full overflow-x-hidden px-2 sm:px-4 py-4 sm:py-6 pb-24 md:pb-6">
          {renderContent()}
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      {isMobile && <AffiliateDashboardBottomNav activeTab={activeTab} onTabChange={setActiveTab} pendingInvitesCount={pendingInvites.length} />}

      {/* Modal de Detalhes do Pedido */}
      <ResponsiveDialog open={!!selectedOrder} onOpenChange={open => !open && closeOrderModal()}>
        <ResponsiveDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              Pedido #{selectedOrder?.order_number}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Detalhes do pedido e comissão
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          
          {selectedOrder && <div className="space-y-6 mt-4">
              {/* Info do Pedido */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Data</p>
                  <p className="font-medium">{formatDate(selectedOrder.order_date)}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Loja</p>
                  <p className="font-medium">{selectedOrder.store_name}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Cliente</p>
                  <p className="font-medium">{selectedOrder.customer_name}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Cupom</p>
                  <Badge variant="outline" className="font-mono text-xs">
                    {selectedOrder.coupon_code || '-'}
                  </Badge>
                </div>
              </div>

              {/* Totais */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-xs text-muted-foreground">Valor do Pedido</p>
                  <p className="text-xl font-bold">{formatCurrency(selectedOrder.order_total)}</p>
                </div>
                <div className="p-4 bg-green-500/5 rounded-lg border border-green-500/20">
                  <p className="text-xs text-muted-foreground">Sua Comissão</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(selectedOrder.commission_amount)}</p>
                  <Badge variant={selectedOrder.commission_status === 'paid' ? 'default' : 'secondary'} className={`mt-1 ${selectedOrder.commission_status === 'paid' ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'}`}>
                    {selectedOrder.commission_status === 'paid' ? <><CheckCircle className="h-3 w-3 mr-1" /> Pago</> : <><Clock className="h-3 w-3 mr-1" /> Pendente</>}
                  </Badge>
                </div>
              </div>

              {/* Itens do Pedido */}
              <div>
                <div className="flex items-center gap-2 text-sm font-medium mb-3">
                  <Package className="h-4 w-4" />
                  Itens do Pedido
                </div>
                
                {loadingModalItems ? <div className="py-8 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mt-2">Carregando itens...</p>
                  </div> : orderModalItems.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">Nenhum item encontrado</p> : <div className="space-y-2">
                    {orderModalItems.map(item => {
                const itemDiscount = item.item_discount || 0;
                return <div key={item.item_id} className="p-3 bg-muted/50 rounded-lg border space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium text-sm">{item.product_name}</p>
                                {item.is_coupon_eligible ? <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-500/10 text-green-600 border-green-500/20">
                                    Com desconto
                                  </Badge> : <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-gray-500/10 text-gray-500 border-gray-500/20">
                                    Sem desconto
                                  </Badge>}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {item.quantity}x {formatCurrency(item.unit_price)} = {formatCurrency(item.subtotal)}
                                {itemDiscount > 0 && <span className="text-orange-500 ml-1">
                                    (-{formatCurrency(itemDiscount)})
                                  </span>}
                                {item.item_value_with_discount !== undefined && item.item_value_with_discount !== item.subtotal && <span className="text-green-600 ml-1">
                                    = {formatCurrency(item.item_value_with_discount)}
                                  </span>}
                              </p>
                            </div>
                            <span className="font-semibold text-green-600 text-sm whitespace-nowrap">
                              {formatCurrency(item.item_commission)}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 flex-wrap">
                            {item.commission_source === 'specific_product' && <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-purple-500/10 text-purple-600 border-purple-500/20">
                                <Target className="h-3 w-3 mr-1" />
                                Regra específica
                              </Badge>}
                            {item.commission_source === 'default' && <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-500/10 text-blue-600 border-blue-500/20">
                                <Calculator className="h-3 w-3 mr-1" />
                                Padrão
                              </Badge>}
                            {(item.commission_source === 'none' || !item.commission_source) && item.item_commission === 0 && <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-gray-500/10 text-gray-500 border-gray-500/20">
                                <Ban className="h-3 w-3 mr-1" />
                                Sem comissão
                              </Badge>}
                            
                            {item.item_commission > 0 && <span className="text-[10px] text-muted-foreground">
                                ({item.commission_type === 'percentage' ? `${item.commission_value}%` : formatCurrency(item.commission_value)} de comissão)
                              </span>}
                          </div>
                        </div>;
              })}
                  </div>}
              </div>
            </div>}
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Modal de Detalhes da Loja */}
      <ResponsiveDialog open={!!selectedStore} onOpenChange={open => !open && setSelectedStore(null)}>
        <ResponsiveDialogContent className="max-w-3xl h-[90vh] flex flex-col glass">
          <ResponsiveDialogHeader className="flex-shrink-0">
            <div className="flex items-center gap-4">
              {selectedStore?.store_logo ? <div className="w-16 h-16 rounded-xl overflow-hidden ring-2 ring-primary/20 shadow-glow flex-shrink-0">
                  <img src={selectedStore.store_logo} alt={selectedStore.store_name} className="w-full h-full object-cover" />
                </div> : <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-glow rounded-xl flex items-center justify-center shadow-glow flex-shrink-0">
                  <Store className="h-8 w-8 text-white" />
                </div>}
              <div>
                <ResponsiveDialogTitle className="text-xl gradient-text">
                  {selectedStore?.store_name}
                </ResponsiveDialogTitle>
                <ResponsiveDialogDescription className="flex items-center gap-2 mt-1">
                  <Badge variant={selectedStore?.status === 'active' ? 'default' : 'secondary'} className={selectedStore?.status === 'active' ? 'bg-green-500/10 text-green-600 border-green-500/20' : ''}>
                    {selectedStore?.status === 'active' ? 'Ativo' : 'Pendente'}
                  </Badge>
                  <a href={`https://ofertas.app/${selectedStore?.store_slug}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    Visitar loja <ExternalLink className="h-3 w-3" />
                  </a>
                </ResponsiveDialogDescription>
              </div>
            </div>
          </ResponsiveDialogHeader>
          
          {selectedStore && renderStoreModalContent(selectedStore)}
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Custom Date Range Dialog */}
      <ResponsiveDialog open={showCustomDatePicker} onOpenChange={setShowCustomDatePicker}>
        <ResponsiveDialogContent className="sm:max-w-lg">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              Selecionar Período Personalizado
            </ResponsiveDialogTitle>
          </ResponsiveDialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Data Inicial</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customDateRange.from ? format(customDateRange.from, "dd/MM/yyyy", {
                      locale: ptBR
                    }) : <span className="text-muted-foreground">Selecione</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={customDateRange.from} onSelect={date => setCustomDateRange(prev => ({
                    ...prev,
                    from: date
                  }))} initialFocus className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Data Final</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customDateRange.to ? format(customDateRange.to, "dd/MM/yyyy", {
                      locale: ptBR
                    }) : <span className="text-muted-foreground">Selecione</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={customDateRange.to} onSelect={date => setCustomDateRange(prev => ({
                    ...prev,
                    to: date
                  }))} disabled={date => customDateRange.from ? date < customDateRange.from : false} initialFocus className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            {customDateRange.from && customDateRange.to && <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 text-center">
                <p className="text-sm text-muted-foreground">Período selecionado:</p>
                <p className="font-medium">
                  {format(customDateRange.from, "dd 'de' MMMM 'de' yyyy", {
                locale: ptBR
              })} até{' '}
                  {format(customDateRange.to, "dd 'de' MMMM 'de' yyyy", {
                locale: ptBR
              })}
                </p>
              </div>}
          </div>
          
          <ResponsiveDialogFooter>
            <Button variant="outline" onClick={() => {
            setCustomDateRange({
              from: undefined,
              to: undefined
            });
            setPeriodFilter('all');
            setShowCustomDatePicker(false);
          }}>
              Cancelar
            </Button>
            <Button onClick={() => setShowCustomDatePicker(false)} disabled={!customDateRange.from || !customDateRange.to}>
              Aplicar
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Dialog de Solicitação de Saque */}
      {withdrawalStore && affiliateDbId && (
        <RequestWithdrawalDialog
          open={withdrawalDialogOpen}
          onOpenChange={setWithdrawalDialogOpen}
          affiliateId={affiliateDbId}
          storeAffiliateId={withdrawalStore.store_affiliate_id}
          storeId={withdrawalStore.store_id}
          storeName={withdrawalStore.store_name}
          availableAmount={withdrawalStore.total_commission}
          defaultPixKey={affiliateUser?.cpf_cnpj || affiliateUser?.pix_key || ''}
          onSubmit={handleCreateWithdrawal}
        />
      )}
    </div>;
}