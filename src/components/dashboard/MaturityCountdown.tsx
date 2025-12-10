import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, Timer } from 'lucide-react';

interface MaturityCountdownProps {
  commissionAvailableAt: string | null | undefined;
  commissionStatus?: string;
  orderStatus?: string;
  variant?: 'badge' | 'inline' | 'detailed';
}

export function MaturityCountdown({ 
  commissionAvailableAt, 
  commissionStatus, 
  orderStatus,
  variant = 'badge' 
}: MaturityCountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState<{
    days: number;
    hours: number;
    minutes: number;
    isAvailable: boolean;
  } | null>(null);

  useEffect(() => {
    if (!commissionAvailableAt) return;
    
    const isDelivered = orderStatus === 'entregue' || orderStatus === 'delivered';
    const isPaid = commissionStatus === 'paid';
    
    if (!isDelivered || isPaid) return;

    const calculateTimeRemaining = () => {
      const availableAt = new Date(commissionAvailableAt);
      const now = new Date();
      const diff = availableAt.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeRemaining({ days: 0, hours: 0, minutes: 0, isAvailable: true });
        return;
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      setTimeRemaining({ days, hours, minutes, isAvailable: false });
    };

    calculateTimeRemaining();
    
    // Atualizar a cada minuto
    const interval = setInterval(calculateTimeRemaining, 60000);
    
    return () => clearInterval(interval);
  }, [commissionAvailableAt, commissionStatus, orderStatus]);

  if (!timeRemaining) return null;

  if (timeRemaining.isAvailable) {
    if (variant === 'inline') {
      return (
        <span className="text-emerald-600 text-xs flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Disponível
        </span>
      );
    }
    
    return (
      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
        <CheckCircle className="h-3 w-3 mr-1" />
        Disponível para saque
      </Badge>
    );
  }

  const formatCountdown = () => {
    const { days, hours, minutes } = timeRemaining;
    
    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const getDetailedText = () => {
    const { days, hours, minutes } = timeRemaining;
    
    if (days > 0) {
      const hoursText = hours > 0 ? ` e ${hours} hora${hours !== 1 ? 's' : ''}` : '';
      return `${days} dia${days !== 1 ? 's' : ''}${hoursText}`;
    } else if (hours > 0) {
      const minutesText = minutes > 0 ? ` e ${minutes} minuto${minutes !== 1 ? 's' : ''}` : '';
      return `${hours} hora${hours !== 1 ? 's' : ''}${minutesText}`;
    } else {
      return `${minutes} minuto${minutes !== 1 ? 's' : ''}`;
    }
  };

  if (variant === 'inline') {
    return (
      <span className="text-orange-600 text-xs flex items-center gap-1">
        <Timer className="h-3 w-3 animate-pulse" />
        {formatCountdown()}
      </span>
    );
  }

  if (variant === 'detailed') {
    return (
      <div className="flex items-center gap-2 text-orange-600">
        <Timer className="h-4 w-4 animate-pulse" />
        <span className="text-sm">Liberação em {getDetailedText()}</span>
      </div>
    );
  }

  return (
    <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20">
      <Timer className="h-3 w-3 mr-1 animate-pulse" />
      Liberação em {formatCountdown()}
    </Badge>
  );
}
