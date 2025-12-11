import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hoverEffect?: boolean;
  delay?: number;
  variant?: 'light' | 'dark';
}

const GlassCard = ({ 
  children, 
  className = '', 
  hoverEffect = true,
  delay = 0,
  variant = 'dark'
}: GlassCardProps) => {
  return (
    <motion.div
      className={`
        relative overflow-hidden rounded-2xl
        bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl 
        border border-orange-200/50 dark:border-white/10
        ${hoverEffect 
          ? 'hover:border-orange-400/50 dark:hover:border-primary/40 hover:shadow-xl hover:shadow-orange-200/20 dark:hover:shadow-primary/10' 
          : ''
        }
        transition-all duration-500
        ${className}
      `}
      initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ 
        duration: 0.7, 
        delay,
        ease: [0.25, 0.1, 0.25, 1]
      }}
      whileHover={hoverEffect ? { y: -5, scale: 1.02 } : {}}
    >
      {/* Gradient border effect */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-orange-400/10 via-transparent to-amber-400/10 dark:from-primary/10 dark:via-transparent dark:to-cyan-500/10 opacity-0 hover:opacity-100 transition-opacity duration-500" />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
      
      {/* Shine effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 dark:via-white/3 to-transparent -translate-x-full"
        animate={{ translateX: ['100%', '-100%'] }}
        transition={{ 
          repeat: Infinity, 
          duration: 3,
          ease: "linear",
          repeatDelay: 5
        }}
      />
    </motion.div>
  );
};

export default GlassCard;
