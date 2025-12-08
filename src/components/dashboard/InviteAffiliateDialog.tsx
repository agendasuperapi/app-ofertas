import { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { CPFInput, isValidCPF } from '@/components/ui/cpf-input';
import { toast } from 'sonner';
import { Loader2, UserPlus, Copy, CheckCircle } from 'lucide-react';

interface InviteAffiliateDialogProps {
  storeId: string;
  storeName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function InviteAffiliateDialog({
  storeId,
  storeName,
  open,
  onOpenChange,
  onSuccess
}: InviteAffiliateDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    cpf: '',
    name: '',
    email: '', // Email é opcional para contato
  });

  const handleSubmit = async () => {
    if (!formData.cpf || !formData.name) {
      toast.error('Preencha nome e CPF do afiliado');
      return;
    }

    // Validar CPF
    const cpfNumbers = formData.cpf.replace(/\D/g, '');
    if (cpfNumbers.length !== 11 || !isValidCPF(cpfNumbers)) {
      toast.error('CPF inválido');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('affiliate-invite', {
        body: {
          action: 'send',
          store_id: storeId,
          store_name: storeName,
          cpf: cpfNumbers,
          name: formData.name,
          email: formData.email || undefined,
        }
      });

      if (error) {
        toast.error('Erro ao enviar convite');
        return;
      }

      if (data?.success) {
        // Check both for backwards compatibility
        if (data.already_verified || data.already_registered) {
          toast.success('Afiliado já existente vinculado à loja!');
          onOpenChange(false);
          onSuccess?.();
        } else if (data.invite_token) {
          const link = `${window.location.origin}/afiliado/cadastro?token=${data.invite_token}`;
          setInviteLink(link);
          toast.success('Convite criado com sucesso!');
        } else {
          toast.error('Erro: token de convite não gerado');
        }
      } else {
        toast.error(data?.error || 'Erro ao criar convite');
      }
    } catch (err) {
      console.error('Invite error:', err);
      toast.error('Erro de conexão');
    } finally {
      setIsLoading(false);
    }
  };

  const copyInviteLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      toast.success('Link copiado!');
    }
  };

  const handleClose = () => {
    setInviteLink(null);
    setFormData({
      cpf: '',
      name: '',
      email: '',
    });
    onOpenChange(false);
    if (inviteLink) {
      onSuccess?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md glass">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow">
              <UserPlus className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl gradient-text">
                Convidar Afiliado
              </DialogTitle>
              <DialogDescription>
                Envie um convite para um novo afiliado se cadastrar no sistema independente.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {inviteLink ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-500/10 to-green-600/5 border border-green-500/20 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg animate-pulse">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-green-700 dark:text-green-300">Convite criado!</p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  Envie o link abaixo para {formData.name}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Link de convite</Label>
              <div className="flex gap-2">
                <Input
                  value={inviteLink}
                  readOnly
                  className="font-mono text-xs glass"
                />
                <Button variant="outline" size="icon" onClick={copyInviteLink} className="hover-lift">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Este link expira em 7 dias
              </p>
            </div>

            <DialogFooter>
              <Button onClick={handleClose} className="w-full bg-gradient-primary shadow-glow hover-lift">
                Fechar
              </Button>
            </DialogFooter>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do afiliado *</Label>
              <Input
                id="name"
                placeholder="Nome completo"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpf">CPF do afiliado *</Label>
              <CPFInput
                id="cpf"
                value={formData.cpf}
                onChange={(value) => setFormData({ ...formData, cpf: value })}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail do afiliado (opcional)</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@exemplo.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                O e-mail é opcional e será usado apenas para contato
              </p>
            </div>

            <p className="text-sm text-muted-foreground">
              As comissões do afiliado serão definidas pelo cupom vinculado a ele no gerenciador de afiliados.
            </p>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Criar Convite
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
