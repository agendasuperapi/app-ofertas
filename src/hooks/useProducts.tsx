import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useProducts = (storeId: string) => {
  return useQuery({
    queryKey: ['products', storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          product_images!left(id, image_url, is_primary, display_order)
        `)
        .eq('store_id', storeId)
        .eq('is_available', true)
        .order('display_order', { ascending: true })
        .order('category')
        .order('name');

      if (error) throw error;
      
      // Process products to get primary image URL
      return (data || []).map(product => {
        const images = product.product_images || [];
        const primaryImage = images.find((img: any) => img.is_primary) || images[0];
        return {
          ...product,
          resolved_image_url: primaryImage?.image_url || product.image_url
        };
      });
    },
    enabled: !!storeId,
  });
};
