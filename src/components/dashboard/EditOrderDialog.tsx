import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ImageUpload } from "./ImageUpload";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, MapPin, CreditCard, StickyNote, Image as ImageIcon } from "lucide-react";

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  observation?: string;
}

interface EditOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
  onUpdate: () => void;
}

export const EditOrderDialog = ({ open, onOpenChange, order, onUpdate }: EditOrderDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  
  const [formData, setFormData] = useState({
    payment_method: order?.payment_method || 'pix',
    change_amount: order?.change_amount || 0,
    delivery_type: order?.delivery_type || 'delivery',
    delivery_street: order?.delivery_street || '',
    delivery_number: order?.delivery_number || '',
    delivery_neighborhood: order?.delivery_neighborhood || '',
    delivery_complement: order?.delivery_complement || '',
    delivery_fee: order?.delivery_fee || 0,
    store_notes: order?.store_notes || '',
    store_image_url: order?.store_image_url || '',
  });

  useEffect(() => {
    if (order) {
      setFormData({
        payment_method: order.payment_method || 'pix',
        change_amount: order.change_amount || 0,
        delivery_type: order.delivery_type || 'delivery',
        delivery_street: order.delivery_street || '',
        delivery_number: order.delivery_number || '',
        delivery_neighborhood: order.delivery_neighborhood || '',
        delivery_complement: order.delivery_complement || '',
        delivery_fee: order.delivery_fee || 0,
        store_notes: order.store_notes || '',
        store_image_url: order.store_image_url || '',
      });
      loadOrderItems();
    }
  }, [order]);

  const loadOrderItems = async () => {
    if (!order?.id) return;
    
    const { data, error } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', order.id);

    if (error) {
      toast({
        title: 'Erro ao carregar itens',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    setOrderItems(data || []);
  };

  const updateOrderItem = async (itemId: string, updates: Partial<OrderItem>) => {
    const { error } = await supabase
      .from('order_items')
      .update(updates)
      .eq('id', itemId);

    if (error) {
      toast({
        title: 'Erro ao atualizar item',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    await loadOrderItems();
    toast({
      title: 'Item atualizado!',
      description: 'O item do pedido foi atualizado com sucesso.',
    });
  };

  const handleSubmit = async () => {
    setLoading(true);
    
    try {
      // Calculate new total
      const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
      const total = subtotal + (formData.delivery_fee || 0);

      const { error } = await supabase
        .from('orders')
        .update({
          payment_method: formData.payment_method,
          change_amount: formData.change_amount,
          delivery_type: formData.delivery_type,
          delivery_street: formData.delivery_street,
          delivery_number: formData.delivery_number,
          delivery_neighborhood: formData.delivery_neighborhood,
          delivery_complement: formData.delivery_complement,
          delivery_fee: formData.delivery_fee,
          store_notes: formData.store_notes,
          store_image_url: formData.store_image_url,
          subtotal: subtotal,
          total: total,
        })
        .eq('id', order.id);

      if (error) throw error;

      toast({
        title: 'Pedido atualizado!',
        description: 'As alterações foram salvas com sucesso.',
      });

      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar pedido',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Editar Pedido #{order.order_number}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="items" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-4 flex-shrink-0">
            <TabsTrigger value="items">
              <Package className="w-4 h-4 mr-2" />
              Itens
            </TabsTrigger>
            <TabsTrigger value="payment">
              <CreditCard className="w-4 h-4 mr-2" />
              Pagamento
            </TabsTrigger>
            <TabsTrigger value="delivery">
              <MapPin className="w-4 h-4 mr-2" />
              Entrega
            </TabsTrigger>
            <TabsTrigger value="notes">
              <StickyNote className="w-4 h-4 mr-2" />
              Notas
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            <TabsContent value="items" className="space-y-4 pr-4">
              {orderItems.map((item) => (
                <div key={item.id} className="border rounded-lg p-4 space-y-3">
                  <div className="font-medium">{item.product_name}</div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label>Quantidade</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => {
                          const newQuantity = parseInt(e.target.value) || 1;
                          const newSubtotal = item.unit_price * newQuantity;
                          updateOrderItem(item.id, { 
                            quantity: newQuantity,
                            subtotal: newSubtotal 
                          });
                        }}
                      />
                    </div>
                    <div>
                      <Label>Preço Unit.</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => {
                          const newPrice = parseFloat(e.target.value) || 0;
                          const newSubtotal = newPrice * item.quantity;
                          updateOrderItem(item.id, { 
                            unit_price: newPrice,
                            subtotal: newSubtotal 
                          });
                        }}
                      />
                    </div>
                    <div>
                      <Label>Subtotal</Label>
                      <Input
                        type="text"
                        value={`R$ ${item.subtotal.toFixed(2)}`}
                        disabled
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Observação</Label>
                    <Textarea
                      value={item.observation || ''}
                      onChange={(e) => updateOrderItem(item.id, { observation: e.target.value })}
                      placeholder="Ex: Sem cebola..."
                      rows={2}
                    />
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="payment" className="space-y-4 pr-4">
              <div>
                <Label>Forma de Pagamento</Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                    <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.payment_method === 'dinheiro' && (
                <div>
                  <Label>Troco para</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.change_amount}
                    onChange={(e) => setFormData({ ...formData, change_amount: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                </div>
              )}
            </TabsContent>

            <TabsContent value="delivery" className="space-y-4 pr-4">
              <div>
                <Label>Tipo de Entrega</Label>
                <Select
                  value={formData.delivery_type}
                  onValueChange={(value) => setFormData({ ...formData, delivery_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="delivery">Entrega</SelectItem>
                    <SelectItem value="pickup">Retirada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Taxa de Entrega</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.delivery_fee}
                  onChange={(e) => setFormData({ ...formData, delivery_fee: parseFloat(e.target.value) || 0 })}
                />
              </div>

              {formData.delivery_type === 'delivery' && (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Label>Rua</Label>
                      <Input
                        value={formData.delivery_street}
                        onChange={(e) => setFormData({ ...formData, delivery_street: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Número</Label>
                      <Input
                        value={formData.delivery_number}
                        onChange={(e) => setFormData({ ...formData, delivery_number: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Bairro</Label>
                      <Input
                        value={formData.delivery_neighborhood}
                        onChange={(e) => setFormData({ ...formData, delivery_neighborhood: e.target.value })}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Complemento</Label>
                      <Input
                        value={formData.delivery_complement}
                        onChange={(e) => setFormData({ ...formData, delivery_complement: e.target.value })}
                        placeholder="Apartamento, bloco, referência..."
                      />
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="notes" className="space-y-4 pr-4">
              <div>
                <Label>Observações Internas (apenas você vê)</Label>
                <Textarea
                  value={formData.store_notes}
                  onChange={(e) => setFormData({ ...formData, store_notes: e.target.value })}
                  placeholder="Anotações sobre este pedido..."
                  rows={5}
                />
              </div>

              <Separator />

              <div>
                <Label>Imagem Anexa (apenas você vê)</Label>
                <ImageUpload
                  bucket="product-images"
                  folder={`orders/${order.id}`}
                  productId={order.id}
                  currentImageUrl={formData.store_image_url}
                  onUploadComplete={(url) => setFormData({ ...formData, store_image_url: url })}
                  label=""
                  aspectRatio="aspect-square"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Anexe comprovantes, fotos ou documentos relacionados ao pedido
                </p>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
