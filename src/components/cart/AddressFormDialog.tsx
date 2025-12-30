import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, MapPin } from 'lucide-react';
import { fetchCepData, formatCep, isValidCepFormat } from '@/lib/cepValidation';
import { toast } from '@/hooks/use-toast';
import type { UserAddress, CreateAddressData } from '@/hooks/useUserAddresses';

interface AddressFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: CreateAddressData) => Promise<UserAddress | null>;
  editingAddress?: UserAddress | null;
  showDefaultCheckbox?: boolean;
}

export function AddressFormDialog({
  open,
  onOpenChange,
  onSave,
  editingAddress,
  showDefaultCheckbox = true,
}: AddressFormDialogProps) {
  const [label, setLabel] = useState('');
  const [cep, setCep] = useState('');
  const [city, setCity] = useState('');
  const [street, setStreet] = useState('');
  const [streetNumber, setStreetNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [complement, setComplement] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [cepError, setCepError] = useState('');

  // Reset form when dialog opens/closes or editing address changes
  useEffect(() => {
    if (open) {
      if (editingAddress) {
        setLabel(editingAddress.label || '');
        setCep(formatCep(editingAddress.cep));
        setCity(editingAddress.city);
        setStreet(editingAddress.street);
        setStreetNumber(editingAddress.street_number);
        setNeighborhood(editingAddress.neighborhood);
        setComplement(editingAddress.complement || '');
        setIsDefault(editingAddress.is_default);
      } else {
        // Clear form for new address
        setLabel('');
        setCep('');
        setCity('');
        setStreet('');
        setStreetNumber('');
        setNeighborhood('');
        setComplement('');
        setIsDefault(false);
      }
      setCepError('');
    }
  }, [open, editingAddress]);

  const handleCepChange = async (value: string) => {
    const formatted = formatCep(value);
    setCep(formatted);
    setCepError('');

    // Auto-search when CEP is complete
    if (isValidCepFormat(formatted)) {
      setIsSearchingCep(true);
      try {
        const data = await fetchCepData(formatted.replace('-', ''));
        if (data) {
          setCity(data.localidade);
          setStreet(data.logradouro);
          setNeighborhood(data.bairro);
        } else {
          setCepError('CEP não encontrado');
        }
      } catch (error) {
        setCepError('Erro ao buscar CEP');
      } finally {
        setIsSearchingCep(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!cep || !city || !street || !streetNumber || !neighborhood) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const result = await onSave({
        label: label || undefined,
        cep: cep.replace('-', ''),
        city,
        street,
        street_number: streetNumber,
        neighborhood,
        complement: complement || undefined,
        is_default: isDefault,
      });

      if (result) {
        onOpenChange(false);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {editingAddress ? 'Editar Endereço' : 'Novo Endereço'}
          </DialogTitle>
          <DialogDescription>
            {editingAddress 
              ? 'Atualize as informações do endereço'
              : 'Adicione um novo endereço de entrega'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Label */}
          <div>
            <Label htmlFor="addr-label">Nome do endereço (opcional)</Label>
            <Input
              id="addr-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ex: Casa, Trabalho..."
              maxLength={50}
            />
          </div>

          {/* CEP */}
          <div>
            <Label htmlFor="addr-cep">
              CEP <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="addr-cep"
                value={cep}
                onChange={(e) => handleCepChange(e.target.value)}
                placeholder="00000-000"
                maxLength={9}
                required
                className={cepError ? 'border-destructive' : ''}
              />
              {isSearchingCep && (
                <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              )}
            </div>
            {cepError && (
              <p className="text-sm text-destructive mt-1">{cepError}</p>
            )}
          </div>

          {/* City and Neighborhood */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="addr-city">
                Cidade <span className="text-destructive">*</span>
              </Label>
              <Input
                id="addr-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex: São Paulo"
                required
                maxLength={100}
              />
            </div>
            <div>
              <Label htmlFor="addr-neighborhood">
                Bairro <span className="text-destructive">*</span>
              </Label>
              <Input
                id="addr-neighborhood"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                placeholder="Ex: Centro"
                required
                maxLength={100}
              />
            </div>
          </div>

          {/* Street */}
          <div>
            <Label htmlFor="addr-street">
              Rua/Avenida <span className="text-destructive">*</span>
            </Label>
            <Input
              id="addr-street"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              placeholder="Ex: Rua das Flores"
              required
              maxLength={200}
            />
          </div>

          {/* Number and Complement */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="addr-number">
                Número <span className="text-destructive">*</span>
              </Label>
              <Input
                id="addr-number"
                value={streetNumber}
                onChange={(e) => setStreetNumber(e.target.value)}
                placeholder="Ex: 123"
                required
                maxLength={20}
              />
            </div>
            <div>
              <Label htmlFor="addr-complement">Complemento</Label>
              <Input
                id="addr-complement"
                value={complement}
                onChange={(e) => setComplement(e.target.value)}
                placeholder="Apto, Bloco..."
                maxLength={100}
              />
            </div>
          </div>

          {/* Default checkbox */}
          {showDefaultCheckbox && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="addr-default"
                checked={isDefault}
                onCheckedChange={(checked) => setIsDefault(checked === true)}
              />
              <Label htmlFor="addr-default" className="text-sm cursor-pointer">
                Definir como endereço padrão
              </Label>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Endereço'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
