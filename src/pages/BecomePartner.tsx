import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhoneInput } from "@/components/ui/phone-input";
import { EmailInput } from "@/components/ui/email-input";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useStoreManagement } from "@/hooks/useStoreManagement";
import { Store, Rocket, CheckCircle, TrendingUp, Users, DollarSign, AlertCircle, Loader2, ArrowLeft, LogOut } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { storeSchema } from "@/hooks/useStoreValidation";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import GridPattern from "@/components/landing/GridPattern";

const categories = [
  "Restaurante",
  "Lanchonete",
  "Pizzaria",
  "Hamburgueria",
  "Japonês",
  "Italiano",
  "Brasileira",
  "Mercado",
  "Padaria",
  "Açougue",
  "Farmácia",
  "Pet Shop",
  "Flores",
  "Outros",
];

const benefits = [
  {
    icon: TrendingUp,
    title: "Aumente suas Vendas",
    description: "Alcance milhares de clientes em sua região",
  },
  {
    icon: Users,
    title: "Gestão Simplificada",
    description: "Dashboard completo para gerenciar pedidos e produtos",
  },
  {
    icon: DollarSign,
    title: "Sem Taxas Iniciais",
    description: "Comece a vender sem custos de adesão",
  },
];

export default function BecomePartner() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { hasRole } = useUserRole();
  const { createStore, isCreating } = useStoreManagement();

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    category: "Restaurante",
    address: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    delivery_fee: 5,
    min_order_value: 0,
    avg_delivery_time: 30,
    owner_name: "",
    owner_phone: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [slugAvailability, setSlugAvailability] = useState<{
    isChecking: boolean;
    isAvailable: boolean | null;
    message: string;
  }>({
    isChecking: false,
    isAvailable: null,
    message: "",
  });

  const handleSlugGeneration = (name: string) => {
    const slug = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "")
      .trim();
    return slug;
  };

  const sanitizeSlug = (value: string) => {
    return value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  };

  useEffect(() => {
    const checkSlugAvailability = async () => {
      const slug = formData.slug.trim();
      
      if (!slug) {
        setSlugAvailability({
          isChecking: false,
          isAvailable: null,
          message: "",
        });
        return;
      }

      setSlugAvailability({
        isChecking: true,
        isAvailable: null,
        message: "",
      });

      try {
        const { data, error } = await supabase
          .from("stores")
          .select("slug")
          .eq("slug", slug)
          .maybeSingle();

        if (error) {
          console.error("Error checking slug:", error);
          setSlugAvailability({
            isChecking: false,
            isAvailable: null,
            message: "",
          });
          return;
        }

        if (data) {
          setSlugAvailability({
            isChecking: false,
            isAvailable: false,
            message: "Esta URL já está em uso",
          });
        } else {
          setSlugAvailability({
            isChecking: false,
            isAvailable: true,
            message: "URL disponível",
          });
        }
      } catch (err) {
        console.error("Error checking slug:", err);
        setSlugAvailability({
          isChecking: false,
          isAvailable: null,
          message: "",
        });
      }
    };

    const timeoutId = setTimeout(() => {
      checkSlugAvailability();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.slug]);

  const validateForm = () => {
    try {
      storeSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.issues.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);

        const first = error.issues[0];
        const firstField = first?.path?.[0] ? String(first.path[0]) : undefined;
        if (firstField) {
          setTimeout(() => {
            const el = document.getElementById(firstField);
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            (el as HTMLInputElement | null)?.focus?.();
          }, 0);
        }

        toast({
          title: 'Erro no formulário',
          description: first?.message || 'Por favor, corrija os campos destacados',
          variant: 'destructive',
        });
      }
      return false;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    createStore(formData, {
      onSuccess: (result: any) => {
        console.log('✅ Resultado do cadastro:', result);
        
        toast({
          title: "Bem-vindo!",
          description: result?.newUserCreated 
            ? "Conta criada e loja ativada! Você já está logado." 
            : "Sua loja foi criada e ativada com sucesso!",
          duration: 5000,
        });
        
        setTimeout(() => {
          navigate("/dashboard-lojista");
        }, 1000);
      },
    });
  };

  const inputStyles = "bg-white border-gray-200 dark:border-white/20 text-slate-900 placeholder:text-slate-400 focus:border-primary/50 focus:ring-primary/20";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-slate-900 dark:text-white overflow-x-hidden">
      <main className="container mx-auto px-4 py-12 relative">
        <GridPattern className="dark:block hidden" variant="neutral-dark" />
        <GridPattern className="dark:hidden block" variant="light" />
        
        {/* Back button */}
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-slate-700 dark:text-white font-semibold hover:text-primary transition-colors mb-8 relative z-10"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Voltar ao início</span>
        </Link>
        
        <div className="relative z-10">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 bg-white/80 dark:bg-slate-800/60 backdrop-blur-sm border border-gray-200 dark:border-white/10 px-4 py-2 rounded-full mb-4">
              <Rocket className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-slate-700 dark:text-white">Seja um Parceiro</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-primary to-orange-400 bg-clip-text text-transparent mb-4">
              Venda na Nossa Plataforma
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              Cadastre sua loja e comece a vender para milhares de clientes
            </p>
          </motion.div>

          {/* Benefits */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
              >
                <Card className="text-center h-full bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border-gray-200 dark:border-white/10 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300">
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/30">
                      <benefit.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-bold mb-2 text-slate-900 dark:text-white">{benefit.title}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {benefit.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Registration Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="max-w-3xl mx-auto"
            id="registration-form"
          >
            <Card className="bg-white/90 dark:bg-slate-900/70 backdrop-blur-xl border-gray-200 dark:border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl text-slate-900 dark:text-white">
                  <Store className="w-6 h-6 text-primary" />
                  Cadastre sua Loja
                </CardTitle>
                <CardDescription className="text-slate-500 dark:text-slate-400">
                  Preencha as informações abaixo para começar a vender
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">

                  {/* Owner Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-900 dark:text-white">
                      <CheckCircle className="w-5 h-5 text-primary" />
                      Dados do Proprietário
                    </h3>

                    <div>
                      <Label htmlFor="owner_name" className="text-slate-700 dark:text-slate-200">Nome Completo *</Label>
                      <Input
                        id="owner_name"
                        value={formData.owner_name}
                        onChange={(e) =>
                          setFormData({ ...formData, owner_name: e.target.value })
                        }
                        placeholder="Ex: João Silva"
                        className={`${inputStyles} ${errors.owner_name ? "border-red-500" : ""}`}
                      />
                      {errors.owner_name && (
                        <p className="text-sm text-red-400 mt-1">{errors.owner_name}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="owner_phone" className="text-slate-700 dark:text-slate-200">Telefone do Proprietário *</Label>
                      <PhoneInput
                        id="owner_phone"
                        value={formData.owner_phone}
                        onChange={(value) =>
                          setFormData({ ...formData, owner_phone: value })
                        }
                        className={`${inputStyles} ${errors.owner_phone ? "border-red-500" : ""}`}
                      />
                      {errors.owner_phone && (
                        <p className="text-sm text-red-400 mt-1">{errors.owner_phone}</p>
                      )}
                    </div>
                  </div>

                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-900 dark:text-white">
                      <CheckCircle className="w-5 h-5 text-primary" />
                      Informações Básicas
                    </h3>

                    <div>
                      <Label htmlFor="name" className="text-slate-700 dark:text-slate-200">Nome da Loja *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => {
                          const name = e.target.value;
                          setFormData({
                            ...formData,
                            name,
                            slug: handleSlugGeneration(name),
                          });
                        }}
                        placeholder="Ex: Pizzaria Bella Italia"
                        className={`${inputStyles} ${errors.name ? "border-red-500" : ""}`}
                      />
                      {errors.name && (
                        <p className="text-sm text-red-400 mt-1">{errors.name}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="slug" className="text-slate-700 dark:text-slate-200">URL da Loja *</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          /
                        </span>
                        <Input
                          id="slug"
                          value={formData.slug}
                          onChange={(e) => {
                            const sanitized = sanitizeSlug(e.target.value);
                            setFormData({ ...formData, slug: sanitized });
                          }}
                          placeholder="pizzaria-bella-italia"
                          className={`${inputStyles} ${errors.slug ? "border-red-500" : ""}`}
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Apenas letras minúsculas, números e hífens
                      </p>
                      {formData.slug && (
                        <div className="mt-2 p-3 bg-gray-100 dark:bg-slate-800/40 rounded-lg border border-gray-200 dark:border-white/10">
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Preview da URL:</p>
                          <div className="flex items-center gap-2">
                            <Store className="w-4 h-4 text-primary" />
                            <code className="text-sm font-mono text-slate-700 dark:text-slate-200">
                              https://ofertas.app/{formData.slug}
                            </code>
                          </div>
                          
                          {/* Availability status */}
                          <div className="mt-2 flex items-center gap-2">
                            {slugAvailability.isChecking && (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                                <span className="text-xs text-slate-400">
                                  Verificando disponibilidade...
                                </span>
                              </>
                            )}
                            {!slugAvailability.isChecking && slugAvailability.isAvailable === true && (
                              <>
                                <CheckCircle className="w-4 h-4 text-emerald-400" />
                                <span className="text-xs text-emerald-400 font-medium">
                                  {slugAvailability.message}
                                </span>
                              </>
                            )}
                            {!slugAvailability.isChecking && slugAvailability.isAvailable === false && (
                              <>
                                <AlertCircle className="w-4 h-4 text-red-400" />
                                <span className="text-xs text-red-400 font-medium">
                                  {slugAvailability.message}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                      {errors.slug && (
                        <p className="text-sm text-red-400 mt-1">{errors.slug}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="category" className="text-slate-700 dark:text-slate-200">Categoria *</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) =>
                          setFormData({ ...formData, category: value })
                        }
                      >
                        <SelectTrigger className={inputStyles}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-slate-900 border-gray-200 dark:border-white/10">
                          {categories.map((cat) => (
                            <SelectItem key={cat} value={cat} className="text-slate-900 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-800 focus:bg-gray-100 dark:focus:bg-slate-800">
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="description" className="text-slate-700 dark:text-slate-200">Descrição da Loja</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({ ...formData, description: e.target.value })
                        }
                        placeholder="Conte sobre sua loja e o que a torna especial..."
                        rows={3}
                        className={inputStyles}
                      />
                    </div>
                  </div>

                  {/* User Account Section - Only if not logged in */}
                  {!user && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-900 dark:text-white">
                        <CheckCircle className="w-5 h-5 text-primary" />
                        Dados de Acesso
                      </h3>

                      <div>
                        <Label htmlFor="email" className="text-slate-700 dark:text-slate-200">E-mail *</Label>
                        <EmailInput
                          id="email"
                          value={formData.email}
                          onChange={(value) =>
                            setFormData({ ...formData, email: value })
                          }
                          className={`${inputStyles} ${errors.email ? "border-red-500" : ""}`}
                        />
                        {errors.email && (
                          <p className="text-sm text-red-400 mt-1">{errors.email}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="password" className="text-slate-700 dark:text-slate-200">Senha *</Label>
                          <Input
                            id="password"
                            type="password"
                            value={formData.password}
                            onChange={(e) =>
                              setFormData({ ...formData, password: e.target.value })
                            }
                            placeholder="Mínimo 6 caracteres"
                            className={`${inputStyles} ${errors.password ? "border-red-500" : ""}`}
                          />
                          {errors.password && (
                            <p className="text-sm text-red-400 mt-1">{errors.password}</p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="confirmPassword" className="text-slate-700 dark:text-slate-200">Confirmar Senha *</Label>
                          <Input
                            id="confirmPassword"
                            type="password"
                            value={formData.confirmPassword}
                            onChange={(e) =>
                              setFormData({ ...formData, confirmPassword: e.target.value })
                            }
                            placeholder="Repita a senha"
                            className={`${inputStyles} ${errors.confirmPassword ? "border-red-500" : ""}`}
                          />
                          {errors.confirmPassword && (
                            <p className="text-sm text-red-400 mt-1">{errors.confirmPassword}</p>
                          )}
                        </div>
                      </div>

                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Uma conta será criada automaticamente para você acessar o painel de gerenciamento.
                      </p>
                    </div>
                  )}

                  {/* Submit Button with Glow */}
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary to-orange-500 rounded-lg blur-xl opacity-40 group-hover:opacity-60 transition-opacity" />
                    <Button
                      type="submit"
                      disabled={isCreating}
                      className="relative w-full bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90 text-white shadow-lg shadow-primary/30 border-0"
                      size="lg"
                    >
                      {isCreating ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Cadastrando...
                        </>
                      ) : (
                        <>
                          <Rocket className="w-5 h-5 mr-2" />
                          Cadastrar Minha Loja
                        </>
                      )}
                    </Button>
                  </div>

                  <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
                    {!user ? (
                      <>
                        Ao cadastrar você automaticamente cria uma conta e faz login.
                        <br />
                        Já tem uma conta? <a href="/login-lojista" className="text-primary hover:text-primary/80 hover:underline">Faça login primeiro</a> ou{" "}
                        <a href="/" className="text-primary hover:text-primary/80 hover:underline">entre como cliente</a> e depois cadastre sua loja.
                      </>
                    ) : (
                      <>
                        Você está logado como <strong className="text-slate-900 dark:text-white">{user.email}</strong>.
                        <br />
                        Sua loja será vinculada à sua conta atual.
                        <br />
                        <button 
                          onClick={() => signOut()} 
                          className="inline-flex items-center gap-1 text-primary hover:text-primary/80 hover:underline mt-1"
                        >
                          <LogOut className="w-3 h-3" />
                          Sair da conta
                        </button>
                      </>
                    )}
                  </p>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
