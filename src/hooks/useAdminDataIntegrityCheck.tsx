import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface IntegrityIssue {
  store_id: string;
  store_name: string;
  issue_type: string;
  issue_description: string;
  affected_count: number;
  severity: 'error' | 'warning';
  sample_data: any[];
}

export interface CorrectionHistory {
  id: string;
  store_id: string;
  store_name: string;
  issue_type: string;
  fixed_count: number;
  fixed_by_name: string;
  fixed_at: string;
  details: any;
}

export interface StoreIssues {
  store_id: string;
  store_name: string;
  issues: IntegrityIssue[];
  totalErrors: number;
  totalWarnings: number;
}

interface UseAdminDataIntegrityCheckOptions {
  interval?: number; // milliseconds, default: 5 minutes
  enabled?: boolean;
}

export function useAdminDataIntegrityCheck(options: UseAdminDataIntegrityCheckOptions = {}) {
  const { interval = 5 * 60 * 1000, enabled = true } = options;
  const { user } = useAuth();
  
  const [issues, setIssues] = useState<IntegrityIssue[]>([]);
  const [history, setHistory] = useState<CorrectionHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [totalStoresChecked, setTotalStoresChecked] = useState(0);

  // Group issues by store
  const storesWithIssues: StoreIssues[] = issues.reduce((acc: StoreIssues[], issue) => {
    const existing = acc.find(s => s.store_id === issue.store_id);
    if (existing) {
      existing.issues.push(issue);
      if (issue.severity === 'error') existing.totalErrors++;
      else existing.totalWarnings++;
    } else {
      acc.push({
        store_id: issue.store_id,
        store_name: issue.store_name,
        issues: [issue],
        totalErrors: issue.severity === 'error' ? 1 : 0,
        totalWarnings: issue.severity === 'warning' ? 1 : 0,
      });
    }
    return acc;
  }, []);

  // Calculate totals
  const totalIssues = issues.length;
  const totalErrors = issues.filter(i => i.severity === 'error').length;
  const totalWarnings = issues.filter(i => i.severity === 'warning').length;
  const storesWithIssuesCount = storesWithIssues.length;

  // Run integrity check
  const runCheck = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Buscar contagem de lojas ativas
      const { count: storesCount } = await supabase
        .from('stores')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');
      
      setTotalStoresChecked(storesCount || 0);
      
      const { data, error } = await supabase.rpc('check_all_stores_data_integrity');
      
      if (error) {
        console.error('Error checking data integrity:', error);
        toast.error('Erro ao verificar integridade dos dados');
        return;
      }

      setIssues((data || []).map((d: any) => ({
        ...d,
        sample_data: Array.isArray(d.sample_data) ? d.sample_data : []
      })));
      setLastChecked(new Date());
    } catch (err) {
      console.error('Error in integrity check:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Fetch correction history
  const fetchHistory = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase.rpc('get_data_integrity_corrections_history', {
        p_limit: 50
      });
      
      if (error) {
        console.error('Error fetching correction history:', error);
        return;
      }

      setHistory(data || []);
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  }, [user]);

  // Fix a specific issue for a store
  const fixIssue = useCallback(async (storeId: string, issueType: string) => {
    if (!user) return;
    
    setIsFixing(true);
    try {
      // Get user profile for name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      
      const { data, error } = await supabase.rpc('fix_store_data_integrity', {
        p_store_id: storeId,
        p_issue_type: issueType,
        p_fixed_by: user.id,
        p_fixed_by_name: profile?.full_name || user.email || 'Admin'
      });
      
      if (error) {
        console.error('Error fixing issue:', error);
        toast.error('Erro ao corrigir inconsistência');
        return;
      }

      const result = data as any;
      if (result?.success) {
        toast.success(`✅ ${result.fixed_count} registro(s) corrigido(s) em ${result.store_name}`);
        // Refresh data
        await runCheck();
        await fetchHistory();
      } else {
        toast.error(result?.error || 'Não foi possível corrigir esta inconsistência');
      }
    } catch (err) {
      console.error('Error fixing issue:', err);
      toast.error('Erro ao corrigir inconsistência');
    } finally {
      setIsFixing(false);
    }
  }, [user, runCheck, fetchHistory]);

  // Fix all auto-fixable issues
  const fixAllIssues = useCallback(async () => {
    if (!user || storesWithIssues.length === 0) return;
    
    setIsFixing(true);
    let totalFixed = 0;
    
    try {
      for (const store of storesWithIssues) {
        for (const issue of store.issues) {
          // Only auto-fix supported types
          if (['order_total_mismatch', 'affiliate_config_desync', 'negative_values', 'coupon_discount_rules_mismatch'].includes(issue.issue_type)) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', user.id)
              .single();
            
            const { data, error } = await supabase.rpc('fix_store_data_integrity', {
              p_store_id: store.store_id,
              p_issue_type: issue.issue_type,
              p_fixed_by: user.id,
              p_fixed_by_name: profile?.full_name || user.email || 'Admin'
            });
            
            if (!error && (data as any)?.success) {
              totalFixed += (data as any).fixed_count;
            }
          }
        }
      }
      
      if (totalFixed > 0) {
        toast.success(`✅ ${totalFixed} registro(s) corrigido(s) no total`);
      } else {
        toast.info('Nenhuma correção automática disponível');
      }
      
      // Refresh data
      await runCheck();
      await fetchHistory();
    } catch (err) {
      console.error('Error fixing all issues:', err);
      toast.error('Erro ao corrigir inconsistências');
    } finally {
      setIsFixing(false);
    }
  }, [user, storesWithIssues, runCheck, fetchHistory]);

  // Initial load
  useEffect(() => {
    if (enabled && user) {
      runCheck();
      fetchHistory();
    }
  }, [enabled, user, runCheck, fetchHistory]);

  // Periodic check
  useEffect(() => {
    if (!enabled || !user) return;
    
    const intervalId = setInterval(() => {
      runCheck();
    }, interval);
    
    return () => clearInterval(intervalId);
  }, [enabled, user, interval, runCheck]);

  return {
    issues,
    storesWithIssues,
    history,
    isLoading,
    isFixing,
    lastChecked,
    totalIssues,
    totalErrors,
    totalWarnings,
    storesWithIssuesCount,
    totalStoresChecked,
    runCheck,
    fetchHistory,
    fixIssue,
    fixAllIssues,
  };
}
