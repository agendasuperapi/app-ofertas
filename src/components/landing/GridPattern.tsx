import { motion } from 'framer-motion';

interface GridPatternProps {
  className?: string;
}

const GridPattern = ({ className = '' }: GridPatternProps) => {
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {/* Base gradient - stronger on mobile */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/15 via-orange-100/20 to-transparent md:from-primary/5 md:via-transparent" />
      
      {/* Centralized radial gradient - more visible on mobile */}
      <div className="absolute top-0 left-0 right-0 h-[60vh] md:h-[80vh] bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.25),transparent)] md:bg-[radial-gradient(ellipse_50%_50%_at_50%_-20%,hsl(var(--primary)/0.12),transparent)]" />
      
      {/* Animated grid */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />
      
      {/* Top center orb - mobile focused */}
      <motion.div 
        className="absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-80 md:w-[600px] md:h-[400px] bg-gradient-to-b from-primary/35 via-orange-400/30 to-transparent rounded-full blur-[80px] md:blur-[120px]"
        animate={{ 
          opacity: [0.6, 0.8, 0.6],
          scale: [1, 1.05, 1],
        }}
        transition={{ 
          repeat: Infinity, 
          duration: 5,
          ease: "easeInOut"
        }}
      />
      
      {/* Left orb - responsive */}
      <motion.div 
        className="absolute top-1/4 -left-16 md:-left-32 w-64 h-64 md:w-[500px] md:h-[500px] bg-gradient-to-r from-primary/40 md:from-primary/30 to-orange-500/30 md:to-orange-500/20 rounded-full blur-[60px] md:blur-[120px]"
        animate={{ 
          x: [0, 30, 0],
          y: [0, 20, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{ 
          repeat: Infinity, 
          duration: 8,
          ease: "easeInOut"
        }}
      />
      
      {/* Right orb - responsive */}
      <motion.div 
        className="absolute bottom-1/4 -right-16 md:-right-32 w-72 h-72 md:w-[600px] md:h-[600px] bg-gradient-to-l from-primary/35 md:from-primary/20 to-purple-500/25 md:to-purple-500/20 rounded-full blur-[60px] md:blur-[120px]"
        animate={{ 
          x: [0, -25, 0],
          y: [0, -25, 0],
          scale: [1.1, 1, 1.1],
        }}
        transition={{ 
          repeat: Infinity, 
          duration: 10,
          ease: "easeInOut",
          delay: 1
        }}
      />
      
      {/* Center orb - responsive */}
      <motion.div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 md:w-[800px] md:h-[800px] bg-gradient-radial from-primary/15 md:from-primary/10 to-transparent rounded-full blur-[60px] md:blur-[100px]"
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.4, 0.6, 0.4],
        }}
        transition={{ 
          repeat: Infinity, 
          duration: 6,
          ease: "easeInOut"
        }}
      />
      
      {/* Floating particles - fewer on mobile, more visible */}
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          className={`absolute w-1 h-1 rounded-full ${i < 8 ? 'bg-primary/60 md:bg-primary/40' : 'hidden md:block bg-primary/40'}`}
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.3, 0.9, 0.3],
          }}
          transition={{
            repeat: Infinity,
            duration: 3 + Math.random() * 2,
            delay: Math.random() * 2,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );
};

export default GridPattern;
