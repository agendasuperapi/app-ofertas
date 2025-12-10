import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useWithdrawalRequests, WithdrawalRequest } from '@/hooks/useWithdrawalRequests';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollableTable } from '@/components/ui/scrollable-table';
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogDescription, ResponsiveDialogFooter } from '@/components/ui/responsive-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Loader2, Wallet, Clock, CheckCircle, XCircle, DollarSign, User, Phone, Key, FileText, Search, Filter, Ban, ShoppingBag, Image, Eye, Upload, Paperclip, ChevronDown, ChevronUp, Package } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';
import { WithdrawalPaymentModal } from './WithdrawalPaymentModal';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WithdrawalRequestsManagerProps {
  storeId: string;
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

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export function WithdrawalRequestsManager({ storeId }: WithdrawalRequestsManagerProps) {
  const { requests, isLoading, stats, markAsPaid, rejectRequest, updatePaymentProof } = useWithdrawalRequests({ storeId });
  const isMobile = useIsMobile();
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentRequest, setPaymentRequest] = useState<WithdrawalRequest | null>(null);
  const [withdrawalOrders, setWithdrawalOrders] = useState<WithdrawalOrder[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [previewImageOpen, setPreviewImageOpen] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [orderItems, setOrderItems] = useState<Record<string, OrderItem[]>>({});
  const [loadingOrderItems, setLoadingOrderItems] = useState<string | null>(null);

  // Fetch order items when expanding an order
  const fetchOrderItems = async (orderId: string) => {
    if (orderItems[orderId]) {
      // Already loaded
      return;
    }

    setLoadingOrderItems(orderId);
    try {
      const { data, error } = await supabase
        .from('order_items')
        .select('id, product_name, quantity, unit_price, subtotal')
        .eq('order_id', orderId)
        .is('deleted_at', null);

      if (error) throw error;

      setOrderItems(prev => ({
        ...prev,
        [orderId]: data || []
      }));
    } catch (error) {
      console.error('Error fetching order items:', error);
      toast.error('Erro ao carregar itens do pedido');
    } finally {
      setLoadingOrderItems(null);
    }
  };

  const handleOrderClick = (orderId: string) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
    } else {
      setExpandedOrderId(orderId);
      fetchOrderItems(orderId);
    }
  };

  // Fetch orders associated with the withdrawal
  useEffect(() => {
    if (!selectedRequest) {
      setWithdrawalOrders([]);
      return;
    }

    const fetchWithdrawalOrders = async () => {
      setIsLoadingOrders(true);
      try {
        // Build query based on available IDs
        // Determine earning status based on withdrawal status
        const earningStatus = selectedRequest.status === 'paid' ? 'paid' : 'pending';
        
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
          .eq('status', earningStatus);

        // Filter by store_affiliate_id or affiliate_id
        if (selectedRequest.store_affiliate_id) {
          query = query.eq('store_affiliate_id', selectedRequest.store_affiliate_id);
        } else if (selectedRequest.affiliate_id) {
          query = query.eq('affiliate_id', selectedRequest.affiliate_id);
        } else {
          // No affiliate ID available, can't fetch orders
          setWithdrawalOrders([]);
          setIsLoadingOrders(false);
          return;
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        // Filter orders that were paid around the time of this withdrawal
        // For paid withdrawals: orders with paid_at around the withdrawal paid_at
        // For pending withdrawals: orders with delivered status (not yet paid)
        const orders: WithdrawalOrder[] = (data || [])
          .filter((earning: any) => {
            // If withdrawal is paid, filter by paid_at timestamp
            if (selectedRequest.status === 'paid' && selectedRequest.paid_at) {
              const earningPaidAt = earning.paid_at ? new Date(earning.paid_at) : null;
              const withdrawalPaidAt = new Date(selectedRequest.paid_at);
              const requestedAt = new Date(selectedRequest.requested_at);
              
              // Check if earning was paid within the window of this withdrawal
              // (between request time and a few seconds after paid time to account for processing)
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
  }, [selectedRequest]);

  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
      const matchesSearch = !searchTerm || 
        req.affiliate_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.affiliate_email?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [requests, statusFilter, searchTerm]);

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

  const handleOpenPaymentModal = (request: WithdrawalRequest) => {
    setPaymentRequest(request);
    setPaymentModalOpen(true);
  };

  const handleMarkAsPaid = async (requestId: string, adminNotes?: string, paymentProof?: string): Promise<boolean> => {
    setProcessingId(requestId);
    const success = await markAsPaid(requestId, adminNotes, paymentProof);
    setProcessingId(null);
    setSelectedRequest(null);
    setPaymentRequest(null);
    return success;
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectNotes.trim()) return;
    setProcessingId(selectedRequest.id);
    await rejectRequest(selectedRequest.id, rejectNotes);
    setProcessingId(null);
    setRejectDialogOpen(false);
    setRejectNotes('');
    setSelectedRequest(null);
  };

  const handleUploadProof = async (file: File) => {
    if (!selectedRequest) return;
    
    setIsUploadingProof(true);
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `${selectedRequest.id}_${Date.now()}.${fileExt}`;
      const filePath = `withdrawals/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('payment-receipts')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('payment-receipts')
        .getPublicUrl(filePath);

      const success = await updatePaymentProof(selectedRequest.id, publicUrl);
      if (success) {
        // Update local state
        setSelectedRequest({ ...selectedRequest, payment_proof: publicUrl });
      }
    } catch (err: any) {
      console.error('[WithdrawalRequestsManager] Erro ao fazer upload:', err);
      toast.error('Erro ao enviar comprovante: ' + err.message);
    } finally {
      setIsUploadingProof(false);
    }
  };

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
                  <p className="text-xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-green-500/10 border-green-500/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Pagos</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(stats.totalPaidAmount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="bg-primary/10 border-primary/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">A Pagar</p>
                  <p className="text-xl font-bold text-primary">{formatCurrency(stats.totalPendingAmount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por afiliado..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="paid">Pagos</SelectItem>
                <SelectItem value="rejected">Rejeitados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Requests Table/Cards */}
      {filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhuma solicitação de saque encontrada</p>
          </CardContent>
        </Card>
      ) : isMobile ? (
        <div className="space-y-3">
          {filteredRequests.map((req) => (
            <motion.div key={req.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setSelectedRequest(req)}>
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium">{req.affiliate_name}</p>
                      <p className="text-xs text-muted-foreground">{req.affiliate_email}</p>
                    </div>
                    {getStatusBadge(req.status)}
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-lg font-bold text-primary">{formatCurrency(req.amount)}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(req.requested_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </p>
                  </div>
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
                  <TableHead>Afiliado</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>PIX</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((req) => (
                  <TableRow key={req.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedRequest(req)}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{req.affiliate_name}</p>
                        <p className="text-xs text-muted-foreground">{req.affiliate_email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-primary">{formatCurrency(req.amount)}</TableCell>
                    <TableCell className="text-sm font-mono">{req.pix_key ? `****${req.pix_key.slice(-4)}` : '-'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(req.requested_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>{getStatusBadge(req.status)}</TableCell>
                    <TableCell className="text-right">
                      {req.status === 'pending' && (
                        <div className="flex gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" onClick={() => handleOpenPaymentModal(req)} disabled={processingId === req.id}>
                            {processingId === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                            Pagar
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => { setSelectedRequest(req); setRejectDialogOpen(true); }}>
                            <Ban className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollableTable>
        </Card>
      )}

      {/* Details Modal */}
      <ResponsiveDialog open={!!selectedRequest && !rejectDialogOpen} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <ResponsiveDialogContent className="max-w-2xl h-[90vh] overflow-y-auto !gap-0">
          <ResponsiveDialogHeader className="pb-0 space-y-0">
            <ResponsiveDialogTitle>Detalhes do Saque</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Solicitação de {selectedRequest?.affiliate_name}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          {selectedRequest && (
            <Tabs defaultValue="details" className="mt-0 h-[90vh]">
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
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Status</span>
                  {getStatusBadge(selectedRequest.status)}
                </div>

                <div className="p-4 bg-primary/10 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground mb-1">Valor Solicitado</p>
                  <p className="text-3xl font-bold text-primary">{formatCurrency(selectedRequest.amount)}</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Afiliado:</span>
                    <span className="font-medium">{selectedRequest.affiliate_name}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Telefone:</span>
                    <span className="font-medium">{selectedRequest.affiliate_phone || '-'}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Key className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Chave PIX:</span>
                    <span className="font-mono font-medium">{selectedRequest.pix_key || '-'}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Solicitado em:</span>
                    <span className="font-medium">
                      {format(new Date(selectedRequest.requested_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>

                  {selectedRequest.notes && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 text-sm mb-1">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Observações:</span>
                      </div>
                      <p className="text-sm">{selectedRequest.notes}</p>
                    </div>
                  )}

                  {selectedRequest.admin_notes && (
                    <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                      <p className="text-xs text-muted-foreground mb-1">Resposta do lojista:</p>
                      <p className="text-sm">{selectedRequest.admin_notes}</p>
                    </div>
                  )}

                  {selectedRequest.paid_at && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span>Pago em: {format(new Date(selectedRequest.paid_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                    </div>
                  )}

                  {selectedRequest.status === 'paid' && (
                    <div className="p-4 bg-muted/50 dark:bg-muted/30 rounded-xl border border-border shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-muted rounded-lg">
                            <Image className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <p className="text-sm font-semibold text-foreground">Comprovante de Pagamento</p>
                        </div>
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleUploadProof(file);
                            }}
                            disabled={isUploadingProof}
                          />
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-xs"
                            disabled={isUploadingProof}
                            asChild
                          >
                            <span>
                              {isUploadingProof ? (
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              ) : (
                                <Upload className="h-3 w-3 mr-1" />
                              )}
                              {selectedRequest.payment_proof ? 'Trocar' : 'Anexar'}
                            </span>
                          </Button>
                        </label>
                      </div>
                      {selectedRequest.payment_proof ? (
                        selectedRequest.payment_proof.endsWith('.pdf') ? (
                          <a 
                            href={selectedRequest.payment_proof} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-muted-foreground transition-colors bg-background px-4 py-2 rounded-lg border border-border hover:border-muted-foreground"
                          >
                            <Eye className="h-4 w-4" />
                            Ver Comprovante PDF
                          </a>
                        ) : (
                          <div 
                            className="cursor-pointer group flex flex-col items-center"
                            onClick={() => setPreviewImageOpen(true)}
                          >
                            <div className="relative overflow-hidden rounded-xl border-2 border-border shadow-lg group-hover:shadow-xl group-hover:border-muted-foreground transition-all duration-300">
                              <img 
                                src={selectedRequest.payment_proof} 
                                alt="Comprovante de pagamento" 
                                className="h-24 w-auto object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/5 transition-colors duration-300 flex items-center justify-center">
                                <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 drop-shadow-lg" />
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2 font-medium">Clique para ampliar</p>
                          </div>
                        )
                      ) : (
                        <div className="text-center py-4 bg-white/50 dark:bg-background/30 rounded-lg border border-dashed border-emerald-300 dark:border-emerald-700">
                          <Image className="h-8 w-8 text-emerald-300 dark:text-emerald-700 mx-auto mb-2" />
                          <p className="text-xs text-emerald-500 dark:text-emerald-500">Nenhum comprovante anexado</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {selectedRequest.status === 'pending' && (
                  <div className="flex gap-2 w-full pt-4">
                    <Button variant="destructive" className="flex-1" onClick={() => setRejectDialogOpen(true)}>
                      <Ban className="h-4 w-4 mr-2" /> Rejeitar
                    </Button>
                    <Button className="flex-1" onClick={() => handleOpenPaymentModal(selectedRequest)} disabled={processingId === selectedRequest.id}>
                      {processingId === selectedRequest.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                      Pagar via PIX
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
                      <Collapsible 
                        key={order.earning_id} 
                        open={expandedOrderId === order.order_id}
                        onOpenChange={() => handleOrderClick(order.order_id)}
                      >
                        <Card className="bg-muted/30">
                          <CollapsibleTrigger asChild>
                            <CardContent className="p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                              <div className="flex justify-between items-start">
                                <div className="flex items-start gap-2">
                                  <div className="mt-0.5">
                                    {expandedOrderId === order.order_id ? (
                                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-medium text-sm">Pedido #{order.order_number}</p>
                                    <p className="text-xs text-muted-foreground">{order.customer_name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {format(new Date(order.order_date), "dd/MM/yy HH:mm", { locale: ptBR })}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-muted-foreground">Comissão</p>
                                  <p className="font-bold text-green-600">{formatCurrency(order.commission_amount)}</p>
                                </div>
                              </div>
                            </CardContent>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="px-3 pb-3 border-t border-border/50">
                              {loadingOrderItems === order.order_id ? (
                                <div className="flex items-center justify-center py-4">
                                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                </div>
                              ) : orderItems[order.order_id]?.length === 0 ? (
                                <p className="text-xs text-muted-foreground py-3 text-center">Nenhum item encontrado</p>
                              ) : (
                                <div className="space-y-2 pt-3">
                                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                    <Package className="h-3 w-3" />
                                    Itens do Pedido
                                  </p>
                                  {orderItems[order.order_id]?.map((item) => (
                                    <div key={item.id} className="flex justify-between items-center text-xs bg-background/50 p-2 rounded">
                                      <div>
                                        <span className="font-medium">{item.quantity}x</span>{' '}
                                        <span>{item.product_name}</span>
                                      </div>
                                      <span className="text-muted-foreground">{formatCurrency(item.subtotal)}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </CollapsibleContent>
                        </Card>
                      </Collapsible>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Reject Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeitar Solicitação</AlertDialogTitle>
            <AlertDialogDescription>
              Informe o motivo da rejeição. O afiliado será notificado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Motivo da rejeição..."
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            className="min-h-[100px]"
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setRejectNotes(''); setRejectDialogOpen(false); }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={!rejectNotes.trim() || processingId === selectedRequest?.id}
              className="bg-destructive hover:bg-destructive/90"
            >
              {processingId === selectedRequest?.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirmar Rejeição
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Payment Modal with PIX QR Code */}
      {paymentRequest && (
        <WithdrawalPaymentModal
          open={paymentModalOpen}
          onOpenChange={setPaymentModalOpen}
          affiliateName={paymentRequest.affiliate_name || 'Afiliado'}
          affiliatePixKey={paymentRequest.pix_key}
          amount={paymentRequest.amount}
          requestId={paymentRequest.id}
          onConfirmPayment={handleMarkAsPaid}
          isProcessing={processingId === paymentRequest.id}
        />
      )}

      {/* Image Preview Modal */}
      <ResponsiveDialog open={previewImageOpen} onOpenChange={setPreviewImageOpen}>
        <ResponsiveDialogContent className="max-w-3xl">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Comprovante de Pagamento</ResponsiveDialogTitle>
          </ResponsiveDialogHeader>
          {selectedRequest?.payment_proof && (
            <div className="flex justify-center p-4">
              <img 
                src={selectedRequest.payment_proof} 
                alt="Comprovante de pagamento" 
                className="max-w-full max-h-[70vh] rounded-lg border border-border object-contain"
              />
            </div>
          )}
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  );
}
