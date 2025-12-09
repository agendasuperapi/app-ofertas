import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface CouponDiscountRule {
  id: string;
  coupon_id: string;
  product_id: string | null;
  category_name: string | null;
  discount_type: string;
  discount_value: number;
  rule_type: string;
}

interface UseCouponDiscountRulesNotificationOptions {
  couponIds: string[];
  onRulesChange: () => void;
  enabled?: boolean;
}

export function useCouponDiscountRulesNotification({
  couponIds,
  onRulesChange,
  enabled = true
}: UseCouponDiscountRulesNotificationOptions) {
  const onRulesChangeRef = useRef(onRulesChange);
  
  // Keep callback ref updated
  useEffect(() => {
    onRulesChangeRef.current = onRulesChange;
  }, [onRulesChange]);

  useEffect(() => {
    if (!enabled || couponIds.length === 0) return;

    const handleChange = (payload: RealtimePostgresChangesPayload<CouponDiscountRule>) => {
      const record = payload.new as CouponDiscountRule | undefined;
      const oldRecord = payload.old as CouponDiscountRule | undefined;
      
      // Check if the change is for one of our coupons
      const couponId = record?.coupon_id || oldRecord?.coupon_id;
      if (couponId && couponIds.includes(couponId)) {
        console.log('[Realtime] Coupon discount rule changed:', payload.eventType, couponId);
        onRulesChangeRef.current();
      }
    };

    const channel = supabase
      .channel('coupon-discount-rules-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'coupon_discount_rules'
        },
        handleChange
      )
      .subscribe((status) => {
        console.log('[Realtime] Coupon discount rules subscription:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, couponIds.join(',')]); // Join couponIds to create stable dependency
}

interface UseCouponChangesNotificationOptions {
  couponIds: string[];
  onCouponChange: () => void;
  enabled?: boolean;
}

export function useCouponChangesNotification({
  couponIds,
  onCouponChange,
  enabled = true
}: UseCouponChangesNotificationOptions) {
  const onCouponChangeRef = useRef(onCouponChange);
  
  useEffect(() => {
    onCouponChangeRef.current = onCouponChange;
  }, [onCouponChange]);

  useEffect(() => {
    if (!enabled || couponIds.length === 0) return;

    const handleChange = (payload: RealtimePostgresChangesPayload<{ id: string }>) => {
      const record = payload.new as { id: string } | undefined;
      const oldRecord = payload.old as { id: string } | undefined;
      
      const couponId = record?.id || oldRecord?.id;
      if (couponId && couponIds.includes(couponId)) {
        console.log('[Realtime] Coupon changed:', payload.eventType, couponId);
        onCouponChangeRef.current();
      }
    };

    const channel = supabase
      .channel('coupons-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'coupons'
        },
        handleChange
      )
      .subscribe((status) => {
        console.log('[Realtime] Coupons subscription:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, couponIds.join(',')]);
}
