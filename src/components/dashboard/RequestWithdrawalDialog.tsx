import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogDescription, ResponsiveDialogFooter } from '@/components/ui/responsive-dialog';
import { Wallet, Key, FileText, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { validatePixKey } from '@/lib/pixValidation';

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

  useEffect(() => {
    if (open && defaultPixKey) {
      setPixKey(defaultPixKey);
    }
  }, [open, defaultPixKey]);

  const pixValidation = useMemo(() => validatePixKey(pixKey), [pixKey]);

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

  const canSubmit = availableAmount > 0 && pixKey.trim().length > 0 && pixValidation.isValid;

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
          <div className="p-5 bg-gradient-to-br from-gray-100 via-gray-50 to-white dark:from-gray-700/50 dark:via-gray-600/30 dark:to-gray-500/20 rounded-xl text-center border border-gray-200/50 dark:border-gray-600/30 shadow-lg shadow-gray-300/20">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/50 backdrop-blur-sm rounded-full mb-3">
              <Wallet className="h-4 w-4 text-emerald-600" />
              <p className="text-sm font-medium text-emerald-600">Valor Disponível para Saque</p>
            </div>
            <p className="text-4xl font-bold text-emerald-600 drop-shadow-sm">{formatCurrency(availableAmount)}</p>
            <p className="text-xs text-emerald-600/70 mt-3">
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
              disabled
              className={`bg-muted ${pixKey && !pixValidation.isValid ? 'border-destructive' : pixValidation.isValid && pixValidation.type !== 'empty' ? 'border-emerald-500' : ''}`}
            />
            {pixKey && pixValidation.type !== 'empty' && (
              <p className={`text-xs flex items-center gap-1 ${pixValidation.isValid ? 'text-emerald-600' : 'text-destructive'}`}>
                {pixValidation.isValid ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <AlertCircle className="h-3 w-3" />
                )}
                {pixValidation.message}
              </p>
            )}
            {(!pixKey || pixValidation.type === 'empty') && (
              <p className="text-xs text-muted-foreground">
                CPF, CNPJ, E-mail, Telefone ou Chave Aleatória
              </p>
            )}
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
