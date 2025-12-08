import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Users, Download, FileText, FileSpreadsheet, ChevronLeft, ChevronRight } from "lucide-react";
import { ScrollableTable } from "@/components/ui/scrollable-table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { generateCustomersReport } from "@/lib/pdfReports";
import { useIsMobile } from "@/hooks/use-mobile";
import * as XLSX from 'xlsx';

interface Customer {
  customer_name: string;
  customer_phone: string;
  delivery_street: string;
  delivery_number: string;
  delivery_neighborhood: string;
  delivery_complement: string;
  delivery_city?: string;
  total_orders: number;
  total_spent: number;
  last_order: string;
}

interface CustomersReportProps {
  storeId: string;
  storeName?: string;
  dateRange: { from: Date | undefined; to: Date | undefined };
}

export const CustomersReport = ({ storeId, storeName = "Minha Loja", dateRange }: CustomersReportProps) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const isMobile = useIsMobile();

  const fetchCustomers = async () => {
    try {
      let query = supabase
        .from('orders')
        .select('customer_name, customer_phone, delivery_city, delivery_street, delivery_number, delivery_neighborhood, delivery_complement, total, created_at')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      if (dateRange.from) {
        query = query.gte('created_at', dateRange.from.toISOString());
      }
      if (dateRange.to) {
        query = query.lte('created_at', dateRange.to.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      const customerMap = new Map<string, Customer>();
      
      data?.forEach((order) => {
        const key = order.customer_phone;
        const existing = customerMap.get(key);
        
        if (existing) {
          existing.total_orders += 1;
          existing.total_spent += order.total || 0;
          if (new Date(order.created_at) > new Date(existing.last_order)) {
            existing.last_order = order.created_at;
          }
        } else {
          customerMap.set(key, {
            customer_name: order.customer_name,
            customer_phone: order.customer_phone,
            delivery_street: order.delivery_street || '',
            delivery_number: order.delivery_number || '',
            delivery_neighborhood: order.delivery_neighborhood || '',
            delivery_complement: order.delivery_complement || '',
            delivery_city: order.delivery_city || '',
            total_orders: 1,
            total_spent: order.total || 0,
            last_order: order.created_at,
          });
        }
      });

      setCustomers(Array.from(customerMap.values()));
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados de clientes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (storeId) {
      fetchCustomers();
    }
  }, [storeId, dateRange]);

  const filteredCustomers = useMemo(() => {
    if (!searchTerm) return customers;
    
    const term = searchTerm.toLowerCase();
    return customers.filter(
      (customer) =>
        customer.customer_name.toLowerCase().includes(term) ||
        customer.customer_phone.includes(term) ||
        customer.delivery_neighborhood?.toLowerCase().includes(term)
    );
  }, [customers, searchTerm]);

  // Paginação
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCustomers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCustomers, currentPage, itemsPerPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateRange]);

  const exportToCSV = () => {
    const headers = ['Nome', 'WhatsApp', 'Endereço', 'Total de Pedidos', 'Total Gasto', 'Último Pedido'];
    
    const rows = filteredCustomers.map(customer => [
      customer.customer_name,
      customer.customer_phone,
      customer.delivery_street && customer.delivery_number 
        ? `${customer.delivery_street}, ${customer.delivery_number}${customer.delivery_neighborhood ? ` - ${customer.delivery_neighborhood}` : ''}${customer.delivery_city ? ` - ${customer.delivery_city}` : ''}`
        : '-',
      customer.total_orders,
      `R$ ${customer.total_spent.toFixed(2)}`,
      format(new Date(customer.last_order), 'dd/MM/yyyy', { locale: ptBR })
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_clientes_${format(new Date(), 'dd-MM-yyyy')}.csv`;
    link.click();
  };

  const exportToPDF = () => {
    const periodLabel = dateRange.from && dateRange.to
      ? `${format(dateRange.from, 'dd/MM/yyyy')} - ${format(dateRange.to, 'dd/MM/yyyy')}`
      : "Todos os períodos";
    
    const customersForReport = filteredCustomers.map(c => ({
      name: c.customer_name,
      phone: c.customer_phone,
      total_orders: c.total_orders,
      total_spent: c.total_spent
    }));

    generateCustomersReport(customersForReport, storeName, periodLabel);
    
    toast({
      title: "PDF gerado!",
      description: "O relatório foi exportado com sucesso.",
    });
  };

  const exportToExcel = () => {
    const data = filteredCustomers.map(customer => ({
      'Nome': customer.customer_name,
      'WhatsApp': customer.customer_phone,
      'Endereço': customer.delivery_street && customer.delivery_number 
        ? `${customer.delivery_street}, ${customer.delivery_number}${customer.delivery_neighborhood ? ` - ${customer.delivery_neighborhood}` : ''}${customer.delivery_city ? ` - ${customer.delivery_city}` : ''}`
        : '-',
      'Total de Pedidos': customer.total_orders,
      'Total Gasto': customer.total_spent,
      'Último Pedido': format(new Date(customer.last_order), 'dd/MM/yyyy', { locale: ptBR })
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const colWidths = [
      { wch: 25 },
      { wch: 15 },
      { wch: 40 },
      { wch: 18 },
      { wch: 15 },
      { wch: 15 }
    ];
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clientes");
    
    XLSX.writeFile(wb, `relatorio_clientes_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
    
    toast({
      title: "Excel gerado!",
      description: "O relatório foi exportado com sucesso.",
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold gradient-text">Relatório de Clientes</h2>
        <p className="text-muted-foreground">Análise completa dos seus clientes e histórico de compras</p>
      </div>
      
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1 w-full sm:max-w-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              disabled={filteredCustomers.length === 0}
              className="flex-1 sm:flex-none"
            >
              <Download className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">CSV</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToExcel}
              disabled={filteredCustomers.length === 0}
              className="flex-1 sm:flex-none"
            >
              <FileSpreadsheet className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Excel</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToPDF}
              disabled={filteredCustomers.length === 0}
              className="flex-1 sm:flex-none"
            >
              <FileText className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">PDF</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          {/* Mobile Cards View */}
          {isMobile ? (
            <div className="space-y-3">
              {filteredCustomers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente no período selecionado'}
                </div>
              ) : (
                paginatedCustomers.map((customer, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{customer.customer_name}</p>
                        <p className="text-sm text-muted-foreground">{customer.customer_phone}</p>
                      </div>
                      <Badge variant="secondary">{customer.total_orders} pedidos</Badge>
                    </div>
                    
                    {customer.delivery_street && customer.delivery_number && (
                      <div className="text-sm text-muted-foreground">
                        <p>{customer.delivery_street}, {customer.delivery_number}</p>
                        {customer.delivery_neighborhood && (
                          <p>{customer.delivery_neighborhood}{customer.delivery_city ? ` - ${customer.delivery_city}` : ''}</p>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">R$ {customer.total_spent.toFixed(2)}</span>
                      <span className="text-muted-foreground">
                        Último: {format(new Date(customer.last_order), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          ) : (
            /* Desktop Table View */
            <ScrollableTable>
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Endereço</TableHead>
                    <TableHead className="text-right">Pedidos</TableHead>
                    <TableHead className="text-right">Total Gasto</TableHead>
                    <TableHead>Último Pedido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        {searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente no período selecionado'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedCustomers.map((customer, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{customer.customer_name}</TableCell>
                        <TableCell>{customer.customer_phone}</TableCell>
                        <TableCell>
                          {customer.delivery_street && customer.delivery_number ? (
                            <div className="text-sm">
                              <div>{customer.delivery_street}, {customer.delivery_number}</div>
                              {customer.delivery_complement && (
                                <div className="text-muted-foreground">{customer.delivery_complement}</div>
                              )}
                              <div className="text-muted-foreground">
                                {customer.delivery_neighborhood}
                                {customer.delivery_city && ` - ${customer.delivery_city}`}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">{customer.total_orders}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          R$ {customer.total_spent.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(customer.last_order), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollableTable>
          )}

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t pt-4 mt-4">
              <p className="text-xs text-muted-foreground hidden sm:block">
                Mostrando {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredCustomers.length)} de {filteredCustomers.length}
              </p>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium px-2">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
