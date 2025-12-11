import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import {
  History,
  TrendingUp,
  TrendingDown,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Package,
  Tag,
  FileText,
  Download,
  Filter,
  Search,
  Minus,
  User
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useCommissionAuditLogs } from "@/hooks/useCommissionAuditLogs";
import { useIsMobile } from "@/hooks/use-mobile";

interface CommissionAuditReportProps {
  storeId: string;
}

export function CommissionAuditReport({ storeId }: CommissionAuditReportProps) {
  const { data, isLoading } = useCommissionAuditLogs(storeId);
  const isMobile = useIsMobile();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<'all' | 'positive' | 'negative' | 'neutral'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const filteredLogs = (data?.logs || []).filter(log => {
    // Filter by type
    if (filterType === 'positive' && (log.commission_difference || 0) <= 0) return false;
    if (filterType === 'negative' && (log.commission_difference || 0) >= 0) return false;
    if (filterType === 'neutral' && (log.commission_difference || 0) !== 0) return false;

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        (log.order_number?.toLowerCase().includes(term)) ||
        (log.affiliate_name?.toLowerCase().includes(term))
      );
    }

    return true;
  });

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const exportToCSV = () => {
    if (!data?.logs?.length) return;

    const headers = [
      'Data/Hora',
      'Pedido',
      'Afiliado',
      'Editado por',
      'Email do Editor',
      'Comissão Antes',
      'Comissão Depois',
      'Variação',
      'Itens Antes',
      'Itens Depois',
      'Motivo'
    ];

    const rows = data.logs.map(log => [
      format(new Date(log.recalculated_at), 'dd/MM/yyyy HH:mm'),
      log.order_number || '-',
      log.affiliate_name || '-',
      log.editor_name || '-',
      log.editor_email || '-',
      log.commission_amount_before.toFixed(2),
      log.commission_amount_after.toFixed(2),
      (log.commission_difference || 0).toFixed(2),
      log.items_count_before,
      log.items_count_after,
      log.reason
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `auditoria-comissoes-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const summary = data?.summary;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg">
            <History className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              Auditoria de Comissões
            </h2>
            <p className="text-sm text-muted-foreground">
              Histórico de recálculos de comissão
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={exportToCSV}
          disabled={!data?.logs?.length}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-card to-card/80 border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Recálculos</p>
                  <p className="text-2xl font-bold">{summary?.totalRecalculations || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-gradient-to-br from-emerald-500/10 to-card border-emerald-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Aumentos</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    +{formatCurrency(summary?.totalPositiveVariation || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ({summary?.positiveCount || 0} vezes)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-gradient-to-br from-red-500/10 to-card border-red-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Reduções</p>
                  <p className="text-2xl font-bold text-red-600">
                    -{formatCurrency(summary?.totalNegativeVariation || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ({summary?.negativeCount || 0} vezes)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-gradient-to-br from-card to-card/80 border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Média/Recálculo</p>
                  <p className={`text-2xl font-bold ${
                    (summary?.averageVariation || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {(summary?.averageVariation || 0) >= 0 ? '+' : ''}
                    {formatCurrency(summary?.averageVariation || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filters */}
      <Card className="bg-card/50 backdrop-blur-sm">
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por pedido ou afiliado..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9"
              />
            </div>
            <Select
              value={filterType}
              onValueChange={(value: 'all' | 'positive' | 'negative' | 'neutral') => {
                setFilterType(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="positive">Aumentos</SelectItem>
                <SelectItem value="negative">Reduções</SelectItem>
                <SelectItem value="neutral">Sem variação</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table/Cards */}
      <Card>
        <CardContent className="p-0">
          {filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <History className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhum recálculo encontrado</p>
              <p className="text-sm">Os recálculos de comissão aparecerão aqui</p>
            </div>
          ) : isMobile ? (
            // Mobile Cards
            <div className="divide-y divide-border">
              {paginatedLogs.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-4"
                >
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleRow(log.id)}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">#{log.order_number || '-'}</span>
                        <VariationBadge value={log.commission_difference || 0} />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {log.affiliate_name || 'Afiliado'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(log.recalculated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(log.commission_amount_before)}
                        </p>
                        <p className="font-medium">
                          {formatCurrency(log.commission_amount_after)}
                        </p>
                      </div>
                      {expandedRows.has(log.id) ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  
                  <AnimatePresence>
                    {expandedRows.has(log.id) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-4 pt-4 border-t border-border/50 space-y-2"
                      >
                        <DetailRow
                          icon={Package}
                          label="Itens"
                          before={log.items_count_before}
                          after={log.items_count_after}
                        />
                        <DetailRow
                          icon={Tag}
                          label="Desconto"
                          before={formatCurrency(log.coupon_discount_before)}
                          after={formatCurrency(log.coupon_discount_after)}
                        />
                        <DetailRow
                          icon={FileText}
                          label="Total Pedido"
                          before={formatCurrency(log.order_total_before)}
                          after={formatCurrency(log.order_total_after)}
                        />
                        <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
                          <span>Motivo:</span>
                          <Badge variant="outline" className="text-xs">
                            {log.reason === 'order_edit' ? 'Edição de Pedido' : log.reason}
                          </Badge>
                        </div>
                        {(log.editor_name || log.editor_email) && (
                          <div className="flex items-start gap-2 text-sm pt-2 border-t border-border/50 mt-2">
                            <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="font-medium text-foreground">{log.editor_name || 'Usuário'}</p>
                              {log.editor_email && (
                                <p className="text-xs text-muted-foreground">{log.editor_email}</p>
                              )}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          ) : (
            // Desktop Table
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Data/Hora</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Pedido</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Afiliado</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Editado por</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Antes</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Depois</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Variação</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">Motivo</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedLogs.map((log) => (
                    <>
                      <tr
                        key={log.id}
                        className="hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => toggleRow(log.id)}
                      >
                        <td className="px-4 py-3 text-sm">
                          {format(new Date(log.recalculated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">
                          #{log.order_number || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {log.affiliate_name || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {log.editor_name || log.editor_email ? (
                            <div>
                              <p className="font-medium">{log.editor_name || '-'}</p>
                              {log.editor_email && (
                                <p className="text-xs text-muted-foreground">{log.editor_email}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-muted-foreground">
                          {formatCurrency(log.commission_amount_before)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium">
                          {formatCurrency(log.commission_amount_after)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <VariationBadge value={log.commission_difference || 0} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="outline" className="text-xs">
                            {log.reason === 'order_edit' ? 'Edição' : log.reason}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {expandedRows.has(log.id) ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </td>
                      </tr>
                      <AnimatePresence>
                        {expandedRows.has(log.id) && (
                          <motion.tr
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          >
                            <td colSpan={9} className="px-4 py-3 bg-muted/20">
                              <div className="grid grid-cols-3 gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                  <Package className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-muted-foreground">Itens:</span>
                                  <span>{log.items_count_before} → {log.items_count_after}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Tag className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-muted-foreground">Desconto:</span>
                                  <span>
                                    {formatCurrency(log.coupon_discount_before)} → {formatCurrency(log.coupon_discount_after)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-muted-foreground">Total:</span>
                                  <span>
                                    {formatCurrency(log.order_total_before)} → {formatCurrency(log.order_total_after)}
                                  </span>
                                </div>
                              </div>
                            </td>
                          </motion.tr>
                        )}
                      </AnimatePresence>
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredLogs.length)} de {filteredLogs.length}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Próximo
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Helper Components
function VariationBadge({ value }: { value: number }) {
  const formatCurrency = (v: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Math.abs(v));
  };

  if (value > 0) {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1">
        <TrendingUp className="h-3 w-3" />
        +{formatCurrency(value)}
      </Badge>
    );
  }
  
  if (value < 0) {
    return (
      <Badge className="bg-red-500/10 text-red-600 border-red-500/20 gap-1">
        <TrendingDown className="h-3 w-3" />
        -{formatCurrency(value)}
      </Badge>
    );
  }
  
  return (
    <Badge variant="outline" className="gap-1">
      <Minus className="h-3 w-3" />
      R$ 0,00
    </Badge>
  );
}

function DetailRow({ 
  icon: Icon, 
  label, 
  before, 
  after 
}: { 
  icon: React.ElementType; 
  label: string; 
  before: string | number; 
  after: string | number; 
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="text-muted-foreground">{label}:</span>
      <span>{before} → {after}</span>
    </div>
  );
}
