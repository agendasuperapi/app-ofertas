import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hoverEffect?: boolean;
  delay?: number;
}

const GlassCard = ({ 
  children, 
  className = '', 
  hoverEffect = true,
  delay = 0
}: GlassCardProps) => {
  return (
    <motion.div
      className={`
        relative overflow-hidden rounded-2xl
        bg-card/50 backdrop-blur-xl
        border border-border/50
        ${hoverEffect ? 'hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5' : ''}
        transition-all duration-500
        ${className}
      `}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      whileHover={hoverEffect ? { y: -5, scale: 1.02 } : {}}
    >
      {/* Gradient border effect */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/10 via-transparent to-orange-500/10 opacity-0 hover:opacity-100 transition-opacity duration-500" />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
      
      {/* Shine effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full"
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
