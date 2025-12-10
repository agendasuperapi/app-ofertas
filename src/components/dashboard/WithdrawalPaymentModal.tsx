import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogDescription, ResponsiveDialogFooter } from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Copy, Check, CheckCircle, Key, DollarSign, User } from 'lucide-react';
import { generatePixQrCode, isValidPixKey } from '@/lib/pixQrCode';
import { toast } from 'sonner';

interface WithdrawalPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  affiliateName: string;
  affiliatePixKey: string | null;
  amount: number;
  requestId: string;
  onConfirmPayment: (requestId: string) => Promise<void>;
  isProcessing: boolean;
}

export function WithdrawalPaymentModal({
  open,
  onOpenChange,
  affiliateName,
  affiliatePixKey,
  amount,
  requestId,
  onConfirmPayment,
  isProcessing,
}: WithdrawalPaymentModalProps) {
  const [copied, setCopied] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const pixPayload = useMemo(() => {
    if (!affiliatePixKey) return null;
    
    try {
      return generatePixQrCode({
        pixKey: affiliatePixKey,
        amount: amount,
        merchantName: affiliateName,
        description: 'Comissao Afiliado',
        merchantCity: 'BRASIL',
        txId: requestId.slice(0, 25),
      });
    } catch (error) {
      console.error('Erro ao gerar PIX:', error);
      return null;
    }
  }, [affiliatePixKey, amount, affiliateName, requestId]);

  const handleCopyPix = async () => {
    if (!pixPayload) return;
    
    try {
      await navigator.clipboard.writeText(pixPayload);
      setCopied(true);
      toast.success('Código PIX copiado!');
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      toast.error('Erro ao copiar código PIX');
    }
  };

  const handleConfirmPayment = async () => {
    await onConfirmPayment(requestId);
    onOpenChange(false);
  };

  const isValidPix = affiliatePixKey && isValidPixKey(affiliatePixKey);

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Pagamento via PIX</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Escaneie o QR Code ou copie o código PIX
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="space-y-4 py-4">
          {/* Informações do pagamento */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Afiliado:</span>
              <span className="font-medium">{affiliateName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Key className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Chave PIX:</span>
              <span className="font-mono text-xs">{affiliatePixKey || 'Não informada'}</span>
            </div>
          </div>

          {/* Valor */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg text-center border border-primary/20"
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              <DollarSign className="h-5 w-5 text-primary" />
              <p className="text-sm text-muted-foreground">Valor a Pagar</p>
            </div>
            <p className="text-3xl font-bold text-primary">{formatCurrency(amount)}</p>
          </motion.div>

          {/* QR Code */}
          {isValidPix && pixPayload ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="p-4 bg-white rounded-xl shadow-lg">
                <QRCodeSVG 
                  value={pixPayload} 
                  size={180}
                  level="M"
                  includeMargin={false}
                />
              </div>
              
              {/* Código copia e cola */}
              <div className="w-full space-y-2">
                <p className="text-xs text-muted-foreground text-center">Código PIX Copia e Cola</p>
                <div className="relative">
                  <div className="p-3 bg-muted/50 rounded-lg border text-xs font-mono break-all max-h-20 overflow-y-auto">
                    {pixPayload}
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute -top-2 -right-2 h-8 w-8 p-0 rounded-full shadow-md"
                    onClick={handleCopyPix}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="p-6 bg-destructive/10 rounded-lg text-center border border-destructive/20">
              <p className="text-sm text-destructive font-medium">
                Chave PIX inválida ou não informada
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Não é possível gerar o QR Code para pagamento
              </p>
            </div>
          )}
        </div>

        <ResponsiveDialogFooter>
          <div className="flex gap-2 w-full">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button 
              className="flex-1"
              onClick={handleConfirmPayment}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Confirmar Pagamento
            </Button>
          </div>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
