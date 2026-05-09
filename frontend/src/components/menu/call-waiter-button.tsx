'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell } from 'lucide-react';
import { getSocket } from '@/lib/socket';
import { useCartStore } from '@/store/cart-store';
import toast from 'react-hot-toast';

interface CallWaiterButtonProps {
  tableId: number | null;
}

export function CallWaiterButton({ tableId }: CallWaiterButtonProps) {
  const [calling, setCalling] = useState(false);
  const { sessionId, language } = useCartStore();

  const handleCall = () => {
    if (!tableId || calling) return;
    const socket = getSocket();
    socket.emit('call-waiter', { tableId, tableNumber: tableId, sessionId });
    setCalling(true);

    const msg = language === 'tk' ? 'Ofisiant çagyryldy!' :
                language === 'ru' ? 'Официант вызван!' :
                language === 'tr' ? 'Garson cagrildi!' :
                'Waiter has been called!';
    toast.success(msg);
    setTimeout(() => setCalling(false), 5000);
  };

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={handleCall}
      disabled={calling}
      className={`p-2 rounded-xl transition-all ${
        calling
          ? 'bg-yellow-500/20 border border-yellow-500/30'
          : 'glass hover:bg-black/10 dark:hover:bg-white/10'
      }`}
    >
      <Bell size={16} className={calling ? 'text-yellow-400 animate-bounce' : 'text-muted-foreground'} />
    </motion.button>
  );
}
