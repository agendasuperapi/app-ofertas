import { StoreOwnerDashboard } from "@/components/dashboard/StoreOwnerDashboard";
import { useAuth } from "@/hooks/useAuth";

const DashboardLojista = () => {
  const { signOut } = useAuth();

  return (
    <div
      className="min-h-screen w-screen overflow-x-hidden overflow-y-auto bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950"
      style={{ zoom: "0.9" }}
    >
      <StoreOwnerDashboard onSignOut={signOut} />
    </div>
  );
};

export default DashboardLojista;
