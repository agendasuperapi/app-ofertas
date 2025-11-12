import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { LogOut, User, Mail, Phone, MapPin } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export const ProfileSettings = () => {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          Informações do Perfil
        </CardTitle>
        <CardDescription>
          Visualize suas informações de perfil e gerenciamento de conta
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* User Info Section */}
        <div className="space-y-4">
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
                <p className="text-sm font-medium text-muted-foreground">Endereço</p>
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
        </div>

        <Separator />

        {/* Account Actions */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Gerenciamento de Conta</h4>
          <Button
            variant="destructive"
            onClick={signOut}
            className="w-full"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair da Conta
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
