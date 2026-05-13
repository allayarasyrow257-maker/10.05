'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function WaiterLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const waiterAuth = sessionStorage.getItem('waiter_authorized');
    if (waiterAuth === 'true') {
      setAuthorized(true);
    } else {
      router.replace('/options');
    }
  }, [router]);

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
