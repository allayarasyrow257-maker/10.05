'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTableId: (id: string) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => {},
  setTableId: () => {},
});

function getStorageKey(tableId: string | null): string {
  return tableId ? `theme_${tableId}` : 'theme';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [tableId, setTableIdState] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Initial hydration (no tableId yet — use global key for admin, etc.)
  useEffect(() => {
    if (hydrated) return;
    const key = getStorageKey(null);
    const stored = localStorage.getItem(key) as Theme | null;
    if (stored) {
      setTheme(stored);
      document.documentElement.classList.toggle('dark', stored === 'dark');
    } else {
      document.documentElement.classList.add('dark');
    }
    setHydrated(true);
  }, [hydrated]);

  // Re-hydrate when tableId changes (menu pages call setTableId)
  const setTableId = useCallback((id: string) => {
    setTableIdState(id);
    const key = getStorageKey(id);
    const stored = localStorage.getItem(key) as Theme | null;
    if (stored) {
      setTheme(stored);
      document.documentElement.classList.toggle('dark', stored === 'dark');
    } else {
      // No preference saved for this table yet — keep current theme
      // and save it so it's isolated from now on
      document.documentElement.classList.toggle('dark', true);
      setTheme('dark');
    }
  }, []);

  const toggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    const key = getStorageKey(tableId);
    localStorage.setItem(key, next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  }, [theme, tableId]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTableId }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
