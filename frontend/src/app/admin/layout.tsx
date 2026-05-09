'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAdminStore } from '@/store/admin-store';
import { AdminSidebar } from '@/components/admin/sidebar';
import { AdminTopbar } from '@/components/admin/topbar';
import { api } from '@/lib/api';
import { useTheme } from '@/components/theme-provider';

function shiftHue(hex: string, degrees: number): string {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  h = ((h * 360 + degrees) % 360) / 360;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const ro = Math.round(hue2rgb(p, q, h + 1/3) * 255);
  const go = Math.round(hue2rgb(p, q, h) * 255);
  const bo = Math.round(hue2rgb(p, q, h - 1/3) * 255);
  return `#${ro.toString(16).padStart(2,'0')}${go.toString(16).padStart(2,'0')}${bo.toString(16).padStart(2,'0')}`;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loadFromStorage } = useAdminStore();
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accentLight, setAccentLight] = useState<string | null>(null);
  const [accentDark, setAccentDark] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useTheme();

  useEffect(() => {
    loadFromStorage();
    setLoading(false);
  }, [loadFromStorage]);

  useEffect(() => {
    api.get<{ accentColorLight?: string; accentColorDark?: string }>('/admin/settings').then((data) => {
      if (data.accentColorLight) setAccentLight(data.accentColorLight);
      if (data.accentColorDark) setAccentDark(data.accentColorDark);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!loading && !isAuthenticated && pathname !== '/admin') {
      router.push('/admin');
    }
  }, [loading, isAuthenticated, pathname, router]);

  // Login page
  if (pathname === '/admin') {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent-color, #7c3aed)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const activeAccent = theme === 'dark' ? accentDark : accentLight;
  const accentStyle = activeAccent ? {
    '--accent-color': activeAccent,
    '--accent-color-end': shiftHue(activeAccent, 40),
  } as React.CSSProperties : undefined;

  return (
    <div className="min-h-screen bg-background flex" style={accentStyle}>
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 min-w-0 lg:ml-64">
        <AdminTopbar onMenuToggle={() => setSidebarOpen(true)} />
        <main className="p-6 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
