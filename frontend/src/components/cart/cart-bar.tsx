'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Clock } from 'lucide-react';
import { useCartStore } from '@/store/cart-store';
import { formatCurrency } from '@/lib/utils';

interface CartBarProps {
  onOpen: () => void;
}

export function CartBar({ onOpen }: CartBarProps) {
  const items = useCartStore((s) => s.items);
  const getTotal = useCartStore((s) => s.getTotal);
  const getItemCount = useCartStore((s) => s.getItemCount);

  // Active items count (badge + triggers bar visibility when ordering new items)
  const activeCount = getItemCount();
  // Ordered (locked) items that have already been sent to kitchen
  const orderedCount = items
    .filter((i) => i.status === 'ordered')
    .reduce((s, i) => s + i.quantity, 0);
  // Bar is visible whenever there is anything in the cart
  const totalCount = activeCount + orderedCount;
  // Grand total across all items
  const total = getTotal();

  // Badge: show active count if nonzero (user is building a new order),
  // otherwise show ordered count so they know items are in the kitchen.
  const badgeCount = activeCount > 0 ? activeCount : orderedCount;
  const hasOnlyOrdered = activeCount === 0 && orderedCount > 0;

  return (
    <AnimatePresence>
      {totalCount > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-50 p-4"
        >
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={onOpen}
            className="w-full gradient-primary rounded-2xl p-4 flex items-center justify-between shadow-2xl shadow-purple-500/30"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                {hasOnlyOrdered ? (
                  <Clock size={22} className="text-white" />
                ) : (
                  <ShoppingBag size={22} className="text-white" />
                )}
                <motion.span
                  key={badgeCount}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-2 -right-2 bg-white text-purple-600 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
                >
                  {badgeCount}
                </motion.span>
              </div>
              <span className="text-white font-medium">
                {hasOnlyOrdered ? 'My Orders' : 'View Cart'}
              </span>
            </div>
            <span className="text-white font-bold text-lg">
              {formatCurrency(total)}
            </span>
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
