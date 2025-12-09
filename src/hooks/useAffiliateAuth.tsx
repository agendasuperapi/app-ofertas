import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AffiliateUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  cpf_cnpj?: string;
  pix_key?: string;
  avatar_url?: string;
}

interface AffiliateCoupon {
  code: string;
  discount_type: string;
  discount_value: number;
  applies_to?: string;
  category_names?: string[];
  product_ids?: string[];
}

interface AffiliateStore {
  store_affiliate_id: string;
  store_id: string;
  store_name: string;
  store_slug: string;
  store_logo?: string;
  commission_type: string;
  commission_value: number;
  status: string;
  // Legacy single coupon fields (backwards compatibility)
  coupon_code?: string;
  coupon_discount_type?: string;
  coupon_discount_value?: number;
  // New: array of all coupons
  coupons?: AffiliateCoupon[];
  total_sales: number;
  total_commission: number;
  pending_commission: number;
}

interface AffiliateStats {
  total_stores: number;
  total_sales: number;
  total_commission: number;
  pending_commission: number;
  paid_commission: number;
  total_orders: number;
}

export interface AffiliateOrder {
  earning_id: string;
  order_id: string;
  order_number: string;
  customer_name: string;
  order_date: string;
  store_id: string;
  store_name: string;
  store_affiliate_id?: string;
  order_total: number;
  order_subtotal: number;
  coupon_discount: number;
  commission_amount: number;
  commission_status: string;
  coupon_code?: string;
  order_status?: string;
}

export interface AffiliateOrderItem {
  item_id: string;
  product_id: string;
  product_name: string;
  product_category: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  item_discount: number;
  item_value_with_discount: number;
  is_coupon_eligible: boolean;
  coupon_scope: string;
  commission_type: string;
  commission_source: string;
  commission_value: number;
  item_commission: number;
}

export interface PendingInvite {
  id: string;
  store_id: string;
  store_name: string;
  store_logo?: string;
  invited_at: string;
  expires_at: string;
}

interface AffiliateAuthContextType {
  affiliateUser: AffiliateUser | null;
  affiliateStores: AffiliateStore[];
  affiliateStats: AffiliateStats | null;
  affiliateOrders: AffiliateOrder[];
  pendingInvites: PendingInvite[];
  isAuthenticated: boolean;
  isLoading: boolean;
  affiliateLogin: (cpf: string, password: string) => Promise<{ success: boolean; error?: string }>;
  affiliateLogout: () => Promise<void>;
  affiliateRegister: (token: string, password: string, name: string, phone?: string, cpf?: string) => Promise<{ success: boolean; error?: string }>;
  refreshData: () => Promise<void>;
  fetchAffiliateOrders: () => Promise<void>;
  fetchOrderItems: (orderId: string, storeAffiliateId: string | null) => Promise<AffiliateOrderItem[]>;
  fetchPendingInvites: () => Promise<void>;
  acceptInvite: (storeAffiliateId: string) => Promise<{ success: boolean; error?: string }>;
  rejectInvite: (storeAffiliateId: string) => Promise<{ success: boolean; error?: string }>;
}

const AffiliateAuthContext = createContext<AffiliateAuthContextType | undefined>(undefined);

const AFFILIATE_TOKEN_KEY = 'affiliate_session_token';

export function AffiliateAuthProvider({ children }: { children: ReactNode }) {
  const [affiliateUser, setAffiliateUser] = useState<AffiliateUser | null>(null);
  const [affiliateStores, setAffiliateStores] = useState<AffiliateStore[]>([]);
  const [affiliateStats, setAffiliateStats] = useState<AffiliateStats | null>(null);
  const [affiliateOrders, setAffiliateOrders] = useState<AffiliateOrder[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const getStoredToken = () => localStorage.getItem(AFFILIATE_TOKEN_KEY);
  const setStoredToken = (token: string) => localStorage.setItem(AFFILIATE_TOKEN_KEY, token);
  const removeStoredToken = () => localStorage.removeItem(AFFILIATE_TOKEN_KEY);

  const validateSession = async () => {
    const token = getStoredToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('affiliate-auth', {
        body: { action: 'validate', token }
      });

      if (error || !data?.valid) {
        removeStoredToken();
        setAffiliateUser(null);
        setAffiliateStores([]);
        setAffiliateStats(null);
        setAffiliateOrders([]);
      } else {
        setAffiliateUser(data.affiliate);
        await fetchAffiliateData();
      }
    } catch (err) {
      console.error('Session validation error:', err);
      removeStoredToken();
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAffiliateOrders = async () => {
    const token = getStoredToken();
    if (!token) return;

    try {
      const { data: ordersData } = await supabase.functions.invoke('affiliate-invite', {
        body: { action: 'orders', affiliate_token: token }
      });
      
      if (ordersData?.orders) {
        setAffiliateOrders(ordersData.orders);
      }
    } catch (err) {
      console.error('Error fetching affiliate orders:', err);
    }
  };

  const fetchAffiliateData = async () => {
    const token = getStoredToken();
    if (!token) return;

    try {
      // Fetch stores
      const { data: storesData } = await supabase.functions.invoke('affiliate-invite', {
        body: { action: 'list-stores', affiliate_token: token }
      });
      
      if (storesData?.stores) {
        setAffiliateStores(storesData.stores);
      }

      // Fetch stats
      const { data: statsData } = await supabase.functions.invoke('affiliate-invite', {
        body: { action: 'stats', affiliate_token: token }
      });
      
      if (statsData?.stats) {
        setAffiliateStats(statsData.stats);
      }

      // Fetch orders
      await fetchAffiliateOrders();
      
      // Fetch pending invites
      await fetchPendingInvites();
    } catch (err) {
      console.error('Error fetching affiliate data:', err);
    }
  };

  const fetchPendingInvites = async () => {
    const token = getStoredToken();
    if (!token) return;

    try {
      const { data } = await supabase.functions.invoke('affiliate-invite', {
        body: { action: 'pending-invites', affiliate_token: token }
      });
      
      if (data?.invites) {
        setPendingInvites(data.invites);
      }
    } catch (err) {
      console.error('Error fetching pending invites:', err);
    }
  };

  const acceptInvite = async (storeAffiliateId: string): Promise<{ success: boolean; error?: string }> => {
    const token = getStoredToken();
    if (!token) return { success: false, error: 'Não autenticado' };

    try {
      const { data, error } = await supabase.functions.invoke('affiliate-invite', {
        body: { 
          action: 'accept-invite-manual', 
          affiliate_token: token,
          store_affiliate_id: storeAffiliateId
        }
      });

      if (error || !data?.success) {
        return { success: false, error: data?.error || 'Erro ao aceitar convite' };
      }

      // Refresh data after accepting
      await fetchAffiliateData();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro de conexão' };
    }
  };

  const rejectInvite = async (storeAffiliateId: string): Promise<{ success: boolean; error?: string }> => {
    const token = getStoredToken();
    if (!token) return { success: false, error: 'Não autenticado' };

    try {
      const { data, error } = await supabase.functions.invoke('affiliate-invite', {
        body: { 
          action: 'reject-invite', 
          affiliate_token: token,
          store_affiliate_id: storeAffiliateId
        }
      });

      if (error || !data?.success) {
        return { success: false, error: data?.error || 'Erro ao recusar convite' };
      }

      // Refresh pending invites after rejecting
      await fetchPendingInvites();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro de conexão' };
    }
  };

  useEffect(() => {
    validateSession();
  }, []);

  const affiliateLogin = async (cpf: string, password: string) => {
    try {
      // Normalizar CPF removendo caracteres não numéricos
      const normalizedCpf = cpf.replace(/\D/g, '');
      
      const { data, error } = await supabase.functions.invoke('affiliate-auth', {
        body: { action: 'login', cpf: normalizedCpf, password }
      });

      if (error || !data?.success) {
        return { success: false, error: data?.error || 'Erro ao fazer login' };
      }

      setStoredToken(data.token);
      setAffiliateUser(data.affiliate);
      await fetchAffiliateData();
      
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro de conexão' };
    }
  };

  const affiliateLogout = async () => {
    const token = getStoredToken();
    if (token) {
      try {
        await supabase.functions.invoke('affiliate-auth', {
          body: { action: 'logout', token }
        });
      } catch (err) {
        console.error('Logout error:', err);
      }
    }
    removeStoredToken();
    setAffiliateUser(null);
    setAffiliateStores([]);
    setAffiliateStats(null);
    setAffiliateOrders([]);
    setPendingInvites([]);
  };

  const affiliateRegister = async (token: string, password: string, name: string, phone?: string, cpf?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('affiliate-auth', {
        body: { action: 'register', invite_token: token, password, name, phone, cpf_cnpj: cpf }
      });

      if (error || !data?.success) {
        return { success: false, error: data?.error || 'Erro ao completar cadastro' };
      }

      // Auto login after registration
      setStoredToken(data.token);
      setAffiliateUser(data.affiliate);
      await fetchAffiliateData();
      
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro de conexão' };
    }
  };

  const refreshData = async () => {
    if (affiliateUser) {
      await fetchAffiliateData();
    }
  };

  const fetchOrderItems = async (orderId: string, storeAffiliateId: string | null): Promise<AffiliateOrderItem[]> => {
    const token = getStoredToken();
    if (!token) return [];

    try {
      const { data } = await supabase.functions.invoke('affiliate-invite', {
        body: { 
          action: 'order-details', 
          affiliate_token: token,
          order_id: orderId,
          store_affiliate_id: storeAffiliateId
        }
      });
      
      return data?.items || [];
    } catch (err) {
      console.error('Error fetching order items:', err);
      return [];
    }
  };

  return (
    <AffiliateAuthContext.Provider
      value={{
        affiliateUser,
        affiliateStores,
        affiliateStats,
        affiliateOrders,
        pendingInvites,
        isAuthenticated: !!affiliateUser,
        isLoading,
        affiliateLogin,
        affiliateLogout,
        affiliateRegister,
        refreshData,
        fetchAffiliateOrders,
        fetchOrderItems,
        fetchPendingInvites,
        acceptInvite,
        rejectInvite
      }}
    >
      {children}
    </AffiliateAuthContext.Provider>
  );
}

export function useAffiliateAuth() {
  const context = useContext(AffiliateAuthContext);
  if (context === undefined) {
    throw new Error('useAffiliateAuth must be used within an AffiliateAuthProvider');
  }
  return context;
}
