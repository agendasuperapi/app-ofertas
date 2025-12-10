import { useState, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogDescription, ResponsiveDialogFooter } from '@/components/ui/responsive-dialog';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Copy, Check, CheckCircle, Key, DollarSign, User, Upload, Image, X, ZoomIn } from 'lucide-react';
import { generatePixQrCode, isValidPixKey } from '@/lib/pixQrCode';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface WithdrawalPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  affiliateName: string;
  affiliatePixKey: string | null;
  amount: number;
  requestId: string;
  onConfirmPayment: (requestId: string, adminNotes?: string, paymentProof?: string) => Promise<boolean>;
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
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [paymentProofPreview, setPaymentProofPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast.error('Apenas imagens ou PDF são permitidos');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo deve ter no máximo 5MB');
      return;
    }

    setPaymentProofFile(file);
    
    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPaymentProofPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPaymentProofPreview(null);
    }
  };

  const handleRemoveFile = () => {
    setPaymentProofFile(null);
    setPaymentProofPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadPaymentProof = async (): Promise<string | null> => {
    if (!paymentProofFile) return null;

    setIsUploading(true);
    try {
      const fileExt = paymentProofFile.name.split('.').pop();
      const fileName = `${requestId}_${Date.now()}.${fileExt}`;
      const filePath = `receipts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('payment-receipts')
        .upload(filePath, paymentProofFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('payment-receipts')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Erro ao fazer upload do comprovante:', error);
      toast.error('Erro ao enviar comprovante');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmPayment = async () => {
    let paymentProofUrl: string | undefined;
    
    if (paymentProofFile) {
      const url = await uploadPaymentProof();
      if (url) {
        paymentProofUrl = url;
      }
    }

    const success = await onConfirmPayment(requestId, undefined, paymentProofUrl);
    if (success) {
      setPaymentProofFile(null);
      setPaymentProofPreview(null);
      onOpenChange(false);
    }
  };

  const isValidPix = affiliatePixKey && isValidPixKey(affiliatePixKey);

  return (
    <>
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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

          {/* Upload de comprovante */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Anexar Comprovante (opcional)</p>
            
            {!paymentProofFile ? (
              <div 
                className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Clique para anexar comprovante
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Imagem ou PDF (máx. 5MB)
                </p>
              </div>
            ) : (
              <div className="relative p-4 bg-muted/50 rounded-lg border">
                <Button
                  size="sm"
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                  onClick={handleRemoveFile}
                >
                  <X className="h-4 w-4" />
                </Button>
                
                {paymentProofPreview ? (
                  <div 
                    className="relative cursor-pointer group"
                    onClick={() => setPreviewModalOpen(true)}
                  >
                    <img 
                      src={paymentProofPreview} 
                      alt="Comprovante" 
                      className="w-full max-h-32 object-contain rounded"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                      <ZoomIn className="h-6 w-6 text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Image className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm truncate">{paymentProofFile.name}</span>
                  </div>
                )}
              </div>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
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
              disabled={isProcessing || isUploading}
            >
              {(isProcessing || isUploading) ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              {isUploading ? 'Enviando...' : 'Confirmar Pagamento'}
            </Button>
          </div>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>

    {/* Preview Modal */}
    <Dialog open={previewModalOpen} onOpenChange={setPreviewModalOpen}>
      <DialogContent className="max-w-3xl p-2">
        {paymentProofPreview && (
          <img 
            src={paymentProofPreview} 
            alt="Comprovante" 
            className="w-full max-h-[80vh] object-contain rounded"
          />
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}
