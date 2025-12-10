import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollableTable } from '@/components/ui/scrollable-table';
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogDescription } from '@/components/ui/responsive-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wallet, Clock, CheckCircle, XCircle, DollarSign, Loader2, Store, FileText, Image, ExternalLink, ShoppingBag, Calendar, Key, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';

interface WithdrawalRequest {
  id: string;
  amount: number;
  status: string;
  pix_key: string | null;
  notes: string | null;
  admin_notes: string | null;
  requested_at: string;
  paid_at: string | null;
  store_name?: string;
  store_affiliate_id?: string;
  affiliate_id?: string;
  payment_proof?: string | null;
}

interface WithdrawalOrder {
  earning_id: string;
  order_id: string;
  order_number: string;
  customer_name: string;
  order_date: string;
  order_total: number;
  commission_amount: number;
}

interface AffiliateWithdrawalHistoryProps {
  requests: WithdrawalRequest[];
  isLoading: boolean;
  stores?: Array<{ store_affiliate_id: string; store_name: string }>;
}

export function AffiliateWithdrawalHistory({ requests, isLoading, stores }: AffiliateWithdrawalHistoryProps) {
  const isMobile = useIsMobile();
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [withdrawalOrders, setWithdrawalOrders] = useState<WithdrawalOrder[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20"><Clock className="h-3 w-3 mr-1" /> Pendente</Badge>;
      case 'paid':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle className="h-3 w-3 mr-1" /> Pago</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20"><XCircle className="h-3 w-3 mr-1" /> Rejeitado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleViewReceipt = (receiptUrl: string) => {
    setSelectedReceipt(receiptUrl);
    setReceiptModalOpen(true);
  };

  const handleViewDetails = (withdrawal: WithdrawalRequest) => {
    setSelectedWithdrawal(withdrawal);
    setDetailsModalOpen(true);
  };

  // Fetch orders associated with the withdrawal
  useEffect(() => {
    if (!selectedWithdrawal || !detailsModalOpen) {
      setWithdrawalOrders([]);
      return;
    }

    const fetchWithdrawalOrders = async () => {
      setIsLoadingOrders(true);
      try {
        // Build query based on available IDs
        let query = supabase
          .from('affiliate_earnings')
          .select(`
            id,
            order_id,
            order_total,
            commission_amount,
            paid_at,
            store_affiliate_id,
            affiliate_id,
            orders!inner (
              order_number,
              customer_name,
              created_at,
              status
            )
          `)
          .eq('status', 'paid');

        // Filter by store_affiliate_id or affiliate_id
        if (selectedWithdrawal.store_affiliate_id) {
          query = query.eq('store_affiliate_id', selectedWithdrawal.store_affiliate_id);
        } else if (selectedWithdrawal.affiliate_id) {
          query = query.eq('affiliate_id', selectedWithdrawal.affiliate_id);
        } else {
          // No affiliate ID available, can't fetch orders
          setWithdrawalOrders([]);
          setIsLoadingOrders(false);
          return;
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        // Filter orders that were paid around the time of this withdrawal
        const orders: WithdrawalOrder[] = (data || [])
          .filter((earning: any) => {
            // If withdrawal is paid, filter by paid_at timestamp
            if (selectedWithdrawal.status === 'paid' && selectedWithdrawal.paid_at) {
              const earningPaidAt = earning.paid_at ? new Date(earning.paid_at) : null;
              const withdrawalPaidAt = new Date(selectedWithdrawal.paid_at);
              const requestedAt = new Date(selectedWithdrawal.requested_at);
              
              // Check if earning was paid within the window of this withdrawal
              if (earningPaidAt) {
                const paidAtPlusBuffer = new Date(withdrawalPaidAt.getTime() + 60000); // 1 minute buffer
                return earningPaidAt >= requestedAt && earningPaidAt <= paidAtPlusBuffer;
              }
              return false;
            }
            
            // For pending withdrawals, show orders with delivered status
            return earning.orders?.status === 'entregue' || earning.orders?.status === 'delivered';
          })
          .map((earning: any) => ({
            earning_id: earning.id,
            order_id: earning.order_id,
            order_number: earning.orders?.order_number || '',
            customer_name: earning.orders?.customer_name || '',
            order_date: earning.orders?.created_at || '',
            order_total: earning.order_total,
            commission_amount: earning.commission_amount,
          }));

        setWithdrawalOrders(orders);
      } catch (error) {
        console.error('Error fetching withdrawal orders:', error);
        setWithdrawalOrders([]);
      } finally {
        setIsLoadingOrders(false);
      }
    };

    fetchWithdrawalOrders();
  }, [selectedWithdrawal, detailsModalOpen]);

  const stats = useMemo(() => {
    const pending = requests.filter(r => r.status === 'pending');
    const paid = requests.filter(r => r.status === 'paid');
    return {
      total: requests.length,
      pendingCount: pending.length,
      pendingAmount: pending.reduce((sum, r) => sum + r.amount, 0),
      paidAmount: paid.reduce((sum, r) => sum + r.amount, 0),
    };
  }, [requests]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-yellow-500/10 border-yellow-500/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Pendentes</p>
                  <p className="text-xl font-bold text-yellow-600">{stats.pendingCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-primary/10 border-primary/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Aguardando</p>
                  <p className="text-xl font-bold text-primary">{formatCurrency(stats.pendingAmount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="bg-green-500/10 border-green-500/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Recebido</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(stats.paidAmount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Requests List */}
      {requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Você ainda não fez nenhuma solicitação de saque</p>
          </CardContent>
        </Card>
      ) : isMobile ? (
        <div className="space-y-3">
          {requests.map((req, idx) => (
            <motion.div key={req.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
              <Card className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => handleViewDetails(req)}>
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium text-sm">{req.store_name || 'Loja'}</p>
                    </div>
                    {getStatusBadge(req.status)}
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-lg font-bold text-primary">{formatCurrency(req.amount)}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(req.requested_at), "dd/MM/yy", { locale: ptBR })}
                    </p>
                  </div>
                  {req.admin_notes && (
                    <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                      <FileText className="h-3 w-3 inline mr-1" />
                      {req.admin_notes}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card>
          <ScrollableTable>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loja</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Observações</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => (
                  <TableRow key={req.id} className="cursor-pointer hover:bg-muted/30" onClick={() => handleViewDetails(req)}>
                    <TableCell className="font-medium">{req.store_name || 'Loja'}</TableCell>
                    <TableCell className="font-bold text-primary">{formatCurrency(req.amount)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(req.requested_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>{getStatusBadge(req.status)}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">
                      {req.admin_notes || '-'}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleViewDetails(req); }}>
                        <Eye className="h-4 w-4 mr-1" />
                        Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollableTable>
        </Card>
      )}

      {/* Withdrawal Details Modal */}
      <ResponsiveDialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <ResponsiveDialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Detalhes do Saque</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Informações do saque e pedidos associados
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          {selectedWithdrawal && (
            <Tabs defaultValue="details" className="mt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">
                  <Wallet className="h-4 w-4 mr-2" />
                  Detalhes
                </TabsTrigger>
                <TabsTrigger value="orders">
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  Pedidos
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="mt-4 space-y-4">
                {/* Status and Amount */}
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Valor do Saque</p>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(selectedWithdrawal.amount)}</p>
                  </div>
                  {getStatusBadge(selectedWithdrawal.status)}
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Solicitado em</p>
                    </div>
                    <p className="font-medium">
                      {format(new Date(selectedWithdrawal.requested_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  {selectedWithdrawal.paid_at && (
                    <div className="p-3 bg-green-500/10 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <p className="text-xs text-muted-foreground">Pago em</p>
                      </div>
                      <p className="font-medium text-green-600">
                        {format(new Date(selectedWithdrawal.paid_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  )}
                </div>

                {/* PIX Key */}
                {selectedWithdrawal.pix_key && (
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Key className="h-4 w-4 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Chave PIX</p>
                    </div>
                    <p className="font-mono text-sm">{selectedWithdrawal.pix_key}</p>
                  </div>
                )}

                {/* Admin Notes */}
                {selectedWithdrawal.admin_notes && (
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Observações do Lojista</p>
                    </div>
                    <p className="text-sm">{selectedWithdrawal.admin_notes}</p>
                  </div>
                )}

                {/* Payment Proof */}
                {selectedWithdrawal.payment_proof && selectedWithdrawal.status === 'paid' && (
                  <div className="p-3 bg-green-500/10 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Image className="h-4 w-4 text-green-600" />
                      <p className="text-xs text-muted-foreground">Comprovante de Pagamento</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewReceipt(selectedWithdrawal.payment_proof!)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Comprovante
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="orders" className="mt-4">
                {isLoadingOrders ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : withdrawalOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingBag className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground text-sm">Nenhum pedido encontrado para este saque</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Summary */}
                    <div className="p-3 bg-primary/10 rounded-lg flex justify-between items-center">
                      <span className="text-sm font-medium">{withdrawalOrders.length} pedido(s)</span>
                      <span className="font-bold text-primary">
                        {formatCurrency(withdrawalOrders.reduce((sum, o) => sum + o.commission_amount, 0))}
                      </span>
                    </div>

                    {/* Orders List */}
                    {withdrawalOrders.map((order) => (
                      <Card key={order.earning_id} className="bg-muted/30">
                        <CardContent className="p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-sm">Pedido #{order.order_number}</p>
                              <p className="text-xs text-muted-foreground">{order.customer_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(order.order_date), "dd/MM/yy HH:mm", { locale: ptBR })}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">Comissão</p>
                              <p className="font-bold text-green-600">{formatCurrency(order.commission_amount)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Receipt Modal */}
      <ResponsiveDialog open={receiptModalOpen} onOpenChange={setReceiptModalOpen}>
        <ResponsiveDialogContent className="max-w-lg">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Comprovante de Pagamento</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Comprovante anexado pelo lojista
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          
          {selectedReceipt && (
            <div className="py-4 space-y-4">
              {selectedReceipt.endsWith('.pdf') ? (
                <div className="text-center p-8 bg-muted/50 rounded-lg">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">Arquivo PDF</p>
                  <Button asChild>
                    <a href={selectedReceipt} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Abrir PDF
                    </a>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <img 
                    src={selectedReceipt} 
                    alt="Comprovante" 
                    className="w-full max-h-[60vh] object-contain rounded-lg border"
                  />
                  <Button asChild variant="outline" className="w-full">
                    <a href={selectedReceipt} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Abrir em Nova Aba
                    </a>
                  </Button>
                </div>
              )}
            </div>
          )}
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  );
}