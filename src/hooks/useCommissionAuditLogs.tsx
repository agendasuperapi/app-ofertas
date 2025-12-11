import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CommissionAuditLog {
  id: string;
  order_id: string;
  order_number: string | null;
  earning_id_before: string | null;
  earning_id_after: string | null;
  affiliate_id: string | null;
  store_affiliate_id: string | null;
  affiliate_name: string | null;
  store_id: string | null;
  order_total_before: number;
  coupon_discount_before: number;
  commission_amount_before: number;
  items_count_before: number;
  order_total_after: number;
  coupon_discount_after: number;
  commission_amount_after: number;
  items_count_after: number;
  commission_difference: number;
  reason: string;
  recalculated_by: string | null;
  recalculated_at: string;
  created_at: string;
}

interface AuditSummary {
  totalRecalculations: number;
  totalPositiveVariation: number;
  totalNegativeVariation: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  averageVariation: number;
}

export function useCommissionAuditLogs(storeId: string | undefined) {
  return useQuery({
    queryKey: ['commission-audit-logs', storeId],
    queryFn: async () => {
      if (!storeId) return { logs: [], summary: null };

      const { data, error } = await supabase
        .from('affiliate_commission_recalc_log')
        .select('*')
        .eq('store_id', storeId)
        .order('recalculated_at', { ascending: false });

      if (error) {
        console.error('Error fetching audit logs:', error);
        throw error;
      }

      const logs = (data || []) as CommissionAuditLog[];

      // Calculate summary
      const summary: AuditSummary = {
        totalRecalculations: logs.length,
        totalPositiveVariation: 0,
        totalNegativeVariation: 0,
        positiveCount: 0,
        negativeCount: 0,
        neutralCount: 0,
        averageVariation: 0
      };

      logs.forEach(log => {
        const diff = log.commission_difference || 0;
        if (diff > 0) {
          summary.totalPositiveVariation += diff;
          summary.positiveCount++;
        } else if (diff < 0) {
          summary.totalNegativeVariation += Math.abs(diff);
          summary.negativeCount++;
        } else {
          summary.neutralCount++;
        }
      });

      if (logs.length > 0) {
        const totalVariation = summary.totalPositiveVariation - summary.totalNegativeVariation;
        summary.averageVariation = totalVariation / logs.length;
      }

      return { logs, summary };
    },
    enabled: !!storeId
  });
}
