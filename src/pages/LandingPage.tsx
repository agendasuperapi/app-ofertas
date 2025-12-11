import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Store, ShoppingCart, Users, BarChart3, Package, Tag, 
  Clock, MapPin, MessageCircle, CreditCard, Smartphone,
  ChevronRight, Check, Star, ArrowRight, Play,
  Utensils, Pizza, Sandwich, ShoppingBag, Pill, PawPrint,
  Coffee, Cake, Sparkles, Zap, Shield, TrendingUp,
  DollarSign, Bell, Settings, FileText, Truck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const LandingPage = () => {
  const [activeFeature, setActiveFeature] = useState(0);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const benefits = [
    {
      icon: TrendingUp,
      title: "Aumente suas Vendas",
      description: "Alcance milhares de clientes em sua região com sua loja online personalizada"
    },
    {
      icon: Settings,
      title: "Gestão Simplificada",
      description: "Dashboard completo para gerenciar pedidos, produtos e relatórios em tempo real"
    },
    {
      icon: Shield,
      title: "Sem Taxas Iniciais",
      description: "Comece a vender sem custos de adesão. Pague apenas quando vender"
    },
    {
      icon: Zap,
      title: "Configuração Rápida",
      description: "Crie sua loja em minutos com nossa interface intuitiva e fácil de usar"
    }
  ];

  const steps = [
    {
      number: "01",
      title: "Cadastre sua Loja",
      description: "Preencha os dados básicos, escolha sua categoria e personalize sua URL"
    },
    {
      number: "02",
      title: "Configure seus Produtos",
      description: "Adicione produtos com fotos, preços, variações de tamanho e cor"
    },
    {
      number: "03",
      title: "Comece a Vender",
      description: "Compartilhe sua URL personalizada e receba pedidos pelo WhatsApp"
    },
    {
      number: "04",
      title: "Gerencie Tudo",
      description: "Acompanhe pedidos, receita e métricas pelo dashboard completo"
    }
  ];

  const dashboardFeatures = [
    { icon: Package, title: "Gestão de Pedidos", description: "Acompanhe pedidos em tempo real com status personalizáveis" },
    { icon: ShoppingCart, title: "Catálogo de Produtos", description: "Produtos com variações de tamanho, cor e adicionais" },
    { icon: Tag, title: "Sistema de Cupons", description: "Crie cupons de desconto com regras personalizadas" },
    { icon: MapPin, title: "Zonas de Entrega", description: "Configure taxas por bairro e cidade" },
    { icon: MessageCircle, title: "Integração WhatsApp", description: "Receba pedidos e notifique clientes automaticamente" },
    { icon: Clock, title: "Horários de Funcionamento", description: "Configure dias e horários de atendimento" },
    { icon: BarChart3, title: "Relatórios e Métricas", description: "Visualize vendas, produtos mais vendidos e clientes" },
    { icon: CreditCard, title: "Múltiplos Pagamentos", description: "PIX, cartão de crédito/débito e dinheiro" }
  ];

  const affiliateFeatures = [
    { icon: Tag, title: "Cupons Personalizados", description: "Cada afiliado tem seus próprios cupons com descontos configuráveis" },
    { icon: DollarSign, title: "Comissões Automáticas", description: "Sistema calcula comissões por produto ou categoria automaticamente" },
    { icon: BarChart3, title: "Dashboard Completo", description: "Afiliados acompanham vendas, comissões e saques em tempo real" },
    { icon: CreditCard, title: "Saques Simplificados", description: "Solicitação de saque com pagamento via PIX" }
  ];

  const categories = [
    { icon: Utensils, name: "Restaurante" },
    { icon: Sandwich, name: "Lanchonete" },
    { icon: Pizza, name: "Pizzaria" },
    { icon: Sandwich, name: "Hamburgueria" },
    { icon: ShoppingBag, name: "Mercado" },
    { icon: Cake, name: "Padaria" },
    { icon: Pill, name: "Farmácia" },
    { icon: PawPrint, name: "Pet Shop" },
    { icon: Coffee, name: "Cafeteria" },
    { icon: Store, name: "Loja de Roupas" }
  ];

  const testimonials = [
    {
      name: "Maria Silva",
      business: "Restaurante Sabor Caseiro",
      text: "Triplicamos nossas vendas em 3 meses! O sistema é muito fácil de usar.",
      rating: 5
    },
    {
      name: "João Santos",
      business: "Pizzaria do João",
      text: "A integração com WhatsApp mudou meu negócio. Recebo pedidos 24h por dia.",
      rating: 5
    },
    {
      name: "Ana Costa",
      business: "Pet Shop Amigo Fiel",
      text: "O sistema de afiliados trouxe muitos clientes novos. Recomendo!",
      rating: 5
    }
  ];

  const faqs = [
    {
      question: "Quanto custa usar a plataforma?",
      answer: "A criação da loja é gratuita. Você paga apenas uma pequena taxa sobre as vendas realizadas, sem mensalidades fixas."
    },
    {
      question: "Como recebo os pagamentos?",
      answer: "Os pagamentos são feitos diretamente para você. Oferecemos integração com PIX, cartão de crédito/débito e dinheiro na entrega."
    },
    {
      question: "Posso personalizar minha loja?",
      answer: "Sim! Você pode personalizar logo, cores, horários de funcionamento, zonas de entrega, métodos de pagamento e muito mais."
    },
    {
      question: "Como funciona o sistema de afiliados?",
      answer: "Você pode cadastrar afiliados que receberão cupons personalizados. Quando um cliente usar o cupom, o afiliado ganha uma comissão automática configurada por você."
    },
    {
      question: "Quais formas de pagamento são aceitas?",
      answer: "PIX (com QR Code automático), cartão de crédito e débito, e dinheiro na entrega com cálculo de troco."
    },
    {
      question: "Preciso de conhecimento técnico?",
      answer: "Não! Nossa plataforma foi criada para ser simples e intuitiva. Qualquer pessoa consegue criar e gerenciar sua loja."
    }
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative py-12 flex items-center justify-center overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-primary/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-primary/10 to-orange-500/10 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 pt-0 pb-20 relative z-10">
          <motion.div 
            className="text-center max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Badge className="mb-6 bg-primary/10 text-primary border-primary/20 px-4 py-2">
              <Sparkles className="w-4 h-4 mr-2" />
              Plataforma completa para seu negócio
            </Badge>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              Transforme sua Loja em um{' '}
              <span className="bg-gradient-to-r from-primary via-orange-500 to-primary bg-clip-text text-transparent">
                Sucesso Digital
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Crie sua loja online em minutos, receba pedidos pelo WhatsApp e 
              gerencie tudo em um único lugar. Sem complicação, sem taxas iniciais.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="text-lg px-8 py-6 bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90 shadow-lg shadow-primary/25">
                <Link to="/become-partner">
                  Criar Minha Loja Grátis
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6 border-2">
                <Link to="/heymax">
                  <Play className="mr-2 h-5 w-5" />
                  Ver Demonstração
                </Link>
              </Button>
            </div>

            <div className="mt-12 flex flex-wrap justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                <span>Cadastro gratuito</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                <span>Sem mensalidade</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                <span>Suporte incluso</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div 
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <div className="w-6 h-10 border-2 border-muted-foreground/30 rounded-full flex justify-center pt-2">
            <div className="w-1.5 h-3 bg-primary rounded-full" />
          </div>
        </motion.div>
      </section>

      {/* Device Mockup Section */}
      <section className="py-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />
        
        <div className="container mx-auto px-4 relative z-10">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">
              Sua loja perfeita em{' '}
              <span className="bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">
                qualquer dispositivo
              </span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Design responsivo que encanta seus clientes no computador e no celular
            </p>
          </motion.div>

          <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16">
            {/* MacBook Mockup */}
            <motion.div
              className="relative"
              initial={{ opacity: 0, x: -50, rotateY: 15 }}
              whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <div className="relative" style={{ perspective: '1000px' }}>
                {/* MacBook Frame */}
                <div className="relative bg-gradient-to-b from-[#2d2d2d] to-[#1a1a1a] rounded-t-xl p-2 shadow-2xl">
                  {/* Screen Bezel */}
                  <div className="bg-black rounded-lg p-1">
                    {/* Camera */}
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#1a1a1a] rounded-full flex items-center justify-center">
                      <div className="w-1 h-1 bg-[#0a3d0a] rounded-full" />
                    </div>
                    {/* Screen Content */}
                    <div className="w-[320px] sm:w-[480px] h-[200px] sm:h-[300px] bg-gradient-to-br from-background to-muted rounded overflow-hidden">
                      {/* Store Dashboard Preview */}
                      <div className="h-full flex flex-col">
                        {/* Header */}
                        <div className="bg-primary/10 px-3 py-2 flex items-center justify-between border-b border-border/50">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-orange-500" />
                            <span className="text-[10px] sm:text-xs font-semibold text-foreground">Minha Loja</span>
                          </div>
                          <div className="flex gap-1">
                            <div className="w-4 h-4 rounded bg-muted" />
                            <div className="w-4 h-4 rounded bg-muted" />
                          </div>
                        </div>
                        {/* Content */}
                        <div className="flex-1 p-3 grid grid-cols-3 gap-2">
                          {/* Stats Cards */}
                          <div className="col-span-3 grid grid-cols-3 gap-2 mb-2">
                            <div className="bg-card rounded-lg p-2 border border-border/50">
                              <div className="text-[8px] text-muted-foreground">Vendas</div>
                              <div className="text-xs sm:text-sm font-bold text-primary">R$ 2.450</div>
                            </div>
                            <div className="bg-card rounded-lg p-2 border border-border/50">
                              <div className="text-[8px] text-muted-foreground">Pedidos</div>
                              <div className="text-xs sm:text-sm font-bold text-green-500">32</div>
                            </div>
                            <div className="bg-card rounded-lg p-2 border border-border/50">
                              <div className="text-[8px] text-muted-foreground">Clientes</div>
                              <div className="text-xs sm:text-sm font-bold text-blue-500">128</div>
                            </div>
                          </div>
                          {/* Products Grid */}
                          {[1, 2, 3, 4, 5, 6].map((item) => (
                            <div key={item} className="bg-card rounded-lg overflow-hidden border border-border/50">
                              <div className={`h-8 sm:h-12 ${item % 2 === 0 ? 'bg-primary/20' : 'bg-orange-500/20'}`} />
                              <div className="p-1">
                                <div className="h-1.5 bg-muted rounded w-3/4 mb-1" />
                                <div className="h-1.5 bg-primary/30 rounded w-1/2" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* MacBook Base */}
                <div className="relative">
                  <div className="bg-gradient-to-b from-[#3d3d3d] to-[#2a2a2a] h-3 rounded-b-lg" />
                  <div className="bg-gradient-to-b from-[#2a2a2a] to-[#1f1f1f] h-2 mx-12 rounded-b-xl" />
                  {/* Notch */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-1.5 bg-[#1a1a1a] rounded-b-lg" />
                </div>
              </div>
              {/* Shadow */}
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-[90%] h-4 bg-black/20 blur-xl rounded-full" />
            </motion.div>

            {/* iPhone Mockup */}
            <motion.div
              className="relative"
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
              animate={{ y: [0, -8, 0] }}
              // @ts-ignore
              transition2={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            >
              <motion.div 
                className="relative"
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              >
                {/* iPhone Frame */}
                <div className="relative bg-gradient-to-b from-[#1a1a1a] to-[#0d0d0d] rounded-[2.5rem] p-2 shadow-2xl">
                  {/* Side Buttons */}
                  <div className="absolute -left-0.5 top-24 w-0.5 h-8 bg-[#2a2a2a] rounded-l" />
                  <div className="absolute -left-0.5 top-36 w-0.5 h-12 bg-[#2a2a2a] rounded-l" />
                  <div className="absolute -left-0.5 top-52 w-0.5 h-12 bg-[#2a2a2a] rounded-l" />
                  <div className="absolute -right-0.5 top-32 w-0.5 h-16 bg-[#2a2a2a] rounded-r" />
                  
                  {/* Screen */}
                  <div className="bg-black rounded-[2rem] p-1 overflow-hidden">
                    {/* Dynamic Island */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-10 flex items-center justify-center gap-2">
                      <div className="w-2 h-2 bg-[#1a1a1a] rounded-full" />
                      <div className="w-1.5 h-1.5 bg-[#0a3d0a] rounded-full" />
                    </div>
                    
                    {/* Screen Content */}
                    <div className="w-[160px] sm:w-[200px] h-[340px] sm:h-[420px] bg-gradient-to-br from-background to-muted rounded-[1.75rem] overflow-hidden">
                      {/* Mobile Store Preview */}
                      <div className="h-full flex flex-col pt-8">
                        {/* Store Header */}
                        <div className="px-3 py-2 flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-orange-500" />
                          <div>
                            <div className="text-[9px] font-semibold text-foreground">Minha Loja</div>
                            <div className="text-[7px] text-green-500">● Aberto</div>
                          </div>
                        </div>
                        
                        {/* Categories */}
                        <div className="px-3 py-2 flex gap-1.5 overflow-hidden">
                          <div className="px-2 py-0.5 bg-primary text-white text-[7px] rounded-full whitespace-nowrap">Todos</div>
                          <div className="px-2 py-0.5 bg-muted text-[7px] rounded-full whitespace-nowrap">Pizzas</div>
                          <div className="px-2 py-0.5 bg-muted text-[7px] rounded-full whitespace-nowrap">Bebidas</div>
                        </div>
                        
                        {/* Products */}
                        <div className="flex-1 px-3 py-2 space-y-2 overflow-hidden">
                          {[1, 2, 3].map((item) => (
                            <div key={item} className="flex gap-2 bg-card rounded-lg p-2 border border-border/50">
                              <div className={`w-12 h-12 rounded-lg ${item === 1 ? 'bg-primary/30' : item === 2 ? 'bg-orange-500/30' : 'bg-green-500/30'}`} />
                              <div className="flex-1 flex flex-col justify-center">
                                <div className="h-1.5 bg-foreground/20 rounded w-16 mb-1" />
                                <div className="h-1.5 bg-muted rounded w-12 mb-1" />
                                <div className="text-[8px] font-bold text-primary">R$ 29,90</div>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {/* Bottom Nav */}
                        <div className="px-4 py-2 bg-card/80 backdrop-blur border-t border-border/50 flex justify-around">
                          <div className="w-5 h-5 rounded bg-primary/20" />
                          <div className="w-5 h-5 rounded bg-muted" />
                          <div className="w-5 h-5 rounded bg-muted" />
                          <div className="w-5 h-5 rounded bg-muted" />
                        </div>
                        
                        {/* Home Indicator */}
                        <div className="flex justify-center py-2">
                          <div className="w-24 h-1 bg-foreground/20 rounded-full" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Glow Effect */}
                <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-orange-500/20 rounded-[3rem] blur-2xl -z-10 opacity-50" />
              </motion.div>
              {/* Shadow */}
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-[80%] h-6 bg-black/20 blur-xl rounded-full" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Por que escolher o{' '}
              <span className="bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">
                Ofertas.app
              </span>
              ?
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Tudo o que você precisa para vender online, em uma única plataforma
            </p>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {benefits.map((benefit, index) => (
              <motion.div key={index} variants={itemVariants}>
                <Card className="h-full hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border-0 bg-background/80 backdrop-blur-sm">
                  <CardContent className="p-6 text-center">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center shadow-lg shadow-primary/25">
                      <benefit.icon className="h-7 w-7 text-white" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{benefit.title}</h3>
                    <p className="text-muted-foreground text-sm">{benefit.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Como Funciona
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Em apenas 4 passos simples, sua loja estará pronta para vender
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <motion.div 
                key={index}
                className="relative"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-12 left-[60%] w-full h-0.5 bg-gradient-to-r from-primary/50 to-transparent" />
                )}
                <div className="text-center">
                  <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/10 to-orange-500/10 border-2 border-primary/20 flex items-center justify-center">
                    <span className="text-3xl font-bold bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">
                      {step.number}
                    </span>
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                  <p className="text-muted-foreground text-sm">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
              Dashboard Completo
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Tudo que você precisa em um só lugar
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Gerencie pedidos, produtos, cupons, entregas e muito mais
            </p>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {dashboardFeatures.map((feature, index) => (
              <motion.div key={index} variants={itemVariants}>
                <Card className="h-full hover:shadow-md hover:border-primary/30 transition-all duration-300 bg-background/80 backdrop-blur-sm">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-orange-500/20 flex items-center justify-center flex-shrink-0">
                        <feature.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">{feature.title}</h3>
                        <p className="text-muted-foreground text-sm">{feature.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Affiliate System Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-orange-500/5" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <Badge className="mb-4 bg-green-500/10 text-green-600 border-green-500/20">
                <Users className="w-4 h-4 mr-2" />
                Sistema de Afiliados
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Transforme clientes em{' '}
                <span className="bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">
                  vendedores
                </span>
              </h2>
              <p className="text-muted-foreground text-lg mb-8">
                Crie um exército de afiliados que divulgam sua loja. 
                Cada venda gera comissão automática para o afiliado.
              </p>

              <div className="grid sm:grid-cols-2 gap-4">
                {affiliateFeatures.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                      <feature.icon className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">{feature.title}</h4>
                      <p className="text-muted-foreground text-xs">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-3xl p-8 border border-green-500/20">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-background rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white font-bold">
                        F
                      </div>
                      <div>
                        <p className="font-semibold">Felipe Afiliado</p>
                        <p className="text-xs text-muted-foreground">Cupom: FELIPE</p>
                      </div>
                    </div>
                    <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Ativo</Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-background rounded-xl text-center">
                      <p className="text-2xl font-bold text-green-600">R$ 2.450</p>
                      <p className="text-xs text-muted-foreground">Total em Vendas</p>
                    </div>
                    <div className="p-4 bg-background rounded-xl text-center">
                      <p className="text-2xl font-bold text-primary">R$ 367,50</p>
                      <p className="text-xs text-muted-foreground">Comissões (15%)</p>
                    </div>
                  </div>

                  <div className="p-4 bg-background rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Disponível para saque</span>
                      <span className="font-bold text-green-600">R$ 245,00</span>
                    </div>
                    <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600">
                      Solicitar Saque
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Para todos os tipos de negócio
            </h2>
            <p className="text-muted-foreground text-lg">
              Seja qual for seu ramo, temos a solução ideal para você
            </p>
          </motion.div>

          <motion.div 
            className="flex flex-wrap justify-center gap-4"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {categories.map((category, index) => (
              <motion.div key={index} variants={itemVariants}>
                <div className="flex items-center gap-2 px-5 py-3 bg-background rounded-full border hover:border-primary/50 hover:shadow-md transition-all duration-300 cursor-pointer group">
                  <category.icon className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                  <span className="font-medium">{category.name}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              O que nossos clientes dizem
            </h2>
            <p className="text-muted-foreground text-lg">
              Milhares de lojistas já transformaram seus negócios
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full bg-background/80 backdrop-blur-sm hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex gap-1 mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-muted-foreground mb-4 italic">"{testimonial.text}"</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center text-white font-bold">
                        {testimonial.name[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{testimonial.name}</p>
                        <p className="text-xs text-muted-foreground">{testimonial.business}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Perguntas Frequentes
            </h2>
            <p className="text-muted-foreground text-lg">
              Tire suas dúvidas sobre a plataforma
            </p>
          </motion.div>

          <motion.div 
            className="max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, index) => (
                <AccordionItem 
                  key={index} 
                  value={`item-${index}`}
                  className="bg-background rounded-xl border px-6"
                >
                  <AccordionTrigger className="text-left hover:no-underline py-4">
                    <span className="font-semibold">{faq.question}</span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-4">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-orange-500/10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />
        
        <div className="container mx-auto px-4 relative z-10">
          <motion.div 
            className="text-center max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
              Pronto para{' '}
              <span className="bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">
                transformar
              </span>{' '}
              seu negócio?
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              Junte-se a milhares de lojistas que já estão vendendo mais com o Ofertas.app
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="text-lg px-8 py-6 bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90 shadow-lg shadow-primary/25">
                <Link to="/become-partner">
                  Criar Minha Loja Grátis
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6">
                <Link to="/heymax">
                  Ver Loja Demonstração
                </Link>
              </Button>
            </div>

            <p className="mt-6 text-sm text-muted-foreground">
              Sem cartão de crédito • Configuração em minutos • Suporte gratuito
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center">
                  <Store className="h-5 w-5 text-white" />
                </div>
                <span className="font-bold text-xl">Ofertas.app</span>
              </div>
              <p className="text-muted-foreground text-sm">
                A plataforma completa para criar e gerenciar sua loja online.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Produto</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/become-partner" className="hover:text-primary transition-colors">Criar Loja</Link></li>
                <li><Link to="/heymax" className="hover:text-primary transition-colors">Demonstração</Link></li>
                <li><a href="#" className="hover:text-primary transition-colors">Preços</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Recursos</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">Central de Ajuda</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">API</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">Termos de Uso</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Privacidade</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Cookies</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © 2024 Ofertas.app. Todos os direitos reservados.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Smartphone className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <MessageCircle className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
