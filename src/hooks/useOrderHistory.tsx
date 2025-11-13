import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface OrderEditHistory {
  id: string;
  order_id: string;
  edited_by: string;
  editor_name: string;
  changes: Record<string, any>;
  created_at: string;
}

export const useOrderHistory = (orderId?: string) => {
  const queryClient = useQueryClient();

  const historyQuery = useQuery({
    queryKey: ['order-history', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_edit_history' as any)
        .select('*')
        .eq('order_id', orderId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as OrderEditHistory[];
    },
    enabled: !!orderId,
  });

  const addHistoryMutation = useMutation({
    mutationFn: async ({
      orderId,
      editorName,
      changes,
    }: {
      orderId: string;
      editorName: string;
      changes: Record<string, any>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase
        .from('order_edit_history' as any)
        .insert({
          order_id: orderId,
          edited_by: user.id,
          editor_name: editorName,
          changes: changes,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['order-history', variables.orderId] });
    },
    onError: (error: Error) => {
      console.error('Error saving history:', error);
    },
  });

  return {
    history: historyQuery.data || [],
    isLoading: historyQuery.isLoading,
    addHistory: addHistoryMutation.mutateAsync,
  };
};
