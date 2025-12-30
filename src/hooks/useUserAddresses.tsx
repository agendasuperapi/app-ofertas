import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export interface UserAddress {
  id: string;
  user_id: string;
  label: string | null;
  cep: string;
  city: string;
  street: string;
  street_number: string;
  neighborhood: string;
  complement: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAddressData {
  label?: string;
  cep: string;
  city: string;
  street: string;
  street_number: string;
  neighborhood: string;
  complement?: string;
  is_default?: boolean;
}

export interface UpdateAddressData extends Partial<CreateAddressData> {
  id: string;
}

export function useUserAddresses() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all addresses for the current user
  const fetchAddresses = useCallback(async () => {
    if (!user) {
      setAddresses([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setAddresses(data || []);
    } catch (err: any) {
      console.error('Error fetching addresses:', err);
      setError(err.message || 'Erro ao carregar endereços');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Initial fetch
  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  // Get default address
  const defaultAddress = addresses.find(addr => addr.is_default) || addresses[0] || null;

  // Add a new address
  const addAddress = async (data: CreateAddressData): Promise<UserAddress | null> => {
    if (!user) {
      toast({
        title: 'Erro',
        description: 'Você precisa estar logado para adicionar um endereço',
        variant: 'destructive',
      });
      return null;
    }

    try {
      // If this is the first address, make it default
      const isFirstAddress = addresses.length === 0;
      const shouldBeDefault = data.is_default ?? isFirstAddress;

      const { data: newAddress, error: insertError } = await supabase
        .from('user_addresses')
        .insert({
          user_id: user.id,
          label: data.label || null,
          cep: data.cep,
          city: data.city,
          street: data.street,
          street_number: data.street_number,
          neighborhood: data.neighborhood,
          complement: data.complement || null,
          is_default: shouldBeDefault,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Refresh the list
      await fetchAddresses();

      toast({
        title: 'Endereço adicionado',
        description: 'Seu endereço foi salvo com sucesso',
      });

      return newAddress;
    } catch (err: any) {
      console.error('Error adding address:', err);
      toast({
        title: 'Erro ao adicionar endereço',
        description: err.message || 'Tente novamente mais tarde',
        variant: 'destructive',
      });
      return null;
    }
  };

  // Update an existing address
  const updateAddress = async (data: UpdateAddressData): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error: updateError } = await supabase
        .from('user_addresses')
        .update({
          label: data.label,
          cep: data.cep,
          city: data.city,
          street: data.street,
          street_number: data.street_number,
          neighborhood: data.neighborhood,
          complement: data.complement,
          is_default: data.is_default,
        })
        .eq('id', data.id)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      await fetchAddresses();

      toast({
        title: 'Endereço atualizado',
        description: 'As alterações foram salvas',
      });

      return true;
    } catch (err: any) {
      console.error('Error updating address:', err);
      toast({
        title: 'Erro ao atualizar endereço',
        description: err.message || 'Tente novamente mais tarde',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Delete an address
  const deleteAddress = async (addressId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const addressToDelete = addresses.find(a => a.id === addressId);
      
      const { error: deleteError } = await supabase
        .from('user_addresses')
        .delete()
        .eq('id', addressId)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      // If we deleted the default address, set another one as default
      if (addressToDelete?.is_default && addresses.length > 1) {
        const nextAddress = addresses.find(a => a.id !== addressId);
        if (nextAddress) {
          await supabase
            .from('user_addresses')
            .update({ is_default: true })
            .eq('id', nextAddress.id)
            .eq('user_id', user.id);
        }
      }

      await fetchAddresses();

      toast({
        title: 'Endereço removido',
        description: 'O endereço foi excluído',
      });

      return true;
    } catch (err: any) {
      console.error('Error deleting address:', err);
      toast({
        title: 'Erro ao remover endereço',
        description: err.message || 'Tente novamente mais tarde',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Set an address as default
  const setDefaultAddress = async (addressId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error: updateError } = await supabase
        .from('user_addresses')
        .update({ is_default: true })
        .eq('id', addressId)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      await fetchAddresses();

      toast({
        title: 'Endereço padrão atualizado',
        description: 'Este endereço será usado por padrão',
      });

      return true;
    } catch (err: any) {
      console.error('Error setting default address:', err);
      toast({
        title: 'Erro ao definir endereço padrão',
        description: err.message || 'Tente novamente mais tarde',
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    addresses,
    defaultAddress,
    isLoading,
    error,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
    refetch: fetchAddresses,
  };
}
