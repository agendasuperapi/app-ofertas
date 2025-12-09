import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Banknote, Wallet, BarChart3, RotateCcw, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { AffiliateOrder } from '@/hooks/useAffiliateAuth';

interface CommissionAdjustment {
  id: string;
  earning_id: string;
  store_affiliate_id: string;
  adjustment_type: 'credit' | 'debit' | 'reversal';
  reason: string;
  amount: number;
  previous_order_status: string;
  new_order_status: string;
  order_id: string;
  created_at: string;
  order_number?: string;
}

interface StoreHistoryTabProps {
  store: {
    store_id: string;
    store_affiliate_id: string;
    store_name: string;
  };
  affiliateOrders: AffiliateOrder[];
  withdrawalRequests: any[];
  historyPage: Record<string, number>;
  setHistoryPage: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  formatCurrency: (value: number) => string;
}

type Transaction = {
  id: string;
  date: string;
  type: 'credit' | 'debit' | 'reversal';
  description: string;
  amount: number;
  orderNumber?: string;
  couponCode?: string;
  previousStatus?: string;
  newStatus?: string;
};

export function StoreHistoryTab({
  store,
  affiliateOrders,
  withdrawalRequests,
  historyPage,
  setHistoryPage,
  formatCurrency
}: StoreHistoryTabProps) {
  const [commissionAdjustments, setCommissionAdjustments] = useState<CommissionAdjustment[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch commission adjustments from database
  useEffect(() => {
    const fetchAdjustments = async () => {
      if (!store.store_affiliate_id) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('affiliate_commission_adjustments')
          .select(`
            *,
            orders!inner(order_number)
          `)
          .eq('store_affiliate_id', store.store_affiliate_id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        const adjustments = (data || []).map((adj: any) => ({
          ...adj,
          order_number: adj.orders?.order_number
        }));
        
        setCommissionAdjustments(adjustments);
      } catch (err) {
        console.error('Erro ao buscar ajustes de comissão:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAdjustments();
  }, [store.store_affiliate_id]);

  // Build transaction list
  const storeOrders = affiliateOrders
    .filter(order => order.store_id === store.store_id)
    .filter(order => order.order_status === 'entregue' || order.order_status === 'delivered');
  
  const storeWithdrawals = withdrawalRequests
    .filter((req: any) => req.store_id === store.store_id && req.status === 'paid');
  
  const transactions: Transaction[] = [];
  
  // Add credits from delivered orders (only if there's no credit adjustment for this order)
  const creditAdjustmentOrderIds = new Set(
    commissionAdjustments
      .filter(adj => adj.adjustment_type === 'credit')
      .map(adj => adj.order_id)
  );
  
  storeOrders.forEach(order => {
    // If there's a credit adjustment, use it instead of the order directly
    const hasAdjustment = creditAdjustmentOrderIds.has(order.order_id);
    if (!hasAdjustment) {
      transactions.push({
        id: `order-${order.earning_id}`,
        date: order.order_date,
        type: 'credit',
        description: `Pedido entregue #${order.order_number}`,
        amount: order.commission_amount || 0,
        orderNumber: order.order_number,
        couponCode: order.coupon_code
      });
    }
  });
  
  // Add commission adjustments
  commissionAdjustments.forEach(adj => {
    let description = '';
    let type = adj.adjustment_type;
    
    switch (adj.adjustment_type) {
      case 'credit':
        description = `Pedido entregue #${adj.order_number || '?'}`;
        break;
      case 'debit':
        description = `Estorno - Pedido cancelado #${adj.order_number || '?'}`;
        break;
      case 'reversal':
        description = `Reversão - Status alterado #${adj.order_number || '?'}`;
        break;
    }
    
    transactions.push({
      id: `adj-${adj.id}`,
      date: adj.created_at,
      type: type,
      description,
      amount: adj.amount,
      orderNumber: adj.order_number,
      previousStatus: adj.previous_order_status,
      newStatus: adj.new_order_status
    });
  });
  
  // Add withdrawals (debits)
  storeWithdrawals.forEach((withdrawal: any) => {
    transactions.push({
      id: `withdrawal-${withdrawal.id}`,
      date: withdrawal.paid_at || withdrawal.requested_at,
      type: 'debit',
      description: 'Saque realizado',
      amount: withdrawal.amount
    });
  });
  
  // Sort by date (most recent first)
  transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  // Calculate running balance (from oldest to newest)
  const transactionsWithBalance = [...transactions].reverse();
  let runningBalance = 0;
  const balances: Record<string, number> = {};
  
  transactionsWithBalance.forEach(t => {
    if (t.type === 'credit') {
      runningBalance += t.amount;
    } else {
      runningBalance -= t.amount;
    }
    balances[t.id] = runningBalance;
  });
  
  // Calculate totals
  const totalCredits = transactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0);
  const totalDebits = transactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0);
  const totalReversals = transactions.filter(t => t.type === 'reversal').reduce((sum, t) => sum + t.amount, 0);
  const currentBalance = totalCredits - totalDebits - totalReversals;
  
  // Pagination
  const ITEMS_PER_PAGE = 15;
  const currentPage = historyPage[store.store_id] || 1;
  const totalPages = Math.ceil(transactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = transactions.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const getTransactionStyles = (type: 'credit' | 'debit' | 'reversal') => {
    switch (type) {
      case 'credit':
        return 'bg-emerald-500/5 border-emerald-500/10 hover:bg-emerald-500/10';
      case 'debit':
        return 'bg-red-500/5 border-red-500/10 hover:bg-red-500/10';
      case 'reversal':
        return 'bg-amber-500/5 border-amber-500/10 hover:bg-amber-500/10';
    }
  };

  const getTransactionColor = (type: 'credit' | 'debit' | 'reversal') => {
    switch (type) {
      case 'credit':
        return 'text-emerald-600';
      case 'debit':
        return 'text-red-600';
      case 'reversal':
        return 'text-amber-600';
    }
  };

  const getTransactionIcon = (type: 'credit' | 'debit' | 'reversal') => {
    switch (type) {
      case 'credit':
        return <ArrowUpCircle className="h-3 w-3" />;
      case 'debit':
        return <ArrowDownCircle className="h-3 w-3" />;
      case 'reversal':
        return <RotateCcw className="h-3 w-3" />;
    }
  };

  const getTransactionPrefix = (type: 'credit' | 'debit' | 'reversal') => {
    return type === 'credit' ? '+' : '-';
  };

  return (
    <div className="space-y-4">
      {/* Resumo do Extrato */}
      <div className="grid grid-cols-4 gap-2">
        <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-center">
          <TrendingUp className="h-4 w-4 mx-auto text-emerald-600 mb-1" />
          <p className="text-[10px] text-muted-foreground">Entradas</p>
          <p className="font-bold text-sm text-emerald-600">+{formatCurrency(totalCredits)}</p>
        </div>
        <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20 text-center">
          <Banknote className="h-4 w-4 mx-auto text-red-600 mb-1" />
          <p className="text-[10px] text-muted-foreground">Saques</p>
          <p className="font-bold text-sm text-red-600">-{formatCurrency(totalDebits)}</p>
        </div>
        <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20 text-center">
          <RotateCcw className="h-4 w-4 mx-auto text-amber-600 mb-1" />
          <p className="text-[10px] text-muted-foreground">Estornos</p>
          <p className="font-bold text-sm text-amber-600">-{formatCurrency(totalReversals)}</p>
        </div>
        <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 text-center">
          <Wallet className="h-4 w-4 mx-auto text-primary mb-1" />
          <p className="text-[10px] text-muted-foreground">Saldo</p>
          <p className={`font-bold text-sm ${currentBalance >= 0 ? 'text-primary' : 'text-red-600'}`}>
            {formatCurrency(currentBalance)}
          </p>
        </div>
      </div>
      
      {/* Extrato */}
      {transactions.length === 0 ? (
        <div className="p-6 bg-muted/50 rounded-lg text-center border border-border/50">
          <BarChart3 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Nenhuma movimentação registrada ainda
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {/* Cabeçalho do extrato */}
          <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-muted/50 rounded-lg text-[10px] font-medium text-muted-foreground">
            <div className="col-span-3">Data</div>
            <div className="col-span-5">Descrição</div>
            <div className="col-span-2 text-right">Valor</div>
            <div className="col-span-2 text-right">Saldo</div>
          </div>
          
          {/* Linhas do extrato */}
          {paginatedTransactions.map((transaction, index) => (
            <motion.div
              key={transaction.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.02 }}
              className={`grid grid-cols-12 gap-2 px-3 py-2.5 rounded-lg border transition-colors ${getTransactionStyles(transaction.type)}`}
            >
              <div className="col-span-3 text-xs">
                <p className="font-medium">{format(new Date(transaction.date), 'dd/MM/yy', { locale: ptBR })}</p>
                <p className="text-[10px] text-muted-foreground">{format(new Date(transaction.date), 'HH:mm', { locale: ptBR })}</p>
              </div>
              <div className="col-span-5">
                <div className="flex items-center gap-1.5">
                  <span className={getTransactionColor(transaction.type)}>
                    {getTransactionIcon(transaction.type)}
                  </span>
                  <p className="text-xs font-medium truncate">{transaction.description}</p>
                </div>
                {transaction.couponCode && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0 mt-0.5">
                    {transaction.couponCode}
                  </Badge>
                )}
                {transaction.previousStatus && transaction.newStatus && (
                  <p className="text-[9px] text-muted-foreground mt-0.5">
                    {transaction.previousStatus} → {transaction.newStatus}
                  </p>
                )}
              </div>
              <div className={`col-span-2 text-right text-xs font-bold ${getTransactionColor(transaction.type)}`}>
                {getTransactionPrefix(transaction.type)}{formatCurrency(transaction.amount)}
              </div>
              <div className="col-span-2 text-right text-xs font-medium text-muted-foreground">
                {formatCurrency(balances[transaction.id] || 0)}
              </div>
            </motion.div>
          ))}
          
          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 border-t border-border/50">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setHistoryPage(prev => ({ ...prev, [store.store_id]: currentPage - 1 }))}
              >
                Anterior
              </Button>
              <span className="text-xs text-muted-foreground">
                Página {currentPage} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setHistoryPage(prev => ({ ...prev, [store.store_id]: currentPage + 1 }))}
              >
                Próxima
              </Button>
            </div>
          )}
        </div>
      )}
      
      {/* Legenda */}
      <div className="flex items-center justify-center gap-3 text-[10px] text-muted-foreground pt-2 flex-wrap">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          <span>Comissão</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500"></div>
          <span>Saque</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-amber-500"></div>
          <span>Estorno/Reversão</span>
        </div>
      </div>
    </div>
  );
}
