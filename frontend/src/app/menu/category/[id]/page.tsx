'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cart-store';
import { useTheme } from '@/components/theme-provider';
import { MenuContent } from '@/components/menu/menu-content';
import { CartModal } from '@/components/cart/cart-modal';
import { GiftNotification } from '@/components/gift/gift-notification';
import { BottomNav } from '@/components/menu/bottom-nav';
import { getSocket } from '@/lib/socket';
import { useTableOrderSync } from '@/hooks/use-table-order-sync';

function CategoryPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [cartOpen, setCartOpen] = useState(false);
  const { setTableData, tableId, tableCode, tableNumber } = useCartStore();
  const { setTableId: setThemeTableId } = useTheme();

  useTableOrderSync();

  // Prevent browser back to home page
  useEffect(() => {
    const blockBack = () => {
      window.history.pushState(null, '', window.location.href);
    };
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', blockBack);
    return () => window.removeEventListener('popstate', blockBack);
  }, []);

  const categoryId = params.id ? parseInt(params.id as string) : null;

  useEffect(() => {
    const tableParam = searchParams.get('table');
    if (tableParam) {
      const lookupTable = async () => {
        try {
          const { api } = await import('@/lib/api');
          const table = await api.get(`/tables/lookup/${tableParam}`);
          if (table) {
            setTableData(table.id, table.number, table.tableCode);
            setThemeTableId(table.number.toString());
            const socket = getSocket();
            socket.emit('join-table', table.id);
          }
        } catch (error) {
          console.error('Failed to lookup table:', error);
        }
      };
      lookupTable();
    }
  }, [searchParams, setTableData, setThemeTableId]);

  const goHome = () => {
    const tableParam = tableCode || tableNumber || searchParams.get('table') || '';
    router.push(`/menu?table=${tableParam}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <MenuContent
        initialCategoryId={categoryId}
        onBack={goHome}
      />

      <CartModal isOpen={cartOpen} onClose={() => setCartOpen(false)} />
      <GiftNotification />

      <BottomNav
        onCartOpen={() => setCartOpen(true)}
        onHome={goHome}
      />
    </div>
  );
}

export default function CategoryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <CategoryPageContent />
    </Suspense>
  );
}
