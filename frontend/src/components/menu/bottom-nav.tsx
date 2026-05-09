'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Gift, Bell, X } from 'lucide-react';
import { useCartStore } from '@/store/cart-store';
import { getSocket } from '@/lib/socket';
import { formatCurrency } from '@/lib/utils';
import { GiftModal } from '../gift/gift-modal';

import toast from 'react-hot-toast';

interface BottomNavProps {
  onCartOpen: () => void;
  onHome: () => void;
  showHome?: boolean;
}

export function BottomNav({ onCartOpen, onHome, showHome = true }: BottomNavProps) {
  const items = useCartStore((s) => s.items);
  const tableId = useCartStore((s) => s.tableId);
  const language = useCartStore((s) => s.language);
  const sessionId = useCartStore((s) => s.sessionId);

  const [mounted, setMounted] = useState(false);
  const [waiterState, setWaiterState] = useState<'idle' | 'countdown' | 'called'>('idle');
  const [countdown, setCountdown] = useState(3);
  const [giftOpen, setGiftOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  const activeItems = items.filter((i) => i.status !== "ordered");
  const itemCount = mounted ? activeItems.reduce((count, item) => count + item.quantity, 0) : 0;
  const total = mounted ? activeItems.reduce((total, item) => total + item.price * item.quantity, 0) : 0;

  // Use default English until mounted to prevent hydration mismatch
  // (Zustand store may retain language from previous client-side navigation)
  const lang = mounted ? language : 'en';

  const cartLabel =
    lang === 'tk' ? 'Sebet' :
    lang === 'ru' ? 'Корзина' :
    lang === 'tr' ? 'Sepet' : 'Cart';

  const waiterLabel =
    lang === 'tk' ? 'Ofisiant' :
    lang === 'ru' ? 'Официант' :
    lang === 'tr' ? 'Garson' : 'Waiter';

  const giftLabel =
    lang === 'tk' ? 'Sowgat' :
    lang === 'ru' ? 'Подарок' :
    lang === 'tr' ? 'Hediye' : 'Gift';

  const calledLabel =
    lang === 'tk' ? 'Çagyryldy' :
    lang === 'ru' ? 'Вызван' :
    lang === 'tr' ? 'Çağrıldı' : 'Called';

  // Countdown timer
  useEffect(() => {
    if (waiterState !== 'countdown') return;
    if (countdown <= 0) {
      const socket = getSocket();
      socket.emit('call-waiter', { tableId, tableNumber: tableId, sessionId });
      setWaiterState('called');
      const msg =
        language === 'tk' ? 'Ofisiant çagyryldy!' :
        language === 'ru' ? 'Официант вызван!' :
        language === 'tr' ? 'Garson çağrıldı!' :
        'Waiter has been called!';
      toast.success(msg);
      setTimeout(() => setWaiterState('idle'), 5000);
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [waiterState, countdown, tableId, sessionId, language]);

  const handleWaiterPress = () => {
    if (waiterState === 'idle') {
      setWaiterState('countdown');
      setCountdown(3);
    } else if (waiterState === 'countdown') {
      setWaiterState('idle');
      setCountdown(3);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30">
      <div className="max-w-lg mx-auto px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        <div className="flex flex-col gap-2">
          {/* Navigation bar */}
          <div className="bg-background/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl shadow-black/20">
            <div className="grid grid-cols-3 items-center py-1.5 px-1.5">

              {/* Gift */}
              <button
                onClick={() => setGiftOpen(true)}
                className="flex flex-col items-center gap-0.5 py-2 rounded-xl hover:bg-white/5 active:scale-95 transition-all"
              >
                <Gift size={20} style={{ color: 'var(--accent-color, #f97316)' }} />
                <span className="text-[10px] font-medium" style={{ color: 'var(--accent-color-muted, #fdba74)' }}>
                  {giftLabel}
                </span>
              </button>

              {/* Call Waiter - center elevated */}
              <div className="flex justify-center">
                <motion.button
                  onClick={handleWaiterPress}
                  whileTap={{ scale: 0.88 }}
                  className={`relative flex flex-col items-center justify-center w-16 h-16 -mt-7 rounded-full shadow-lg transition-all ${
                    waiterState === 'countdown'
                      ? 'bg-red-500 shadow-red-500/40'
                      : waiterState === 'called'
                      ? 'bg-green-500 shadow-green-500/40'
                      : ''
                  }`}
                  style={waiterState === 'idle' ? { backgroundColor: 'var(--accent-color, #f97316)', boxShadow: '0 10px 15px -3px color-mix(in srgb, var(--accent-color, #f97316) 30%, transparent)' } : undefined}
                >
                  {/* Outer ring for visual polish */}
                  <div className="absolute inset-[-3px] rounded-full border-[3px] border-background" />

                  <AnimatePresence mode="wait">
                    {waiterState === 'countdown' ? (
                      <motion.div
                        key="cancel"
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0 }}
                        className="flex flex-col items-center"
                      >
                        <X size={18} className="text-white" />
                        <span className="text-[9px] text-white font-bold -mt-0.5">{countdown}</span>
                      </motion.div>
                    ) : waiterState === 'called' ? (
                      <motion.div
                        key="called"
                        initial={{ scale: 0 }}
                        animate={{ scale: [1, 1.15, 1] }}
                        transition={{ repeat: Infinity, duration: 1.2 }}
                        className="flex flex-col items-center"
                      >
                        <Bell size={18} className="text-white" />
                        <span className="text-[8px] text-white/90 font-semibold mt-0.5">{calledLabel}</span>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="bell"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="flex flex-col items-center"
                      >
                        <Bell size={18} className="text-white" />
                        <span className="text-[8px] text-white/80 font-medium mt-0.5">{waiterLabel}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Countdown ring */}
                  {waiterState === 'countdown' && (
                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                      <circle
                        cx="32" cy="32" r="30"
                        fill="none"
                        stroke="rgba(255,255,255,0.2)"
                        strokeWidth="2.5"
                      />
                      <motion.circle
                        cx="32" cy="32" r="30"
                        fill="none"
                        stroke="white"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 30}
                        initial={{ strokeDashoffset: 0 }}
                        animate={{ strokeDashoffset: 2 * Math.PI * 30 }}
                        transition={{ duration: 3, ease: 'linear' }}
                      />
                    </svg>
                  )}
                </motion.button>
              </div>

              {/* Cart button (when empty) / placeholder (when cart bar visible) */}
              <button
                onClick={onCartOpen}
                className="flex flex-col items-center gap-0.5 py-2 rounded-xl hover:bg-white/5 active:scale-95 transition-all relative"
              >
                <div className="relative">
                  <ShoppingBag size={20} className={itemCount > 0 ? '' : 'text-muted-foreground'} style={itemCount > 0 ? { color: 'var(--accent-color, #f1995bff)' } : undefined} />
                  <AnimatePresence>
                    {itemCount > 0 && (
                      <motion.span
                        key={itemCount}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute -top-1 -right-1.5 text-white text-[8px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center"
                        style={{ backgroundColor: 'var(--accent-color, #f97316)' }}
                      >
                        {itemCount}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
                <span className={`text-[10px] font-medium ${itemCount > 0 ? '' : 'text-muted-foreground'}`} style={itemCount > 0 ? { color: 'var(--accent-color, #fdba74)' } : undefined}>
                  {cartLabel}
                </span>
              </button>

            </div>
          </div>
        </div>
      </div>
      <GiftModal isOpen={giftOpen} onClose={() => setGiftOpen(false)} />
    </div>
  );
}
