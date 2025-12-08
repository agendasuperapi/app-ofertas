import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollableTable } from '@/components/ui/scrollable-table';
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogDescription } from '@/components/ui/responsive-dialog';
import { toast } from 'sonner';
import { Loader2, Copy, ExternalLink, Package, Search, Target, Calculator, Ban, Link, ImageIcon } from 'lucide-react';
interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  promotional_price: number | null;
  image_url: string | null;
  short_id: string | null;
  external_code: string | null;
  is_available: boolean;
}
interface CommissionRule {
  product_id: string;
  commission_type: string;
  commission_value: number;
}
interface AffiliateStoreProductsTabProps {
  storeId: string;
  storeSlug: string;
  storeAffiliateId?: string;
  defaultCommissionType: string;
  defaultCommissionValue: number;
  couponCode: string;
}
export function AffiliateStoreProductsTab({
  storeId,
  storeSlug,
  storeAffiliateId,
  defaultCommissionType,
  defaultCommissionValue,
  couponCode
}: AffiliateStoreProductsTabProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [commissionRules, setCommissionRules] = useState<CommissionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  useEffect(() => {
    fetchData();
  }, [storeId, storeAffiliateId]);
  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch products
      const {
        data: productsData,
        error: productsError
      } = await supabase.from('products').select('id, name, category, price, promotional_price, image_url, short_id, external_code, is_available').eq('store_id', storeId).eq('is_available', true).is('deleted_at', null).order('category', {
        ascending: true
      }).order('name', {
        ascending: true
      });
      if (productsError) throw productsError;
      setProducts(productsData || []);

      // Fetch commission rules for this store affiliate
      // We need to get affiliate_id from store_affiliates first
      if (storeAffiliateId) {
        const {
          data: storeAffiliateData
        } = await supabase.from('store_affiliates').select('affiliate_account_id').eq('id', storeAffiliateId).single();
        if (storeAffiliateData?.affiliate_account_id) {
          // Get affiliates linked to this account for this store
          const {
            data: affiliateData
          } = await supabase.from('affiliates').select('id').eq('store_id', storeId).limit(1);
          if (affiliateData?.[0]?.id) {
            const {
              data: rulesData
            } = await supabase.from('affiliate_commission_rules').select('product_id, commission_type, commission_value').eq('affiliate_id', affiliateData[0].id).eq('is_active', true);
            if (rulesData) {
              setCommissionRules(rulesData);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };
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
  const getProductCommission = (productId: string) => {
    const specificRule = commissionRules.find(r => r.product_id === productId);
    if (specificRule) {
      return {
        type: specificRule.commission_type,
        value: specificRule.commission_value,
        source: 'specific'
      };
    }
    if (defaultCommissionValue > 0) {
      return {
        type: defaultCommissionType,
        value: defaultCommissionValue,
        source: 'default'
      };
    }
    return {
      type: 'percentage',
      value: 0,
      source: 'none'
    };
  };
  const calculateCommission = (product: Product) => {
    const commission = getProductCommission(product.id);
    const productPrice = product.promotional_price || product.price;
    if (commission.value === 0) return 0;
    if (commission.type === 'percentage') {
      return productPrice * commission.value / 100;
    }
    return commission.value;
  };
  const getProductLink = (product: Product) => {
    if (!product.short_id) return `https://ofertas.app/${storeSlug}`;
    return `https://ofertas.app/p/${product.short_id}?cupom=${couponCode}`;
  };
  const filteredProducts = products.filter(product => {
    const search = searchTerm.toLowerCase();
    return product.name.toLowerCase().includes(search) || product.category.toLowerCase().includes(search) || product.short_id && product.short_id.toLowerCase().includes(search) || product.external_code && product.external_code.toLowerCase().includes(search);
  });

  // Group by category
  const productsByCategory = filteredProducts.reduce((acc, product) => {
    if (!acc[product.category]) {
      acc[product.category] = [];
    }
    acc[product.category].push(product);
    return acc;
  }, {} as Record<string, Product[]>);
  if (loading) {
    return <div className="py-12 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground mt-2">Carregando produtos...</p>
      </div>;
  }
  return <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome, código interno ou externo..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
      </div>

      {/* Products Table */}
      <ScrollableTable>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Foto</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead className="text-right">Preço</TableHead>
              <TableHead className="text-center">Comissão</TableHead>
              <TableHead className="text-right">Você Ganha</TableHead>
              <TableHead className="text-center">Cupons Itens</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhum produto encontrado
                </TableCell>
              </TableRow> : filteredProducts.map(product => {
            const commission = getProductCommission(product.id);
            const commissionAmount = calculateCommission(product);
            const productPrice = product.promotional_price || product.price;
            return <TableRow key={product.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedProduct(product)}>
                    <TableCell>
                      {product.image_url ? <img src={product.image_url} alt={product.name} className="w-10 h-10 rounded-lg object-cover" /> : <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        </div>}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm truncate max-w-[200px]">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.category}</p>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          {product.short_id && <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                              #{product.short_id}
                            </span>}
                          {product.external_code && <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                              Ext: {product.external_code}
                            </span>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div>
                        {product.promotional_price ? <>
                            <p className="font-medium text-green-600">{formatCurrency(product.promotional_price)}</p>
                            <p className="text-xs text-muted-foreground line-through">{formatCurrency(product.price)}</p>
                          </> : <p className="font-medium">{formatCurrency(product.price)}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {commission.source === 'specific' && <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-purple-500/10 text-purple-600 border-purple-500/20">
                          <Target className="h-3 w-3 mr-1" />
                          {commission.type === 'percentage' ? `${commission.value}%` : formatCurrency(commission.value)}
                        </Badge>}
                      {commission.source === 'default' && <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-500/10 text-blue-600 border-blue-500/20">
                          <Calculator className="h-3 w-3 mr-1" />
                          {commission.type === 'percentage' ? `${commission.value}%` : formatCurrency(commission.value)}
                        </Badge>}
                      {commission.source === 'none' && <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-gray-500/10 text-gray-500 border-gray-500/20">
                          <Ban className="h-3 w-3 mr-1" />
                          Sem
                        </Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-bold text-green-600">
                        {formatCurrency(commissionAmount)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="sm" onClick={e => {
                  e.stopPropagation();
                  copyToClipboard(getProductLink(product), 'Link do produto');
                }}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>;
          })}
          </TableBody>
        </Table>
      </ScrollableTable>

      {/* Product Details Modal */}
      <ResponsiveDialog open={!!selectedProduct} onOpenChange={open => !open && setSelectedProduct(null)}>
        <ResponsiveDialogContent className="max-w-lg glass">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle className="flex items-center gap-2 gradient-text">
              <Package className="h-5 w-5 text-primary" />
              Detalhes do Produto
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Informações e link de afiliado
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          
          {selectedProduct && <motion.div initial={{
          opacity: 0,
          y: 10
        }} animate={{
          opacity: 1,
          y: 0
        }} className="space-y-6 mt-4">
              {/* Product Image & Info */}
              <div className="flex gap-4">
                {selectedProduct.image_url ? <div className="w-24 h-24 rounded-xl overflow-hidden ring-2 ring-primary/20 flex-shrink-0">
                    <img src={selectedProduct.image_url} alt={selectedProduct.name} className="w-full h-full object-cover" />
                  </div> : <div className="w-24 h-24 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                    <Package className="h-8 w-8 text-muted-foreground" />
                  </div>}
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{selectedProduct.name}</h3>
                  <Badge variant="secondary" className="mt-1">{selectedProduct.category}</Badge>
                  <div className="mt-2">
                    {selectedProduct.promotional_price ? <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-green-600">
                          {formatCurrency(selectedProduct.promotional_price)}
                        </span>
                        <span className="text-sm text-muted-foreground line-through">
                          {formatCurrency(selectedProduct.price)}
                        </span>
                      </div> : <span className="text-xl font-bold">{formatCurrency(selectedProduct.price)}</span>}
                  </div>
                </div>
              </div>

              {/* Commission Info */}
              {(() => {
            const commission = getProductCommission(selectedProduct.id);
            const commissionAmount = calculateCommission(selectedProduct);
            const productPrice = selectedProduct.promotional_price || selectedProduct.price;
            return <div className="p-4 bg-gradient-to-br from-green-500/5 to-green-500/10 rounded-xl border border-green-500/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Sua comissão</p>
                        <p className="text-2xl font-bold text-green-600">{formatCurrency(commissionAmount)}</p>
                      </div>
                      <div className="text-right">
                        {commission.source === 'specific' && <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20">
                            <Target className="h-3 w-3 mr-1" />
                            Regra específica
                          </Badge>}
                        {commission.source === 'default' && <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                            <Calculator className="h-3 w-3 mr-1" />
                            Comissão padrão
                          </Badge>}
                        {commission.source === 'none' && <Badge variant="outline" className="bg-gray-500/10 text-gray-500 border-gray-500/20">
                            <Ban className="h-3 w-3 mr-1" />
                            Sem comissão
                          </Badge>}
                        <p className="text-xs text-muted-foreground mt-1">
                          {commission.type === 'percentage' ? `${commission.value}% do valor` : 'Valor fixo'}
                        </p>
                      </div>
                    </div>
                  </div>;
          })()}

              {/* Share Link */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Link className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Link de afiliado do produto</span>
                </div>
                <div className="flex gap-2">
                  <Input value={getProductLink(selectedProduct)} readOnly className="font-mono text-xs" />
                  <Button variant="default" size="sm" onClick={() => copyToClipboard(getProductLink(selectedProduct), 'Link do produto')} className="shrink-0">
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  O cupom <span className="font-mono font-bold">{couponCode}</span> será aplicado automaticamente
                </p>
              </div>

              {/* View Product Button */}
              <Button variant="outline" className="w-full" onClick={() => window.open(getProductLink(selectedProduct), '_blank')}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Ver produto na loja
              </Button>
            </motion.div>}
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>;
}