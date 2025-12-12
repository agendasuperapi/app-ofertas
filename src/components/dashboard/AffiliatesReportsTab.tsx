import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useAffiliates } from '@/hooks/useAffiliates';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, Users, Clock, DollarSign, CheckCircle, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { OrderItemsCommissionDialog } from './OrderItemsCommissionDialog';

interface AffiliatesReportsTabProps {
  storeId: string;
}

export const AffiliatesReportsTab = ({ storeId }: AffiliatesReportsTabProps) => {
  const { affiliates, getAllStoreEarnings, isLoading } = useAffiliates(storeId);
  const [allEarnings, setAllEarnings] = useState<any[]>([]);
  const [selectedEarning, setSelectedEarning] = useState<any | null>(null);

  useEffect(() => {
    getAllStoreEarnings().then(setAllEarnings);
  }, [getAllStoreEarnings]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'outline' | 'secondary' | 'default' | 'destructive' }> = {
      pending: { label: 'Pendente', variant: 'outline' },
      approved: { label: 'Aprovada', variant: 'secondary' },
      paid: { label: 'Paga', variant: 'default' },
      cancelled: { label: 'Cancelada', variant: 'destructive' },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Calcular totais para cards resumo
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

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1, duration: 0.4, ease: [0.4, 0, 0.2, 1] as const }
    })
  };

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <motion.div 
        className="flex items-center gap-3"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-glow">
          <TrendingUp className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-bold gradient-text">Relatórios de Afiliados</h2>
          <p className="text-sm text-muted-foreground">Acompanhe as comissões e desempenho</p>
        </div>
      </motion.div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          custom={0}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          whileHover={{ scale: 1.02, y: -2 }}
        >
          <Card className="glass-card bg-gradient-to-br from-secondary/5 to-secondary/10 border-secondary/20 hover:border-secondary/40 transition-all duration-300 hover:shadow-glow-secondary">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{totalAffiliates}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-secondary to-secondary-glow flex items-center justify-center shadow-glow-secondary">
                  <Users className="h-6 w-6 text-secondary-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          custom={1}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          whileHover={{ scale: 1.02, y: -2 }}
        >
          <Card className="glass-card bg-gradient-to-br from-success/5 to-success/10 border-success/20 hover:border-success/40 transition-all duration-300">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ativos</p>
                  <p className="text-2xl font-bold text-success">{activeAffiliates}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-success to-success/80 flex items-center justify-center" style={{ boxShadow: '0 0 20px hsl(33 95% 50% / 0.3)' }}>
                  <CheckCircle className="h-6 w-6 text-success-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          custom={2}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          whileHover={{ scale: 1.02, y: -2 }}
        >
          <Card className="glass-card bg-gradient-to-br from-warning/5 to-warning/10 border-warning/20 hover:border-warning/40 transition-all duration-300">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pendente</p>
                  <p className="text-2xl font-bold text-warning">{formatCurrency(totalPendingEarnings)}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-warning to-warning/80 flex items-center justify-center" style={{ boxShadow: '0 0 20px hsl(45 100% 51% / 0.3)' }}>
                  <Clock className="h-6 w-6 text-warning-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          custom={3}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          whileHover={{ scale: 1.02, y: -2 }}
        >
          <Card className="glass-card bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 hover:border-primary/40 transition-all duration-300 hover:shadow-glow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pago</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(totalPaidEarnings)}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-glow">
                  <DollarSign className="h-6 w-6 text-primary-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Tabela de Comissões */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent to-accent-glow flex items-center justify-center" style={{ boxShadow: '0 0 20px hsl(330 85% 55% / 0.3)' }}>
                <DollarSign className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <CardTitle className="text-base gradient-text">Todas as Comissões</CardTitle>
                <CardDescription>Histórico completo de comissões de todos os afiliados</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Afiliado</TableHead>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Valor Venda</TableHead>
                    <TableHead>Comissão</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allEarnings.map((earning, index) => (
                    <motion.tr
                      key={earning.id}
                      className="border-b transition-colors hover:bg-muted/50 cursor-pointer"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => setSelectedEarning(earning)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-xs font-bold text-primary-foreground shadow-sm">
                            {earning.affiliate?.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="font-medium">{earning.affiliate?.name}</p>
                            <p className="text-xs text-muted-foreground">{earning.affiliate?.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        #{earning.order?.order_number || '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(earning.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell>{formatCurrency(earning.order_total)}</TableCell>
                      <TableCell className="font-semibold text-primary">
                        {formatCurrency(earning.commission_amount)}
                      </TableCell>
                      <TableCell>{getStatusBadge(earning.status)}</TableCell>
                    </motion.tr>
                  ))}
                  {allEarnings.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhuma comissão registrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </motion.div>

      {/* Order Items Modal */}
      <OrderItemsCommissionDialog
        open={!!selectedEarning}
        onOpenChange={(open) => !open && setSelectedEarning(null)}
        earningId={selectedEarning?.id || null}
        orderNumber={selectedEarning?.order?.order_number || ''}
        affiliateName={selectedEarning?.affiliate?.name || ''}
      />
    </motion.div>
  );
};