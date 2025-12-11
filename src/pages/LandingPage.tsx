import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Store, ShoppingCart, Users, BarChart3, Package, Tag, Clock, MapPin, MessageCircle, CreditCard, Smartphone, ChevronRight, Check, Star, ArrowRight, Play, Utensils, Pizza, Sandwich, ShoppingBag, Pill, PawPrint, Coffee, Cake, Sparkles, Zap, Shield, TrendingUp, DollarSign, Bell, Settings, FileText, Truck, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import IPhoneMockup from '@/components/landing/IPhoneMockup';
import AnimatedCounter from '@/components/landing/AnimatedCounter';
import GridPattern from '@/components/landing/GridPattern';
import GlassCard from '@/components/landing/GlassCard';
import BentoGrid from '@/components/landing/BentoGrid';
import FloatingCards from '@/components/landing/FloatingCards';
import PricingSection from '@/components/landing/PricingSection';
import { LandingHeader } from '@/components/landing/LandingHeader';
const LandingPage = () => {
  const containerVariants = {
    hidden: {
      opacity: 0
    },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  const itemVariants = {
    hidden: {
      opacity: 0,
      y: 20
    },
    visible: {
      opacity: 1,
      y: 0
    }
  };
  const benefits = [{
    icon: TrendingUp,
    title: "Aumente suas Vendas",
    description: "Alcance milhares de clientes em sua região com sua loja online personalizada"
  }, {
    icon: Settings,
    title: "Gestão Simplificada",
    description: "Dashboard completo para gerenciar pedidos, produtos e relatórios em tempo real"
  }, {
    icon: Shield,
    title: "Sem Taxas Iniciais",
    description: "Comece a vender sem custos de adesão. Pague apenas quando vender"
  }, {
    icon: Zap,
    title: "Configuração Rápida",
    description: "Crie sua loja em minutos com nossa interface intuitiva e fácil de usar"
  }];
  const steps = [{
    number: "01",
    title: "Cadastre sua Loja",
    description: "Preencha os dados básicos, escolha sua categoria e personalize sua URL"
  }, {
    number: "02",
    title: "Configure seus Produtos",
    description: "Adicione produtos com fotos, preços, variações de tamanho e cor"
  }, {
    number: "03",
    title: "Comece a Vender",
    description: "Compartilhe sua URL personalizada e receba pedidos pelo WhatsApp"
  }, {
    number: "04",
    title: "Gerencie Tudo",
    description: "Acompanhe pedidos, receita e métricas pelo dashboard completo"
  }];
  const dashboardFeatures = [{
    icon: Package,
    title: "Gestão de Pedidos",
    description: "Acompanhe pedidos em tempo real com status personalizáveis e notificações automáticas",
    featured: true
  }, {
    icon: ShoppingCart,
    title: "Catálogo de Produtos",
    description: "Produtos com variações de tamanho, cor e adicionais"
  }, {
    icon: Tag,
    title: "Sistema de Cupons",
    description: "Crie cupons de desconto com regras personalizadas"
  }, {
    icon: MapPin,
    title: "Zonas de Entrega",
    description: "Configure taxas por bairro e cidade com precisão total",
    featured: true
  }, {
    icon: MessageCircle,
    title: "Integração WhatsApp",
    description: "Receba pedidos e notifique clientes automaticamente"
  }, {
    icon: Clock,
    title: "Horários",
    description: "Configure dias e horários de atendimento"
  }, {
    icon: BarChart3,
    title: "Relatórios",
    description: "Visualize vendas, produtos mais vendidos e clientes"
  }, {
    icon: CreditCard,
    title: "Pagamentos",
    description: "PIX, cartão de crédito/débito e dinheiro"
  }];
  const affiliateFeatures = [{
    icon: Tag,
    title: "Cupons Personalizados",
    description: "Cada afiliado tem seus próprios cupons com descontos configuráveis"
  }, {
    icon: DollarSign,
    title: "Comissões Automáticas",
    description: "Sistema calcula comissões por produto ou categoria automaticamente"
  }, {
    icon: BarChart3,
    title: "Dashboard Completo",
    description: "Afiliados acompanham vendas, comissões e saques em tempo real"
  }, {
    icon: CreditCard,
    title: "Saques Simplificados",
    description: "Solicitação de saque com pagamento via PIX"
  }];
  const categories = [{
    icon: Utensils,
    name: "Restaurante"
  }, {
    icon: Sandwich,
    name: "Lanchonete"
  }, {
    icon: Pizza,
    name: "Pizzaria"
  }, {
    icon: Sandwich,
    name: "Hamburgueria"
  }, {
    icon: ShoppingBag,
    name: "Mercado"
  }, {
    icon: Cake,
    name: "Padaria"
  }, {
    icon: Pill,
    name: "Farmácia"
  }, {
    icon: PawPrint,
    name: "Pet Shop"
  }, {
    icon: Coffee,
    name: "Cafeteria"
  }, {
    icon: Store,
    name: "Loja de Roupas"
  }];
  const testimonials = [{
    name: "Maria Silva",
    business: "Restaurante Sabor Caseiro",
    text: "Triplicamos nossas vendas em 3 meses! O sistema é muito fácil de usar e meus clientes adoram.",
    rating: 5,
    avatar: "MS"
  }, {
    name: "João Santos",
    business: "Pizzaria do João",
    text: "A integração com WhatsApp mudou meu negócio. Recebo pedidos 24h por dia e a gestão ficou muito mais fácil.",
    rating: 5,
    avatar: "JS"
  }, {
    name: "Ana Costa",
    business: "Pet Shop Amigo Fiel",
    text: "O sistema de afiliados trouxe muitos clientes novos. Recomendo para qualquer negócio!",
    rating: 5,
    avatar: "AC"
  }];
  const faqs = [{
    question: "Quanto custa usar a plataforma?",
    answer: "A criação da loja é gratuita. Você paga apenas uma pequena taxa sobre as vendas realizadas, sem mensalidades fixas."
  }, {
    question: "Como recebo os pagamentos?",
    answer: "Os pagamentos são feitos diretamente para você. Oferecemos integração com PIX, cartão de crédito/débito e dinheiro na entrega."
  }, {
    question: "Posso personalizar minha loja?",
    answer: "Sim! Você pode personalizar logo, cores, horários de funcionamento, zonas de entrega, métodos de pagamento e muito mais."
  }, {
    question: "Como funciona o sistema de afiliados?",
    answer: "Você pode cadastrar afiliados que receberão cupons personalizados. Quando um cliente usar o cupom, o afiliado ganha uma comissão automática configurada por você."
  }, {
    question: "Quais formas de pagamento são aceitas?",
    answer: "PIX (com QR Code automático), cartão de crédito e débito, e dinheiro na entrega com cálculo de troco."
  }, {
    question: "Preciso de conhecimento técnico?",
    answer: "Não! Nossa plataforma foi criada para ser simples e intuitiva. Qualquer pessoa consegue criar e gerenciar sua loja."
  }];
  const stats = [{
    value: 2500,
    suffix: '+',
    label: 'Lojas Ativas'
  }, {
    value: 50000,
    suffix: '+',
    label: 'Pedidos Entregues'
  }, {
    value: 98,
    suffix: '%',
    label: 'Clientes Satisfeitos'
  }, {
    value: 24,
    suffix: '/7',
    label: 'Suporte Disponível'
  }];

  // Parallax scroll effects
  const heroRef = useRef<HTMLDivElement>(null);
  const {
    scrollYProgress
  } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start']
  });
  const heroGlowY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const heroGlowOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0.3]);
  const heroContentY = useTransform(scrollYProgress, [0, 1], [0, 50]);
  return <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden">
      <LandingHeader />
      
      {/* Hero Section */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16 md:pt-20">
        <GridPattern variant="dark" />
        
        <motion.div style={{
        y: heroContentY
      }} className="container mx-auto px-4 pt-8 pb-20 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left content */}
            <motion.div className="text-center lg:text-left" initial={{
            opacity: 0,
            y: 30
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            duration: 0.8
          }}>
              <motion.div initial={{
              opacity: 0,
              scale: 0.9
            }} animate={{
              opacity: 1,
              scale: 1
            }} transition={{
              delay: 0.2
            }}>
                <Badge className="mb-6 bg-primary/20 text-primary border-primary/30 px-4 py-2 backdrop-blur-sm">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Plataforma completa para seu negócio
                </Badge>
              </motion.div>
              
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
                Transforme sua Loja em um{' '}
                <span className="relative">
                  <span className="bg-gradient-to-r from-primary via-orange-500 to-cyan-500 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                    Sucesso Digital
                  </span>
                  <motion.span className="absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r from-primary via-orange-500 to-cyan-500 rounded-full" initial={{
                  scaleX: 0
                }} animate={{
                  scaleX: 1
                }} transition={{
                  delay: 0.8,
                  duration: 0.6
                }} />
                </span>
              </h1>
              
              <p className="text-lg sm:text-xl text-slate-400 mb-8 max-w-xl mx-auto lg:mx-0">
                Transforme as Ofertas da sua Loja em uma máquina de Vendas Online.

              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
                <Button asChild size="lg" className="text-lg px-8 py-6 bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90 shadow-lg shadow-primary/30 group relative overflow-hidden">
                  <Link to="/become-partner">
                    <span className="relative z-10 flex items-center">
                      Criar Minha Loja Grátis
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                    <motion.div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-primary" initial={{
                    x: '100%'
                  }} whileHover={{
                    x: 0
                  }} transition={{
                    duration: 0.3
                  }} />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6 border-2 border-white/20 backdrop-blur-sm bg-white/5 hover:bg-white/10 text-white">
                  <Link to="/heymax">
                    <Play className="mr-2 h-5 w-5" />
                    Ver Demonstração
                  </Link>
                </Button>
              </div>

              {/* Stats inline */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
                {stats.map((stat, index) => <motion.div key={index} className="text-center lg:text-left" initial={{
                opacity: 0,
                y: 20
              }} animate={{
                opacity: 1,
                y: 0
              }} transition={{
                delay: 0.6 + index * 0.1
              }}>
                    <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary via-orange-500 to-cyan-500 bg-clip-text text-transparent">
                      <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                    </div>
                    <div className="text-sm text-slate-500">{stat.label}</div>
                  </motion.div>)}
              </div>
            </motion.div>

            {/* Right content - iPhone with Floating Cards */}
            <div className="relative hidden lg:block">
              <motion.div className="relative flex justify-center" style={{
              y: useTransform(scrollYProgress, [0, 1], [0, 30])
            }}>
                {/* Glow effect behind phone with parallax */}
                <motion.div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-r from-primary/30 to-cyan-500/30 rounded-full blur-[100px]" style={{
                y: heroGlowY,
                opacity: heroGlowOpacity
              }} />
                
                <IPhoneMockup className="w-64 relative z-10" />
                
                {/* Floating Cards */}
                <FloatingCards />
              </motion.div>
            </div>
          </div>

          {/* Trust badges */}
          <motion.div className="mt-16 flex flex-wrap justify-center gap-4 text-sm" initial={{
          opacity: 0
        }} animate={{
          opacity: 1
        }} transition={{
          delay: 1
        }}>
            {[{
            icon: Check,
            text: 'Cadastro gratuito'
          }, {
            icon: Shield,
            text: 'Dados seguros'
          }, {
            icon: Zap,
            text: 'Suporte incluso'
          }, {
            icon: Heart,
            text: '+2.500 lojistas'
          }].map((item, i) => <div key={i} className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10">
                <item.icon className="h-4 w-4 text-green-500" />
                <span className="text-slate-300">{item.text}</span>
              </div>)}
          </motion.div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div className="absolute bottom-8 left-1/2 -translate-x-1/2" animate={{
        y: [0, 10, 0]
      }} transition={{
        repeat: Infinity,
        duration: 2
      }}>
          <div className="w-6 h-10 border-2 border-white/20 rounded-full flex justify-center pt-2 backdrop-blur-sm">
            <motion.div className="w-1.5 h-3 bg-primary rounded-full" animate={{
            y: [0, 8, 0],
            opacity: [1, 0.5, 1]
          }} transition={{
            repeat: Infinity,
            duration: 1.5
          }} />
          </div>
        </motion.div>
      </section>

      {/* Device Showcase Mobile */}
      <section className="py-16 lg:hidden relative">
        <div className="container mx-auto px-4">
          <motion.div className="text-center mb-8" initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }}>
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">
              Sua loja em{' '}
              <span className="bg-gradient-to-r from-primary to-cyan-500 bg-clip-text text-transparent">
                qualquer dispositivo
              </span>
            </h2>
          </motion.div>
          <div className="flex justify-center relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-gradient-to-r from-primary/30 to-cyan-500/30 rounded-full blur-[60px]" />
            <IPhoneMockup className="w-48 relative z-10" />
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900/50 to-slate-950" />
        
        <div className="container mx-auto px-4 relative z-10">
          <motion.div className="text-center mb-16" initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }}>
            <Badge className="mb-4 bg-primary/20 text-primary border-primary/30">
              Vantagens
            </Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              Por que escolher o{' '}
              <span className="bg-gradient-to-r from-primary to-cyan-500 bg-clip-text text-transparent">
                Ofertas.app
              </span>
              ?
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Tudo o que você precisa para vender online, em uma única plataforma
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => <GlassCard key={index} delay={index * 0.1} variant="dark">
                <div className="p-6 text-center">
                  <motion.div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center shadow-lg shadow-primary/30" whileHover={{
                scale: 1.1,
                rotate: 5
              }} transition={{
                type: "spring",
                stiffness: 300
              }}>
                    <benefit.icon className="h-8 w-8 text-white" />
                  </motion.div>
                  <h3 className="font-bold text-lg mb-2 text-white">{benefit.title}</h3>
                  <p className="text-slate-400 text-sm">{benefit.description}</p>
                </div>
              </GlassCard>)}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="container mx-auto px-4">
          <motion.div className="text-center mb-16" initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }}>
            <Badge className="mb-4 bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
              Como Funciona
            </Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              4 passos simples para{' '}
              <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                começar a vender
              </span>
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Em poucos minutos, sua loja estará pronta para receber pedidos
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => <motion.div key={index} className="relative" initial={{
            opacity: 0,
            y: 30
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true
          }} transition={{
            delay: index * 0.15
          }}>
                {/* Connection line */}
                {index < steps.length - 1 && <div className="hidden lg:block absolute top-14 left-[60%] w-full h-0.5">
                    <motion.div className="h-full bg-gradient-to-r from-cyan-500/50 to-cyan-500/20" initial={{
                scaleX: 0
              }} whileInView={{
                scaleX: 1
              }} viewport={{
                once: true
              }} transition={{
                delay: index * 0.2 + 0.5,
                duration: 0.5
              }} />
                  </div>}
                
                <div className="text-center group">
                  <motion.div className="w-28 h-28 mx-auto mb-6 rounded-full bg-slate-900/80 border-2 border-cyan-500/30 flex items-center justify-center relative overflow-hidden group-hover:border-cyan-500/60 transition-colors" whileHover={{
                scale: 1.05
              }}>
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent relative z-10">
                      {step.number}
                    </span>
                  </motion.div>
                  <h3 className="font-bold text-xl mb-2 group-hover:text-cyan-400 transition-colors text-white">{step.title}</h3>
                  <p className="text-slate-400">{step.description}</p>
                </div>
              </motion.div>)}
          </div>
        </div>
      </section>

      {/* Dashboard Features - Bento Grid */}
      <section className="py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900/30 to-slate-950" />
        
        <div className="container mx-auto px-4 relative z-10">
          <motion.div className="text-center mb-16" initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }}>
            <Badge className="mb-4 bg-purple-500/20 text-purple-400 border-purple-500/30">
              Dashboard Completo
            </Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              Tudo que você precisa em{' '}
              <span className="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                um só lugar
              </span>
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Gerencie pedidos, produtos, cupons, entregas e muito mais
            </p>
          </motion.div>

          <BentoGrid items={dashboardFeatures} variant="dark" />
        </div>
      </section>

      {/* Affiliate System Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-slate-950 to-green-500/5" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div initial={{
            opacity: 0,
            x: -30
          }} whileInView={{
            opacity: 1,
            x: 0
          }} viewport={{
            once: true
          }}>
              <Badge className="mb-4 bg-green-500/20 text-green-400 border-green-500/30">
                <Users className="w-4 h-4 mr-2" />
                Sistema de Afiliados
              </Badge>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
                Transforme clientes em{' '}
                <span className="bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
                  vendedores
                </span>
              </h2>
              <p className="text-slate-400 text-lg mb-8">
                Crie um exército de afiliados que divulgam sua loja. 
                Cada venda gera comissão automática para o afiliado.
              </p>

              <div className="grid sm:grid-cols-2 gap-4">
                {affiliateFeatures.map((feature, index) => <motion.div key={index} className="flex items-start gap-3" initial={{
                opacity: 0,
                x: -20
              }} whileInView={{
                opacity: 1,
                x: 0
              }} viewport={{
                once: true
              }} transition={{
                delay: index * 0.1
              }}>
                    <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <feature.icon className="h-5 w-5 text-green-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-white">{feature.title}</h4>
                      <p className="text-slate-500 text-xs">{feature.description}</p>
                    </div>
                  </motion.div>)}
              </div>
            </motion.div>

            <motion.div initial={{
            opacity: 0,
            x: 30
          }} whileInView={{
            opacity: 1,
            x: 0
          }} viewport={{
            once: true
          }} className="relative">
              <GlassCard hoverEffect={false} variant="dark" className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30">
                <div className="p-8 space-y-6">
                  <div className="flex items-center justify-between p-4 bg-slate-900/80 rounded-xl border border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-green-500/30">
                        F
                      </div>
                      <div>
                        <p className="font-semibold text-white">Felipe Afiliado</p>
                        <p className="text-xs text-slate-400">Cupom: FELIPE</p>
                      </div>
                    </div>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Ativo</Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <motion.div className="p-4 bg-slate-900/80 rounded-xl text-center border border-white/10" whileHover={{
                    scale: 1.02
                  }}>
                      <p className="text-3xl font-bold text-green-400">
                        <AnimatedCounter end={2450} prefix="R$ " />
                      </p>
                      <p className="text-xs text-slate-400">Total em Vendas</p>
                    </motion.div>
                    <motion.div className="p-4 bg-slate-900/80 rounded-xl text-center border border-white/10" whileHover={{
                    scale: 1.02
                  }}>
                      <p className="text-3xl font-bold text-primary">
                        <AnimatedCounter end={367} prefix="R$ " suffix=",50" />
                      </p>
                      <p className="text-xs text-slate-400">Comissões (15%)</p>
                    </motion.div>
                  </div>

                  <div className="p-4 bg-slate-900/80 rounded-xl border border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-slate-400">Disponível para saque</span>
                      <span className="font-bold text-green-400 text-lg">R$ 245,00</span>
                    </div>
                    <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-lg shadow-green-500/30">
                      Solicitar Saque
                    </Button>
                  </div>
                </div>
              </GlassCard>
              
              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-green-500/30 rounded-full blur-2xl" />
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-emerald-500/30 rounded-full blur-2xl" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <PricingSection />

      {/* Categories Section */}
      <section className="py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900/30 to-slate-950" />
        
        <div className="container mx-auto px-4 relative z-10">
          <motion.div className="text-center mb-12" initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }}>
            <Badge className="mb-4 bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
              Segmentos
            </Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              Para todos os{' '}
              <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                tipos de negócio
              </span>
            </h2>
            <p className="text-slate-400 text-lg">
              Seja qual for seu ramo, temos a solução ideal para você
            </p>
          </motion.div>

          <div className="relative overflow-hidden py-4">
            <motion.div 
              className="flex gap-4 w-max"
              animate={{
                x: [0, -1920]
              }}
              transition={{
                x: {
                  repeat: Infinity,
                  repeatType: "loop",
                  duration: 30,
                  ease: "linear"
                }
              }}
            >
              {/* First set */}
              {categories.map((category, index) => (
                <motion.div 
                  key={`first-${index}`} 
                  whileHover={{ scale: 1.05, y: -2 }}
                  className="flex-shrink-0"
                >
                  <div className="flex items-center gap-3 px-6 py-3 bg-slate-900/80 backdrop-blur-sm rounded-full border border-white/10 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-300 cursor-pointer group">
                    <category.icon className="h-5 w-5 text-cyan-400 group-hover:scale-110 transition-transform" />
                    <span className="font-medium text-slate-300 whitespace-nowrap">{category.name}</span>
                  </div>
                </motion.div>
              ))}
              {/* Duplicate set for seamless loop */}
              {categories.map((category, index) => (
                <motion.div 
                  key={`second-${index}`} 
                  whileHover={{ scale: 1.05, y: -2 }}
                  className="flex-shrink-0"
                >
                  <div className="flex items-center gap-3 px-6 py-3 bg-slate-900/80 backdrop-blur-sm rounded-full border border-white/10 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-300 cursor-pointer group">
                    <category.icon className="h-5 w-5 text-cyan-400 group-hover:scale-110 transition-transform" />
                    <span className="font-medium text-slate-300 whitespace-nowrap">{category.name}</span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="container mx-auto px-4">
          <motion.div className="text-center mb-16" initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }}>
            <Badge className="mb-4 bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
              <Star className="w-4 h-4 mr-2 fill-yellow-400" />
              Depoimentos
            </Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              O que nossos{' '}
              <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                clientes dizem
              </span>
            </h2>
            <p className="text-slate-400 text-lg">
              Milhares de lojistas já transformaram seus negócios
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => <motion.div key={index} initial={{
            opacity: 0,
            y: 30
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true
          }} transition={{
            delay: index * 0.15
          }}>
                <GlassCard className="h-full" variant="dark">
                  <div className="p-6">
                    {/* Stars */}
                    <div className="flex gap-1 mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => <motion.div key={i} initial={{
                    opacity: 0,
                    scale: 0
                  }} whileInView={{
                    opacity: 1,
                    scale: 1
                  }} viewport={{
                    once: true
                  }} transition={{
                    delay: index * 0.1 + i * 0.1
                  }}>
                          <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                        </motion.div>)}
                    </div>
                    
                    {/* Quote */}
                    <p className="text-slate-400 mb-6 italic text-lg leading-relaxed">
                      "{testimonial.text}"
                    </p>
                    
                    {/* Author */}
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center text-white font-bold shadow-lg shadow-primary/30">
                        {testimonial.avatar}
                      </div>
                      <div>
                        <p className="font-semibold text-white">{testimonial.name}</p>
                        <p className="text-sm text-slate-500">{testimonial.business}</p>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>)}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900/30 to-slate-950" />
        
        <div className="container mx-auto px-4 relative z-10">
          <motion.div className="text-center mb-16" initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }}>
            <Badge className="mb-4 bg-indigo-500/20 text-indigo-400 border-indigo-500/30">
              FAQ
            </Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              Perguntas{' '}
              <span className="bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">
                Frequentes
              </span>
            </h2>
            <p className="text-slate-400 text-lg">
              Tire suas dúvidas sobre a plataforma
            </p>
          </motion.div>

          <motion.div className="max-w-3xl mx-auto" initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }}>
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, index) => <AccordionItem key={index} value={`item-${index}`} className="bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-white/10 px-6 overflow-hidden data-[state=open]:border-primary/40 transition-colors">
                  <AccordionTrigger className="text-left hover:no-underline py-5 [&[data-state=open]>svg]:rotate-180 text-white">
                    <span className="font-semibold text-lg">{faq.question}</span>
                  </AccordionTrigger>
                  <AccordionContent className="text-slate-400 pb-5 text-base leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>)}
            </Accordion>
          </motion.div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <GridPattern variant="dark" />
        
        <div className="container mx-auto px-4 relative z-10">
          <motion.div className="text-center max-w-4xl mx-auto" initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }}>
            <motion.div initial={{
            scale: 0
          }} whileInView={{
            scale: 1
          }} viewport={{
            once: true
          }} transition={{
            type: "spring",
            stiffness: 200
          }} className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center shadow-2xl shadow-primary/30">
              <Sparkles className="h-10 w-10 text-white" />
            </motion.div>
            
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Pronto para{' '}
              <span className="bg-gradient-to-r from-primary via-orange-500 to-cyan-500 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                transformar
              </span>{' '}
              seu negócio?
            </h2>
            <p className="text-slate-400 text-lg sm:text-xl mb-10 max-w-2xl mx-auto">
              Junte-se a milhares de lojistas que já estão vendendo mais com o Ofertas.app
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="text-lg px-10 py-7 bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90 shadow-xl shadow-primary/30 group">
                <Link to="/become-partner">
                  <span className="flex items-center">
                    Criar Minha Loja Grátis
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-lg px-10 py-7 backdrop-blur-sm bg-white/5 border-white/20 hover:bg-white/10 text-white">
                <Link to="/heymax">
                  Ver Lojas Parceiras
                </Link>
              </Button>
            </div>

            {/* Final trust badges */}
            <motion.div className="mt-12 flex flex-wrap justify-center gap-6 text-sm text-slate-500" initial={{
            opacity: 0
          }} whileInView={{
            opacity: 1
          }} viewport={{
            once: true
          }} transition={{
            delay: 0.3
          }}>
              {['Sem cartão de crédito', 'Cancele quando quiser', 'Suporte em português'].map((text, i) => <div key={i} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>{text}</span>
                </div>)}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/10 relative">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-2 md:col-span-1">
              <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-primary to-cyan-500 bg-clip-text text-transparent">
                Ofertas.app
              </Link>
              <p className="text-slate-500 text-sm mt-2">
                A plataforma completa para sua loja online
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-white">Produto</h4>
              <ul className="space-y-2 text-slate-500 text-sm">
                <li><Link to="/become-partner" className="hover:text-primary transition-colors">Criar Loja</Link></li>
                <li><Link to="/heymax" className="hover:text-primary transition-colors">Ver Demo</Link></li>
                <li><a href="#" className="hover:text-primary transition-colors">Preços</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-white">Recursos</h4>
              <ul className="space-y-2 text-slate-500 text-sm">
                <li><a href="#" className="hover:text-primary transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Central de Ajuda</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">API</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-white">Contato</h4>
              <ul className="space-y-2 text-slate-500 text-sm">
                <li><a href="mailto:contato@ofertas.app" className="hover:text-primary transition-colors">contato@ofertas.app</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">WhatsApp</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-slate-500 text-sm">
              © 2024 Ofertas.app. Todos os direitos reservados.
            </p>
            <div className="flex gap-6 text-slate-500 text-sm">
              <a href="#" className="hover:text-primary transition-colors">Termos de Uso</a>
              <a href="#" className="hover:text-primary transition-colors">Privacidade</a>
            </div>
          </div>
        </div>
      </footer>
    </div>;
};
export default LandingPage;