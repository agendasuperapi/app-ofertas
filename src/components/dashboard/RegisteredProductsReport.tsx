import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Package, Download, FileText, FileSpreadsheet, ChevronLeft, ChevronRight } from "lucide-react";
import { ScrollableTable } from "@/components/ui/scrollable-table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { generateProductsReport } from "@/lib/pdfReports";
import { useIsMobile } from "@/hooks/use-mobile";
import * as XLSX from 'xlsx';

interface RegisteredProduct {
  id: string;
  short_id: string;
  name: string;
  description: string;
  price: number;
  promotional_price: number;
  is_available: boolean;
  category: string;
  external_code: string | null;
}

interface RegisteredProductsReportProps {
  storeId: string;
  storeName?: string;
}

export const RegisteredProductsReport = ({ storeId, storeName = "Minha Loja" }: RegisteredProductsReportProps) => {
  const [products, setProducts] = useState<RegisteredProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const isMobile = useIsMobile();

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, short_id, name, description, price, promotional_price, is_available, category, external_code')
        .eq('store_id', storeId)
        .order('name', { ascending: true });

      if (error) throw error;

      setProducts(data || []);
    } catch (error) {
      console.error('Erro ao buscar produtos cadastrados:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os produtos cadastrados",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (storeId) {
      fetchProducts();
    }
  }, [storeId]);

  const filteredProducts = useMemo(() => {
    let filtered = products;

    if (statusFilter === "active") {
      filtered = filtered.filter(p => p.is_available);
    } else if (statusFilter === "inactive") {
      filtered = filtered.filter(p => !p.is_available);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(term) ||
          product.description?.toLowerCase().includes(term) ||
          product.short_id?.toLowerCase().includes(term) ||
          product.external_code?.toLowerCase().includes(term) ||
          product.category.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [products, searchTerm, statusFilter]);

  // Paginação
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const exportToCSV = () => {
    const headers = ['Código', 'Código Externo', 'Nome', 'Descrição', 'Categoria', 'Preço', 'Preço Promocional', 'Status'];
    
    const rows = filteredProducts.map(product => [
      product.short_id || product.id.substring(0, 8),
      product.external_code || '-',
      product.name,
      product.description || '-',
      product.category,
      `R$ ${product.price.toFixed(2)}`,
      product.promotional_price && product.promotional_price > 0 
        ? `R$ ${product.promotional_price.toFixed(2)}` 
        : '-',
      product.is_available ? 'Ativo' : 'Inativo'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_produtos_cadastrados_${format(new Date(), 'dd-MM-yyyy')}.csv`;
    link.click();
  };

  const exportToPDF = () => {
    const productsForReport = filteredProducts.map(p => ({
      name: p.name,
      price: p.promotional_price || p.price,
      category: p.category,
      available: p.is_available
    }));

    generateProductsReport(productsForReport, storeName);
    
    toast({
      title: "PDF gerado!",
      description: "O relatório foi exportado com sucesso.",
    });
  };

  const exportToExcel = () => {
    const data = filteredProducts.map(product => ({
      'Código': product.short_id || product.id.substring(0, 8),
      'Código Externo': product.external_code || '-',
      'Nome': product.name,
      'Descrição': product.description || '-',
      'Categoria': product.category,
      'Preço': product.price,
      'Preço Promocional': product.promotional_price && product.promotional_price > 0 
        ? product.promotional_price 
        : 0,
      'Status': product.is_available ? 'Ativo' : 'Inativo'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const colWidths = [
      { wch: 12 },
      { wch: 15 },
      { wch: 30 },
      { wch: 40 },
      { wch: 15 },
      { wch: 12 },
      { wch: 18 },
      { wch: 10 }
    ];
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Produtos Cadastrados");
    
    XLSX.writeFile(wb, `relatorio_produtos_cadastrados_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
    
    toast({
      title: "Excel gerado!",
      description: "O relatório foi exportado com sucesso.",
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold gradient-text">Relatorio Produtos Cadastrados</h2>
        <p className="text-muted-foreground">Todos os produtos registrados no seu catálogo</p>
      </div>
      
      <Card>
        <CardHeader className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4 w-full">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar produto por nome, código ou categoria..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="w-full sm:w-[150px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="inactive">Inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              disabled={filteredProducts.length === 0}
              className="flex-1 sm:flex-none"
            >
              <Download className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">CSV</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToExcel}
              disabled={filteredProducts.length === 0}
              className="flex-1 sm:flex-none"
            >
              <FileSpreadsheet className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Excel</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToPDF}
              disabled={filteredProducts.length === 0}
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
              {filteredProducts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm || statusFilter !== "all" 
                    ? 'Nenhum produto encontrado com os filtros selecionados' 
                    : 'Nenhum produto cadastrado'}
                </div>
              ) : (
                paginatedProducts.map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{product.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-mono">{product.short_id || product.id.substring(0, 8)}</span>
                          {product.external_code && (
                            <span>• Ext: {product.external_code}</span>
                          )}
                        </div>
                      </div>
                      <Badge variant={product.is_available ? "default" : "secondary"}>
                        {product.is_available ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    
                    {product.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{product.category}</Badge>
                      <div className="text-right">
                        {product.promotional_price && product.promotional_price > 0 ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground line-through">
                              R$ {product.price.toFixed(2)}
                            </span>
                            <span className="font-medium text-green-600">
                              R$ {product.promotional_price.toFixed(2)}
                            </span>
                          </div>
                        ) : (
                          <span className="font-medium">R$ {product.price.toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          ) : (
            /* Desktop Table View */
            <ScrollableTable>
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Código Externo</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Preço</TableHead>
                    <TableHead className="text-right">Preço Promocional</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        {searchTerm || statusFilter !== "all" 
                          ? 'Nenhum produto encontrado com os filtros selecionados' 
                          : 'Nenhum produto cadastrado'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-mono text-sm">
                          {product.short_id || product.id.substring(0, 8)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {product.external_code || '-'}
                        </TableCell>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell className="max-w-[300px] truncate text-sm text-muted-foreground">
                          {product.description || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{product.category}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          R$ {product.price.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {product.promotional_price && product.promotional_price > 0 ? (
                            <span className="text-green-600 font-medium">
                              R$ {product.promotional_price.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={product.is_available ? "default" : "secondary"}>
                            {product.is_available ? "Ativo" : "Inativo"}
                          </Badge>
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
                Mostrando {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredProducts.length)} de {filteredProducts.length}
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
