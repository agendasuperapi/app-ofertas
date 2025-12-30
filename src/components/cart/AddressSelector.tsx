import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MapPin, Star, Plus, MoreVertical, Pencil, Trash2, Check } from 'lucide-react';
import { AddressFormDialog } from './AddressFormDialog';
import type { UserAddress, CreateAddressData } from '@/hooks/useUserAddresses';
import { formatCep } from '@/lib/cepValidation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface AddressSelectorProps {
  addresses: UserAddress[];
  selectedAddressId: string | null;
  onSelectAddress: (address: UserAddress) => void;
  onAddAddress: (data: CreateAddressData) => Promise<UserAddress | null>;
  onUpdateAddress: (data: CreateAddressData & { id: string }) => Promise<boolean>;
  onDeleteAddress: (id: string) => Promise<boolean>;
  onSetDefault: (id: string) => Promise<boolean>;
  isLoading?: boolean;
}

export function AddressSelector({
  addresses,
  selectedAddressId,
  onSelectAddress,
  onAddAddress,
  onUpdateAddress,
  onDeleteAddress,
  onSetDefault,
  isLoading,
}: AddressSelectorProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null);
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null);

  const handleSaveAddress = async (data: CreateAddressData) => {
    if (editingAddress) {
      const success = await onUpdateAddress({ ...data, id: editingAddress.id });
      if (success) {
        setEditingAddress(null);
        return editingAddress; // Return the existing address on update
      }
      return null;
    }
    return onAddAddress(data);
  };

  const handleDeleteConfirm = async () => {
    if (deletingAddressId) {
      await onDeleteAddress(deletingAddressId);
      setDeletingAddressId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Endereço de Entrega
        </h3>
      </div>

      {/* Address list */}
      <div className="space-y-2">
        {addresses.map((address) => {
          const isSelected = selectedAddressId === address.id;
          
          return (
            <Card
              key={address.id}
              className={`cursor-pointer transition-all ${
                isSelected
                  ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                  : 'hover:border-primary/50'
              }`}
              onClick={() => onSelectAddress(address)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {address.is_default && (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <Star className="h-3 w-3 fill-current" />
                          Padrão
                        </Badge>
                      )}
                      {address.label && (
                        <span className="font-medium text-sm">{address.label}</span>
                      )}
                      {isSelected && (
                        <Check className="h-4 w-4 text-primary ml-auto" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {address.street}, {address.street_number}
                      {address.complement && ` - ${address.complement}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {address.neighborhood}, {address.city} - {formatCep(address.cep)}
                    </p>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingAddress(address);
                        }}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      {!address.is_default && (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onSetDefault(address.id);
                          }}
                        >
                          <Star className="h-4 w-4 mr-2" />
                          Definir como padrão
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingAddressId(address.id);
                        }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add new address button */}
      <Button
        variant="outline"
        className="w-full gap-2"
        onClick={() => setIsAddDialogOpen(true)}
      >
        <Plus className="h-4 w-4" />
        Adicionar novo endereço
      </Button>

      {/* Add/Edit dialog */}
      <AddressFormDialog
        open={isAddDialogOpen || !!editingAddress}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false);
            setEditingAddress(null);
          }
        }}
        onSave={handleSaveAddress}
        editingAddress={editingAddress}
        showDefaultCheckbox={addresses.length > 0}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deletingAddressId} onOpenChange={() => setDeletingAddressId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir endereço?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O endereço será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
