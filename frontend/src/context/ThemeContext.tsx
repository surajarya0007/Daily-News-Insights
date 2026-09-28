'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
  mounted: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
  isDark: false,
  mounted: false,
});

function getInitialTheme(): Theme {
  if (typeof document !== 'undefined') {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme === 'light' || currentTheme === 'dark') {
      return currentTheme;
    }
  }

  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('ir-theme');
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }

    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  }

  return 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Determine theme on client mount to prevent hydration mismatch
    const stored = localStorage.getItem('ir-theme');
    const initialTheme = stored === 'light' || stored === 'dark'
      ? stored
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    
    setTheme(initialTheme);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem('ir-theme', theme);
    // Sync to cookie for Server-Side Rendering (SSR)
    document.cookie = `ir-theme=${theme}; path=/; max-age=31536000; SameSite=Lax`;

    // Disconnect the MutationObserver once client state is ready and mounted
    try {
      if (typeof window !== 'undefined' && (window as any).__themeObserver) {
        (window as any).__themeObserver.disconnect();
        delete (window as any).__themeObserver;
      }
    } catch (e) {}
  }, [theme, mounted]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark', mounted }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
