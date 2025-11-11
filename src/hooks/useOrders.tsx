import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';

// Validation schema for order data
const orderSchema = z.object({
  storeId: z.string().uuid(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    productName: z.string().trim().min(1).max(200),
    quantity: z.number().int().positive().max(1000),
    unitPrice: z.number().positive().max(100000),
    observation: z.string().trim().max(500).optional().transform(val => val || undefined),
    addons: z.array(z.object({
      id: z.string(),
      name: z.string().trim().min(1).max(200),
      price: z.number().nonnegative().max(10000),
    })).optional().default([]).transform(val => val && val.length > 0 ? val : []),
  })).min(1),
  customerName: z.string().trim().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100, 'Nome muito longo'),
  customerPhone: z.string()
    .transform(val => val.replace(/\D/g, ''))
    .refine(val => val.length === 10 || val.length === 11, {
      message: 'Telefone deve ter 10 ou 11 dígitos'
    }),
  deliveryType: z.enum(['delivery', 'pickup']),
  deliveryStreet: z.string().trim().max(200, 'Nome da rua muito longo').optional().transform(val => val || undefined),
  deliveryNumber: z.string().trim().max(20, 'Número muito longo').optional().transform(val => val || undefined),
  deliveryNeighborhood: z.string().trim().max(100, 'Nome do bairro muito longo').optional().transform(val => val || undefined),
  deliveryComplement: z.string().trim().max(100, 'Complemento muito longo').optional().transform(val => val || undefined),
  notes: z.string().trim().max(500, 'Observações muito longas').optional().transform(val => val || undefined),
  paymentMethod: z.enum(['pix', 'dinheiro', 'cartao'], { errorMap: () => ({ message: 'Método de pagamento inválido' }) }),
  changeAmount: z.number().positive().max(100000).optional(),
}).refine((data) => {
  if (data.deliveryType === 'delivery') {
    return data.deliveryStreet && data.deliveryStreet.length >= 3 && 
           data.deliveryNumber && data.deliveryNumber.length >= 1 && 
           data.deliveryNeighborhood && data.deliveryNeighborhood.length >= 2;
  }
  return true;
}, {
  message: 'Endereço completo é obrigatório para entrega',
  path: ['deliveryStreet'],
});

export interface CreateOrderData {
  storeId: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    observation?: string;
    addons?: Array<{
      id: string;
      name: string;
      price: number;
    }>;
  }>;
  customerName: string;
  customerPhone: string;
  deliveryType: 'delivery' | 'pickup';
  deliveryStreet?: string;
  deliveryNumber?: string;
  deliveryNeighborhood?: string;
  deliveryComplement?: string;
  notes?: string;
  paymentMethod: 'pix' | 'dinheiro' | 'cartao';
  changeAmount?: number;
}

export const useOrders = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const ordersQuery = useQuery({
    queryKey: ['orders', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            order_item_addons (*)
          ),
          stores (
            name,
            slug
          )
        `)
        .eq('customer_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: CreateOrderData) => {
      try {
        console.log('🔍 [STEP 1] Dados recebidos do Cart:', JSON.stringify(orderData, null, 2));
        
        // Validate input data
        const validatedData = orderSchema.parse(orderData);
        console.log('✅ [STEP 2] Dados validados com sucesso:', JSON.stringify(validatedData, null, 2));
        
        // Calculate totals
        const subtotal = validatedData.items.reduce(
          (sum, item) => sum + (item.unitPrice * item.quantity),
          0
        );
        const deliveryFee = validatedData.deliveryType === 'pickup' ? 0 : 5;
        const total = subtotal + deliveryFee;

        // Generate order number
        const orderNumber = `#${Date.now().toString().slice(-8)}`;
        
        console.log('💰 [STEP 3] Totais calculados:', { subtotal, deliveryFee, total, orderNumber });

        // Create order with validated data (remove undefined values)
        const orderInsertData = {
          store_id: validatedData.storeId,
          customer_id: user!.id,
          customer_name: validatedData.customerName,
          customer_phone: validatedData.customerPhone,
          delivery_type: validatedData.deliveryType,
          order_number: orderNumber,
          subtotal,
          delivery_fee: deliveryFee,
          total,
          status: 'pending' as const,
          payment_method: validatedData.paymentMethod,
          ...(validatedData.deliveryStreet && { delivery_street: validatedData.deliveryStreet }),
          ...(validatedData.deliveryNumber && { delivery_number: validatedData.deliveryNumber }),
          ...(validatedData.deliveryNeighborhood && { delivery_neighborhood: validatedData.deliveryNeighborhood }),
          ...(validatedData.deliveryComplement && { delivery_complement: validatedData.deliveryComplement }),
          ...(validatedData.changeAmount && { change_amount: validatedData.changeAmount }),
        };

        console.log('📦 [STEP 4] Dados que serão inseridos na tabela orders:', JSON.stringify(orderInsertData, null, 2));

        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert(orderInsertData)
          .select()
          .single();

        if (orderError) {
          console.error('❌ [ERRO] Falha ao criar pedido:', {
            message: orderError.message,
            details: orderError.details,
            hint: orderError.hint,
            code: orderError.code
          });
          throw new Error(`Erro ao criar pedido: ${orderError.message}`);
        }
        
        console.log('✅ [STEP 5] Pedido criado com sucesso:', order);

        // Update order with notes field separately
        if (validatedData.notes) {
          console.log('📝 [STEP 6] Adicionando notes ao pedido:', validatedData.notes);
          const { error: notesError } = await supabase
            .from('orders')
            .update({ notes: validatedData.notes })
            .eq('id', order.id);
          
          if (notesError) {
            console.error('⚠️ Erro ao atualizar notes:', notesError);
          }
        }

        // Create order items with validated data
        console.log('🛒 [STEP 7] Criando itens do pedido...');
        const itemsToInsert = validatedData.items.map(item => ({
          order_id: order.id,
          product_id: item.productId,
          product_name: item.productName,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          subtotal: item.unitPrice * item.quantity,
          observation: item.observation || null,
        }));
        
        console.log('📝 Itens a inserir:', JSON.stringify(itemsToInsert, null, 2));
        
        const { data: createdItems, error: itemsError } = await supabase
          .from('order_items')
          .insert(itemsToInsert)
          .select();

        if (itemsError) {
          console.error('❌ [ERRO] Falha ao criar itens:', {
            message: itemsError.message,
            details: itemsError.details,
            hint: itemsError.hint,
            code: itemsError.code
          });
          throw new Error(`Erro ao criar itens: ${itemsError.message}`);
        }
        
        console.log('✅ [STEP 8] Itens criados:', createdItems);

        // Create order item addons if any
        const addonsToInsert: Array<{
          order_item_id: string;
          addon_name: string;
          addon_price: number;
        }> = [];
        
        validatedData.items.forEach((item, index) => {
          if (Array.isArray(item.addons) && item.addons.length > 0 && createdItems && createdItems[index]) {
            item.addons.forEach(addon => {
              if (addon && addon.name && typeof addon.price === 'number' && !isNaN(addon.price)) {
                addonsToInsert.push({
                  order_item_id: createdItems[index].id,
                  addon_name: String(addon.name).trim(),
                  addon_price: Number(addon.price),
                });
              }
            });
          }
        });

        if (addonsToInsert.length > 0) {
          console.log('🎁 [STEP 9] Criando addons:', JSON.stringify(addonsToInsert, null, 2));
          const { error: addonsError } = await supabase
            .from('order_item_addons')
            .insert(addonsToInsert);

          if (addonsError) {
            console.error('❌ [ERRO] Falha ao inserir addons:', {
              message: addonsError.message,
              details: addonsError.details,
              hint: addonsError.hint,
              code: addonsError.code
            });
          } else {
            console.log('✅ [STEP 10] Addons criados com sucesso');
          }
        }

        console.log('🎉 [SUCESSO] PEDIDO FINALIZADO COM SUCESSO!');
        return order;
      } catch (error) {
        console.error('💥 [ERRO GERAL]', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({
        title: 'Pedido realizado!',
        description: 'Seu pedido foi enviado com sucesso.',
      });
    },
    onError: (error: Error) => {
      const errorMessage = error instanceof z.ZodError 
        ? error.errors[0]?.message || 'Dados do pedido inválidos'
        : error.message;
      
      toast({
        title: 'Erro ao criar pedido',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  return {
    orders: ordersQuery.data,
    isLoading: ordersQuery.isLoading,
    createOrder: (data: CreateOrderData) => createOrderMutation.mutateAsync(data),
    isCreating: createOrderMutation.isPending,
  };
};
