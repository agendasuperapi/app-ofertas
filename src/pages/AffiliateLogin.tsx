import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { useAffiliateAuth } from '@/hooks/useAffiliateAuth';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CPFInput, isValidCPF } from '@/components/ui/cpf-input';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Loader2, Users, ArrowLeft, LogIn, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function AffiliateLogin() {
  const navigate = useNavigate();
  const { affiliateLogin, isLoading: authLoading } = useAffiliateAuth();
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!cpf || !password) {
      setError('Preencha todos os campos');
      return;
    }

    // Validar CPF
    const cpfNumbers = cpf.replace(/\D/g, '');
    if (cpfNumbers.length !== 11 || !isValidCPF(cpfNumbers)) {
      setError('CPF inválido');
      return;
    }

    setIsLoading(true);
    const result = await affiliateLogin(cpfNumbers, password);
    setIsLoading(false);

    if (result.success) {
      toast.success('Login realizado com sucesso!');
      navigate('/afiliado/dashboard');
    } else {
      setError(result.error || 'Erro ao fazer login');
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
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md mx-auto"
        >
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao início
          </Link>

          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-primary mb-4">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold gradient-text mb-2">
              Portal do Afiliado
            </h1>
            <p className="text-muted-foreground">
              Acesse sua conta para gerenciar suas comissões
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Entrar na sua conta</CardTitle>
              <CardDescription>
                Digite suas credenciais de afiliado para acessar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div>
                  <Label htmlFor="cpf">CPF *</Label>
                  <CPFInput
                    id="cpf"
                    value={cpf}
                    onChange={setCpf}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Digite sua senha"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <Link
                    to="/afiliado/esqueci-senha"
                    className="text-xs text-muted-foreground hover:text-primary transition-colors inline-block"
                  >
                    Esqueceu sua senha?
                  </Link>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-primary"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 mr-2" />
                      Entrar
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <div className="text-sm text-center text-muted-foreground">
                Ainda não tem uma conta?{" "}
                <span className="text-foreground">
                  Aguarde um convite de uma loja parceira.
                </span>
              </div>
              <div className="text-sm text-center text-muted-foreground">
                É lojista?{" "}
                <Link 
                  to="/login-lojista" 
                  className="text-primary hover:underline font-medium"
                >
                  Fazer login como lojista
                </Link>
              </div>
            </CardFooter>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
