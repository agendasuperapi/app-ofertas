import { Home, BarChart3, MessageSquare, Mail, Bell, Settings, FolderOpen, ChevronDown, Package, FolderTree, Users, UserCog, Truck, MapPin, Bike, Tag, TrendingUp, DollarSign, ShoppingCart, Calendar, FileBarChart, FileText, LogOut, UserPlus, Wallet, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { EmployeePermissions } from "@/hooks/useStoreEmployees";
import { Badge } from "@/components/ui/badge";
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

interface DashboardSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  storeLogo?: string;
  storeName?: string;
  isEmployee?: boolean;
  employeePermissions?: EmployeePermissions | null;
  onSignOut?: () => void;
}

export const DashboardSidebar = ({ activeTab, onTabChange, storeLogo, storeName, isEmployee, employeePermissions, onSignOut }: DashboardSidebarProps) => {
  const [cadastrosOpen, setCadastrosOpen] = useState(false);
  const [relatoriosOpen, setRelatoriosOpen] = useState(false);
  const [afiliadosOpen, setAfiliadosOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    onSignOut?.();
  };

  const handleTabChange = (tab: string) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    onTabChange(tab);
  };

  // Função para verificar se o funcionário tem permissão
  const hasPermission = (module: string, action: string = 'view'): boolean => {
    if (!isEmployee || !employeePermissions) return true; // Donos de loja veem tudo
    
    const modulePermissions = (employeePermissions as any)[module];
    if (!modulePermissions) return false;
    
    return modulePermissions[action] === true;
  };

  const cadastrosSubItems = [
    ...(hasPermission('products', 'view') 
      ? [{ id: 'produtos', label: 'produtos', icon: Package }] 
      : []),
    ...(hasPermission('coupons', 'view') 
      ? [{ id: 'cupons', label: 'cupons', icon: Tag }] 
      : []),
    // Funcionários só são visíveis para donos de loja
    ...(!isEmployee ? [{ id: 'funcionarios', label: 'funcionários', icon: UserCog }] : []),
  ];

  const relatoriosSubItems = [
    ...(hasPermission('reports') ? [{ id: 'relatorio-clientes', label: 'clientes', icon: Users }] : []),
    ...(hasPermission('reports') ? [{ id: 'relatorio-produtos-vendidos', label: 'mais vendidos', icon: TrendingUp }] : []),
    ...(hasPermission('reports') ? [{ id: 'relatorio-produtos-cadastrados', label: 'produtos', icon: Package }] : []),
    ...(hasPermission('reports') ? [{ id: 'relatorio-pedidos', label: 'pedidos', icon: ShoppingCart }] : []),
  ];

  const afiliadosSubItems = [
    { id: 'afiliados', label: 'cadastro', icon: UserPlus },
    { id: 'afiliados-saques', label: 'saques', icon: Wallet },
    { id: 'afiliados-relatorios', label: 'relatórios', icon: FileBarChart },
    { id: 'afiliados-auditoria', label: 'auditoria', icon: History },
  ];
  
  console.log('[DashboardSidebar] Cadastros SubItems:', {
    products: hasPermission('products', 'view'),
    coupons: hasPermission('coupons', 'view'),
    categories: hasPermission('categories', 'view'),
    isEmployee,
    cadastrosSubItems: cadastrosSubItems.map(i => i.id),
    employeePermissions
  });

  const menuItems = [
    { id: 'home', label: 'home', icon: Home, show: true },
    ...(hasPermission('reports') ? [{ id: 'metricas', label: 'métricas', icon: TrendingUp, show: true }] : []),
    ...(hasPermission('orders') ? [{ id: 'pedidos', label: 'pedidos', icon: ShoppingCart, show: true }] : []),
    ...(relatoriosSubItems.length > 0 ? [{ id: 'relatorios', label: 'relatórios', icon: FileBarChart, hasSubmenu: true, show: true }] : []),
    ...(cadastrosSubItems.length > 0 ? [{ id: 'cadastros', label: 'cadastros', icon: FolderOpen, hasSubmenu: true, show: true }] : []),
    ...(hasPermission('affiliates', 'enabled') ? [{ id: 'afiliados-menu', label: 'afiliados', icon: UserPlus, hasSubmenu: true, show: true }] : []),
    ...(hasPermission('settings', 'manage_whatsapp') ? [{ id: 'whatsapp', label: 'whatsapp', icon: MessageSquare, show: true }] : []),
    ...(hasPermission('settings') ? [{ id: 'result', label: 'configurações', icon: Settings, show: true }] : []),
  ].filter(item => item.show);

  return (
    <motion.div
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="hidden md:flex w-[120px] bg-gray-50 dark:bg-gray-900 backdrop-blur-xl border-2 border-gray-300 dark:border-gray-700 h-full flex-col items-center pt-6 pb-2 shadow-lg overflow-hidden"
    >
      <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mb-2 border border-primary/20 overflow-hidden flex-shrink-0">
        {storeLogo ? (
          <img 
            src={storeLogo} 
            alt={storeName || 'Logo da loja'} 
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-primary font-bold text-2xl">U</span>
        )}
      </div>
      
      {isEmployee && (
        <Badge variant="secondary" className="mb-2 text-[10px] px-2 py-0.5">
          Funcionário
        </Badge>
      )}

      <nav className="flex-1 w-full space-y-0 px-2 overflow-y-auto overflow-x-hidden min-h-0 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
        if (item.hasSubmenu) {
            const isOpen = item.id === 'cadastros' ? cadastrosOpen : item.id === 'afiliados-menu' ? afiliadosOpen : relatoriosOpen;
            const setOpen = (open: boolean) => {
              if (open) {
                // Fechar todos os outros menus ao abrir um
                setCadastrosOpen(item.id === 'cadastros');
                setAfiliadosOpen(item.id === 'afiliados-menu');
                setRelatoriosOpen(item.id === 'relatorios');
              } else {
                // Apenas fechar o menu atual
                if (item.id === 'cadastros') setCadastrosOpen(false);
                else if (item.id === 'afiliados-menu') setAfiliadosOpen(false);
                else setRelatoriosOpen(false);
              }
            };
            const subItems = item.id === 'cadastros' ? cadastrosSubItems : item.id === 'afiliados-menu' ? afiliadosSubItems : relatoriosSubItems;
            
            return (
              <div key={item.id}>
                {index > 0 && <div className="h-px bg-primary/20 my-1 mx-1" />}
                <Collapsible 
                  open={isOpen} 
                  onOpenChange={setOpen}
                >
                <CollapsibleTrigger asChild>
                  <motion.button
                    whileHover={{ scale: 1.03, y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    className={cn(
                      "w-full flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-xl relative transition-all duration-300",
                      isOpen
                        ? "bg-gradient-to-br from-primary/20 via-primary/15 to-primary/10 text-primary shadow-md border border-primary/20" 
                        : "text-foreground hover:bg-muted/60 hover:text-foreground hover:shadow-sm"
                    )}
                  >
                    {isOpen && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-gradient-to-b from-primary to-primary/70 rounded-r-full shadow-lg"
                        initial={false}
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <Icon className={cn(
                      "w-5 h-5 relative z-10 transition-all duration-300",
                      isOpen && "drop-shadow-[0_0_6px_rgba(var(--primary),0.4)] text-primary"
                    )} />
                    <span className={cn(
                      "text-[11px] relative z-10 transition-all duration-300 font-semibold uppercase leading-tight tracking-wide",
                      isOpen && "font-bold"
                    )}>
                      {item.label}
                    </span>
                    <ChevronDown className={cn(
                      "w-3 h-3 transition-transform duration-300",
                      isOpen && "rotate-180"
                    )} />
                  </motion.button>
                </CollapsibleTrigger>
                
                <CollapsibleContent className="mt-1 space-y-0.5">
                  <AnimatePresence>
                    {subItems.map((subItem) => {
                      const SubIcon = subItem.icon;
                      const isSubActive = activeTab === subItem.id;
                      
                      return (
                        <motion.button
                          key={subItem.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          onClick={() => handleTabChange(subItem.id)}
                          whileHover={{ scale: 1.02, x: 3, backgroundColor: "hsl(var(--primary) / 0.1)" }}
                          whileTap={{ scale: 0.94, backgroundColor: "hsl(var(--primary) / 0.2)" }}
                          className={cn(
                            "w-full flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg relative transition-all duration-200",
                            isSubActive 
                              ? "bg-primary/15 text-primary border border-primary/25 shadow-sm" 
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <SubIcon className={cn(
                            "w-4 h-4 relative z-10 transition-colors",
                            isSubActive ? "text-primary" : "text-muted-foreground/80"
                          )} />
                          <span className={cn(
                            "text-[10px] relative z-10 transition-colors text-center leading-tight uppercase tracking-wide",
                            isSubActive ? "font-semibold text-primary" : "font-medium"
                          )}>
                            {subItem.label}
                          </span>
                        </motion.button>
                      );
                    })}
                  </AnimatePresence>
                </CollapsibleContent>
              </Collapsible>
              </div>
            );
          }
          
          return (
            <div key={item.id}>
              {index > 0 && <div className="h-px bg-primary/20 my-1 mx-1" />}
              <motion.button
              onClick={() => handleTabChange(item.id)}
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
              className={cn(
                "w-full flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-xl relative transition-all duration-300",
                isActive 
                  ? "bg-gradient-to-br from-primary/20 via-primary/15 to-primary/10 text-primary shadow-md border border-primary/20" 
                  : "text-foreground hover:bg-muted/60 hover:text-foreground hover:shadow-sm"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-gradient-to-b from-primary to-primary/70 rounded-r-full shadow-lg"
                  initial={false}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <Icon className={cn(
                "w-5 h-5 relative z-10 transition-all duration-300",
                isActive && "drop-shadow-[0_0_6px_rgba(var(--primary),0.4)] text-primary"
              )} />
              <span className={cn(
                "text-[11px] relative z-10 transition-all duration-300 font-semibold uppercase leading-tight tracking-wide",
                isActive && "font-bold"
              )}>
                {item.label}
              </span>
            </motion.button>
            </div>
          );
        })}
      </nav>

      {/* Botão Sair - fixo na parte inferior */}
      {onSignOut && (
        <div className="px-2 pb-4 pt-2 mt-auto flex-shrink-0 w-full">
          <div className="h-px bg-primary/20 mb-2" />
          <motion.button
            onClick={() => setShowLogoutConfirm(true)}
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            className="w-full flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-xl text-destructive hover:bg-destructive/10 transition-all duration-300"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-[11px] font-semibold uppercase tracking-wide">
              sair
            </span>
          </motion.button>
        </div>
      )}

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
    </motion.div>
  );
};
