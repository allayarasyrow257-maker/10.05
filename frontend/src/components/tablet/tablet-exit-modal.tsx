'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, X } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

interface TabletExitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tableId: number;
}

export function TabletExitModal({ isOpen, onClose, onSuccess, tableId }: TabletExitModalProps) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) {
      toast.error('Please enter the PIN');
      return;
    }

    setLoading(true);
    try {
      // Backend verify-pin endpoint
      await api.post('/tables/verify-pin', {
        tableId,
        pin
      }, false);

      toast.success('PIN Verified');
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Invalid PIN');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, x: "-50%", y: "-45%" }}
            animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
            exit={{ opacity: 0, scale: 0.95, x: "-50%", y: "-45%" }}
            className="fixed left-1/2 top-1/2 w-[90%] max-w-sm bg-background border border-border shadow-2xl rounded-2xl z-[101] overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                    <Lock className="text-purple-500" size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Exit Table</h2>
                    <p className="text-xs text-muted-foreground">Enter PIN to leave</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleVerify} className="space-y-4">
                <div className="space-y-2">
                  <input
                    type="password"
                    placeholder="Enter PIN"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] focus:outline-none focus:border-purple-500 transition-colors"
                    autoFocus
                    maxLength={6}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading || !pin}
                  className="w-full h-12 text-base font-semibold"
                >
                  {loading ? 'Verifying...' : 'Verify & Exit'}
                </Button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
