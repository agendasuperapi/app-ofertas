import { motion } from 'framer-motion';

interface GridPatternProps {
  className?: string;
  variant?: 'light' | 'dark' | 'neutral-dark';
}

const GridPattern = ({ className = '', variant = 'dark' }: GridPatternProps) => {
  const isDark = variant === 'dark' || variant === 'neutral-dark';
  const isNeutralDark = variant === 'neutral-dark';
  const isLight = variant === 'light';
  
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {/* Base gradient */}
      <div className={`absolute inset-0 ${
        isLight 
          ? 'bg-gradient-to-b from-primary/5 via-background to-background' 
          : isNeutralDark 
            ? 'bg-gradient-to-b from-cyan-500/5 via-slate-950 to-slate-950' 
            : 'bg-gradient-to-b from-primary/10 via-slate-950 to-slate-950'
      }`} />
      
      {/* Centralized radial gradient */}
      <div className={`absolute top-0 left-0 right-0 h-[60vh] md:h-[80vh] ${
        isLight
          ? 'bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.15),transparent)]'
          : isNeutralDark 
            ? 'bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(190_80%_50%/0.15),transparent)]' 
            : 'bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.20),transparent)]'
      }`} />
      
      {/* Animated grid */}
      <div 
        className={`absolute inset-0 ${isDark ? 'opacity-[0.02]' : 'opacity-[0.04]'}`}
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />
      
      {/* Top center orb */}
      <motion.div 
        className={`absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-80 md:w-[600px] md:h-[400px] ${
          isLight
            ? 'bg-gradient-to-b from-primary/20 via-primary/10 to-transparent'
            : isNeutralDark 
              ? 'bg-gradient-to-b from-cyan-500/20 via-blue-500/15 to-transparent' 
              : 'bg-gradient-to-b from-primary/25 via-orange-500/20 to-transparent'
        } rounded-full blur-[80px] md:blur-[120px]`}
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
      
      {/* Left orb */}
      <motion.div 
        className={`absolute top-1/4 -left-16 md:-left-32 w-64 h-64 md:w-[500px] md:h-[500px] ${
          isLight
            ? 'bg-gradient-to-r from-primary/15 to-orange-400/10'
            : 'bg-gradient-to-r from-cyan-500/20 to-blue-500/15'
        } rounded-full blur-[60px] md:blur-[120px]`}
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
      
      {/* Right orb */}
      <motion.div 
        className={`absolute bottom-1/4 -right-16 md:-right-32 w-72 h-72 md:w-[600px] md:h-[600px] ${
          isLight
            ? 'bg-gradient-to-l from-primary/15 to-purple-400/10'
            : isNeutralDark 
              ? 'bg-gradient-to-l from-blue-500/20 to-indigo-500/15' 
              : 'bg-gradient-to-l from-primary/20 to-orange-500/15'
        } rounded-full blur-[60px] md:blur-[120px]`}
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
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 md:w-[800px] md:h-[800px] ${
          isLight
            ? 'bg-gradient-radial from-primary/8 to-transparent'
            : isNeutralDark 
              ? 'bg-gradient-radial from-cyan-500/8 to-transparent' 
              : 'bg-gradient-radial from-primary/8 to-transparent'
        } rounded-full blur-[60px] md:blur-[100px]`}
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
          className={`absolute w-1 h-1 rounded-full ${
            isLight
              ? 'bg-primary/40'
              : i % 2 === 0 
                ? (isNeutralDark ? 'bg-cyan-400/50' : 'bg-primary/50') 
                : 'bg-cyan-500/50'
          }`}
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
