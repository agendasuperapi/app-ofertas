import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const fetchFeaturedProducts = async (storeId: string) => {
  const result = await (supabase as any)
    .from('products')
    .select('*')
    .eq('store_id', storeId)
    .eq('is_available', true)
    .eq('is_featured', true)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(10);

  if (result.error) throw result.error;
  return result.data || [];
};

export const useFeaturedProducts = (storeId: string) => {
  return useQuery({
    queryKey: ['featured-products', storeId] as const,
    queryFn: () => fetchFeaturedProducts(storeId),
    enabled: !!storeId,
  });
};
