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
import { StoreHistoryTab } from '@/components/dashboard/StoreHistoryTab';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogDescription, ResponsiveDialogFooter } from '@/components/ui/responsive-dialog';
import { Users, DollarSign, Store, TrendingUp, Copy, LogOut, Loader2, Clock, CheckCircle, Building2, Wallet, BarChart3, User, Link, Ticket, ShoppingBag, Package, Target, Ban, Calculator, Home, ExternalLink, ChevronRight, Grid3X3, X, Calendar as CalendarIcon, Filter, ChevronDown, XCircle, Search, Banknote, Camera, Pencil, Save, Timer } from 'lucide-react';
import { MaturityCountdown } from '@/components/dashboard/MaturityCountdown';
import { AvatarCropDialog } from '@/components/dashboard/AvatarCropDialog';
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
    rejectInvite,
    updateAvatarUrl,
    updateProfile
  } = useAffiliateAuth();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
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
  const [ordersPage, setOrdersPage] = useState<Record<string, number>>({});
  const [ordersSearch, setOrdersSearch] = useState<Record<string, string>>({});
  const [ordersStatusFilter, setOrdersStatusFilter] = useState<Record<string, string>>({});
  const [withdrawalsPage, setWithdrawalsPage] = useState<Record<string, number>>({});
  const [withdrawalsSearch, setWithdrawalsSearch] = useState<Record<string, string>>({});
  const [withdrawalsStatusFilter, setWithdrawalsStatusFilter] = useState<Record<string, string>>({});
  const [storesSearch, setStoresSearch] = useState('');
  const [storesStatusFilter, setStoresStatusFilter] = useState('all');
  const [storesSortBy, setStoresSortBy] = useState('name');
  const [storesSubTab, setStoresSubTab] = useState('stores');
  const [historyPage, setHistoryPage] = useState<Record<string, number>>({});

  // Commissions summary filters
  const [commissionViewMode, setCommissionViewMode] = useState<'stores' | 'orders'>('stores');
  const [commissionsOrderSearch, setCommissionsOrderSearch] = useState('');
  const [commissionsStoreFilter, setCommissionsStoreFilter] = useState<string>('all');

  // Withdrawal orders modal state
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<any | null>(null);
  const [withdrawalOrders, setWithdrawalOrders] = useState<any[]>([]);
  const [loadingWithdrawalOrders, setLoadingWithdrawalOrders] = useState(false);

  // Buscar affiliate_id do banco
  useEffect(() => {
    const fetchAffiliateId = async () => {
      if (!affiliateUser?.email) return;
      const {
        data
      } = await supabase.from('affiliates').select('id').eq('email', affiliateUser.email).limit(1).maybeSingle();
      if (data) setAffiliateDbId(data.id);
    };
    fetchAffiliateId();
  }, [affiliateUser?.email]);

  // Buscar solicitações de saque
  const fetchWithdrawalRequests = useCallback(async () => {
    if (!affiliateDbId) return;
    setLoadingWithdrawals(true);
    try {
      const {
        data
      } = await supabase.from('affiliate_withdrawal_requests').select(`
          *,
          stores!inner(name)
        `).eq('affiliate_id', affiliateDbId).order('requested_at', {
        ascending: false
      });
      const formatted = (data || []).map((req: any) => ({
        ...req,
        store_name: req.stores?.name
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
      const {
        data: existing
      } = await supabase.from('affiliate_withdrawal_requests').select('id').eq('affiliate_id', data.affiliate_id).eq('store_id', data.store_id).eq('status', 'pending').maybeSingle();
      if (existing) {
        toast.error('Já existe uma solicitação pendente para esta loja');
        return null;
      }
      const {
        data: newRequest,
        error
      } = await supabase.from('affiliate_withdrawal_requests').insert({
        affiliate_id: data.affiliate_id,
        store_affiliate_id: data.store_affiliate_id || null,
        store_id: data.store_id,
        amount: data.amount,
        pix_key: data.pix_key || null,
        notes: data.notes || null,
        status: 'pending'
      }).select().single();
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

  // Buscar pedidos relacionados a um saque (comissões pagas no período do saque)
  const fetchWithdrawalOrders = useCallback(async (withdrawal: any) => {
    if (!withdrawal || !affiliateDbId) return;
    setLoadingWithdrawalOrders(true);
    try {
      // Buscar affiliate_earnings com status 'paid' e paid_at no período do saque
      const {
        data: earnings,
        error
      } = await supabase.from('affiliate_earnings').select(`
          id,
          order_id,
          commission_amount,
          order_total,
          paid_at,
          orders!inner(
            order_number,
            customer_name,
            created_at,
            total,
            status
          )
        `).eq('affiliate_id', affiliateDbId).eq('status', 'paid').gte('paid_at', withdrawal.requested_at).lte('paid_at', withdrawal.paid_at || new Date().toISOString());
      if (error) throw error;
      const formattedOrders = (earnings || []).map((e: any) => ({
        order_id: e.order_id,
        order_number: e.orders?.order_number,
        customer_name: e.orders?.customer_name,
        order_date: e.orders?.created_at,
        order_total: e.order_total,
        commission_amount: e.commission_amount,
        order_status: e.orders?.status
      }));
      setWithdrawalOrders(formattedOrders);
    } catch (err) {
      console.error('Erro ao buscar pedidos do saque:', err);
      setWithdrawalOrders([]);
    } finally {
      setLoadingWithdrawalOrders(false);
    }
  }, [affiliateDbId]);

  // Abrir modal do saque com pedidos
  const handleOpenWithdrawalDetails = (withdrawal: any) => {
    setSelectedWithdrawal(withdrawal);
    fetchWithdrawalOrders(withdrawal);
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
  const affiliateOrderIds = useMemo(() => affiliateOrders?.map(o => o.order_id).filter(Boolean) || [], [affiliateOrders]);

  // Hook de notificação de mudança de status do pedido (atualiza dashboard quando lojista muda status)
  useAffiliateOrderStatusNotification({
    orderIds: affiliateOrderIds,
    storeAffiliateIds,
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
    const validOrders = filteredAffiliateOrders.filter(order => order.order_status !== 'cancelado' && order.order_status !== 'cancelled');

    // Pedidos cancelados
    const cancelledOrders = filteredAffiliateOrders.filter(order => order.order_status === 'cancelado' || order.order_status === 'cancelled');
    const totalOrders = validOrders.length;
    const totalSales = validOrders.reduce((sum, order) => sum + (order.order_total || 0), 0);

    // Ganhos: SOMENTE pedidos ENTREGUES
    const earnedCommission = validOrders.filter(order => order.order_status === 'entregue' || order.order_status === 'delivered').reduce((sum, order) => sum + (order.commission_amount || 0), 0);

    // Disponível para saque: pedidos entregues E que já passaram o período de maturidade
    const now = new Date();
    const availableForWithdrawal = validOrders.filter(order => {
      const isDelivered = order.order_status === 'entregue' || order.order_status === 'delivered';
      if (!isDelivered) return false;

      // Se tem data de maturidade, verificar se já passou
      if (order.commission_available_at) {
        const maturityDate = new Date(order.commission_available_at);
        return maturityDate <= now;
      }

      // Fallback: usar maturity_days (default 7 dias) + data do pedido
      const maturityDays = order.maturity_days || 7;
      const orderDate = new Date(order.order_date);
      const maturityDate = new Date(orderDate.getTime() + maturityDays * 24 * 60 * 60 * 1000);
      return maturityDate <= now;
    }).reduce((sum, order) => sum + (order.commission_amount || 0), 0);

    // Em maturação: pedidos entregues MAS ainda no período de carência
    const maturingCommission = validOrders.filter(order => {
      const isDelivered = order.order_status === 'entregue' || order.order_status === 'delivered';
      if (!isDelivered) return false;

      // Se tem data de maturidade, verificar se ainda não passou
      if (order.commission_available_at) {
        const maturityDate = new Date(order.commission_available_at);
        return maturityDate > now;
      }

      // Fallback: usar maturity_days (default 7 dias) + data do pedido
      const maturityDays = order.maturity_days || 7;
      const orderDate = new Date(order.order_date);
      const maturityDate = new Date(orderDate.getTime() + maturityDays * 24 * 60 * 60 * 1000);
      return maturityDate > now;
    }).reduce((sum, order) => sum + (order.commission_amount || 0), 0);

    // Pendente: pedidos que NÃO são "entregue" nem "cancelado"
    const pendingCommission = validOrders.filter(order => {
      const status = order.order_status;
      return status !== 'entregue' && status !== 'delivered' && status !== 'cancelado' && status !== 'cancelled';
    }).reduce((sum, order) => sum + (order.commission_amount || 0), 0);
    const cancelledCount = cancelledOrders.length;
    const cancelledCommission = cancelledOrders.reduce((sum, order) => sum + (order.commission_amount || 0), 0);
    return {
      total_orders: totalOrders,
      total_sales: totalSales,
      total_commission: earnedCommission,
      // Apenas entregues (total de ganhos)
      available_for_withdrawal: availableForWithdrawal,
      // Disponível para saque (passou maturidade)
      maturing_commission: maturingCommission,
      // Em maturação (ainda no período de carência)
      pending_commission: pendingCommission,
      // Em processamento (pedidos não entregues)
      paid_commission: earnedCommission,
      // Alias para compatibilidade
      cancelled_count: cancelledCount,
      cancelled_commission: cancelledCommission
    };
  }, [filteredAffiliateOrders]);

  // Dados para gráficos - Comissões ao longo do tempo (excluindo cancelados)
  const commissionsOverTime = useMemo(() => {
    if (!filteredAffiliateOrders || filteredAffiliateOrders.length === 0) return [];

    // Filtrar pedidos não cancelados para os gráficos
    const validOrdersForChart = filteredAffiliateOrders.filter(order => order.order_status !== 'cancelado' && order.order_status !== 'cancelled');
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

  // Dados para gráfico de maturação - Liberação de comissões por dia
  const maturityChartData = useMemo(() => {
    if (!filteredAffiliateOrders || filteredAffiliateOrders.length === 0) return [];
    
    const now = new Date();
    
    // Filtrar apenas pedidos entregues que ainda estão em maturação
    const maturingOrders = filteredAffiliateOrders.filter(order => {
      const isDelivered = order.order_status === 'entregue' || order.order_status === 'delivered';
      if (!isDelivered) return false;
      
      // Verificar se ainda está em maturação
      if (order.commission_available_at) {
        const maturityDate = new Date(order.commission_available_at);
        return maturityDate > now;
      }
      return false;
    });
    
    if (maturingOrders.length === 0) return [];
    
    // Agrupar por data de liberação
    const byDate: Record<string, number> = {};
    
    maturingOrders.forEach(order => {
      if (order.commission_available_at) {
        const dateKey = format(new Date(order.commission_available_at), 'yyyy-MM-dd');
        if (!byDate[dateKey]) {
          byDate[dateKey] = 0;
        }
        byDate[dateKey] += order.commission_amount || 0;
      }
    });
    
    // Converter para array e ordenar por data
    return Object.entries(byDate)
      .map(([date, value]) => ({
        date,
        dateDisplay: format(new Date(date), 'dd/MM', { locale: ptBR }),
        value,
        fullDate: format(new Date(date), "dd 'de' MMMM", { locale: ptBR })
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 14); // Próximos 14 dias
  }, [filteredAffiliateOrders]);

  // Dados para gráfico de pizza - Comissões por loja (apenas pedidos entregues)
  const commissionsByStore = useMemo(() => {
    if (!filteredAffiliateOrders || filteredAffiliateOrders.length === 0) return [];

    // Filtrar apenas pedidos entregues para comissões
    const deliveredOrders = filteredAffiliateOrders.filter(order => order.order_status === 'entregue' || order.order_status === 'delivered');
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
      return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
          <CheckCircle className="h-3 w-3 mr-1" /> Concluído
        </Badge>;
    }

    // Cancelado
    if (status === 'cancelado' || status === 'cancelled') {
      return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
          <Ban className="h-3 w-3 mr-1" /> Cancelado
        </Badge>;
    }

    // Pendente: todos os outros status
    return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
        <Clock className="h-3 w-3 mr-1" /> Pendente
      </Badge>;
  };

  // Helper para exibir ganhos condicionalmente baseado no status
  const getCommissionDisplay = (order: AffiliateOrder) => {
    const status = order.order_status;
    const isDelivered = status === 'entregue' || status === 'delivered';
    const isCancelled = status === 'cancelado' || status === 'cancelled';
    if (isDelivered) {
      return <span className="font-semibold text-green-600">
          {formatCurrency(order.commission_amount)}
        </span>;
    }
    if (isCancelled) {
      return <span className="text-muted-foreground line-through">
          {formatCurrency(order.commission_amount)}
        </span>;
    }

    // Pendente: mostrar valor em amarelo
    return <span className="font-medium text-yellow-600">
        {formatCurrency(order.commission_amount)}
      </span>;
  };
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  // Helper function para badge de status do saque
  const getWithdrawalStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle className="h-3 w-3 mr-1" />Pago</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20"><XCircle className="h-3 w-3 mr-1" />Rejeitado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Formatar e validar chave PIX
  const formatPixKey = (key: string | null | undefined): {
    formatted: string;
    type: string;
    isValid: boolean;
  } => {
    if (!key) return {
      formatted: '',
      type: '',
      isValid: false
    };
    const cleanKey = key.replace(/\D/g, '');

    // CPF: 11 dígitos
    if (cleanKey.length === 11 && /^\d{11}$/.test(cleanKey)) {
      const formatted = cleanKey.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      return {
        formatted,
        type: 'CPF',
        isValid: true
      };
    }

    // CNPJ: 14 dígitos
    if (cleanKey.length === 14 && /^\d{14}$/.test(cleanKey)) {
      const formatted = cleanKey.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
      return {
        formatted,
        type: 'CNPJ',
        isValid: true
      };
    }

    // Telefone: 10 ou 11 dígitos
    if ((cleanKey.length === 10 || cleanKey.length === 11) && /^\d+$/.test(cleanKey)) {
      if (cleanKey.length === 11) {
        const formatted = cleanKey.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        return {
          formatted,
          type: 'Telefone',
          isValid: true
        };
      } else {
        const formatted = cleanKey.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
        return {
          formatted,
          type: 'Telefone',
          isValid: true
        };
      }
    }

    // Email
    if (key.includes('@') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key)) {
      return {
        formatted: key,
        type: 'E-mail',
        isValid: true
      };
    }

    // Chave aleatória (32 caracteres hexadecimais com hifens)
    if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(key)) {
      return {
        formatted: key,
        type: 'Chave Aleatória',
        isValid: true
      };
    }

    // Formato não reconhecido
    return {
      formatted: key,
      type: 'Desconhecido',
      isValid: false
    };
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
    return affiliateOrders.filter(order => order.store_affiliate_id === storeAffiliateId && (order.order_status === 'cancelado' || order.order_status === 'cancelled')).reduce((sum, order) => sum + (order.commission_amount || 0), 0);
  }, [affiliateOrders]);

  // Calcula total de saques pagos por loja
  const getStorePaidWithdrawals = useCallback((storeId: string) => {
    return withdrawalRequests.filter(req => req.store_id === storeId && req.status === 'paid').reduce((sum, req) => sum + (req.amount || 0), 0);
  }, [withdrawalRequests]);

  // Renderiza o conteúdo das abas do modal da loja
  const renderStoreModalContent = (store: typeof affiliateStores[0]) => <Tabs defaultValue="overview" className="mt-4 flex-1 flex flex-col min-h-0 px-4">
      <TabsList className="grid w-full grid-cols-5 flex-shrink-0">
        <TabsTrigger value="overview">Resumo</TabsTrigger>
        <TabsTrigger value="coupons">Cupons</TabsTrigger>
        <TabsTrigger value="orders">Pedidos</TabsTrigger>
        <TabsTrigger value="withdrawals">Saques</TabsTrigger>
        <TabsTrigger value="history">Histórico</TabsTrigger>
      </TabsList>
      
      {/* Tab Resumo */}
      <TabsContent value="overview" className="space-y-6 mt-4 flex-1 overflow-y-auto">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
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
          delay: 0.15
        }} className="p-3 sm:p-4 bg-purple-500/10 rounded-lg border border-purple-500/20 text-center">
            <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 mx-auto text-purple-600 mb-1" />
            <p className="text-[10px] sm:text-xs text-muted-foreground">Total Ganhos</p>
            <p className="font-bold text-sm sm:text-lg text-purple-600">{formatCurrency(getStorePaidWithdrawals(store.store_id))}</p>
          </motion.div>
          <motion.div initial={{
          opacity: 0,
          y: 10
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: 0.2
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
          delay: 0.25
        }} className="p-3 sm:p-4 bg-orange-500/10 rounded-lg border border-orange-500/20 text-center">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5 mx-auto text-orange-500 mb-1" />
            <p className="text-[10px] sm:text-xs text-muted-foreground">Aguardando Prazo </p>
            <p className="font-bold text-sm sm:text-lg text-orange-500">{formatCurrency((store as any).maturing_commission || 0)}</p>
            {(store as any).maturity_days > 0 && <p className="text-[8px] sm:text-[10px] text-orange-500/70">{(store as any).maturity_days} dias de carência</p>}
          </motion.div>
          <motion.div initial={{
          opacity: 0,
          y: 10
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: 0.3
        }} className="p-3 sm:p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-center">
            <Wallet className="h-4 w-4 sm:h-5 sm:w-5 mx-auto text-emerald-600 mb-1" />
            <p className="text-[10px] sm:text-xs text-muted-foreground">Disponível Saque</p>
            <p className="font-bold text-sm sm:text-lg text-emerald-600">{formatCurrency(store.total_commission)}</p>
          </motion.div>
          <motion.div initial={{
          opacity: 0,
          y: 10
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: 0.35
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
            <span className="text-sm font-medium">Comissão padrão</span>
          </div>
          <p className="text-2xl font-bold gradient-text">
            {store.commission_type === 'percentage' ? `${store.commission_value}%` : formatCurrency(store.commission_value)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {store.commission_type === 'percentage' ? 'Percentual sobre cada venda' : 'Valor fixo por venda'}
          </p>
          <p className="text-xs text-foreground/60 mt-3 italic">
            Visualize as comissões específicas dos produtos clicando em <span className="font-medium text-primary">Cupons</span> e <span className="font-medium text-primary">Produtos</span>.
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
      }} className="space-y-3">
          {/* Valor em maturação */}
          {((store as any).maturing_commission || 0) > 0 && <div className="p-4 bg-gradient-to-r from-orange-500/10 to-amber-500/10 rounded-lg border border-orange-500/20">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">​Aguardando o prazo para a liberação </span>
              </div>
              <p className="text-xl font-bold text-orange-500">
                {formatCurrency((store as any).maturing_commission || 0)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Liberação após {(store as any).maturity_days || 7} dias da entrega
              </p>
            </div>}
          
          {/* Valor disponível para saque */}
          <div className="p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg border border-green-500/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Wallet className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Disponível para Saque</span>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(store.total_commission)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Comissões liberadas
                </p>
              </div>
              <div>
                {hasPendingWithdrawal(store.store_id) ? <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                    <Clock className="h-3 w-3 mr-1" />
                    Saque Pendente
                  </Badge> : <Button onClick={() => {
                setWithdrawalStore(store);
                setWithdrawalDialogOpen(true);
              }} disabled={store.total_commission <= 0} className="bg-green-600 hover:bg-green-700">
                    <Wallet className="h-4 w-4 mr-2" />
                    Solicitar Saque
                  </Button>}
              </div>
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
                    {coupon.discount_type && <Badge variant="secondary" className="mt-1">
                        {coupon.discount_type === 'percentage' ? `${coupon.discount_value}% OFF` : `R$ ${coupon.discount_value} OFF`}
                      </Badge>}
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
                    <Button variant="outline" className="w-full justify-between bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20 hover:border-primary/40 hover:from-primary/10 hover:to-primary/20 transition-all duration-300">
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
                    <AffiliateStoreProductsTab storeId={store.store_id} storeSlug={store.store_slug} storeAffiliateId={store.store_affiliate_id} defaultCommissionType={store.commission_type} defaultCommissionValue={store.commission_value} couponCode={coupon.code} couponId={coupon.id} couponDiscountType={coupon.discount_type} couponDiscountValue={coupon.discount_value} couponScope={coupon.applies_to as 'all' | 'category' | 'product' | 'categories' | 'products'} couponCategoryNames={coupon.category_names || []} couponProductIds={coupon.product_ids || []} />
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
      
      {/* Tab Pedidos */}
      <TabsContent value="orders" className="space-y-4 mt-4 flex-1 overflow-y-auto">
        {(() => {
        const searchTerm = (ordersSearch[store.store_id] || '').toLowerCase();
        const statusFilter = ordersStatusFilter[store.store_id] || 'all';

        // Filtrar pedidos
        const storeOrders = affiliateOrders.filter(order => order.store_id === store.store_id).filter(order => {
          if (!searchTerm) return true;
          return order.order_number?.toLowerCase().includes(searchTerm) || order.customer_name?.toLowerCase().includes(searchTerm) || order.coupon_code?.toLowerCase().includes(searchTerm);
        }).filter(order => {
          if (statusFilter === 'all') return true;
          const orderStatus = order.order_status?.toLowerCase() || '';
          if (statusFilter === 'pending') return orderStatus === 'pendente' || orderStatus === 'pending';
          if (statusFilter === 'delivered') return orderStatus === 'entregue' || orderStatus === 'delivered';
          if (statusFilter === 'cancelled') return orderStatus === 'cancelado' || orderStatus === 'cancelled';
          if (statusFilter === 'processing') return !['pendente', 'pending', 'entregue', 'delivered', 'cancelado', 'cancelled'].includes(orderStatus);
          return true;
        });
        const ORDERS_PER_PAGE = 10;
        const currentPage = ordersPage[store.store_id] || 1;
        const totalPages = Math.ceil(storeOrders.length / ORDERS_PER_PAGE);
        const paginatedOrders = storeOrders.slice((currentPage - 1) * ORDERS_PER_PAGE, currentPage * ORDERS_PER_PAGE);
        const totalOrders = affiliateOrders.filter(order => order.store_id === store.store_id).length;
        return <div className="space-y-3">
              {/* Filtros e Busca */}
              <div className="p-3 bg-muted/30 rounded-lg border border-border/50 space-y-3">
                {/* Busca */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar por número, cliente ou cupom..." value={ordersSearch[store.store_id] || ''} onChange={e => {
                setOrdersSearch(prev => ({
                  ...prev,
                  [store.store_id]: e.target.value
                }));
                setOrdersPage(prev => ({
                  ...prev,
                  [store.store_id]: 1
                }));
              }} className="pl-9 h-9 text-sm" />
                </div>
                
                {/* Filtros */}
                <div className="flex flex-wrap gap-2">
                  <Select value={statusFilter} onValueChange={value => {
                setOrdersStatusFilter(prev => ({
                  ...prev,
                  [store.store_id]: value
                }));
                setOrdersPage(prev => ({
                  ...prev,
                  [store.store_id]: 1
                }));
              }}>
                    <SelectTrigger className="w-[160px] h-8 text-xs">
                      <Filter className="h-3 w-3 mr-1.5" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      <SelectItem value="pending">Pendentes</SelectItem>
                      <SelectItem value="processing">Em processamento</SelectItem>
                      <SelectItem value="delivered">Concluídos</SelectItem>
                      <SelectItem value="cancelled">Cancelados</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {(searchTerm || statusFilter !== 'all') && <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground" onClick={() => {
                setOrdersSearch(prev => ({
                  ...prev,
                  [store.store_id]: ''
                }));
                setOrdersStatusFilter(prev => ({
                  ...prev,
                  [store.store_id]: 'all'
                }));
                setOrdersPage(prev => ({
                  ...prev,
                  [store.store_id]: 1
                }));
              }}>
                      <X className="h-3 w-3 mr-1" />
                      Limpar filtros
                    </Button>}
                </div>
                
                {/* Contador de resultados */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {storeOrders.length === totalOrders ? `${totalOrders} pedido${totalOrders !== 1 ? 's' : ''}` : `${storeOrders.length} de ${totalOrders} pedidos`}
                  </span>
                  {storeOrders.length > 0 && <span className="text-emerald-600 font-medium">
                      Total: {formatCurrency(storeOrders.reduce((sum, o) => sum + (o.order_total || 0), 0))}
                    </span>}
                </div>
              </div>
              
              {/* Lista de pedidos */}
              {storeOrders.length === 0 ? <div className="p-6 bg-muted/50 rounded-lg text-center border border-border/50">
                  <ShoppingBag className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {totalOrders === 0 ? 'Nenhum pedido realizado ainda nesta loja' : 'Nenhum pedido encontrado com os filtros selecionados'}
                  </p>
                </div> : <>
                  {paginatedOrders.map(order => <div key={order.earning_id} className="p-3 bg-muted/30 rounded-lg border border-border/50 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => openOrderModal(order)}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono font-medium text-sm">#{order.order_number}</span>
                        {getOrderStatusBadge(order)}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Cliente:</span>
                          <p className="font-medium truncate">{order.customer_name}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Data:</span>
                          <p className="font-medium">{formatDate(order.order_date)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Valor:</span>
                          <p className="font-medium">{formatCurrency(order.order_total)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Comissão:</span>
                          <p className="font-medium">{getCommissionDisplay(order)}</p>
                        </div>
                      </div>
                      {/* Mostrar contagem regressiva para pedidos entregues */}
                      {(order.order_status === 'entregue' || order.order_status === 'delivered') && order.commission_status !== 'paid' && (order as any).commission_available_at && <div className="mt-2 pt-2 border-t border-border/50">
                          <MaturityCountdown commissionAvailableAt={(order as any).commission_available_at} commissionStatus={order.commission_status} orderStatus={order.order_status} />
                        </div>}
                      {order.coupon_code && !(order.order_status === 'entregue' || order.order_status === 'delivered') && <div className="mt-2 pt-2 border-t border-border/50">
                          <Badge variant="outline" className="font-mono text-xs">
                            {order.coupon_code}
                          </Badge>
                        </div>}
                    </div>)}
                  
                  {/* Paginação */}
                  {totalPages > 1 && <div className="flex items-center justify-between pt-3 border-t border-border/50">
                      <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setOrdersPage(prev => ({
                ...prev,
                [store.store_id]: currentPage - 1
              }))}>
                        Anterior
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        Página {currentPage} de {totalPages}
                      </span>
                      <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setOrdersPage(prev => ({
                ...prev,
                [store.store_id]: currentPage + 1
              }))}>
                        Próxima
                      </Button>
                    </div>}
                </>}
            </div>;
      })()}
      </TabsContent>
      
      {/* Tab Saques */}
      <TabsContent value="withdrawals" className="space-y-4 mt-4 flex-1 overflow-y-auto">
        {(() => {
        const searchTerm = (withdrawalsSearch[store.store_id] || '').toLowerCase();
        const statusFilter = withdrawalsStatusFilter[store.store_id] || 'all';

        // Filtrar saques
        const storeWithdrawals = withdrawalRequests.filter(req => req.store_id === store.store_id).filter(req => {
          if (!searchTerm) return true;
          return req.pix_key?.toLowerCase().includes(searchTerm) || req.admin_notes?.toLowerCase().includes(searchTerm) || formatCurrency(req.amount).toLowerCase().includes(searchTerm);
        }).filter(req => {
          if (statusFilter === 'all') return true;
          return req.status === statusFilter;
        });
        const WITHDRAWALS_PER_PAGE = 10;
        const currentPage = withdrawalsPage[store.store_id] || 1;
        const totalPages = Math.ceil(storeWithdrawals.length / WITHDRAWALS_PER_PAGE);
        const paginatedWithdrawals = storeWithdrawals.slice((currentPage - 1) * WITHDRAWALS_PER_PAGE, currentPage * WITHDRAWALS_PER_PAGE);
        const totalWithdrawals = withdrawalRequests.filter(req => req.store_id === store.store_id).length;
        return <div className="space-y-3">
              {/* Filtros e Busca */}
              <div className="p-3 bg-muted/30 rounded-lg border border-border/50 space-y-3">
                {/* Busca */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar por valor ou chave PIX..." value={withdrawalsSearch[store.store_id] || ''} onChange={e => {
                setWithdrawalsSearch(prev => ({
                  ...prev,
                  [store.store_id]: e.target.value
                }));
                setWithdrawalsPage(prev => ({
                  ...prev,
                  [store.store_id]: 1
                }));
              }} className="pl-9 h-9 text-sm" />
                </div>
                
                {/* Filtros */}
                <div className="flex flex-wrap gap-2">
                  <Select value={statusFilter} onValueChange={value => {
                setWithdrawalsStatusFilter(prev => ({
                  ...prev,
                  [store.store_id]: value
                }));
                setWithdrawalsPage(prev => ({
                  ...prev,
                  [store.store_id]: 1
                }));
              }}>
                    <SelectTrigger className="w-[160px] h-8 text-xs">
                      <Filter className="h-3 w-3 mr-1.5" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      <SelectItem value="pending">Pendentes</SelectItem>
                      <SelectItem value="paid">Pagos</SelectItem>
                      <SelectItem value="rejected">Rejeitados</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {(searchTerm || statusFilter !== 'all') && <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground" onClick={() => {
                setWithdrawalsSearch(prev => ({
                  ...prev,
                  [store.store_id]: ''
                }));
                setWithdrawalsStatusFilter(prev => ({
                  ...prev,
                  [store.store_id]: 'all'
                }));
                setWithdrawalsPage(prev => ({
                  ...prev,
                  [store.store_id]: 1
                }));
              }}>
                      <X className="h-3 w-3 mr-1" />
                      Limpar filtros
                    </Button>}
                </div>
                
                {/* Contador de resultados */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {storeWithdrawals.length === totalWithdrawals ? `${totalWithdrawals} saque${totalWithdrawals !== 1 ? 's' : ''}` : `${storeWithdrawals.length} de ${totalWithdrawals} saques`}
                  </span>
                  {storeWithdrawals.length > 0 && <span className="text-emerald-600 font-medium">
                      Total: {formatCurrency(storeWithdrawals.reduce((sum, w) => sum + (w.amount || 0), 0))}
                    </span>}
                </div>
              </div>
              
              {/* Lista de saques */}
              {storeWithdrawals.length === 0 ? <div className="p-6 bg-muted/50 rounded-lg text-center border border-border/50">
                  <Wallet className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {totalWithdrawals === 0 ? 'Nenhum saque solicitado ainda nesta loja' : 'Nenhum saque encontrado com os filtros selecionados'}
                  </p>
                </div> : <>
                  {paginatedWithdrawals.map(withdrawal => <div key={withdrawal.id} className="p-3 bg-muted/30 rounded-lg border border-border/50 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleOpenWithdrawalDetails(withdrawal)}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-lg text-emerald-600">{formatCurrency(withdrawal.amount)}</span>
                        {getWithdrawalStatusBadge(withdrawal.status)}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Solicitado em:</span>
                          <p className="font-medium">{formatDate(withdrawal.requested_at)}</p>
                        </div>
                        {withdrawal.paid_at && <div>
                            <span className="text-muted-foreground">Pago em:</span>
                            <p className="font-medium">{formatDate(withdrawal.paid_at)}</p>
                          </div>}
                        {withdrawal.pix_key && <div className="col-span-2">
                            <span className="text-muted-foreground">Chave PIX:</span>
                            <p className="font-medium font-mono">{withdrawal.pix_key}</p>
                          </div>}
                      </div>
                      {withdrawal.admin_notes && <div className="mt-2 pt-2 border-t border-border/50">
                          <span className="text-xs text-muted-foreground">Observação:</span>
                          <p className="text-xs">{withdrawal.admin_notes}</p>
                        </div>}
                    </div>)}
                  
                  {/* Paginação */}
                  {totalPages > 1 && <div className="flex items-center justify-between pt-3 border-t border-border/50">
                      <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setWithdrawalsPage(prev => ({
                ...prev,
                [store.store_id]: currentPage - 1
              }))}>
                        Anterior
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        Página {currentPage} de {totalPages}
                      </span>
                      <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setWithdrawalsPage(prev => ({
                ...prev,
                [store.store_id]: currentPage + 1
              }))}>
                        Próxima
                      </Button>
                    </div>}
                </>}
            </div>;
      })()}
      </TabsContent>
      
      {/* Tab Histórico - Extrato de Comissões */}
      <TabsContent value="history" className="space-y-4 mt-4 flex-1 overflow-y-auto">
        <StoreHistoryTab store={store} affiliateOrders={affiliateOrders} withdrawalRequests={withdrawalRequests} historyPage={historyPage} setHistoryPage={setHistoryPage} formatCurrency={formatCurrency} />
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
    return <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7 gap-2 sm:gap-3">
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
                  <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground truncate">Total Vendas</p>
                  <p className="text-xs sm:text-sm md:text-lg lg:text-xl font-bold text-green-600">{formatCurrency(displayStats?.total_sales || 0)}</p>
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
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
            <CardContent className="p-2.5 sm:p-4 md:pt-6 md:px-6 relative">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-primary to-primary-glow shadow-glow">
                  <Wallet className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground truncate">Total Ganhos</p>
                  <p className="text-xs sm:text-sm md:text-lg lg:text-xl font-bold gradient-text">{formatCurrency(displayStats?.total_commission || 0)}</p>
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
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent pointer-events-none" />
            <CardContent className="p-2.5 sm:p-4 md:pt-6 md:px-6 relative">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-yellow-500 to-amber-600 shadow-[0_0_20px_hsl(45_93%_47%/0.4)]">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground truncate">Pendentes</p>
                  <p className="text-xs sm:text-sm md:text-lg lg:text-xl font-bold text-yellow-600">{formatCurrency(displayStats?.pending_commission || 0)}</p>
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
        delay: 0.5
      }} whileHover={{
        scale: 1.02
      }}>
          <Card className="glass border-border/50 overflow-hidden relative h-full">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
            <CardContent className="p-2.5 sm:p-4 md:pt-6 md:px-6 relative">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-amber-500 to-amber-600 shadow-[0_0_20px_hsl(38_92%_50%/0.4)]">
                  <Timer className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-white animate-pulse" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground truncate">Em Maturação</p>
                  <p className="text-xs sm:text-sm md:text-lg lg:text-xl font-bold text-amber-600">{formatCurrency((displayStats as any)?.maturing_commission || 0)}</p>
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
        delay: 0.55
      }} whileHover={{
        scale: 1.02
      }}>
          <Card className="glass border-border/50 overflow-hidden relative h-full">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent pointer-events-none" />
            <CardContent className="p-2.5 sm:p-4 md:pt-6 md:px-6 relative">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-orange-500 to-orange-600 shadow-[0_0_20px_hsl(25_95%_53%/0.4)]">
                  <Banknote className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground truncate">Disponível Saque</p>
                  <p className="text-xs sm:text-sm md:text-lg lg:text-xl font-bold text-orange-600">{formatCurrency((displayStats as any)?.available_for_withdrawal || 0)}</p>
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
        delay: 0.6
      }} whileHover={{
        scale: 1.02
      }}>
          <Card className="glass border-border/50 overflow-hidden relative h-full">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none" />
            <CardContent className="p-2.5 sm:p-4 md:pt-6 md:px-6 relative">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-red-500 to-red-600 shadow-[0_0_20px_hsl(0_84%_60%/0.4)]">
                  <XCircle className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground truncate">Cancelados</p>
                  <p className="text-xs sm:text-sm md:text-lg lg:text-xl font-bold text-red-600">{formatCurrency((displayStats as any)?.cancelled_commission || 0)}</p>
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
                }} whileTap={{
                  scale: 0.98
                }} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border/50 cursor-pointer hover:bg-muted/70 transition-colors" onClick={() => {
                  setActiveTab('stores');
                  setSelectedStore(store);
                }}>
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

      {/* Maturity Chart - Cronograma de Liberação */}
      {maturityChartData.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
          <Card className="glass border-border/50 overflow-hidden">
            <CardHeader className="p-4 sm:p-6 bg-gradient-to-r from-amber-500/10 to-transparent">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
                  <CalendarIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                </div>
                <span className="gradient-text">Cronograma de Liberação</span>
              </CardTitle>
              <CardDescription className="text-[10px] sm:text-sm">
                Comissões que serão liberadas nos próximos dias
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-2 sm:pt-4">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={maturityChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="dateDisplay" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(value) => `R$${value}`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    formatter={(value: number) => [formatCurrency(value), 'Liberação']}
                    labelFormatter={(label, payload) => {
                      if (payload && payload[0]?.payload?.fullDate) {
                        return payload[0].payload.fullDate;
                      }
                      return label;
                    }}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="hsl(38, 92%, 50%)" 
                    radius={[6, 6, 0, 0]}
                    name="Liberação"
                  />
                </BarChart>
              </ResponsiveContainer>
              
              {/* Resumo total em maturação */}
              <div className="mt-4 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Timer className="h-4 w-4 text-amber-600" />
                  <span className="text-sm text-muted-foreground">Total em maturação:</span>
                </div>
                <span className="font-bold text-amber-600">
                  {formatCurrency(maturityChartData.reduce((sum, d) => sum + d.value, 0))}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

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

  // Filtered and sorted stores
  const filteredStores = useMemo(() => {
    let result = [...affiliateStores];

    // Apply search filter
    if (storesSearch.trim()) {
      const searchLower = storesSearch.toLowerCase();
      result = result.filter(store => store.store_name.toLowerCase().includes(searchLower) || store.coupon_code?.toLowerCase().includes(searchLower) || store.coupons?.some(c => c.code.toLowerCase().includes(searchLower)));
    }

    // Apply status filter
    if (storesStatusFilter === 'with_commission') {
      result = result.filter(store => store.total_commission > 0);
    } else if (storesStatusFilter !== 'all') {
      result = result.filter(store => store.status === storesStatusFilter);
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (storesSortBy) {
        case 'name':
          return a.store_name.localeCompare(b.store_name);
        case 'sales':
          return b.total_sales - a.total_sales;
        case 'commission':
          return b.total_commission - a.total_commission;
        case 'pending':
          return b.pending_commission - a.pending_commission;
        default:
          return 0;
      }
    });
    return result;
  }, [affiliateStores, storesSearch, storesStatusFilter, storesSortBy]);
  const totalStoresCommission = useMemo(() => filteredStores.reduce((sum, store) => sum + store.total_commission, 0), [filteredStores]);
  const hasStoresFilters = storesSearch.trim() || storesStatusFilter !== 'all' || storesSortBy !== 'name';

  // Stores Tab Content
  const renderStoresContent = () => <div className="space-y-4">
      <Card className="glass border-border/50">
        <CardHeader className="p-4 sm:p-6 pb-0 sm:pb-0">
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            Lojas & Convites
          </CardTitle>
          <CardDescription>
            Gerencie suas lojas parceiras e convites pendentes
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-4">
          <Tabs value={storesSubTab} onValueChange={setStoresSubTab} className="w-full">
            <TabsList className="w-full grid grid-cols-2 mb-4">
              <TabsTrigger value="stores" className="gap-2">
                <Store className="h-4 w-4" />
                Lojas
              </TabsTrigger>
              <TabsTrigger value="invites" className="gap-2">
                <Users className="h-4 w-4" />
                Convites
                {pendingInvites.length > 0 && <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1 text-[10px]">
                    {pendingInvites.length}
                  </Badge>}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="stores" className="mt-0 space-y-4">
              {/* Search and Filters */}
              {affiliateStores.length > 0 && <div className="space-y-4">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Buscar por nome da loja ou cupom..." value={storesSearch} onChange={e => setStoresSearch(e.target.value)} className="pl-9" />
                  </div>
                  
                  {/* Filters Row */}
                  <div className="flex flex-wrap gap-2">
                    <Select value={storesStatusFilter} onValueChange={setStoresStatusFilter}>
                      <SelectTrigger className="w-[140px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os status</SelectItem>
                        <SelectItem value="active">Ativas</SelectItem>
                        <SelectItem value="pending">Pendentes</SelectItem>
                        <SelectItem value="with_commission">Com saldo disponível</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={storesSortBy} onValueChange={setStoresSortBy}>
                      <SelectTrigger className="w-[160px]">
                        <TrendingUp className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Ordenar por" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name">Nome A-Z</SelectItem>
                        <SelectItem value="sales">Maior Vendas</SelectItem>
                        <SelectItem value="commission">Maior Comissão</SelectItem>
                        <SelectItem value="pending">Maior Pendente</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {hasStoresFilters && <Button variant="outline" size="sm" onClick={() => {
                  setStoresSearch('');
                  setStoresStatusFilter('all');
                  setStoresSortBy('name');
                }} className="gap-2">
                        <XCircle className="h-4 w-4" />
                        Limpar filtros
                      </Button>}
                  </div>
                  
                  {/* Results Counter */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {filteredStores.length} {filteredStores.length === 1 ? 'loja encontrada' : 'lojas encontradas'}
                    </span>
                    <span className="font-medium text-emerald-600">
                      Total disponível: {formatCurrency(totalStoresCommission)}
                    </span>
                  </div>
                </div>}

              {affiliateStores.length === 0 ? <div className="py-12 text-center">
                  <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhuma loja vinculada</h3>
                  <p className="text-muted-foreground">
                    Aguarde um convite de uma loja parceira para começar a ganhar comissões.
                  </p>
                </div> : filteredStores.length === 0 ? <div className="py-12 text-center">
                  <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhuma loja encontrada</h3>
                  <p className="text-muted-foreground">
                    Tente ajustar os filtros ou o termo de busca.
                  </p>
                </div> : <div className="grid gap-4 md:grid-cols-2">
                  {filteredStores.map(store => <motion.div key={store.store_affiliate_id} whileHover={{
                scale: 1.02
              }} whileTap={{
                scale: 0.98
              }}>
                      <Card className="glass border-border/50 overflow-hidden cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedStore(store)}>
                        <CardHeader className="pb-3 p-3 sm:p-6 sm:pb-3">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                            <div className="flex items-center gap-3">
                              {store.store_logo ? <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden ring-2 ring-primary/20 shadow-glow flex-shrink-0">
                                  <img src={store.store_logo} alt={store.store_name} className="w-full h-full object-cover" />
                                </div> : <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary to-primary-glow rounded-lg flex items-center justify-center shadow-glow flex-shrink-0">
                                  <Store className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                                </div>}
                              <div className="min-w-0 flex-1">
                                <CardTitle className="text-sm sm:text-base truncate">{store.store_name}</CardTitle>
                                <CardDescription className="text-xs sm:text-sm truncate">
                                  {store.coupons?.length ? `${store.coupons.length} cupom(s)` : store.coupon_code ? `Cupom: ${store.coupon_code}` : 'Sem cupom'}
                                </CardDescription>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 self-end sm:self-auto">
                              <Badge className={`text-[10px] sm:text-xs ${store.status === 'active' ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : ''}`} variant={store.status === 'active' ? 'default' : 'secondary'}>
                                {store.status === 'active' ? 'Ativo' : 'Pendente'}
                              </Badge>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0 p-3 sm:p-6 sm:pt-0">
                          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 sm:gap-2 text-center">
                            <div className="p-1.5 sm:p-2 bg-muted/50 rounded-lg">
                              <p className="text-[8px] sm:text-[10px] text-muted-foreground leading-tight">Vendas</p>
                              <p className="font-semibold text-[10px] sm:text-xs">{formatCurrency(store.total_sales)}</p>
                            </div>
                            <div className="p-1.5 sm:p-2 bg-purple-500/10 rounded-lg">
                              <p className="text-[8px] sm:text-[10px] text-muted-foreground leading-tight">Ganhos</p>
                              <p className="font-semibold text-[10px] sm:text-xs text-purple-600">{formatCurrency(getStorePaidWithdrawals(store.store_id))}</p>
                            </div>
                            <div className="p-1.5 sm:p-2 bg-yellow-500/10 rounded-lg">
                              <p className="text-[8px] sm:text-[10px] text-muted-foreground leading-tight">Pendente</p>
                              <p className="font-semibold text-[10px] sm:text-xs text-yellow-600">{formatCurrency(store.pending_commission)}</p>
                            </div>
                            <div className="p-1.5 sm:p-2 bg-emerald-500/10 rounded-lg col-span-1.5 sm:col-span-1">
                              <p className="text-[8px] sm:text-[10px] text-muted-foreground leading-tight">Saque</p>
                              <p className="font-semibold text-[10px] sm:text-xs text-emerald-600">{formatCurrency(store.total_commission)}</p>
                            </div>
                            <div className="p-1.5 sm:p-2 bg-red-500/10 rounded-lg col-span-1.5 sm:col-span-1">
                              <p className="text-[8px] sm:text-[10px] text-muted-foreground leading-tight">Cancelados</p>
                              <p className="font-semibold text-[10px] sm:text-xs text-red-600">{formatCurrency(getStoreCancelledCommission(store.store_affiliate_id))}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>)}
                </div>}
            </TabsContent>
            
            <TabsContent value="invites" className="mt-0">
              <AffiliatePendingInvites invites={pendingInvites} onAccept={acceptInvite} onReject={rejectInvite} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
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
                      {order.customer_name?.split(' ')[0] || '-'}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
            <div className="p-3 sm:p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <CheckCircle className="h-4 w-4 shrink-0" />
                <span className="text-xs sm:text-sm truncate">Total Pago</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-green-600">
                {formatCurrency(affiliateStats?.paid_commission || 0)}
              </p>
            </div>
            <div className="p-3 sm:p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Banknote className="h-4 w-4 shrink-0" />
                <span className="text-xs sm:text-sm truncate">Disponível</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-orange-600">
                {formatCurrency(affiliateStats?.total_commission || 0)}
              </p>
            </div>
          </div>

          <Separator />

          {/* Toggle between Stores and Orders view */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
                <button
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${commissionViewMode === 'stores' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={() => setCommissionViewMode('stores')}
                >
                  <Store className="h-4 w-4 inline-block mr-1.5" />
                  Por Loja
                </button>
                <button
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${commissionViewMode === 'orders' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={() => setCommissionViewMode('orders')}
                >
                  <Package className="h-4 w-4 inline-block mr-1.5" />
                  Por Pedido
                </button>
              </div>

              {commissionViewMode === 'stores' && (
                <label className="flex items-center gap-2 text-xs sm:text-sm cursor-pointer whitespace-nowrap ml-auto">
                  <input type="checkbox" checked={storesStatusFilter === 'available'} onChange={e => setStoresStatusFilter(e.target.checked ? 'available' : 'all')} className="h-4 w-4 rounded border-border" />
                  <span className="text-muted-foreground">Só c/ Saldo</span>
                </label>
              )}
            </div>

            {/* Filters based on view mode */}
            {commissionViewMode === 'stores' ? (
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar loja..." className="pl-9 w-full" value={storesSearch} onChange={e => setStoresSearch(e.target.value)} />
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar pedido..." className="pl-9 w-full" value={commissionsOrderSearch} onChange={e => setCommissionsOrderSearch(e.target.value)} />
                </div>
                <Select value={commissionsStoreFilter} onValueChange={setCommissionsStoreFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filtrar por loja" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as lojas</SelectItem>
                    {affiliateStores.map(store => (
                      <SelectItem key={store.store_affiliate_id} value={store.store_id}>
                        {store.store_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Content based on view mode */}
          {commissionViewMode === 'stores' ? (
            <div className="space-y-2">
              {affiliateStores.filter(store => store.store_name.toLowerCase().includes(storesSearch.toLowerCase())).filter(store => storesStatusFilter === 'available' ? store.total_commission > 0 : true).map(store => <div key={store.store_affiliate_id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted/70 transition-colors" onClick={() => {
              setActiveTab('stores');
              setSelectedStore(store);
            }}>
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
              {affiliateStores.filter(store => store.store_name.toLowerCase().includes(storesSearch.toLowerCase())).filter(store => storesStatusFilter === 'available' ? store.total_commission > 0 : true).length === 0 && <p className="text-center text-muted-foreground py-4">Nenhuma loja encontrada</p>}
            </div>
          ) : (
            <div className="space-y-2">
              {affiliateOrders
                .filter(order => {
                  const matchesSearch = commissionsOrderSearch === '' || 
                    order.order_number.toLowerCase().includes(commissionsOrderSearch.toLowerCase()) ||
                    order.customer_name.toLowerCase().includes(commissionsOrderSearch.toLowerCase());
                  const matchesStore = commissionsStoreFilter === 'all' || order.store_id === commissionsStoreFilter;
                  return matchesSearch && matchesStore;
                })
                .slice(0, 10)
                .map(order => {
                  const store = affiliateStores.find(s => s.store_id === order.store_id);
                  const isDelivered = order.order_status === 'entregue' || order.order_status === 'delivered';
                  const isCancelled = order.order_status === 'cancelado' || order.order_status === 'cancelled';
                  const isMaturing = isDelivered && order.commission_available_at && new Date(order.commission_available_at) > new Date();
                  
                  return (
                    <div key={order.earning_id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted/70 transition-colors" onClick={() => {
                      openOrderModal(order);
                    }}>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">#{order.order_number}</span>
                          <Badge variant={isCancelled ? 'destructive' : isDelivered ? 'default' : 'secondary'} className="text-xs">
                            {isCancelled ? 'Cancelado' : isDelivered ? 'Entregue' : 'Pendente'}
                          </Badge>
                          {isMaturing && order.commission_available_at && (
                            <MaturityCountdown 
                              commissionAvailableAt={order.commission_available_at} 
                              orderStatus={order.order_status}
                              variant="inline"
                            />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">{store?.store_name || 'Loja'}</span>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`font-semibold ${isCancelled ? 'text-destructive line-through' : 'text-green-600'}`}>
                          {formatCurrency(order.commission_amount)}
                        </span>
                        {isDelivered && !isMaturing && !isCancelled && (
                          <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                            Disponível
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              {affiliateOrders.filter(order => {
                const matchesSearch = commissionsOrderSearch === '' || 
                  order.order_number.toLowerCase().includes(commissionsOrderSearch.toLowerCase()) ||
                  order.customer_name.toLowerCase().includes(commissionsOrderSearch.toLowerCase());
                const matchesStore = commissionsStoreFilter === 'all' || order.store_id === commissionsStoreFilter;
                return matchesSearch && matchesStore;
              }).length === 0 && <p className="text-center text-muted-foreground py-4">Nenhum pedido encontrado</p>}
              {affiliateOrders.filter(order => {
                const matchesSearch = commissionsOrderSearch === '' || 
                  order.order_number.toLowerCase().includes(commissionsOrderSearch.toLowerCase()) ||
                  order.customer_name.toLowerCase().includes(commissionsOrderSearch.toLowerCase());
                const matchesStore = commissionsStoreFilter === 'all' || order.store_id === commissionsStoreFilter;
                return matchesSearch && matchesStore;
              }).length > 10 && (
                <p className="text-center text-muted-foreground text-sm py-2">
                  Mostrando 10 de {affiliateOrders.filter(order => {
                    const matchesSearch = commissionsOrderSearch === '' || 
                      order.order_number.toLowerCase().includes(commissionsOrderSearch.toLowerCase()) ||
                      order.customer_name.toLowerCase().includes(commissionsOrderSearch.toLowerCase());
                    const matchesStore = commissionsStoreFilter === 'all' || order.store_id === commissionsStoreFilter;
                    return matchesSearch && matchesStore;
                  }).length} pedidos
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>;

  // Handle avatar file selection - opens crop dialog
  const handleAvatarSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !affiliateUser) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }

    // Create object URL for cropping
    const objectUrl = URL.createObjectURL(file);
    setTempImageUrl(objectUrl);
    setCropDialogOpen(true);

    // Reset input
    event.target.value = '';
  };

  // Handle cropped image upload
  const handleCropComplete = async (croppedBlob: Blob) => {
    if (!affiliateUser) return;
    setUploadingAvatar(true);
    try {
      const fileName = `${affiliateUser.id}.jpg`;
      const filePath = `${fileName}`;

      // Upload to Supabase Storage
      const {
        error: uploadError
      } = await supabase.storage.from('affiliate-avatars').upload(filePath, croppedBlob, {
        upsert: true,
        contentType: 'image/jpeg'
      });
      if (uploadError) throw uploadError;

      // Get public URL with cache buster
      const {
        data: {
          publicUrl
        }
      } = supabase.storage.from('affiliate-avatars').getPublicUrl(filePath);
      const urlWithCacheBuster = `${publicUrl}?t=${Date.now()}`;

      // Update affiliate account
      const result = await updateAvatarUrl(urlWithCacheBuster);
      if (result.success) {
        toast.success('Foto atualizada com sucesso!');
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error('Erro ao enviar foto: ' + error.message);
    } finally {
      setUploadingAvatar(false);
      if (tempImageUrl) {
        URL.revokeObjectURL(tempImageUrl);
        setTempImageUrl(null);
      }
    }
  };

  // Profile Tab Content
  const renderProfileContent = () => <Card>
      <CardHeader>
        <CardTitle>Meus Dados</CardTitle>
        <CardDescription>
          Informações da sua conta de afiliado
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar Upload Section */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-muted ring-2 ring-primary/20">
              {affiliateUser?.avatar_url ? <img src={affiliateUser.avatar_url} alt="Avatar" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary to-primary/60">
                  <User className="h-10 w-10 text-white" />
                </div>}
            </div>
            <label className="absolute bottom-0 right-0 p-2 bg-primary rounded-full cursor-pointer hover:bg-primary/90 transition-colors shadow-lg">
              {uploadingAvatar ? <Loader2 className="h-4 w-4 text-white animate-spin" /> : <Camera className="h-4 w-4 text-white" />}
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} disabled={uploadingAvatar} />
            </label>
          </div>
          <p className="text-sm text-muted-foreground">Clique no ícone para alterar a foto</p>
          
          {/* Avatar Crop Dialog */}
          {tempImageUrl && <AvatarCropDialog open={cropDialogOpen} onOpenChange={open => {
          setCropDialogOpen(open);
          if (!open && tempImageUrl) {
            URL.revokeObjectURL(tempImageUrl);
            setTempImageUrl(null);
          }
        }} imageUrl={tempImageUrl} onCropComplete={handleCropComplete} />}
        </div>

        <Separator />

        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-muted-foreground">Dados do Perfil</span>
          {!editingProfile ? <Button variant="ghost" size="sm" onClick={() => {
          setEditEmail(affiliateUser?.email || '');
          setEditPhone(affiliateUser?.phone || '');
          setEditingProfile(true);
        }} className="gap-2">
              <Pencil className="h-4 w-4" />
              Editar
            </Button> : <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditingProfile(false)} disabled={savingProfile}>
                <X className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={async () => {
            setSavingProfile(true);
            const result = await updateProfile({
              email: editEmail,
              phone: editPhone
            });
            if (result.success) {
              toast.success('Perfil atualizado com sucesso!');
              setEditingProfile(false);
            } else {
              toast.error(result.error || 'Erro ao atualizar perfil');
            }
            setSavingProfile(false);
          }} disabled={savingProfile} className="gap-2">
                {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar
              </Button>
            </div>}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Nome</p>
            <p className="font-medium">{affiliateUser?.name || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">E-mail</p>
            {editingProfile ? <Input value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="seu@email.com" type="email" /> : <p className="font-medium">{affiliateUser?.email || '-'}</p>}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Telefone</p>
            {editingProfile ? <Input value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="(00) 00000-0000" /> : <p className="font-medium">{affiliateUser?.phone || '-'}</p>}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">CPF/CNPJ</p>
            <p className="font-medium">{affiliateUser?.cpf_cnpj || '-'}</p>
          </div>
        </div>

        <Separator />

        <div>
          <p className="text-sm text-muted-foreground mb-1">Chave PIX para recebimento</p>
          {(() => {
          const rawPixKey = affiliateUser?.pix_key || affiliateUser?.cpf_cnpj;
          if (!rawPixKey) {
            return <p className="text-muted-foreground italic">Nenhuma chave PIX cadastrada</p>;
          }
          const pixInfo = formatPixKey(rawPixKey);
          return <div className="space-y-2">
                <code className="p-2 bg-muted rounded text-sm font-mono">
                  {pixInfo.formatted}
                </code>
                <div className="flex items-center gap-2">
                  <Badge variant={pixInfo.isValid ? 'default' : 'destructive'} className={pixInfo.isValid ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : ''}>
                    {pixInfo.isValid ? <><CheckCircle className="h-3 w-3 mr-1" /> {pixInfo.type}</> : <><XCircle className="h-3 w-3 mr-1" /> Formato inválido</>}
                  </Badge>
                </div>
              </div>;
        })()}
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
      case 'withdrawals':
        return <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Wallet className="h-6 w-6 text-primary" />
              <div>
                <h2 className="text-xl font-semibold">Meus Saques</h2>
                <p className="text-sm text-muted-foreground">Histórico de solicitações de saque</p>
              </div>
            </div>
            <AffiliateWithdrawalHistory requests={withdrawalRequests} isLoading={loadingWithdrawals} stores={affiliateStores} />
          </div>;
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
        <AffiliateDashboardSidebar activeTab={activeTab} onTabChange={setActiveTab} affiliateName={affiliateUser?.name} affiliateAvatarUrl={affiliateUser?.avatar_url} onSignOut={handleLogout} pendingInvitesCount={pendingInvites.length} />

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
      {withdrawalStore && affiliateDbId && <RequestWithdrawalDialog open={withdrawalDialogOpen} onOpenChange={setWithdrawalDialogOpen} affiliateId={affiliateDbId} storeAffiliateId={withdrawalStore.store_affiliate_id} storeId={withdrawalStore.store_id} storeName={withdrawalStore.store_name} availableAmount={withdrawalStore.total_commission} maturingAmount={(withdrawalStore as any).maturing_commission || 0} maturityDays={(withdrawalStore as any).maturity_days || 7} defaultPixKey={affiliateUser?.cpf_cnpj || affiliateUser?.pix_key || ''} onSubmit={handleCreateWithdrawal} />}

      {/* Modal de Detalhes do Saque */}
      <ResponsiveDialog open={!!selectedWithdrawal} onOpenChange={open => !open && setSelectedWithdrawal(null)}>
        <ResponsiveDialogContent className="max-w-lg">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-emerald-600" />
              Detalhes do Saque
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {selectedWithdrawal && <div className="flex items-center justify-between mt-2">
                  <span className="font-bold text-xl text-emerald-600">{formatCurrency(selectedWithdrawal.amount)}</span>
                  {getWithdrawalStatusBadge(selectedWithdrawal.status)}
                </div>}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          {selectedWithdrawal && <div className="space-y-4">
              {/* Informações do saque */}
              <div className="grid grid-cols-2 gap-3 text-sm bg-muted/30 p-3 rounded-lg">
                <div>
                  <span className="text-muted-foreground text-xs">Solicitado em:</span>
                  <p className="font-medium">{formatDate(selectedWithdrawal.requested_at)}</p>
                </div>
                {selectedWithdrawal.paid_at && <div>
                    <span className="text-muted-foreground text-xs">Pago em:</span>
                    <p className="font-medium">{formatDate(selectedWithdrawal.paid_at)}</p>
                  </div>}
                {selectedWithdrawal.pix_key && <div className="col-span-2">
                    <span className="text-muted-foreground text-xs">Chave PIX:</span>
                    <p className="font-medium font-mono">{selectedWithdrawal.pix_key}</p>
                  </div>}
                {selectedWithdrawal.admin_notes && <div className="col-span-2">
                    <span className="text-muted-foreground text-xs">Observação:</span>
                    <p className="text-sm">{selectedWithdrawal.admin_notes}</p>
                  </div>}
              </div>

              {/* Lista de pedidos do saque */}
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4" />
                  Pedidos incluídos neste saque
                </h4>
                
                {loadingWithdrawalOrders ? <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div> : withdrawalOrders.length === 0 ? <div className="text-center py-4 text-muted-foreground text-sm bg-muted/20 rounded-lg">
                    Nenhum pedido encontrado para este saque
                  </div> : <div className="space-y-2 max-h-60 overflow-y-auto">
                    {withdrawalOrders.map((order, idx) => <div key={order.order_id || idx} className="flex items-center justify-between p-2 bg-muted/20 rounded-lg text-sm">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">#{order.order_number}</p>
                          <p className="text-xs text-muted-foreground truncate">{order.customer_name}</p>
                        </div>
                        <div className="text-right ml-2">
                          <p className="font-medium text-emerald-600">{formatCurrency(order.commission_amount)}</p>
                          <p className="text-xs text-muted-foreground">{formatCurrency(order.order_total)}</p>
                        </div>
                      </div>)}
                    
                    {/* Total */}
                    <div className="flex items-center justify-between p-2 bg-emerald-500/10 rounded-lg text-sm border border-emerald-500/20">
                      <span className="font-semibold">Total Comissões</span>
                      <span className="font-bold text-emerald-600">
                        {formatCurrency(withdrawalOrders.reduce((sum, o) => sum + (o.commission_amount || 0), 0))}
                      </span>
                    </div>
                  </div>}
              </div>
            </div>}

          <ResponsiveDialogFooter>
            <Button variant="outline" onClick={() => setSelectedWithdrawal(null)}>
              Fechar
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>;
}