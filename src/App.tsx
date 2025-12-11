import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "./hooks/useAuth";
import { CartProvider } from "./contexts/CartContext";
import { AffiliateAuthProvider } from "./hooks/useAffiliateAuth";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { StoreAccessRoute } from "./components/auth/StoreAccessRoute";
import { AffiliateProtectedRoute } from "./components/auth/AffiliateProtectedRoute";
import { MobileBottomNav } from "./components/layout/MobileBottomNav";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import DashboardLojista from "./pages/DashboardLojista";
import Profile from "./pages/Profile";
import StoreDetails from "./pages/StoreDetails";
import Cart from "./pages/Cart";
import Orders from "./pages/Orders";
import BecomePartner from "./pages/BecomePartner";
import LoginLojista from "./pages/LoginLojista";
import AdminDashboard from "./pages/AdminDashboard";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import LandingPage from "./pages/LandingPage";
import ProductPage from "./pages/ProductPage";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
// Affiliate pages
import AffiliateLogin from "./pages/AffiliateLogin";
import AffiliateRegister from "./pages/AffiliateRegister";
import AffiliateForgotPassword from "./pages/AffiliateForgotPassword";
import AffiliateResetPassword from "./pages/AffiliateResetPassword";
import AffiliateDashboardNew from "./pages/AffiliateDashboardNew";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
        <AffiliateAuthProvider>
          <CartProvider>
            <div className="pb-20 md:pb-0">
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/lojas" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                
                {/* Affiliate routes - independent authentication */}
                <Route path="/afiliado/login" element={<AffiliateLogin />} />
                <Route path="/afiliado/cadastro" element={<AffiliateRegister />} />
                <Route path="/afiliado/esqueci-senha" element={<AffiliateForgotPassword />} />
                <Route path="/afiliado/redefinir-senha" element={<AffiliateResetPassword />} />
                <Route 
                  path="/afiliado/dashboard" 
                  element={
                    <AffiliateProtectedRoute>
                      <AffiliateDashboardNew />
                    </AffiliateProtectedRoute>
                  } 
                />
                
                <Route
                  path="/dashboard" 
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/dashboard-lojista" 
                  element={
                    <StoreAccessRoute redirectPath="/login-lojista">
                      <DashboardLojista />
                    </StoreAccessRoute>
                  } 
                />
                <Route 
                  path="/profile" 
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  } 
                />
                <Route path="/cart" element={<Cart />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/become-partner" element={<BecomePartner />} />
                <Route path="/login-lojista" element={<LoginLojista />} />
                <Route
                  path="/admin" 
                  element={
                    <ProtectedRoute requireAuth={true} requireRole="admin">
                      <AdminDashboard />
                    </ProtectedRoute>
                  } 
                />
                {/* Rotas específicas devem vir ANTES das rotas genéricas */}
                <Route path="/p/:shortId" element={<ProductPage />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "/:slug" ROUTE */}
                <Route path="/:slug" element={<StoreDetails />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
            <MobileBottomNav />
          </CartProvider>
        </AffiliateAuthProvider>
      </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
