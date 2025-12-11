import { motion } from 'framer-motion';

interface IPhoneMockupProps {
  className?: string;
}

const IPhoneMockup = ({ className = '' }: IPhoneMockupProps) => {
  return (
    <motion.div 
      className={`relative ${className}`}
      initial={{ opacity: 0, x: 50 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
      animate={{ y: [0, -10, 0] }}
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
      >
        {/* iPhone Frame */}
        <div className="relative bg-gradient-to-b from-zinc-800 to-zinc-900 rounded-[2.5rem] p-2 shadow-2xl">
          {/* Side buttons */}
          <div className="absolute -left-0.5 top-24 w-0.5 h-8 bg-zinc-700 rounded-l" />
          <div className="absolute -left-0.5 top-36 w-0.5 h-12 bg-zinc-700 rounded-l" />
          <div className="absolute -left-0.5 top-52 w-0.5 h-12 bg-zinc-700 rounded-l" />
          <div className="absolute -right-0.5 top-32 w-0.5 h-16 bg-zinc-700 rounded-r" />
          
          {/* Screen */}
          <div className="bg-black rounded-[2rem] overflow-hidden relative">
            {/* Dynamic Island */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-10 flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-zinc-800" />
              <div className="w-3 h-3 rounded-full bg-zinc-800 border border-zinc-700" />
            </div>
            
            {/* Screen content - Store mobile view */}
            <div className="aspect-[9/19] bg-gradient-to-br from-background to-muted relative pt-10">
              {/* Store header */}
              <div className="px-3 py-2">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-orange-500 shadow-lg" />
                    <div>
                      <div className="w-16 h-2 bg-foreground/30 rounded mb-1" />
                      <div className="w-12 h-1.5 bg-muted-foreground/30 rounded" />
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                    <div className="w-3 h-3 rounded bg-primary/50" />
                  </div>
                </div>
                
                {/* Search bar */}
                <div className="bg-muted/50 rounded-full px-3 py-1.5 flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
                  <div className="w-20 h-1.5 bg-muted-foreground/30 rounded" />
                </div>
                
                {/* Category pills */}
                <div className="flex gap-1.5 mb-3 overflow-hidden">
                  {['Todos', 'Pratos', 'Bebidas', 'Sobremesas'].map((cat, i) => (
                    <motion.div
                      key={cat}
                      className={`px-2 py-1 rounded-full text-[6px] whitespace-nowrap ${
                        i === 0 
                          ? 'bg-gradient-to-r from-primary to-orange-500 text-white' 
                          : 'bg-muted text-muted-foreground'
                      }`}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.6 + i * 0.1 }}
                    >
                      {cat}
                    </motion.div>
                  ))}
                </div>
              </div>
              
              {/* Products grid */}
              <div className="px-3 grid grid-cols-2 gap-2">
                {[1, 2, 3, 4].map((_, i) => (
                  <motion.div
                    key={i}
                    className="bg-card rounded-xl overflow-hidden shadow-sm border border-border/30"
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.8 + i * 0.1 }}
                  >
                    <div className="aspect-square bg-gradient-to-br from-muted to-muted/50 relative">
                      <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500/80 flex items-center justify-center">
                        <span className="text-[5px] text-white font-bold">-20%</span>
                      </div>
                    </div>
                    <div className="p-1.5">
                      <div className="w-full h-1.5 bg-foreground/20 rounded mb-1" />
                      <div className="flex items-center justify-between">
                        <div className="text-[7px] font-bold text-primary">R$ 29,90</div>
                        <div className="w-4 h-4 rounded-full bg-gradient-to-r from-primary to-orange-500 flex items-center justify-center">
                          <span className="text-[6px] text-white">+</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              
              {/* Bottom nav */}
              <div className="absolute bottom-0 left-0 right-0 bg-card/90 backdrop-blur-sm border-t border-border/30 px-4 py-2">
                <div className="flex justify-around items-center">
                  {[true, false, false, false].map((active, i) => (
                    <div key={i} className={`w-5 h-5 rounded-lg ${active ? 'bg-gradient-to-r from-primary to-orange-500' : 'bg-muted'}`} />
                  ))}
                </div>
              </div>
              
              {/* Reflection */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            </div>
          </div>
        </div>
        
        {/* Glow effect */}
        <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-orange-500/20 blur-2xl rounded-full -z-10" />
        
        {/* Shadow */}
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-2/3 h-6 bg-black/30 blur-xl rounded-full" />
      </motion.div>
    </motion.div>
  );
};

export default IPhoneMockup;
