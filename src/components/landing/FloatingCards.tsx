import { motion, useScroll, useTransform } from 'framer-motion';
import { MessageCircle, Package, CreditCard, Tag, TrendingUp, Users } from 'lucide-react';
import { useRef } from 'react';

const floatingCards = [
  { 
    icon: MessageCircle, 
    title: 'WhatsApp', 
    subtitle: 'Pedidos automáticos', 
    color: 'from-green-500 to-emerald-500',
    shadow: 'shadow-green-500/30',
    position: 'top-0 -left-4 md:top-10 md:-left-8',
    delay: 0,
    parallaxSpeed: 0.3
  },
  { 
    icon: Package, 
    title: '+23 Pedidos', 
    subtitle: 'Hoje', 
    color: 'from-primary to-orange-500',
    shadow: 'shadow-primary/30',
    position: 'top-1/4 -right-2 md:-right-12',
    delay: 0.2,
    parallaxSpeed: 0.5
  },
  { 
    icon: CreditCard, 
    title: 'PIX Recebido', 
    subtitle: 'R$ 156,00', 
    color: 'from-cyan-500 to-blue-500',
    shadow: 'shadow-cyan-500/30',
    position: 'bottom-1/3 -left-4 md:-left-16',
    delay: 0.4,
    parallaxSpeed: 0.4
  },
  { 
    icon: Tag, 
    title: 'Cupom PROMO', 
    subtitle: '45 usos', 
    color: 'from-purple-500 to-pink-500',
    shadow: 'shadow-purple-500/30',
    position: 'bottom-10 -right-2 md:-right-8',
    delay: 0.6,
    parallaxSpeed: 0.6
  },
  { 
    icon: TrendingUp, 
    title: '+127%', 
    subtitle: 'Vendas', 
    color: 'from-emerald-500 to-green-500',
    shadow: 'shadow-emerald-500/30',
    position: 'top-1/2 -left-8 md:-left-20 hidden md:flex',
    delay: 0.8,
    parallaxSpeed: 0.35
  },
  { 
    icon: Users, 
    title: '12 Afiliados', 
    subtitle: 'Ativos', 
    color: 'from-amber-500 to-orange-500',
    shadow: 'shadow-amber-500/30',
    position: 'top-4 -right-4 md:top-0 md:-right-16 hidden md:flex',
    delay: 1,
    parallaxSpeed: 0.45
  }
];

const FloatingCards = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start']
  });

  return (
    <div ref={containerRef}>
      {floatingCards.map((card, index) => {
        const Icon = card.icon;
        const y = useTransform(
          scrollYProgress, 
          [0, 1], 
          [0, -50 * card.parallaxSpeed]
        );
        
        return (
          <motion.div
            key={index}
            className={`absolute ${card.position} z-20`}
            initial={{ opacity: 0, scale: 0.8, y: 20, filter: 'blur(8px)' }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ 
              delay: 0.5 + card.delay, 
              duration: 0.6, 
              type: "spring",
              ease: [0.25, 0.1, 0.25, 1]
            }}
            style={{ y }}
          >
            <motion.div
              className={`
                flex items-center gap-3 px-4 py-3 
                bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl 
                border border-orange-200/50 dark:border-white/10 rounded-xl
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
                <p className="font-bold text-slate-900 dark:text-white text-sm">{card.title}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">{card.subtitle}</p>
              </div>
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default FloatingCards;
