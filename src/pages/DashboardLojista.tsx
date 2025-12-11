import { Navigation } from "@/components/layout/Navigation";
import { StoreOwnerDashboard } from "@/components/dashboard/StoreOwnerDashboard";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { LogOut, Menu } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useForceTheme } from "@/hooks/useForceTheme";

const DashboardLojista = () => {
  useForceTheme('light');
  const { signOut } = useAuth();

  return (
    <div
      className="min-h-screen w-screen overflow-x-hidden overflow-y-auto bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20"
      style={{ zoom: "0.9" }}
    >
      <StoreOwnerDashboard onSignOut={signOut} />
    </div>
  );
};

export default DashboardLojista;
