import { motion } from 'framer-motion';
import { Check, Star, Zap, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';

const plans = [
  {
    name: 'Grátis',
    icon: Zap,
    price: '0',
    period: '/mês',
    description: 'Perfeito para começar',
    features: [
      'Até 50 produtos',
      'Integração WhatsApp',
      'PIX básico',
      'Dashboard simples',
      'Suporte por email'
    ],
    cta: 'Começar Grátis',
    popular: false,
    gradient: 'from-slate-500 to-slate-600'
  },
  {
    name: 'Popular',
    icon: Star,
    price: '49',
    period: '/mês',
    description: 'Mais recursos para crescer',
    features: [
      'Produtos ilimitados',
      'Integração WhatsApp Pro',
      'PIX + QR Code automático',
      'Sistema de Afiliados',
      'Relatórios avançados',
      'Cupons de desconto',
      'Múltiplas formas de pagamento',
      'Suporte prioritário'
    ],
    cta: 'Assinar Agora',
    popular: true,
    gradient: 'from-primary to-orange-500'
  },
  {
    name: 'Premium',
    icon: Crown,
    price: '99',
    period: '/mês',
    description: 'Para grandes operações',
    features: [
      'Tudo do Popular',
      'API de integração',
      'Múltiplas lojas',
      'White-label (sua marca)',
      'Relatórios personalizados',
      'Gerente de conta dedicado',
      'Suporte VIP 24/7',
      'Treinamento exclusivo'
    ],
    cta: 'Falar com Vendas',
    popular: false,
    gradient: 'from-purple-500 to-pink-500'
  }
];

const PricingSection = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900/50 to-slate-950" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-primary/10 rounded-full blur-[150px]" />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Badge className="mb-4 bg-primary/20 text-primary border-primary/30">
            <Crown className="w-4 h-4 mr-2" />
            Planos e Preços
          </Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 text-white">
            Escolha o plano{' '}
            <span className="bg-gradient-to-r from-primary via-orange-500 to-cyan-500 bg-clip-text text-transparent">
              ideal para você
            </span>
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Comece grátis e escale quando precisar. Sem surpresas, sem taxas escondidas.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => {
            const Icon = plan.icon;
            return (
              <motion.div
                key={index}
                className={`relative ${plan.popular ? 'md:-mt-4 md:mb-4' : ''}`}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
              >
                {/* Popular badge */}
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                    <Badge className="bg-gradient-to-r from-primary to-orange-500 text-white border-0 px-4 py-1 shadow-lg shadow-primary/30">
                      <Star className="w-3 h-3 mr-1 fill-white" />
                      Mais Popular
                    </Badge>
                  </div>
                )}
                
                <motion.div
                  className={`
                    relative h-full p-6 lg:p-8 rounded-2xl
                    bg-slate-900/80 backdrop-blur-xl
                    border ${plan.popular ? 'border-primary/50' : 'border-white/10'}
                    ${plan.popular ? 'shadow-2xl shadow-primary/20' : 'shadow-xl shadow-black/20'}
                    transition-all duration-500
                  `}
                  whileHover={{ 
                    y: -8, 
                    borderColor: plan.popular ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.3)'
                  }}
                >
                  {/* Glow effect for popular */}
                  {plan.popular && (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-orange-500/10 rounded-2xl" />
                  )}
                  
                  <div className="relative z-10">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center shadow-lg`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                        <p className="text-sm text-slate-400">{plan.description}</p>
                      </div>
                    </div>
                    
                    {/* Price */}
                    <div className="mb-6">
                      <div className="flex items-baseline gap-1">
                        <span className="text-slate-400 text-lg">R$</span>
                        <span className={`text-5xl font-bold bg-gradient-to-r ${plan.gradient} bg-clip-text text-transparent`}>
                          {plan.price}
                        </span>
                        <span className="text-slate-400">{plan.period}</span>
                      </div>
                    </div>
                    
                    {/* Features */}
                    <ul className="space-y-3 mb-8">
                      {plan.features.map((feature, i) => (
                        <motion.li 
                          key={i}
                          className="flex items-center gap-3 text-slate-300"
                          initial={{ opacity: 0, x: -10 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: index * 0.1 + i * 0.05 }}
                        >
                          <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${plan.gradient} flex items-center justify-center flex-shrink-0`}>
                            <Check className="h-3 w-3 text-white" />
                          </div>
                          <span className="text-sm">{feature}</span>
                        </motion.li>
                      ))}
                    </ul>
                    
                    {/* CTA */}
                    <Button 
                      asChild
                      className={`
                        w-full py-6 text-base font-semibold
                        ${plan.popular 
                          ? 'bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90 shadow-lg shadow-primary/30' 
                          : 'bg-slate-800 hover:bg-slate-700 border border-white/10'
                        }
                      `}
                    >
                      <Link to="/become-partner">
                        {plan.cta}
                      </Link>
                    </Button>
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
        
        {/* Trust note */}
        <motion.p 
          className="text-center text-slate-500 text-sm mt-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
        >
          Todos os planos incluem SSL grátis • Cancele a qualquer momento • Suporte em português
        </motion.p>
      </div>
    </section>
  );
};

export default PricingSection;
