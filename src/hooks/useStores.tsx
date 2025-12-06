import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Use the secure public view for browsing stores (excludes sensitive data like pix_key)
export const useStores = (category?: string, searchTerm?: string) => {
  return useQuery({
    queryKey: ['stores', category, searchTerm],
    queryFn: async () => {
      // Use stores_public view which hides sensitive columns
      let query = (supabase as any)
        .from('stores_public')
        .select('*')
        .order('rating', { ascending: false });

      if (category && category !== 'all') {
        query = query.eq('category', category);
      }

      if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
  });
};

// Use the secure public view for single store (excludes sensitive data)
export const useStore = (slug: string) => {
  return useQuery({
    queryKey: ['store', slug],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('stores_public')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });
};

// Hook to get PIX key for checkout (authenticated users only)
export const useStorePixKey = (storeId: string, enabled = true) => {
  return useQuery({
    queryKey: ['store-pix-key', storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_store_pix_key_for_order', { p_store_id: storeId });
      
      if (error) throw error;
      return data?.[0] || null;
    },
    enabled: !!storeId && enabled,
  });
};
