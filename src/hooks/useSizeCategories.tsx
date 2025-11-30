import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SizeCategory {
  id: string;
  store_id: string;
  name: string;
  display_order: number;
  is_active: boolean;
  is_exclusive: boolean;
  min_items: number;
  max_items: number | null;
  created_at: string;
  updated_at: string;
}

export function useSizeCategories(storeId?: string) {
  const [categories, setCategories] = useState<SizeCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (storeId) {
      fetchCategories();
    }
  }, [storeId]);

  const fetchCategories = async () => {
    if (!storeId) return;
    
    try {
      setLoading(true);
      const result: any = await (supabase as any)
        .from('size_categories')
        .select('*')
        .eq('store_id', storeId)
        .order('display_order', { ascending: true });

      if (result.error) throw result.error;
      setCategories(result.data || []);
    } catch (error) {
      console.error('Erro ao buscar categorias de variações:', error);
      toast.error('Erro ao carregar categorias de variações');
    } finally {
      setLoading(false);
    }
  };

  const addCategory = async (categoryData: {
    name: string;
    is_exclusive?: boolean;
    min_items?: number;
    max_items?: number | null;
  }) => {
    if (!storeId) return;

    try {
      const maxOrder = Math.max(...categories.map(c => c.display_order), -1);
      
      const result: any = await (supabase as any)
        .from('size_categories')
        .insert({
          store_id: storeId,
          name: categoryData.name,
          is_exclusive: categoryData.is_exclusive ?? false,
          min_items: categoryData.min_items ?? 0,
          max_items: categoryData.max_items,
          display_order: maxOrder + 1,
          is_active: true
        })
        .select()
        .single();

      if (result.error) throw result.error;

      setCategories([...categories, result.data]);
      toast.success('Categoria criada com sucesso');
      return result.data;
    } catch (error) {
      console.error('Erro ao criar categoria:', error);
      toast.error('Erro ao criar categoria');
      throw error;
    }
  };

  const updateCategory = async (id: string, updates: Partial<SizeCategory>) => {
    try {
      const result: any = await (supabase as any)
        .from('size_categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (result.error) throw result.error;

      setCategories(categories.map(cat => cat.id === id ? result.data : cat));
      toast.success('Categoria atualizada com sucesso');
      return result.data;
    } catch (error) {
      console.error('Erro ao atualizar categoria:', error);
      toast.error('Erro ao atualizar categoria');
      throw error;
    }
  };

  const toggleCategoryStatus = async (id: string, is_active: boolean) => {
    await updateCategory(id, { is_active });
  };

  const deleteCategory = async (id: string) => {
    try {
      const sizesResult: any = await (supabase as any)
        .from('product_sizes')
        .select('id')
        .eq('category_id', id)
        .limit(1);

      if (sizesResult.data && sizesResult.data.length > 0) {
        toast.error('Não é possível excluir uma categoria que possui variações associadas');
        return;
      }

      const result: any = await (supabase as any)
        .from('size_categories')
        .delete()
        .eq('id', id);

      if (result.error) throw result.error;

      setCategories(categories.filter(cat => cat.id !== id));
      toast.success('Categoria excluída com sucesso');
    } catch (error) {
      console.error('Erro ao excluir categoria:', error);
      toast.error('Erro ao excluir categoria');
      throw error;
    }
  };

  const reorderCategories = async (updates: { id: string; display_order: number }[]) => {
    try {
      const promises = updates.map(({ id, display_order }) =>
        (supabase as any)
          .from('size_categories')
          .update({ display_order })
          .eq('id', id)
      );

      await Promise.all(promises);

      const updatedCategories = categories.map(cat => {
        const update = updates.find(u => u.id === cat.id);
        return update ? { ...cat, display_order: update.display_order } : cat;
      });

      setCategories(updatedCategories.sort((a, b) => a.display_order - b.display_order));
      toast.success('Ordem atualizada com sucesso');
    } catch (error) {
      console.error('Erro ao reordenar categorias:', error);
      toast.error('Erro ao reordenar categorias');
      throw error;
    }
  };

  const refetch = () => {
    fetchCategories();
  };

  return {
    categories,
    loading,
    addCategory,
    updateCategory,
    toggleCategoryStatus,
    deleteCategory,
    reorderCategories,
    refetch
  };
}
