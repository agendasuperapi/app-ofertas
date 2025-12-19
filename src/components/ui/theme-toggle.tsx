import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface ThemeToggleProps {
  className?: string;
  size?: "default" | "sm";
}

export function ThemeToggle({ className, size = "default" }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  const sizeClasses = size === "sm" ? "w-8 h-8" : "w-10 h-10";
  const iconClasses = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className={`relative rounded-full ${sizeClasses} bg-gray-200 hover:bg-gray-300 dark:bg-white/10 dark:hover:bg-white/20 backdrop-blur-sm border border-gray-300 dark:border-white/10 ${className}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {theme === "dark" ? (
          <motion.div
            key="sun"
            initial={{ rotate: -90, scale: 0, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: 90, scale: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Sun className={`${iconClasses} text-amber-400`} />
          </motion.div>
        ) : (
          <motion.div
            key="moon"
            initial={{ rotate: 90, scale: 0, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: -90, scale: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Moon className={`${iconClasses} text-slate-700`} />
          </motion.div>
        )}
      </AnimatePresence>
      <span className="sr-only">Alternar tema</span>
    </Button>
  );
}
