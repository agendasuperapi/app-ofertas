import { motion } from 'framer-motion';
import { MessageCircle, Package, CreditCard, Tag, TrendingUp, Users } from 'lucide-react';

const floatingCards = [
  { 
    icon: MessageCircle, 
    title: 'WhatsApp', 
    subtitle: 'Pedidos automáticos', 
    color: 'from-green-500 to-emerald-500',
    shadow: 'shadow-green-500/30',
    position: 'top-0 -left-4 md:top-10 md:-left-8',
    delay: 0
  },
  { 
    icon: Package, 
    title: '+23 Pedidos', 
    subtitle: 'Hoje', 
    color: 'from-primary to-orange-500',
    shadow: 'shadow-primary/30',
    position: 'top-1/4 -right-2 md:-right-12',
    delay: 0.2
  },
  { 
    icon: CreditCard, 
    title: 'PIX Recebido', 
    subtitle: 'R$ 156,00', 
    color: 'from-cyan-500 to-blue-500',
    shadow: 'shadow-cyan-500/30',
    position: 'bottom-1/3 -left-4 md:-left-16',
    delay: 0.4
  },
  { 
    icon: Tag, 
    title: 'Cupom PROMO', 
    subtitle: '45 usos', 
    color: 'from-purple-500 to-pink-500',
    shadow: 'shadow-purple-500/30',
    position: 'bottom-10 -right-2 md:-right-8',
    delay: 0.6
  },
  { 
    icon: TrendingUp, 
    title: '+127%', 
    subtitle: 'Vendas', 
    color: 'from-emerald-500 to-green-500',
    shadow: 'shadow-emerald-500/30',
    position: 'top-1/2 -left-8 md:-left-20 hidden md:flex',
    delay: 0.8
  },
  { 
    icon: Users, 
    title: '12 Afiliados', 
    subtitle: 'Ativos', 
    color: 'from-amber-500 to-orange-500',
    shadow: 'shadow-amber-500/30',
    position: 'top-4 -right-4 md:top-0 md:-right-16 hidden md:flex',
    delay: 1
  }
];

const FloatingCards = () => {
  return (
    <>
      {floatingCards.map((card, index) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={index}
            className={`absolute ${card.position} z-20`}
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.5 + card.delay, duration: 0.5, type: "spring" }}
          >
            <motion.div
              className={`
                flex items-center gap-3 px-4 py-3 
                bg-slate-900/90 backdrop-blur-xl 
                border border-white/10 rounded-xl
                shadow-xl ${card.shadow}
              `}
              animate={{ 
                y: [0, -8, 0],
                rotate: index % 2 === 0 ? [-1, 1, -1] : [1, -1, 1]
              }}
              transition={{ 
                repeat: Infinity, 
                duration: 3 + index * 0.5,
                ease: "easeInOut",
                delay: index * 0.3
              }}
              whileHover={{ scale: 1.05, y: -5 }}
            >
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center shadow-lg`}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-white text-sm">{card.title}</p>
                <p className="text-xs text-slate-400">{card.subtitle}</p>
              </div>
            </motion.div>
          </motion.div>
        );
      })}
    </>
  );
};

export default FloatingCards;
