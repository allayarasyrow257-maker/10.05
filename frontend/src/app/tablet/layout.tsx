'use client';

import { useEffect } from 'react';
import { useTabletStore } from '@/store/tablet-store';
import { ThemeProvider } from '@/components/theme-provider';

export default function TabletLayout({ children }: { children: React.ReactNode }) {
  const { loadFromSession } = useTabletStore();

  useEffect(() => {
    loadFromSession();
  }, [loadFromSession]);

  return <>{children}</>;
}
