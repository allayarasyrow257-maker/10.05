'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTabletStore } from '@/store/tablet-store';

export default function TabletRedirect() {
  const router = useRouter();
  const { isTabletMode, loadFromSession } = useTabletStore();

  useEffect(() => {
    loadFromSession();
  }, [loadFromSession]);

  useEffect(() => {
    if (isTabletMode) {
      router.replace('/tablet/menu');
    } else {
      router.replace('/admin');
    }
  }, [isTabletMode, router]);

  return null;
}
