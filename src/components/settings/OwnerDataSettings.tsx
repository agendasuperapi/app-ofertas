import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useStoreManagement } from "@/hooks/useStoreManagement";
import { User, Mail, Phone, MapPin, Store, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export const OwnerDataSettings = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { myStore } = useStoreManagement();

  return (
    <div className="space-y-6">
      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Informações Pessoais
          </CardTitle>
          <CardDescription>
            Dados do proprietário da loja
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
            <Mail className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p className="text-base">{user?.email}</p>
            </div>
          </div>

          {profile?.full_name && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <User className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Nome Completo</p>
                <p className="text-base">{profile.full_name}</p>
              </div>
            </div>
          )}

          {profile?.phone && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <Phone className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Telefone</p>
                <p className="text-base">{profile.phone}</p>
              </div>
            </div>
          )}

          {(profile?.street || profile?.neighborhood) && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Endereço Pessoal</p>
                <p className="text-base">
                  {profile.street && profile.street_number 
                    ? `${profile.street}, ${profile.street_number}` 
                    : profile.street || 'Não informado'}
                </p>
                {profile.neighborhood && (
                  <p className="text-sm text-muted-foreground">{profile.neighborhood}</p>
                )}
                {profile.complement && (
                  <p className="text-sm text-muted-foreground">{profile.complement}</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Store Information */}
      {myStore && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="w-5 h-5" />
              Informações da Loja
            </CardTitle>
            <CardDescription>
              Dados da sua loja cadastrada
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <Store className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Nome da Loja</p>
                <p className="text-base font-semibold">{myStore.name}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Slug: <span className="font-mono">{myStore.slug}</span>
                </p>
              </div>
              <Badge 
                variant={myStore.status === 'active' ? 'default' : 'secondary'}
                className="mt-1"
              >
                {myStore.status === 'active' ? 'Ativa' : 
                 myStore.status === 'pending_approval' ? 'Aguardando Aprovação' : 
                 'Inativa'}
              </Badge>
            </div>

            {myStore.category && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                <Store className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Categoria</p>
                  <p className="text-base">{myStore.category}</p>
                </div>
              </div>
            )}

            {myStore.phone && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                <Phone className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Telefone da Loja</p>
                  <p className="text-base">{myStore.phone}</p>
                </div>
              </div>
            )}

            {myStore.email && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                <Mail className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Email da Loja</p>
                  <p className="text-base">{myStore.email}</p>
                </div>
              </div>
            )}

            {myStore.address && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Endereço da Loja</p>
                  <p className="text-base">{myStore.address}</p>
                </div>
              </div>
            )}

            {myStore.pickup_address && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Endereço para Retirada</p>
                  <p className="text-base">{myStore.pickup_address}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Membro desde</p>
                <p className="text-base">
                  {format(new Date(myStore.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
