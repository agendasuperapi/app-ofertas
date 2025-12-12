import { useState, useEffect } from 'react';
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogDescription } from '@/components/ui/responsive-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Package, Tag, Percent, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';

interface OrderItemsCommissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  earningId: string | null;
  orderNumber: string;
  affiliateName: string;
}

interface ItemEarning {
  id: string;
  product_name: string;
  product_category: string | null;
  item_subtotal: number;
  item_discount: number | null;
  item_value_with_discount: number;
  is_coupon_eligible: boolean | null;
  commission_type: string;
  commission_value: number;
  commission_amount: number;
  commission_source: string | null;
}

export const OrderItemsCommissionDialog = ({
  open,
  onOpenChange,
  earningId,
  orderNumber,
  affiliateName
}: OrderItemsCommissionDialogProps) => {
  const [items, setItems] = useState<ItemEarning[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && earningId) {
      fetchItems();
    }
  }, [open, earningId]);

  const fetchItems = async () => {
    if (!earningId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('affiliate_item_earnings')
        .select('*')
        .eq('earning_id', earningId)
        .order('product_name');

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching item earnings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getSourceBadge = (source: string | null) => {
    switch (source) {
      case 'specific_product':
        return <Badge variant="secondary" className="bg-purple-500/20 text-purple-600 border-purple-500/30">Regra Específica</Badge>;
      case 'specific_category':
        return <Badge variant="secondary" className="bg-orange-500/20 text-orange-600 border-orange-500/30">Regra Categoria</Badge>;
      case 'default':
        return <Badge variant="secondary" className="bg-blue-500/20 text-blue-600 border-blue-500/30">Padrão</Badge>;
      default:
        return <Badge variant="outline">-</Badge>;
    }
  };

  const totalSubtotal = items.reduce((sum, item) => sum + item.item_subtotal, 0);
  const totalDiscount = items.reduce((sum, item) => sum + (item.item_discount || 0), 0);
  const totalWithDiscount = items.reduce((sum, item) => sum + item.item_value_with_discount, 0);
  const totalCommission = items.reduce((sum, item) => sum + item.commission_amount, 0);

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-4xl">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Itens do Pedido #{orderNumber}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Detalhes de desconto e comissão por item • {affiliateName}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Nenhum item encontrado para este pedido
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-lg bg-secondary/10 border border-secondary/20"
              >
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Package className="h-3.5 w-3.5" />
                  Subtotal
                </div>
                <p className="font-semibold">{formatCurrency(totalSubtotal)}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="p-3 rounded-lg bg-warning/10 border border-warning/20"
              >
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Tag className="h-3.5 w-3.5" />
                  Desconto
                </div>
                <p className="font-semibold text-warning">-{formatCurrency(totalDiscount)}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="p-3 rounded-lg bg-accent/10 border border-accent/20"
              >
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <DollarSign className="h-3.5 w-3.5" />
                  c/ Desconto
                </div>
                <p className="font-semibold">{formatCurrency(totalWithDiscount)}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="p-3 rounded-lg bg-primary/10 border border-primary/20"
              >
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Percent className="h-3.5 w-3.5" />
                  Comissão
                </div>
                <p className="font-semibold text-primary">{formatCurrency(totalCommission)}</p>
              </motion.div>
            </div>

            {/* Items Table */}
            <ScrollArea className="h-[300px] rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="text-right">Desconto</TableHead>
                    <TableHead className="text-right">c/ Desconto</TableHead>
                    <TableHead className="text-center">Tipo</TableHead>
                    <TableHead className="text-right">Comissão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <motion.tr
                      key={item.id}
                      className="border-b transition-colors hover:bg-muted/50"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{item.product_name}</p>
                          {item.product_category && (
                            <p className="text-xs text-muted-foreground">{item.product_category}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatCurrency(item.item_subtotal)}
                      </TableCell>
                      <TableCell className="text-right text-sm text-warning">
                        {item.item_discount ? `-${formatCurrency(item.item_discount)}` : '-'}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {formatCurrency(item.item_value_with_discount)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          {getSourceBadge(item.commission_source)}
                          <span className="text-xs text-muted-foreground">
                            {item.commission_value}{item.commission_type === 'percentage' ? '%' : ' R$'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-primary">
                        {formatCurrency(item.commission_amount)}
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};
