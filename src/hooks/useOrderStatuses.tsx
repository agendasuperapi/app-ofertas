import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface OrderStatus {
  id: string;
  status_key: string;
  status_label: string;
  status_color: string;
  display_order: number;
  is_active: boolean;
}

export const useOrderStatuses = (storeId: string | undefined) => {
  const [statuses, setStatuses] = useState<OrderStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storeId) {
      setLoading(false);
      return;
    }

    const loadStatuses = async () => {
      try {
        const { data, error } = await supabase
          .from('order_status_configs' as any)
          .select('id, status_key, status_label, status_color, display_order, is_active')
          .eq('store_id', storeId)
          .eq('is_active', true)
          .order('display_order');

        if (error) throw error;
        setStatuses((data as any) || []);
      } catch (error) {
        console.error('Error loading order statuses:', error);
        setStatuses([]);
      } finally {
        setLoading(false);
      }
    };

    loadStatuses();
  }, [storeId]);

  return { statuses, loading };
};
