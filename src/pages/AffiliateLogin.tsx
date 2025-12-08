import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAffiliateAuth } from '@/hooks/useAffiliateAuth';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CPFInput, isValidCPF } from '@/components/ui/cpf-input';
import { PasswordInput } from '@/components/ui/password-input';
import { toast } from 'sonner';
import { Loader2, Users, ArrowLeft } from 'lucide-react';

export default function AffiliateLogin() {
  const navigate = useNavigate();
  const { affiliateLogin, isLoading: authLoading } = useAffiliateAuth();
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!cpf || !password) {
      toast.error('Preencha todos os campos');
      return;
    }

    // Validar CPF
    const cpfNumbers = cpf.replace(/\D/g, '');
    if (cpfNumbers.length !== 11 || !isValidCPF(cpfNumbers)) {
      toast.error('CPF inválido');
      return;
    }

    setIsLoading(true);
    const result = await affiliateLogin(cpfNumbers, password);
    setIsLoading(false);

    if (result.success) {
      toast.success('Login realizado com sucesso!');
      navigate('/afiliado/dashboard');
    } else {
      toast.error(result.error || 'Erro ao fazer login');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao início
        </Link>

        <Card className="border-2">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Portal do Afiliado</CardTitle>
            <CardDescription>
              Acesse sua conta para gerenciar suas comissões
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <CPFInput
                  id="cpf"
                  value={cpf}
                  onChange={setCpf}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <PasswordInput
                  id="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="text-right">
                <Link 
                  to="/afiliado/esqueci-senha" 
                  className="text-sm text-primary hover:underline"
                >
                  Esqueci minha senha
                </Link>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-4">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>

              <p className="text-sm text-center text-muted-foreground">
                Ainda não tem uma conta?{' '}
                <span className="text-foreground">
                  Aguarde um convite de uma loja parceira.
                </span>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
