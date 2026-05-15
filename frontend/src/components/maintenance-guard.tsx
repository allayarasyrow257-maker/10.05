'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import { AlertTriangle } from 'lucide-react';

export function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [maintenance, setMaintenance] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    api.get<{ maintenance?: boolean; maintenanceUntil?: string | null }>('/admin/settings')
      .then((data) => {
        // Backend auto-checks expiry, so just use the maintenance flag
        setMaintenance(!!data.maintenance);
      })
      .catch(() => {})
      .finally(() => setChecked(true));
  }, [pathname]);

  // Always allow master admin page
  if (pathname === '/Yedi7777777') {
    return <>{children}</>;
  }

  if (!checked) return null;

  if (maintenance) {
    return <MaintenancePage />;
  }

  return <>{children}</>;
}

function MaintenancePage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="max-w-lg w-full text-center space-y-8">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <AlertTriangle size={48} className="text-amber-500" />
          </div>
        </div>

        {/* Turkmen */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">
            Tehniki bejeriş işleri
          </h1>
          <p className="text-zinc-400 text-lg leading-relaxed">
            Käbir nasazlyklar sebapli  menyumyz işlemeýär.
            <br />
            Bagyşlaň, biraz garaşmagyňyzy haýyş edýäris.
          </p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-zinc-800" />
          <div className="w-2 h-2 rounded-full bg-amber-500/50" />
          <div className="flex-1 h-px bg-zinc-800" />
        </div>

        {/* Russian */}
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">
            Техническое обслуживание
          </h2>
          <p className="text-zinc-400 text-lg leading-relaxed">
            Из-за некоторых неполадок наше меню временно не работает.
            <br />
            Приносим извинения за неудобства.
          </p>
        </div>

        {/* Pulse indicator */}
        <div className="flex justify-center items-center gap-3 pt-4">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
          </span>
          <span className="text-sm text-zinc-500 font-medium">
            Işlenýär... / Обработка...
          </span>
        </div>
      </div>
    </div>
  );
}
