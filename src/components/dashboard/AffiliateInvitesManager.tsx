import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Mail, Clock, CheckCircle, XCircle, Loader2, RefreshCw, Copy, Users, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { InviteAffiliateDialog } from './InviteAffiliateDialog';

interface AffiliateInvitesManagerProps {
  storeId: string;
  storeName?: string;
}

export const AffiliateInvitesManager = ({ storeId, storeName = 'Loja' }: AffiliateInvitesManagerProps) => {
  const [affiliateInvites, setAffiliateInvites] = useState<any[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [inviteStatusFilter, setInviteStatusFilter] = useState<'all' | 'pending' | 'active' | 'expired'>('all');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Função para buscar convites de afiliados
  const fetchAffiliateInvites = useCallback(async () => {
    if (!storeId) return;
    setInvitesLoading(true);
    try {
      const { data, error } = await supabase
        .from('store_affiliates')
        .select(`
          id, status, invite_token, invited_at, accepted_at, invite_expires, is_active,
          affiliate_accounts (name, email, cpf_cnpj, phone)
        `)
        .eq('store_id', storeId)
        .order('invited_at', { ascending: false });

      if (error) throw error;
      setAffiliateInvites(data || []);
    } catch (error) {
      console.error('Error fetching affiliate invites:', error);
    } finally {
      setInvitesLoading(false);
    }
  }, [storeId]);

  // Carregar convites ao montar
  useEffect(() => {
    fetchAffiliateInvites();
  }, [fetchAffiliateInvites]);

  // Helper para formatar CPF
  const formatCPF = (cpf?: string | null) => {
    if (!cpf) return '-';
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length !== 11) return cpf;
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  // Helper para obter badge de status do convite
  const getInviteStatusBadge = (invite: any) => {
    if (invite.status === 'active') {
      return (
        <Badge className="bg-green-600 text-white">
          <CheckCircle className="h-3 w-3 mr-1" />
          Aceito
        </Badge>
      );
    }
    if (invite.status === 'pending') {
      const isExpired = invite.invite_expires && isPast(new Date(invite.invite_expires));
      if (isExpired) {
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Expirado
          </Badge>
        );
      }
      return (
        <Badge variant="outline" className="text-amber-600 border-amber-600">
          <Clock className="h-3 w-3 mr-1" />
          Pendente
        </Badge>
      );
    }
    return <Badge variant="secondary">{invite.status}</Badge>;
  };

  // Helper para copiar link de convite
  const copyInviteLink = async (token: string) => {
    const link = `${window.location.origin}/afiliado/cadastro?token=${token}`;
    await navigator.clipboard.writeText(link);
    toast({ title: "Link copiado!", description: "O link de convite foi copiado para a área de transferência." });
  };

  // Helper para reenviar convite
  const handleResendInvite = async (invite: any) => {
    try {
      const { data, error } = await supabase.functions.invoke('affiliate-invite', {
        body: {
          action: 'send',
          store_id: storeId,
          store_name: storeName,
          cpf: invite.affiliate_accounts?.cpf_cnpj,
          email: invite.affiliate_accounts?.email,
          name: invite.affiliate_accounts?.name,
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({ title: "Convite reenviado!", description: "Um novo link de convite foi gerado." });
        fetchAffiliateInvites();
      } else {
        toast({ title: "Erro ao reenviar", description: data?.error || "Tente novamente.", variant: "destructive" });
      }
    } catch (err) {
      console.error('Error resending invite:', err);
      toast({ title: "Erro ao reenviar convite", variant: "destructive" });
    }
  };

  // Helper para excluir convite pendente/expirado
  const handleDeleteInvite = async (invite: any) => {
    try {
      const { error } = await supabase
        .from('store_affiliates')
        .delete()
        .eq('id', invite.id);

      if (error) throw error;

      toast({ title: "Convite excluído!", description: "O convite foi removido com sucesso." });
      fetchAffiliateInvites();
    } catch (err) {
      console.error('Error deleting invite:', err);
      toast({ title: "Erro ao excluir convite", variant: "destructive" });
    }
  };

  // Filtrar convites
  const filteredInvites = affiliateInvites.filter((invite) => {
    if (inviteStatusFilter === 'all') return true;
    if (inviteStatusFilter === 'active') return invite.status === 'active';
    if (inviteStatusFilter === 'pending') {
      return invite.status === 'pending' && (!invite.invite_expires || !isPast(new Date(invite.invite_expires)));
    }
    if (inviteStatusFilter === 'expired') {
      return invite.status === 'pending' && invite.invite_expires && isPast(new Date(invite.invite_expires));
    }
    return true;
  });

  // Contadores
  const pendingCount = affiliateInvites.filter(i => i.status === 'pending' && (!i.invite_expires || !isPast(new Date(i.invite_expires)))).length;
  const activeCount = affiliateInvites.filter(i => i.status === 'active').length;
  const expiredCount = affiliateInvites.filter(i => i.status === 'pending' && i.invite_expires && isPast(new Date(i.invite_expires))).length;

  // Paginação
  const totalPages = Math.ceil(filteredInvites.length / itemsPerPage);
  const paginatedInvites = filteredInvites.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  
  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [inviteStatusFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h2 className="text-3xl font-bold gradient-text flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-glow">
              <Mail className="h-5 w-5 text-white" />
            </div>
            Convites de Afiliados
          </h2>
          <p className="text-muted-foreground mt-1">
            Gerencie os convites enviados para afiliados
          </p>
        </div>
      </motion.div>

      {/* Invite Dialog */}
      <InviteAffiliateDialog
        storeId={storeId}
        storeName={storeName}
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
      />

      {/* Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <motion.div whileHover={{ y: -4, scale: 1.02 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
          <Card className="glass-card overflow-hidden border-primary/10 hover:border-primary/30 transition-all">
            <CardContent className="pt-6 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
              <div className="flex items-center justify-between relative">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Total</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">{affiliateInvites.length}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div whileHover={{ y: -4, scale: 1.02 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
          <Card className="glass-card overflow-hidden border-amber-500/10 hover:border-amber-500/30 transition-all">
            <CardContent className="pt-6 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
              <div className="flex items-center justify-between relative">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Pendentes</p>
                  <p className="text-3xl font-bold text-amber-600">{pendingCount}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-500/5 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div whileHover={{ y: -4, scale: 1.02 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
          <Card className="glass-card overflow-hidden border-green-500/10 hover:border-green-500/30 transition-all">
            <CardContent className="pt-6 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent pointer-events-none" />
              <div className="flex items-center justify-between relative">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Aceitos</p>
                  <p className="text-3xl font-bold text-green-600">{activeCount}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500/20 to-green-500/5 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div whileHover={{ y: -4, scale: 1.02 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
          <Card className="glass-card overflow-hidden border-red-500/10 hover:border-red-500/30 transition-all">
            <CardContent className="pt-6 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none" />
              <div className="flex items-center justify-between relative">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Expirados</p>
                  <p className="text-3xl font-bold text-red-600">{expiredCount}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500/20 to-red-500/5 flex items-center justify-center">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Invites Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card className="glass-card overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-lg">Lista de Convites</CardTitle>
                <CardDescription>Todos os convites enviados para afiliados</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select value={inviteStatusFilter} onValueChange={(value: 'all' | 'pending' | 'active' | 'expired') => setInviteStatusFilter(value)}>
                  <SelectTrigger className="w-[140px] glass h-9">
                    <SelectValue placeholder="Filtrar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos ({affiliateInvites.length})</SelectItem>
                    <SelectItem value="pending">Pendentes ({pendingCount})</SelectItem>
                    <SelectItem value="active">Aceitos ({activeCount})</SelectItem>
                    <SelectItem value="expired">Expirados ({expiredCount})</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={fetchAffiliateInvites} disabled={invitesLoading}>
                  <RefreshCw className={`h-4 w-4 ${invitesLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {invitesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredInvites.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Mail className="h-12 w-12 mx-auto mb-4 opacity-40" />
                <p className="text-lg font-medium mb-2">Nenhum convite encontrado</p>
                <p className="text-sm">Convide afiliados para promover seus produtos</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Afiliado</TableHead>
                      <TableHead className="hidden sm:table-cell">CPF</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden md:table-cell">Data do Convite</TableHead>
                      <TableHead className="hidden lg:table-cell">Expira em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedInvites.map((invite) => {
                      const isExpired = invite.status === 'pending' && invite.invite_expires && isPast(new Date(invite.invite_expires));
                      return (
                        <TableRow key={invite.id}>
                          <TableCell>
                            <div className="flex flex-col min-w-0">
                              <span className="font-medium truncate">{invite.affiliate_accounts?.name || '-'}</span>
                              <span className="text-xs text-muted-foreground truncate">{invite.affiliate_accounts?.email || '-'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell font-mono text-sm">
                            {formatCPF(invite.affiliate_accounts?.cpf_cnpj)}
                          </TableCell>
                          <TableCell>
                            {getInviteStatusBadge(invite)}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                            {invite.invited_at 
                              ? format(new Date(invite.invited_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                              : '-'
                            }
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                            {invite.status === 'pending' && invite.invite_expires ? (
                              isExpired ? (
                                <span className="text-destructive">Expirado</span>
                              ) : (
                                formatDistanceToNow(new Date(invite.invite_expires), { locale: ptBR, addSuffix: true })
                              )
                            ) : invite.status === 'active' && invite.accepted_at ? (
                              <span className="text-green-600">
                                Aceito {format(new Date(invite.accepted_at), "dd/MM/yyyy", { locale: ptBR })}
                              </span>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {invite.status === 'pending' && invite.invite_token && !isExpired && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => copyInviteLink(invite.invite_token)}
                                  title="Copiar link"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              )}
                              {(isExpired || (invite.status === 'pending' && !isExpired)) && (
                                <>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleResendInvite(invite)}
                                    title={isExpired ? "Gerar novo convite" : "Reenviar convite"}
                                  >
                                    <RefreshCw className="h-4 w-4" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                        title="Excluir convite"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Excluir convite?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Tem certeza que deseja excluir o convite para {invite.affiliate_accounts?.name || 'este afiliado'}? Esta ação não pode ser desfeita.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction 
                                          onClick={() => handleDeleteInvite(invite)}
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                          Excluir
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                
                {/* Paginação */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t border-border/50 mt-4">
                    <p className="text-sm text-muted-foreground">
                      Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredInvites.length)} de {filteredInvites.length} convites
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum: number;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              className="w-8 h-8 p-0"
                              onClick={() => setCurrentPage(pageNum)}
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};
