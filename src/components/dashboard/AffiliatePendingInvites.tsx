import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Store, Clock, Check, X, Loader2, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export interface PendingInvite {
  id: string;
  store_id: string;
  store_name: string;
  store_logo?: string;
  invited_at: string;
  expires_at: string;
}

interface AffiliatePendingInvitesProps {
  invites: PendingInvite[];
  onAccept: (inviteId: string) => Promise<{ success: boolean; error?: string }>;
  onReject: (inviteId: string) => Promise<{ success: boolean; error?: string }>;
  isLoading?: boolean;
}

export function AffiliatePendingInvites({
  invites,
  onAccept,
  onReject,
  isLoading = false,
}: AffiliatePendingInvitesProps) {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<'accept' | 'reject' | null>(null);

  const handleAccept = async (inviteId: string) => {
    setProcessingId(inviteId);
    setProcessingAction('accept');
    try {
      const result = await onAccept(inviteId);
      if (result.success) {
        toast.success('Convite aceito com sucesso!');
      } else {
        toast.error(result.error || 'Erro ao aceitar convite');
      }
    } finally {
      setProcessingId(null);
      setProcessingAction(null);
    }
  };

  const handleReject = async (inviteId: string) => {
    setProcessingId(inviteId);
    setProcessingAction('reject');
    try {
      const result = await onReject(inviteId);
      if (result.success) {
        toast.success('Convite recusado');
      } else {
        toast.error(result.error || 'Erro ao recusar convite');
      }
    } finally {
      setProcessingId(null);
      setProcessingAction(null);
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd 'de' MMM 'às' HH:mm", { locale: ptBR });
  };

  const getDaysRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffTime = expires.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Carregando convites...</p>
      </div>
    );
  }

  if (invites.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-12 text-center"
      >
        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <Mail className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Nenhum convite pendente
        </h3>
        <p className="text-muted-foreground max-w-sm">
          Quando uma loja enviar um convite para você, ele aparecerá aqui para você aceitar ou recusar.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-6">
        <Mail className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Convites Pendentes</h2>
        <Badge variant="secondary" className="ml-auto">
          {invites.length} {invites.length === 1 ? 'convite' : 'convites'}
        </Badge>
      </div>

      <AnimatePresence mode="popLayout">
        {invites.map((invite, index) => {
          const daysRemaining = getDaysRemaining(invite.expires_at);
          const isProcessing = processingId === invite.id;

          return (
            <motion.div
              key={invite.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="glass-card overflow-hidden">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Store Info */}
                    <div className="flex items-center gap-3 flex-1">
                      <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                        {invite.store_logo ? (
                          <AvatarImage src={invite.store_logo} alt={invite.store_name} />
                        ) : null}
                        <AvatarFallback className="bg-primary/10 text-primary">
                          <Store className="h-6 w-6" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">
                          {invite.store_name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Convite recebido em {formatDate(invite.invited_at)}
                        </p>
                      </div>
                    </div>

                    {/* Expiration Badge */}
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={daysRemaining <= 2 ? "destructive" : "secondary"}
                        className="flex items-center gap-1"
                      >
                        <Clock className="h-3 w-3" />
                        {daysRemaining > 0 
                          ? `Expira em ${daysRemaining} ${daysRemaining === 1 ? 'dia' : 'dias'}`
                          : 'Expira hoje'
                        }
                      </Badge>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 sm:flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReject(invite.id)}
                        disabled={isProcessing}
                        className="flex-1 sm:flex-none text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                      >
                        {isProcessing && processingAction === 'reject' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <X className="h-4 w-4 mr-1" />
                            Recusar
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleAccept(invite.id)}
                        disabled={isProcessing}
                        className="flex-1 sm:flex-none bg-primary hover:bg-primary/90"
                      >
                        {isProcessing && processingAction === 'accept' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            Aceitar
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
