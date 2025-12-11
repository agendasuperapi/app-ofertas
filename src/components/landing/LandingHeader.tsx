import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Menu, X, Store, Users, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export const LandingHeader = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Login Lojista", href: "/login-lojista", icon: Store },
    { label: "Login Afiliado", href: "/afiliado/login", icon: Users },
  ];

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-orange-50/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-orange-200/50 dark:border-white/10 shadow-lg shadow-orange-200/20 dark:shadow-black/20"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/30 group-hover:shadow-orange-500/50 transition-shadow">
              <Store className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            <span className="text-xl md:text-2xl font-bold bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 dark:from-orange-400 dark:via-amber-400 dark:to-cyan-400 bg-clip-text text-transparent">
              Ofertas.app
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-2">
            {navLinks.map((link) => (
              <Link key={link.href} to={link.href}>
                <Button
                  variant="ghost"
                  className="text-slate-700 hover:text-orange-600 hover:bg-orange-100/50 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/10 gap-2"
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </Button>
              </Link>
            ))}
            <ThemeToggle />
            <Link to="/become-partner">
              <Button className="ml-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all gap-2">
                <LogIn className="w-4 h-4" />
                Cadastrar Loja
              </Button>
            </Link>
          </nav>

          {/* Mobile Menu */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-slate-700 dark:text-white hover:bg-orange-100/50 dark:hover:bg-white/10">
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-[280px] bg-orange-50/98 dark:bg-slate-900/98 backdrop-blur-xl border-l border-orange-200/50 dark:border-white/10 p-0"
              >
                <div className="flex flex-col h-full">
                  {/* Mobile Header */}
                  <div className="flex items-center justify-between p-4 border-b border-orange-200/50 dark:border-white/10">
                    <span className="text-lg font-bold bg-gradient-to-r from-orange-500 to-amber-500 dark:from-orange-400 dark:to-cyan-400 bg-clip-text text-transparent">
                      Ofertas.app
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-slate-600 hover:text-orange-600 hover:bg-orange-100/50 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/10"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>

                  {/* Mobile Links */}
                  <nav className="flex flex-col gap-2 p-4">
                    {navLinks.map((link) => (
                      <Link
                        key={link.href}
                        to={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Button
                          variant="ghost"
                          className="w-full justify-start text-slate-700 hover:text-orange-600 hover:bg-orange-100/50 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/10 gap-3"
                        >
                          <link.icon className="w-5 h-5" />
                          {link.label}
                        </Button>
                      </Link>
                    ))}
                    
                    <div className="pt-4 border-t border-orange-200/50 dark:border-white/10 mt-2">
                      <Link to="/become-partner" onClick={() => setMobileMenuOpen(false)}>
                        <Button className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg gap-2">
                          <LogIn className="w-5 h-5" />
                          Cadastrar Loja
                        </Button>
                      </Link>
                    </div>
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </motion.header>
  );
};
