import { Home, Store, ShoppingBag, BarChart3, User, LogOut, Wallet, Mail } from "lucide-react";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface AffiliateDashboardSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  affiliateName?: string;
  onSignOut: () => void;
  pendingInvitesCount?: number;
}

const menuItems = [
  { id: "home", label: "Início", icon: Home },
  { id: "stores", label: "Lojas", icon: Store },
  { id: "invites", label: "Convites", icon: Mail },
  { id: "orders", label: "Pedidos", icon: ShoppingBag },
  { id: "commissions", label: "Comissões Disponível", icon: BarChart3 },
  { id: "withdrawals", label: "Saques", icon: Wallet },
  { id: "profile", label: "Perfil", icon: User },
];

export function AffiliateDashboardSidebar({
  activeTab,
  onTabChange,
  affiliateName,
  onSignOut,
  pendingInvitesCount = 0,
}: AffiliateDashboardSidebarProps) {
  const handleTabChange = (tabId: string) => {
    onTabChange(tabId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const getInitials = (name?: string) => {
    if (!name) return "A";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="hidden md:flex flex-col w-[120px] min-h-screen bg-card/50 backdrop-blur-sm border-r border-border/50 sticky top-0"
    >
      {/* Avatar */}
      <div className="flex flex-col items-center justify-center py-6 border-b border-border/50">
        <Avatar className="h-14 w-14 ring-2 ring-primary/20">
          <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-semibold">
            {getInitials(affiliateName)}
          </AvatarFallback>
        </Avatar>
        <p className="mt-2 text-xs font-medium text-muted-foreground text-center px-2 truncate max-w-full">
          {affiliateName?.split(" ")[0] || "Afiliado"}
        </p>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 py-4">
        <ul className="space-y-1 px-2">
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            const showBadge = item.id === "invites" && pendingInvitesCount > 0;

            return (
              <li key={item.id}>
                <button
                  onClick={() => handleTabChange(item.id)}
                  className={`
                    relative w-full flex flex-col items-center gap-1 py-3 px-2 rounded-lg
                    transition-all duration-200 group
                    ${isActive 
                      ? "text-primary" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }
                  `}
                >
                  {isActive && (
                    <motion.div
                      layoutId="affiliate-sidebar-active"
                      className="absolute inset-0 bg-primary/10 rounded-lg"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <div className="relative">
                    <Icon className={`h-5 w-5 relative z-10 ${isActive ? "text-primary" : ""}`} />
                    {showBadge && (
                      <Badge 
                        className="absolute -top-2 -right-2 h-4 min-w-4 px-1 text-[10px] bg-destructive text-destructive-foreground border-0"
                      >
                        {pendingInvitesCount > 9 ? "9+" : pendingInvitesCount}
                      </Badge>
                    )}
                  </div>
                  <span className="text-[10px] font-medium relative z-10">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Sign Out */}
      <div className="p-4 border-t border-border/50">
        <Button
          variant="ghost"
          size="sm"
          onClick={onSignOut}
          className="w-full flex flex-col items-center gap-1 h-auto py-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          <LogOut className="h-5 w-5" />
          <span className="text-[10px] font-medium">Sair</span>
        </Button>
      </div>
    </motion.aside>
  );
}
