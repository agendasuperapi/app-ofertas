import { motion } from 'framer-motion';

interface MacBookMockupProps {
  className?: string;
}

const MacBookMockup = ({ className = '' }: MacBookMockupProps) => {
  return (
    <motion.div 
      className={`relative ${className}`}
      initial={{ opacity: 0, x: -50, rotateY: 15 }}
      whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      style={{ perspective: '1000px' }}
    >
      {/* MacBook Frame */}
      <div className="relative">
        {/* Screen */}
        <div className="bg-gradient-to-b from-zinc-800 to-zinc-900 rounded-t-xl p-2 shadow-2xl">
          {/* Camera notch */}
          <div className="flex justify-center mb-1">
            <div className="w-2 h-2 rounded-full bg-zinc-700 shadow-inner" />
          </div>
          
          {/* Screen content */}
          <div className="bg-gradient-to-br from-zinc-900 to-black rounded-lg overflow-hidden aspect-[16/10] relative">
            {/* Dashboard mockup content */}
            <div className="absolute inset-0 p-3 bg-gradient-to-br from-background to-muted">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary to-orange-500" />
                  <div className="w-16 h-2 bg-foreground/20 rounded" />
                </div>
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                </div>
              </div>
              
              {/* Stats cards */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[
                  { value: 'R$ 2.450', label: 'Vendas', color: 'from-primary to-orange-500' },
                  { value: '48', label: 'Pedidos', color: 'from-blue-500 to-cyan-500' },
                  { value: '156', label: 'Clientes', color: 'from-green-500 to-emerald-500' },
                  { value: '98%', label: 'Satisfação', color: 'from-purple-500 to-pink-500' },
                ].map((stat, i) => (
                  <motion.div 
                    key={i}
                    className="bg-card rounded-lg p-2 shadow-sm border border-border/50"
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                  >
                    <div className={`text-[8px] font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                      {stat.value}
                    </div>
                    <div className="text-[6px] text-muted-foreground">{stat.label}</div>
                  </motion.div>
                ))}
              </div>
              
              {/* Chart area */}
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 bg-card rounded-lg p-2 border border-border/50">
                  <div className="text-[7px] font-medium mb-2">Vendas da Semana</div>
                  <div className="flex items-end gap-1 h-12">
                    {[40, 65, 45, 80, 55, 90, 75].map((height, i) => (
                      <motion.div
                        key={i}
                        className="flex-1 bg-gradient-to-t from-primary to-orange-500 rounded-t"
                        initial={{ height: 0 }}
                        whileInView={{ height: `${height}%` }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.8 + i * 0.05, duration: 0.5 }}
                      />
                    ))}
                  </div>
                </div>
                
                <div className="bg-card rounded-lg p-2 border border-border/50">
                  <div className="text-[7px] font-medium mb-2">Pedidos Recentes</div>
                  <div className="space-y-1">
                    {[1, 2, 3].map((_, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded-full bg-gradient-to-br from-primary/20 to-orange-500/20" />
                        <div className="flex-1">
                          <div className="w-full h-1.5 bg-muted rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Reflection effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
          </div>
        </div>
        
        {/* Bottom bezel */}
        <div className="bg-gradient-to-b from-zinc-700 to-zinc-800 h-3 rounded-b-lg flex justify-center items-center">
          <div className="w-12 h-1 bg-zinc-600 rounded-full" />
        </div>
        
        {/* Base */}
        <div className="relative mx-auto">
          <div className="bg-gradient-to-b from-zinc-700 to-zinc-800 h-2 w-32 mx-auto rounded-b" />
          <div className="bg-gradient-to-b from-zinc-600 to-zinc-700 h-1 w-48 mx-auto rounded-b-xl shadow-lg" />
        </div>
        
        {/* Shadow */}
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-4 bg-black/20 blur-xl rounded-full" />
      </div>
    </motion.div>
  );
};

export default MacBookMockup;
