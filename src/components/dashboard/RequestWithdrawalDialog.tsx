import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogDescription, ResponsiveDialogFooter } from '@/components/ui/responsive-dialog';
import { Wallet, Key, FileText, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface RequestWithdrawalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  affiliateId: string;
  storeAffiliateId?: string;
  storeId: string;
  storeName: string;
  availableAmount: number;
  defaultPixKey?: string;
  onSubmit: (data: {
    affiliate_id: string;
    store_affiliate_id?: string;
    store_id: string;
    amount: number;
    pix_key?: string;
    notes?: string;
  }) => Promise<any>;
}

export function RequestWithdrawalDialog({
  open,
  onOpenChange,
  affiliateId,
  storeAffiliateId,
  storeId,
  storeName,
  availableAmount,
  defaultPixKey,
  onSubmit,
}: RequestWithdrawalDialogProps) {
  const [pixKey, setPixKey] = useState(defaultPixKey || '');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleSubmit = async () => {
    if (availableAmount <= 0) return;

    setIsSubmitting(true);
    try {
      const result = await onSubmit({
        affiliate_id: affiliateId,
        store_affiliate_id: storeAffiliateId,
        store_id: storeId,
        amount: availableAmount,
        pix_key: pixKey || undefined,
        notes: notes || undefined,
      });

      if (result) {
        onOpenChange(false);
        setNotes('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = availableAmount > 0 && pixKey.trim().length > 0;

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Solicitar Saque
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Solicitar saque de comissões da loja {storeName}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="space-y-4 py-4">
          {/* Valor disponível */}
          <div className="p-4 bg-primary/10 rounded-lg text-center border border-primary/20">
            <p className="text-sm text-muted-foreground mb-1">Valor Disponível para Saque</p>
            <p className="text-3xl font-bold text-primary">{formatCurrency(availableAmount)}</p>
            <p className="text-xs text-muted-foreground mt-2">
              * O valor total disponível será solicitado
            </p>
          </div>

          {availableAmount <= 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Você não possui comissões disponíveis para saque nesta loja. 
                As comissões ficam disponíveis após os pedidos serem entregues.
              </AlertDescription>
            </Alert>
          )}

          {/* Chave PIX */}
          <div className="space-y-2">
            <Label htmlFor="pix_key" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Chave PIX *
            </Label>
            <Input
              id="pix_key"
              placeholder="Digite sua chave PIX"
              value={pixKey}
              onChange={(e) => setPixKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              CPF, CNPJ, E-mail, Telefone ou Chave Aleatória
            </p>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Observações (opcional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Alguma observação para o lojista..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
        </div>

        <ResponsiveDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Enviando...
              </>
            ) : (
              <>
                <Wallet className="h-4 w-4 mr-2" />
                Solicitar Saque
              </>
            )}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
