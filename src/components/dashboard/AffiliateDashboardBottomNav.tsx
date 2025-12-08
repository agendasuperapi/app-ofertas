import { Home, Store, ShoppingBag, BarChart3, User } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AffiliateDashboardBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: "home", label: "Início", icon: Home },
  { id: "stores", label: "Lojas", icon: Store },
  { id: "orders", label: "Pedidos", icon: ShoppingBag },
  { id: "commissions", label: "Comissões", icon: BarChart3 },
  { id: "profile", label: "Perfil", icon: User },
];

export function AffiliateDashboardBottomNav({
  activeTab,
  onTabChange,
}: AffiliateDashboardBottomNavProps) {
  const handleClick = (tabId: string) => {
    onTabChange(tabId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      {/* Barra de navegação flutuante */}
      <motion.nav
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="md:hidden fixed bottom-4 left-4 right-4 z-50"
      >
        <div className="bg-background/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
          <div className="grid grid-cols-5 h-16 px-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;

              return (
                <motion.button
                  key={item.id}
                  onClick={() => handleClick(item.id)}
                  whileTap={{ scale: 0.9 }}
                  className="flex flex-col items-center justify-center gap-1 relative py-2"
                >
                  {/* Pill de fundo ativo */}
                  {isActive && (
                    <motion.div
                      layoutId="affiliate-bottom-nav-pill"
                      className="absolute inset-1.5 bg-primary/10 rounded-xl"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}

                  {/* Ícone com animação */}
                  <motion.div
                    animate={{
                      scale: isActive ? 1.1 : 1,
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    className="relative z-10"
                  >
                    <Icon 
                      className={cn(
                        "w-5 h-5 transition-all duration-200",
                        isActive 
                          ? "text-primary stroke-[2.5]" 
                          : "text-muted-foreground"
                      )} 
                    />
                  </motion.div>

                  {/* Label */}
                  <span 
                    className={cn(
                      "text-[10px] font-medium transition-all duration-200 z-10",
                      isActive 
                        ? "text-primary font-semibold" 
                        : "text-muted-foreground"
                    )}
                  >
                    {item.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Safe area inset para iOS */}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </motion.nav>

      {/* Spacer para evitar sobreposição de conteúdo */}
      <div className="md:hidden h-24" />
    </>
  );
}
