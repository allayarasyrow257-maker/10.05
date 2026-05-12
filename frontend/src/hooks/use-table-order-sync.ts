import { useEffect } from 'react';
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

  useEffect(() => {
    if (!tableId) return;

    // Fetch all open orders for this table and merge them into the cart
    // as "ordered" (locked) items so every phone at the table sees them.
    const syncOrderedItems = async () => {
      try {
        const orders = await api.get<any[]>(`/orders/table/${tableId}`);

        // If we still think the bill is closed but there are now fresh orders,
        // silently clear the closed-bill banner so the new session starts clean.
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
    };

    // Initial sync on mount
    syncOrderedItems();

    const socket = getSocket();

    // Any new order from any phone at this table → refresh ordered items
    socket.on('table-order-updated', syncOrderedItems);

    // Bill closed by admin → show banner, then auto-clear after 5 s
    let billTimer: ReturnType<typeof setTimeout> | null = null;

    socket.on('bill-closed', () => {
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
    });

    return () => {
      socket.off('table-order-updated', syncOrderedItems);
      socket.off('bill-closed');
      if (billTimer) clearTimeout(billTimer);
    };
  }, [tableId, markBillClosed, acknowledgeClosedBill, billClosedAt, setOrderedItemsFromBackend]);
}
