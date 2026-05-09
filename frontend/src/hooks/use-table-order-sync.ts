import { useEffect } from 'react';
import { useCartStore } from '@/store/cart-store';
import { getSocket } from '@/lib/socket';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

export function useTableOrderSync() {
  const {
    tableId,
    markBillClosed,
    acknowledgeClosedBill,
    billClosedAt,
  } = useCartStore();

  useEffect(() => {
    if (!tableId) return;

    const checkBillStatus = async () => {
      try {
        const orders = await api.get<any[]>(`/orders/table/${tableId}`);

        // If we still believe a bill is closed but the backend reports active
        // orders (i.e. a new customer group has placed an order on this table),
        // silently dismiss the closed-bill banner so the next group starts fresh.
        if (billClosedAt && Array.isArray(orders) && orders.length > 0) {
          acknowledgeClosedBill();
        }
      } catch (error) {
        console.error('Failed to check table orders:', error);
      }
    };

    // Initial check on mount
    checkBillStatus();

    const socket = getSocket();

    // Listen for new orders from other devices (only check bill status)
    socket.on('table-order-updated', checkBillStatus);

    // Listen for bill closure — show the closed-bill banner instead of
    // silently wiping the cart. The customer sees a clear "closed at" notice
    // and acknowledges it before the cart resets.
    let billTimer: ReturnType<typeof setTimeout> | null = null;

    socket.on('bill-closed', () => {
      const ts = new Date().toISOString();
      markBillClosed(ts);
      const lang = useCartStore.getState().language;
      const msg =
        lang === 'tk' ? 'Hasap ýapyldy. Sag boluň!' :
        lang === 'ru' ? 'Счёт закрыт. Спасибо!' :
        lang === 'tr' ? 'Hesap kapatildi. Tesekkurler!' :
        'Bill closed. Thank you!';
      toast.success(msg, { icon: '🧾', duration: 5000 });

      // Auto-acknowledge after 5 seconds — clears cart, generates new sessionId,
      // so the next customer group starts completely fresh
      billTimer = setTimeout(() => {
        acknowledgeClosedBill();
      }, 5000);
    });

    return () => {
      socket.off('table-order-updated', checkBillStatus);
      socket.off('bill-closed');
      if (billTimer) clearTimeout(billTimer);
    };
  }, [tableId, markBillClosed, acknowledgeClosedBill, billClosedAt]);
}
