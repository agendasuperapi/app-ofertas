import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAffiliateAuth, AffiliateOrderItem, AffiliateOrder } from '@/hooks/useAffiliateAuth';
import { useAffiliateEarningsNotification } from '@/hooks/useAffiliateEarningsNotification';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollableTable } from '@/components/ui/scrollable-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AffiliateDashboardSidebar } from '@/components/dashboard/AffiliateDashboardSidebar';
import { AffiliateDashboardBottomNav } from '@/components/dashboard/AffiliateDashboardBottomNav';
import { toast } from 'sonner';
import {
  Users,
  DollarSign,
  Store,
  TrendingUp,
  Copy,
  LogOut,
  Loader2,
  Clock,
  CheckCircle,
  Building2,
  Wallet,
  BarChart3,
  User,
  Link,
  Ticket,
  ShoppingBag,
  Package,
  Target,
  Ban,
  Calculator,
  Home
} from 'lucide-react';

export default function AffiliateDashboardNew() {
  const {
    affiliateUser,
    affiliateStores,
    affiliateStats,
    affiliateOrders,
    isLoading,
    affiliateLogout,
    refreshData,
    fetchOrderItems
  } = useAffiliateAuth();

  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('home');
  const [selectedOrder, setSelectedOrder] = useState<AffiliateOrder | null>(null);
  const [orderModalItems, setOrderModalItems] = useState<AffiliateOrderItem[]>([]);
  const [loadingModalItems, setLoadingModalItems] = useState(false);

  // Extrair IDs dos store_affiliates para notificações em tempo real
  const storeAffiliateIds = useMemo(() => 
    affiliateStores.map(s => s.store_affiliate_id).filter(Boolean),
    [affiliateStores]
  );

  // Hook de notificação de ganhos em tempo real
  const handleNewEarning = useCallback(() => {
    refreshData();
  }, [refreshData]);

  useAffiliateEarningsNotification({
    storeAffiliateIds,
    onNewEarning: handleNewEarning
  });

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando painel...</p>
        </div>
      </div>
    );
  }

  // Render Stats Cards (reusable)
  const renderStatsCards = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        whileHover={{ scale: 1.02 }}
      >
        <Card className="glass border-border/50 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
          <CardContent className="p-3 sm:pt-6 sm:px-6 relative">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-blue-500 to-blue-600 shadow-[0_0_20px_hsl(217_91%_60%/0.4)]">
                <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Lojas</p>
                <p className="text-lg sm:text-2xl font-bold gradient-text">{affiliateStats?.total_stores || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        whileHover={{ scale: 1.02 }}
      >
        <Card className="glass border-border/50 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent pointer-events-none" />
          <CardContent className="p-3 sm:pt-6 sm:px-6 relative">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-green-500 to-emerald-600 shadow-[0_0_20px_hsl(142_76%_36%/0.4)]">
                <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Total Vendas</p>
                <p className="text-base sm:text-2xl font-bold text-green-600 truncate">{formatCurrency(affiliateStats?.total_sales || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        whileHover={{ scale: 1.02 }}
      >
        <Card className="glass border-border/50 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent pointer-events-none" />
          <CardContent className="p-3 sm:pt-6 sm:px-6 relative">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-yellow-500 to-amber-600 shadow-[0_0_20px_hsl(45_93%_47%/0.4)]">
                <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Pendente</p>
                <p className="text-base sm:text-2xl font-bold text-yellow-600 truncate">{formatCurrency(affiliateStats?.pending_commission || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        whileHover={{ scale: 1.02 }}
      >
        <Card className="glass border-border/50 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
          <CardContent className="p-3 sm:pt-6 sm:px-6 relative">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-primary to-primary-glow shadow-glow">
                <Wallet className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Total Ganhos</p>
                <p className="text-base sm:text-2xl font-bold gradient-text truncate">{formatCurrency(affiliateStats?.total_commission || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );

  // Home Tab Content
  const renderHomeContent = () => (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {renderStatsCards()}
      
      {/* Quick Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="glass border-border/50 overflow-hidden">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-glow">
                <Home className="h-4 w-4 text-white" />
              </div>
              <span className="gradient-text">Bem-vindo, {affiliateUser?.name?.split(' ')[0]}!</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Resumo rápido do seu desempenho como afiliado
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <div className="p-3 sm:p-4 bg-muted/50 rounded-lg border border-border/50">
                <div className="flex items-center gap-1.5 sm:gap-2 text-muted-foreground mb-1">
                  <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="text-xs sm:text-sm">Total de Pedidos</span>
                </div>
                <p className="text-xl sm:text-2xl font-bold">{affiliateStats?.total_orders || 0}</p>
              </div>
              <div className="p-3 sm:p-4 bg-muted/50 rounded-lg border border-border/50">
                <div className="flex items-center gap-1.5 sm:gap-2 text-muted-foreground mb-1">
                  <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="text-xs sm:text-sm">Total Pago</span>
                </div>
                <p className="text-lg sm:text-2xl font-bold text-green-600 truncate">
                  {formatCurrency(affiliateStats?.paid_commission || 0)}
                </p>
              </div>
            </div>

            {affiliateStores.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium mb-3">Suas Lojas</h4>
                  <div className="space-y-2">
                    {affiliateStores.slice(0, 3).map((store) => (
                      <motion.div
                        key={store.store_affiliate_id}
                        whileHover={{ scale: 1.01 }}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border/50"
                      >
                        <div className="flex items-center gap-3">
                          {store.store_logo ? (
                            <img
                              src={store.store_logo}
                              alt={store.store_name}
                              className="w-8 h-8 rounded object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                              <Store className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <span className="font-medium">{store.store_name}</span>
                        </div>
                        <span className="font-semibold text-green-600">
                          {formatCurrency(store.total_commission)}
                        </span>
                      </motion.div>
                    ))}
                    {affiliateStores.length > 3 && (
                      <Button 
                        variant="ghost" 
                        className="w-full" 
                        onClick={() => setActiveTab('stores')}
                      >
                        Ver todas as {affiliateStores.length} lojas
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
        </CardContent>
      </Card>
      </motion.div>
    </motion.div>
  );

  // Stores Tab Content
  const renderStoresContent = () => (
    <div className="space-y-4">
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

      {affiliateStores.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma loja vinculada</h3>
            <p className="text-muted-foreground">
              Aguarde um convite de uma loja parceira para começar a ganhar comissões.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {affiliateStores.map((store) => (
            <Card key={store.store_affiliate_id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {store.store_logo ? (
                      <img
                        src={store.store_logo}
                        alt={store.store_name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                        <Store className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-base">{store.store_name}</CardTitle>
                      <CardDescription>
                        {store.coupon_code 
                          ? `Cupom: ${store.coupon_code}`
                          : 'Sem cupom vinculado'}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant={store.status === 'active' ? 'default' : 'secondary'}>
                    {store.status === 'active' ? 'Ativo' : 'Pendente'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Vendas</p>
                    <p className="font-semibold">{formatCurrency(store.total_sales)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Ganhos</p>
                    <p className="font-semibold text-green-600">{formatCurrency(store.total_commission)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Pendente</p>
                    <p className="font-semibold text-yellow-600">{formatCurrency(store.pending_commission)}</p>
                  </div>
                </div>

                {(store.coupons && store.coupons.length > 0) || store.coupon_code ? (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Ticket className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">
                          {(store.coupons?.length || 1) > 1 
                            ? `Seus cupons de desconto (${store.coupons?.length})` 
                            : 'Seu cupom de desconto'}
                        </span>
                      </div>
                      
                      {(store.coupons && store.coupons.length > 0 
                        ? store.coupons 
                        : store.coupon_code 
                          ? [{ code: store.coupon_code, discount_type: store.coupon_discount_type || '', discount_value: store.coupon_discount_value || 0 }]
                          : []
                      ).map((coupon, idx) => (
                        <div key={idx} className="p-3 bg-primary/5 rounded-lg border border-primary/20 space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="font-mono font-bold text-xl text-primary">{coupon.code}</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(coupon.code, 'Cupom')}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          {coupon.discount_type && (
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">
                                {coupon.discount_type === 'percentage' 
                                  ? `${coupon.discount_value}% de desconto`
                                  : `${formatCurrency(coupon.discount_value || 0)} de desconto`}
                              </p>
                              <div className="text-xs text-muted-foreground/70">
                                {coupon.applies_to === 'all' || !coupon.applies_to ? (
                                  <span className="inline-flex items-center gap-1">
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Geral</Badge>
                                    <span>Vale para todos os produtos</span>
                                  </span>
                                ) : coupon.applies_to === 'categories' && coupon.category_names?.length ? (
                                  <span className="inline-flex items-center gap-1 flex-wrap">
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Categorias</Badge>
                                    <span>{coupon.category_names.join(', ')}</span>
                                  </span>
                                ) : coupon.applies_to === 'products' && coupon.product_ids?.length ? (
                                  <span className="inline-flex items-center gap-1">
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Produtos</Badge>
                                    <span>{coupon.product_ids.length} produto(s) específico(s)</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1">
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Geral</Badge>
                                    <span>Vale para todos os produtos</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                          
                          <div className="pt-2 border-t border-primary/10">
                            <div className="flex items-center gap-2 mb-2">
                              <Link className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">Link de afiliado</span>
                            </div>
                            <div className="flex gap-2">
                              <Input
                                value={`https://ofertas.app/${store.store_slug}?cupom=${coupon.code}`}
                                readOnly
                                className="font-mono text-xs h-8"
                              />
                              <Button
                                variant="default"
                                size="sm"
                                className="h-8"
                                onClick={() => copyToClipboard(
                                  `https://ofertas.app/${store.store_slug}?cupom=${coupon.code}`,
                                  'Link de afiliado'
                                )}
                              >
                                <Copy className="h-3 w-3 mr-1" />
                                Copiar
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      <p className="text-xs text-muted-foreground text-center">
                        Compartilhe o link. O cupom será aplicado automaticamente!
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <Separator />
                    <div className="p-3 bg-muted rounded-lg text-center">
                      <Ticket className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Aguardando vinculação de cupom pelo lojista
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  // Orders Tab Content
  const renderOrdersContent = () => (
    <Card>
      <CardHeader>
        <CardTitle>Meus Pedidos</CardTitle>
        <CardDescription>
          Pedidos realizados com seus cupons e comissões ganhas
        </CardDescription>
      </CardHeader>
      <CardContent>
        {affiliateOrders.length === 0 ? (
          <div className="py-12 text-center">
            <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum pedido ainda</h3>
            <p className="text-muted-foreground">
              Quando clientes usarem seus cupons, os pedidos aparecerão aqui.
            </p>
          </div>
        ) : (
          <ScrollableTable>
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
                {affiliateOrders.map((order) => (
                  <TableRow 
                    key={order.earning_id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openOrderModal(order)}
                  >
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
                    <TableCell className="text-right font-semibold text-green-600 whitespace-nowrap">
                      {formatCurrency(order.commission_amount)}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={order.commission_status === 'paid' ? 'default' : 'secondary'}
                        className={order.commission_status === 'paid' 
                          ? 'bg-green-500/10 text-green-600 border-green-500/20' 
                          : 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
                        }
                      >
                        {order.commission_status === 'paid' ? (
                          <><CheckCircle className="h-3 w-3 mr-1" /> Pago</>
                        ) : (
                          <><Clock className="h-3 w-3 mr-1" /> Pendente</>
                        )}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollableTable>
        )}
      </CardContent>
    </Card>
  );

  // Commissions Tab Content
  const renderCommissionsContent = () => (
    <Card>
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
              {affiliateStores.map((store) => (
                <div
                  key={store.store_affiliate_id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {store.store_logo ? (
                      <img
                        src={store.store_logo}
                        alt={store.store_name}
                        className="w-8 h-8 rounded object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                        <Store className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <span className="font-medium">{store.store_name}</span>
                  </div>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(store.total_commission)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Profile Tab Content
  const renderProfileContent = () => (
    <Card>
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
          {affiliateUser?.pix_key ? (
            <div className="flex items-center gap-2">
              <code className="flex-1 p-2 bg-muted rounded text-sm font-mono">
                {affiliateUser.pix_key}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(affiliateUser.pix_key!, 'Chave PIX')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground italic">Nenhuma chave PIX cadastrada</p>
          )}
        </div>
      </CardContent>
    </Card>
  );

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
      case 'profile':
        return renderProfileContent();
      default:
        return renderHomeContent();
    }
  };

  return (
    <div className="min-h-screen bg-background">
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
        />

        {/* Main Content */}
        <main className="flex-1 w-full max-w-full overflow-x-hidden px-2 sm:px-4 py-4 sm:py-6 pb-24 md:pb-6">
          {renderContent()}
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      {isMobile && (
        <AffiliateDashboardBottomNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      )}

      {/* Modal de Detalhes do Pedido */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && closeOrderModal()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              Pedido #{selectedOrder?.order_number}
            </DialogTitle>
            <DialogDescription>
              Detalhes do pedido e comissão
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-6 mt-4">
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
                  <Badge 
                    variant={selectedOrder.commission_status === 'paid' ? 'default' : 'secondary'}
                    className={`mt-1 ${selectedOrder.commission_status === 'paid' 
                      ? 'bg-green-500/10 text-green-600 border-green-500/20' 
                      : 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
                    }`}
                  >
                    {selectedOrder.commission_status === 'paid' ? (
                      <><CheckCircle className="h-3 w-3 mr-1" /> Pago</>
                    ) : (
                      <><Clock className="h-3 w-3 mr-1" /> Pendente</>
                    )}
                  </Badge>
                </div>
              </div>

              {/* Itens do Pedido */}
              <div>
                <div className="flex items-center gap-2 text-sm font-medium mb-3">
                  <Package className="h-4 w-4" />
                  Itens do Pedido
                </div>
                
                {loadingModalItems ? (
                  <div className="py-8 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mt-2">Carregando itens...</p>
                  </div>
                ) : orderModalItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Nenhum item encontrado</p>
                ) : (
                  <div className="space-y-2">
                    {orderModalItems.map((item) => {
                      const itemDiscount = item.item_discount || 0;
                      
                      return (
                        <div 
                          key={item.item_id} 
                          className="p-3 bg-muted/50 rounded-lg border space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium text-sm">{item.product_name}</p>
                                {item.is_coupon_eligible ? (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-500/10 text-green-600 border-green-500/20">
                                    Com desconto
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-gray-500/10 text-gray-500 border-gray-500/20">
                                    Sem desconto
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {item.quantity}x {formatCurrency(item.unit_price)} = {formatCurrency(item.subtotal)}
                                {itemDiscount > 0 && (
                                  <span className="text-orange-500 ml-1">
                                    (-{formatCurrency(itemDiscount)})
                                  </span>
                                )}
                                {item.item_value_with_discount !== undefined && item.item_value_with_discount !== item.subtotal && (
                                  <span className="text-green-600 ml-1">
                                    = {formatCurrency(item.item_value_with_discount)}
                                  </span>
                                )}
                              </p>
                            </div>
                            <span className="font-semibold text-green-600 text-sm whitespace-nowrap">
                              {formatCurrency(item.item_commission)}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 flex-wrap">
                            {item.commission_source === 'specific_product' && (
                              <Badge 
                                variant="outline" 
                                className="text-[10px] px-1.5 py-0 bg-purple-500/10 text-purple-600 border-purple-500/20"
                              >
                                <Target className="h-3 w-3 mr-1" />
                                Regra específica
                              </Badge>
                            )}
                            {item.commission_source === 'default' && (
                              <Badge 
                                variant="outline" 
                                className="text-[10px] px-1.5 py-0 bg-blue-500/10 text-blue-600 border-blue-500/20"
                              >
                                <Calculator className="h-3 w-3 mr-1" />
                                Padrão
                              </Badge>
                            )}
                            {(item.commission_source === 'none' || !item.commission_source) && item.item_commission === 0 && (
                              <Badge 
                                variant="outline" 
                                className="text-[10px] px-1.5 py-0 bg-gray-500/10 text-gray-500 border-gray-500/20"
                              >
                                <Ban className="h-3 w-3 mr-1" />
                                Sem comissão
                              </Badge>
                            )}
                            
                            {item.item_commission > 0 && (
                              <span className="text-[10px] text-muted-foreground">
                                ({item.commission_type === 'percentage' 
                                  ? `${item.commission_value}%` 
                                  : formatCurrency(item.commission_value)} de comissão)
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
