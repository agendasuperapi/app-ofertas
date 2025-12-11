import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface BentoItem {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
  featured?: boolean;
  gradient?: string;
}

interface BentoGridProps {
  items: BentoItem[];
  variant?: 'light' | 'dark';
}

const BentoGrid = ({ items, variant = 'dark' }: BentoGridProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[180px]">
      {items.map((item, index) => {
        const Icon = item.icon;
        const isFeatured = item.featured || index === 0 || index === 3;
        
        return (
          <motion.div
            key={index}
            className={`
              group relative overflow-hidden rounded-2xl p-6
              bg-white/90 dark:bg-slate-900/60 backdrop-blur-xl 
              border border-gray-200/60 dark:border-white/10 
              hover:border-gray-300/80 dark:hover:border-primary/40 
              hover:shadow-2xl hover:shadow-gray-200/30 dark:hover:shadow-primary/10
              transition-all duration-500 cursor-pointer
              ${isFeatured ? 'md:col-span-2 md:row-span-2' : ''}
              ${item.className || ''}
            `}
            initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
            whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ 
              delay: index * 0.08, 
              duration: 0.7,
              ease: [0.25, 0.1, 0.25, 1]
            }}
            whileHover={{ y: -5 }}
          >
            {/* Background gradient */}
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${item.gradient || 'bg-gradient-to-br from-gray-200/10 to-gray-100/5 dark:from-primary/10 dark:to-cyan-500/5'}`} />
            
            {/* Glow effect */}
            <div className="absolute -inset-px bg-gradient-to-r from-gray-300/20 via-transparent to-gray-300/20 dark:from-primary/20 dark:via-transparent dark:to-cyan-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity blur-sm" />
            
            {/* Content */}
            <div className="relative z-10 h-full flex flex-col">
              {/* Icon */}
              <motion.div
                className={`
                  ${isFeatured ? 'w-16 h-16' : 'w-12 h-12'} 
                  rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 dark:from-primary dark:to-cyan-500
                  flex items-center justify-center mb-4
                  shadow-lg shadow-orange-400/20 dark:shadow-primary/30
                  group-hover:scale-110 transition-transform duration-500
                `}
                whileHover={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.5 }}
              >
                <Icon className={`${isFeatured ? 'h-8 w-8' : 'h-6 w-6'} text-white`} />
              </motion.div>
              
              {/* Text */}
              <div className="flex-1 flex flex-col">
                <h3 className={`font-bold mb-2 group-hover:text-orange-500 dark:group-hover:text-primary transition-colors ${isFeatured ? 'text-xl' : 'text-lg'} text-slate-900 dark:text-white`}>
                  {item.title}
                </h3>
                <p className={`text-slate-600 dark:text-slate-400 ${isFeatured ? 'text-base' : 'text-sm'} line-clamp-3`}>
                  {item.description}
                </p>
              </div>
              
              {/* Arrow indicator for featured */}
              {isFeatured && (
                <motion.div 
                  className="absolute bottom-6 right-6 w-10 h-10 rounded-full bg-gray-100 dark:bg-primary/20 flex items-center justify-center group-hover:bg-gray-200 dark:group-hover:bg-primary/30 transition-colors"
                  whileHover={{ scale: 1.1 }}
                >
                  <svg className="w-5 h-5 text-orange-500 dark:text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </motion.div>
              )}
            </div>
            
            {/* Decorative elements for featured cards */}
            {isFeatured && (
              <>
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-gray-300/15 dark:from-primary/15 to-transparent rounded-bl-full opacity-50" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-gray-300/15 dark:from-cyan-500/15 to-transparent rounded-tr-full opacity-50" />
              </>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};

export default BentoGrid;
