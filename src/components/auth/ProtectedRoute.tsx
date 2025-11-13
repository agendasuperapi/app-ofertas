import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ProtectedRouteProps {
  children: ReactNode;
  requireRole?: 'customer' | 'store_owner' | 'admin';
  requireAuth?: boolean;
}

export const ProtectedRoute = ({ 
  children, 
  requireRole,
  requireAuth = true 
}: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { hasRole, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading || roleLoading) return;

    // Debug logs
    console.log('ProtectedRoute check:', { 
      user: user?.id, 
      requireRole, 
      authLoading, 
      roleLoading 
    });

    if (requireAuth && !user) {
      console.log('User not authenticated, redirecting to /auth');
      toast.error('Você precisa estar logado para acessar essa página');
      navigate('/auth');
      return;
    }

    if (requireRole && !hasRole(requireRole)) {
      console.log(`User does not have required role: ${requireRole}`);
      toast.error(`Você não tem permissão para acessar essa página. Role requerida: ${requireRole}`);
      navigate('/');
      return;
    }
  }, [user, authLoading, roleLoading, requireAuth, requireRole, hasRole, navigate]);

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (requireAuth && !user) {
    return null;
  }

  if (requireRole && !hasRole(requireRole)) {
    return null;
  }

  return <>{children}</>;
};
