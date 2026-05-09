'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag } from 'lucide-react';
import { useCartStore } from '@/store/cart-store';
import { formatCurrency } from '@/lib/utils';

interface CartBarProps {
  onOpen: () => void;
}

export function CartBar({ onOpen }: CartBarProps) {
  const items = useCartStore((s) => s.items);
  const getTotal = useCartStore((s) => s.getTotal);
  const getItemCount = useCartStore((s) => s.getItemCount);

  const itemCount = getItemCount();
  const total = getTotal();

  return (
    <AnimatePresence>
      {itemCount > 0 && (
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
                <ShoppingBag size={22} className="text-white" />
                <motion.span
                  key={itemCount}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-2 -right-2 bg-white text-purple-600 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
                >
                  {itemCount}
                </motion.span>
              </div>
              <span className="text-white font-medium">View Cart</span>
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
