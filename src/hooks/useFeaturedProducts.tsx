import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const fetchFeaturedProducts = async (storeId: string) => {
  const result = await supabase
    .from('products')
    .select(`
      *,
      product_images!left(id, image_url, is_primary, display_order)
    `)
    .eq('store_id', storeId)
    .eq('is_available', true)
    .eq('is_featured', true)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(10);

  if (result.error) throw result.error;
  
  // Process products to get primary image URL
  return (result.data || []).map(product => {
    const images = product.product_images || [];
    const primaryImage = images.find((img: any) => img.is_primary) || images[0];
    return {
      ...product,
      resolved_image_url: primaryImage?.image_url || product.image_url
    };
  });
};

export const useFeaturedProducts = (storeId: string) => {
  return useQuery({
    queryKey: ['featured-products', storeId] as const,
    queryFn: () => fetchFeaturedProducts(storeId),
    enabled: !!storeId,
  });
};
