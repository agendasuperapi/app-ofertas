import { Home, Store, ShoppingBag, BarChart3, User } from "lucide-react";
import { motion } from "framer-motion";

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
      <motion.nav
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border/50 shadow-lg"
      >
        <div className="grid grid-cols-5 h-16">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => handleClick(item.id)}
                className={`
                  relative flex flex-col items-center justify-center gap-1 py-2
                  transition-all duration-200
                  ${isActive 
                    ? "text-primary" 
                    : "text-muted-foreground"
                  }
                `}
              >
                {isActive && (
                  <motion.div
                    layoutId="affiliate-bottom-nav-active"
                    className="absolute top-1 left-1/2 -translate-x-1/2 w-10 h-1 bg-primary rounded-full"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <Icon className={`h-5 w-5 ${isActive ? "text-primary" : ""}`} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Safe area inset for iOS */}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </motion.nav>

      {/* Spacer to prevent content overlap */}
      <div className="md:hidden h-20" />
    </>
  );
}
