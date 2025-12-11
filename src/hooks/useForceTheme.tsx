import { useLayoutEffect } from "react";

export function useForceTheme(theme: 'light' | 'dark') {
  // Use useLayoutEffect to apply theme BEFORE browser paints (sync)
  useLayoutEffect(() => {
    const root = document.documentElement;
    const previousTheme = root.classList.contains('dark') ? 'dark' : 'light';
    
    // Apply forced theme immediately
    root.classList.remove('dark', 'light');
    root.classList.add(theme);

    // Restore previous theme when leaving page
    return () => {
      root.classList.remove('dark', 'light');
      root.classList.add(previousTheme);
    };
  }, [theme]);
}
