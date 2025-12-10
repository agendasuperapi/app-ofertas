import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Package, TrendingUp, Menu, Home, Users, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DashboardBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onMenuClick: () => void;
  onSignOut?: () => void;
  pendingOrdersCount?: number;
}

export const DashboardBottomNav = ({ activeTab, onTabChange, onMenuClick, onSignOut, pendingOrdersCount = 0 }: DashboardBottomNavProps) => {
  const [showRelatoriosMenu, setShowRelatoriosMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const relatoriosButtonRef = useRef<HTMLButtonElement>(null);

  const navItems = [
    { id: "home", label: "Início", icon: Home },
    { id: "produtos", label: "Produtos", icon: Package },
    { id: "pedidos", label: "Pedidos", icon: ShoppingBag },
    { id: "relatorios", label: "Relatórios", icon: TrendingUp, isRelatorios: true },
    { id: "menu", label: "Menu", icon: Menu, isMenu: true },
  ];

  const relatoriosSubmenus = [
    { id: "relatorio-clientes", label: "Clientes", icon: Users },
    { id: "relatorio-produtos-vendidos", label: "Mais Vendidos", icon: TrendingUp },
    { id: "relatorio-produtos-cadastrados", label: "Produtos", icon: Package },
    { id: "relatorio-pedidos", label: "Pedidos", icon: ShoppingBag },
  ];

  const handleClick = (item: typeof navItems[0]) => {
    if ((item as any).isLogout) {
      setShowLogoutConfirm(true);
    } else if (item.isMenu) {
      onMenuClick();
    } else if (item.isRelatorios) {
      setShowRelatoriosMenu(!showRelatoriosMenu);
    } else {
      onTabChange(item.id);
    }
  };

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    onSignOut?.();
  };

  const handleRelatorioClick = (id: string) => {
    onTabChange(id);
    setShowRelatoriosMenu(false);
  };

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (relatoriosButtonRef.current && !relatoriosButtonRef.current.contains(event.target as Node)) {
        setShowRelatoriosMenu(false);
      }
    };

    if (showRelatoriosMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showRelatoriosMenu]);

  const gridCols = "grid-cols-5";

  return (
    <>
      {/* Dialog de confirmação de logout */}
      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-destructive/10">
                <LogOut className="w-5 h-5 text-destructive" />
              </div>
              Sair da conta
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja sair? Você precisará fazer login novamente para acessar o painel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2 sm:gap-0">
            <AlertDialogCancel className="flex-1 sm:flex-none mt-0">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmLogout}
              className="flex-1 sm:flex-none bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Sair
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Menu popup de Relatórios */}
      <AnimatePresence>
        {showRelatoriosMenu && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] w-[85vw] max-w-xs"
          >
            <div className="bg-background/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
              {relatoriosSubmenus.map((submenu, index) => {
                const SubmenuIcon = submenu.icon;
                const isActive = activeTab === submenu.id;
                
                return (
                  <motion.button
                    key={submenu.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleRelatorioClick(submenu.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3.5 transition-all duration-200",
                      "hover:bg-muted/50 active:bg-muted",
                      isActive && "bg-primary/10",
                      index !== relatoriosSubmenus.length - 1 && "border-b border-border/50"
                    )}
                  >
                    <div className={cn(
                      "p-2 rounded-xl transition-all",
                      isActive ? "bg-primary/15 text-primary" : "bg-muted/50 text-muted-foreground"
                    )}>
                      <SubmenuIcon className="w-4 h-4" />
                    </div>
                    <span className={cn(
                      "text-sm font-medium",
                      isActive && "text-primary"
                    )}>{submenu.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Barra de navegação flutuante */}
      <motion.nav
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="fixed bottom-4 left-4 right-4 z-50"
      >
        <div className="bg-background/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
          <div className={cn("grid h-16 px-1", gridCols)}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id || 
                (item.isRelatorios && activeTab.startsWith("relatorio-"));
              const isSpecialItem = item.isMenu || item.isRelatorios || (item as any).isLogout;
              const isLogout = (item as any).isLogout;

              return (
                <motion.button
                  key={item.id}
                  ref={item.isRelatorios ? relatoriosButtonRef : null}
                  onClick={() => handleClick(item)}
                  whileTap={{ scale: 0.9 }}
                  className="flex flex-col items-center justify-center gap-1 relative py-2"
                >
                  {/* Pill de fundo ativo */}
                  {isActive && !item.isMenu && !isLogout && (
                    <motion.div
                      layoutId="activeTabPill"
                      className="absolute inset-1.5 bg-primary/10 rounded-xl"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}

                  {/* Ícone com animação e badge */}
                  <motion.div
                    animate={{
                      scale: isActive && !item.isMenu && !isLogout ? 1.1 : 1,
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    className="relative z-10"
                  >
                    <Icon 
                      className={cn(
                        "w-5 h-5 transition-all duration-200",
                        isLogout 
                          ? "text-destructive" 
                          : isActive && !item.isMenu 
                            ? "text-primary stroke-[2.5]" 
                            : "text-muted-foreground"
                      )} 
                    />
                    
                    {/* Badge de contagem de pedidos */}
                    {item.id === "pedidos" && pendingOrdersCount > 0 && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 25 }}
                        className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] flex items-center justify-center bg-gradient-to-r from-destructive to-red-500 text-destructive-foreground text-[10px] font-bold rounded-full px-1 shadow-lg ring-2 ring-background"
                      >
                        <motion.span
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          {pendingOrdersCount > 99 ? "99+" : pendingOrdersCount}
                        </motion.span>
                      </motion.div>
                    )}
                  </motion.div>

                  {/* Label */}
                  <span 
                    className={cn(
                      "text-[10px] font-medium transition-all duration-200 z-10",
                      isLogout 
                        ? "text-destructive font-semibold" 
                        : isActive && !item.isMenu 
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
      <div className="h-24" />
    </>
  );
};
