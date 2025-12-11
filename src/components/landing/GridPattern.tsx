import { motion } from 'framer-motion';

interface GridPatternProps {
  className?: string;
  variant?: 'light' | 'dark';
}

const GridPattern = ({ className = '', variant = 'dark' }: GridPatternProps) => {
  const isDark = variant === 'dark';
  
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {/* Base gradient - dark theme */}
      <div className={`absolute inset-0 ${isDark ? 'bg-gradient-to-b from-primary/10 via-slate-950 to-slate-950' : 'bg-gradient-to-b from-primary/15 via-orange-100/20 to-transparent md:from-primary/5 md:via-transparent'}`} />
      
      {/* Centralized radial gradient */}
      <div className={`absolute top-0 left-0 right-0 h-[60vh] md:h-[80vh] ${isDark ? 'bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.20),transparent)]' : 'bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.25),transparent)] md:bg-[radial-gradient(ellipse_50%_50%_at_50%_-20%,hsl(var(--primary)/0.12),transparent)]'}`} />
      
      {/* Animated grid - more subtle in dark mode */}
      <div 
        className={`absolute inset-0 ${isDark ? 'opacity-[0.02]' : 'opacity-[0.03]'}`}
        style={{
          backgroundImage: `
            linear-gradient(${isDark ? 'hsl(0 0% 100%)' : 'hsl(var(--foreground))'} 1px, transparent 1px),
            linear-gradient(90deg, ${isDark ? 'hsl(0 0% 100%)' : 'hsl(var(--foreground))'} 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />
      
      {/* Top center orb - primary/orange */}
      <motion.div 
        className={`absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-80 md:w-[600px] md:h-[400px] ${isDark ? 'bg-gradient-to-b from-primary/25 via-orange-500/20 to-transparent' : 'bg-gradient-to-b from-primary/35 via-orange-400/30 to-transparent'} rounded-full blur-[80px] md:blur-[120px]`}
        animate={{ 
          opacity: [0.5, 0.7, 0.5],
          scale: [1, 1.05, 1],
        }}
        transition={{ 
          repeat: Infinity, 
          duration: 5,
          ease: "easeInOut"
        }}
      />
      
      {/* Left orb - cyan accent */}
      <motion.div 
        className={`absolute top-1/4 -left-16 md:-left-32 w-64 h-64 md:w-[500px] md:h-[500px] ${isDark ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/15' : 'bg-gradient-to-r from-primary/40 md:from-primary/30 to-orange-500/30 md:to-orange-500/20'} rounded-full blur-[60px] md:blur-[120px]`}
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
      
      {/* Right orb - primary accent */}
      <motion.div 
        className={`absolute bottom-1/4 -right-16 md:-right-32 w-72 h-72 md:w-[600px] md:h-[600px] ${isDark ? 'bg-gradient-to-l from-primary/20 to-orange-500/15' : 'bg-gradient-to-l from-primary/35 md:from-primary/20 to-purple-500/25 md:to-purple-500/20'} rounded-full blur-[60px] md:blur-[120px]`}
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
      
      {/* Center orb */}
      <motion.div 
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 md:w-[800px] md:h-[800px] ${isDark ? 'bg-gradient-radial from-primary/8 to-transparent' : 'bg-gradient-radial from-primary/15 md:from-primary/10 to-transparent'} rounded-full blur-[60px] md:blur-[100px]`}
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ 
          repeat: Infinity, 
          duration: 6,
          ease: "easeInOut"
        }}
      />
      
      {/* Additional cyan orb for dark mode */}
      {isDark && (
        <motion.div 
          className="absolute top-1/3 right-1/4 w-48 h-48 md:w-[300px] md:h-[300px] bg-gradient-to-br from-cyan-500/15 to-transparent rounded-full blur-[80px]"
          animate={{ 
            scale: [1, 1.15, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ 
            repeat: Infinity, 
            duration: 7,
            ease: "easeInOut",
            delay: 2
          }}
        />
      )}
      
      {/* Floating particles */}
      {[...Array(isDark ? 15 : 12)].map((_, i) => (
        <motion.div
          key={i}
          className={`absolute w-1 h-1 rounded-full ${isDark ? (i % 2 === 0 ? 'bg-primary/50' : 'bg-cyan-500/50') : (i < 8 ? 'bg-primary/60 md:bg-primary/40' : 'hidden md:block bg-primary/40')}`}
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

      {/* Noise texture overlay for dark mode */}
      {isDark && (
        <div 
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
          }}
        />
      )}
    </div>
  );
};

export default GridPattern;
