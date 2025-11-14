import { Home, ShoppingCart, Menu as MenuIcon, TrendingUp, Settings, FolderOpen, FileBarChart, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { motion } from "framer-motion";

interface DashboardMobileNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  ordersCount?: number;
  isEmployee?: boolean;
  hasPermission?: (module: string, action?: string) => boolean;
}

export const DashboardMobileNav = ({ 
  activeTab, 
  onTabChange, 
  ordersCount = 0,
  isEmployee = false,
  hasPermission = () => true
}: DashboardMobileNavProps) => {
  const isActive = (tab: string) => activeTab === tab;

  return (
    <motion.nav
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border/50 shadow-lg"
    >
      <div className="flex items-center justify-around px-2 py-3">
        {/* Home */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onTabChange('home')}
          className={`flex flex-col items-center gap-1 h-auto py-2 px-3 ${
            isActive('home') ? 'text-primary bg-primary/10' : 'text-muted-foreground'
          }`}
        >
          <Home className="h-5 w-5" />
          <span className="text-xs">Home</span>
        </Button>

        {/* Pedidos */}
        {hasPermission('orders') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onTabChange('pedidos')}
            className={`flex flex-col items-center gap-1 h-auto py-2 px-3 relative ${
              isActive('pedidos') ? 'text-primary bg-primary/10' : 'text-muted-foreground'
            }`}
          >
            <div className="relative">
              <ShoppingCart className="h-5 w-5" />
              {ordersCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {ordersCount > 99 ? '99+' : ordersCount}
                </Badge>
              )}
            </div>
            <span className="text-xs">Pedidos</span>
          </Button>
        )}

        {/* Menu Central (Popover) */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="flex flex-col items-center gap-1 h-auto py-2 px-3 text-muted-foreground"
            >
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                <MenuIcon className="h-5 w-5 text-primary" />
              </div>
              <span className="text-xs">Menu</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            side="top" 
            align="center" 
            className="w-48 p-2 mb-2"
          >
            <div className="flex flex-col gap-1">
              {hasPermission('products', 'view') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onTabChange('cadastros')}
                  className={`justify-start ${
                    isActive('cadastros') ? 'bg-primary/10 text-primary' : ''
                  }`}
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Cadastros
                </Button>
              )}
              {hasPermission('reports') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onTabChange('relatorios')}
                  className={`justify-start ${
                    isActive('relatorios') ? 'bg-primary/10 text-primary' : ''
                  }`}
                >
                  <FileBarChart className="h-4 w-4 mr-2" />
                  Relatórios
                </Button>
              )}
              {hasPermission('settings', 'manage_whatsapp') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onTabChange('whatsapp')}
                  className={`justify-start ${
                    isActive('whatsapp') ? 'bg-primary/10 text-primary' : ''
                  }`}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  WhatsApp
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Métricas */}
        {hasPermission('reports') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onTabChange('metricas')}
            className={`flex flex-col items-center gap-1 h-auto py-2 px-3 ${
              isActive('metricas') ? 'text-primary bg-primary/10' : 'text-muted-foreground'
            }`}
          >
            <TrendingUp className="h-5 w-5" />
            <span className="text-xs">Métricas</span>
          </Button>
        )}

        {/* Configurações */}
        {hasPermission('settings') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onTabChange('result')}
            className={`flex flex-col items-center gap-1 h-auto py-2 px-3 ${
              isActive('result') ? 'text-primary bg-primary/10' : 'text-muted-foreground'
            }`}
          >
            <Settings className="h-5 w-5" />
            <span className="text-xs">Config</span>
          </Button>
        )}
      </div>
    </motion.nav>
  );
};
