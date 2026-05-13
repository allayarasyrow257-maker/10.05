import React, { useEffect } from 'react';
import { useCartStore, CartItem } from '@/store/cart-store';
import { getSocket } from '@/lib/socket';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

export function useTableOrderSync() {
  const {
    tableId,
    markBillClosed,
    acknowledgeClosedBill,
    billClosedAt,
    setOrderedItemsFromBackend,
  } = useCartStore();

  const syncOrderedItems = React.useCallback(async () => {
    if (!tableId) return;
    try {
      const orders = await api.get<any[]>(`/orders/table/${tableId}`);

      if (billClosedAt && Array.isArray(orders) && orders.length > 0) {
        acknowledgeClosedBill();
        return;
      }

      if (Array.isArray(orders)) {
        const orderedItems: CartItem[] = orders.flatMap((order: any) =>
          (order.items ?? []).map((item: any) => ({
            cartItemId: `backend-${order.id}-${item.id}`,
            productId: item.productId ?? item.product?.id ?? 0,
            name:
              item.product?.name ??
              item.combo?.name ?? { en: 'Item', ru: 'Позиция', tk: 'Haryt', tr: 'Ürün' },
            price: parseFloat(item.price ?? '0'),
            quantity: item.quantity,
            image: item.product?.image ?? item.combo?.image,
            notes: item.notes ?? undefined,
            isGift: item.isGift ?? false,
            isCombo: !!item.comboId,
            comboId: item.comboId ?? undefined,
            comboName: item.combo?.name ?? undefined,
            status: 'ordered' as const,
            fromBackend: true,
          }))
        );
        setOrderedItemsFromBackend(orderedItems);
      }
    } catch (error) {
      console.error('Failed to sync table orders:', error);
    }
  }, [tableId, billClosedAt, acknowledgeClosedBill, setOrderedItemsFromBackend]);

  useEffect(() => {
    if (!tableId) return;

    // Initial sync on mount or tableId change
    syncOrderedItems();

    const socket = getSocket();
    socket.on('table-order-updated', syncOrderedItems);

    let billTimer: ReturnType<typeof setTimeout> | null = null;

    const handleBillClosed = () => {
      const ts = new Date().toISOString();
      markBillClosed(ts);
      const lang = useCartStore.getState().language;
      const msg =
        lang === 'tk' ? 'Hasap ýapyldy. Sag boluň!' :
          lang === 'ru' ? 'Счёт закрыт. Спасибо!' :
            lang === 'tr' ? 'Hesap kapatildi. Teşekkürler!' :
              'Bill closed. Thank you!';
      toast.success(msg, { icon: '🧾', duration: 5000 });

      billTimer = setTimeout(() => {
        acknowledgeClosedBill();
      }, 5000);
    };

    socket.on('bill-closed', handleBillClosed);

    return () => {
      socket.off('table-order-updated', syncOrderedItems);
      socket.off('bill-closed', handleBillClosed);
      if (billTimer) clearTimeout(billTimer);
    };
  }, [tableId, syncOrderedItems, markBillClosed, acknowledgeClosedBill]);
}
