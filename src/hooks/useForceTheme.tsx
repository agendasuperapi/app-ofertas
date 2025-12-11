import { useLayoutEffect, useEffect } from "react";
import { useTheme } from "next-themes";

export function useForceTheme(theme: 'light' | 'dark') {
  const { setTheme, resolvedTheme } = useTheme();

  // Use next-themes API to force theme
  useEffect(() => {
    const previousTheme = resolvedTheme || 'dark';
    
    // Force theme via next-themes API
    setTheme(theme);

    // Restore previous theme when leaving page
    return () => {
      setTheme(previousTheme);
    };
  }, [theme, setTheme]);

  // Also force via DOM as backup (runs synchronously before paint)
  useLayoutEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    
    // Remove dark class and add forced theme
    root.classList.remove('dark', 'light');
    root.classList.add(theme);
    
    // Add body class as CSS fallback for light theme
    if (theme === 'light') {
      body.classList.add('force-light-theme');
    } else {
      body.classList.remove('force-light-theme');
    }

    return () => {
      root.classList.remove('dark', 'light');
      root.classList.add('dark'); // Default back to dark
      body.classList.remove('force-light-theme');
    };
  }, [theme]);
}
