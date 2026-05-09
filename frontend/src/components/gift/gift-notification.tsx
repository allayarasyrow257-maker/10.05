'use client';

import { useEffect } from 'react';
import { Gift } from 'lucide-react';
import { getSocket } from '@/lib/socket';
import { useCartStore } from '@/store/cart-store';
import { api } from '@/lib/api';
import { getLocalizedName } from '@/lib/utils';
import toast from 'react-hot-toast';

interface GiftData {
  id: number;
  product: {
    id: number;
    name: Record<string, string>;
    price: string;
    image?: string;
  };
  senderTable: { number: number };
}

export function GiftNotification() {
  const { addItem, language } = useCartStore();

  const labels = {
    received: language === 'tk' ? 'Sowgat aldyňyz!' : language === 'ru' ? 'Вы получили подарок!' : language === 'tr' ? 'Hediye aldiniz!' : 'You received a gift!',
    from: language === 'tk' ? 'Stoldan' : language === 'ru' ? 'От стола' : language === 'tr' ? 'Masadan' : 'From Table',
  };

  useEffect(() => {
    const socket = getSocket();
    socket.on('gift-received', async (gift: GiftData) => {
      try {
        await api.put(`/gifts/${gift.id}/respond`, { status: 'accepted' });
        addItem({
          productId: gift.product.id,
          name: gift.product.name,
          price: 0,
          image: gift.product.image,
          isGift: true,
          giftFrom: String(gift.senderTable.number),
        });
        toast.success(
          `🎁 ${labels.received} ${labels.from} ${gift.senderTable.number} - ${getLocalizedName(gift.product.name, language)}`,
          { duration: 4000 }
        );
      } catch {
        toast.error('Failed to accept gift');
      }
    });
    return () => { socket.off('gift-received'); };
  }, []);

  return null;
}
