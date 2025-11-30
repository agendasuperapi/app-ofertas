import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface StoreSize {
  id: string;
  name: string;
  price: number;
  is_available: boolean;
  product_id: string;
  category_id: string | null;
  description?: string;
  allow_quantity?: boolean;
  created_at: string;
  updated_at: string;
  category?: {
    id: string;
    name: string;
  };
}

export const useStoreSizes = (storeId?: string) => {
  const queryClient = useQueryClient();

  // Buscar todas as variações da loja
  const sizesQuery = useQuery({
    queryKey: ['store-sizes', storeId],
    queryFn: async () => {
      if (!storeId) return [];

      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id')
        .eq('store_id', storeId);

      if (productsError) throw productsError;
      if (!products || products.length === 0) return [];

      const productIds = products.map(p => p.id);

      const { data, error } = await supabase
        .from('product_sizes')
        .select(`
          *,
          category:size_categories(id, name)
        `)
        .in('product_id', productIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // De-duplicar variações por nome e categoria
      // Se houver variações com mesmo nome e categoria em produtos diferentes,
      // mantém apenas a mais recente
      const uniqueSizes = new Map<string, StoreSize>();
      (data || []).forEach((size: StoreSize) => {
        const key = `${size.name}-${size.category_id || 'null'}`;
        if (!uniqueSizes.has(key)) {
          uniqueSizes.set(key, size);
        }
      });
      
      return Array.from(uniqueSizes.values());
    },
    enabled: !!storeId,
  });

  // Criar variação global
  const createSizeMutation = useMutation({
    mutationFn: async (sizeData: {
      name: string;
      price: number;
      is_available: boolean;
      product_id: string;
      category_id?: string | null;
      description?: string;
      allow_quantity?: boolean;
    }) => {
      const { data, error } = await supabase
        .from('product_sizes')
        .insert(sizeData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-sizes', storeId] });
      queryClient.invalidateQueries({ queryKey: ['product-sizes'] });
      toast({
        title: 'Variação criada!',
        description: 'A variação foi adicionada com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar variação',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Atualizar variação
  const updateSizeMutation = useMutation({
    mutationFn: async ({ id, ...sizeData }: Partial<StoreSize> & { id: string }) => {
      const { data, error } = await supabase
        .from('product_sizes')
        .update(sizeData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-sizes', storeId] });
      queryClient.invalidateQueries({ queryKey: ['product-sizes'] });
      toast({
        title: 'Variação atualizada!',
        description: 'As informações da variação foram atualizadas.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar variação',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Deletar variação
  const deleteSizeMutation = useMutation({
    mutationFn: async (sizeId: string) => {
      const { error } = await supabase
        .from('product_sizes')
        .delete()
        .eq('id', sizeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-sizes', storeId] });
      queryClient.invalidateQueries({ queryKey: ['product-sizes'] });
      toast({
        title: 'Variação removida!',
        description: 'A variação foi removida com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao remover variação',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Atualização em massa
  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: Partial<StoreSize> }) => {
      const promises = ids.map(id =>
        supabase
          .from('product_sizes')
          .update(updates)
          .eq('id', id)
      );

      const results = await Promise.all(promises);
      const errors = results.filter(r => r.error);
      
      if (errors.length > 0) {
        throw new Error(`Falha ao atualizar ${errors.length} variações`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-sizes', storeId] });
      queryClient.invalidateQueries({ queryKey: ['product-sizes'] });
      toast({
        title: 'Variações atualizadas!',
        description: 'As variações foram atualizadas em massa.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar variações',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    sizes: sizesQuery.data,
    isLoading: sizesQuery.isLoading,
    createSize: createSizeMutation.mutate,
    updateSize: updateSizeMutation.mutate,
    deleteSize: deleteSizeMutation.mutate,
    bulkUpdate: bulkUpdateMutation.mutate,
    isCreating: createSizeMutation.isPending,
    isUpdating: updateSizeMutation.isPending,
    isDeleting: deleteSizeMutation.isPending,
    isBulkUpdating: bulkUpdateMutation.isPending,
  };
};
