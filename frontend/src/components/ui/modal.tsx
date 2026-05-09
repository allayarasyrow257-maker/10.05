"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children, footer }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      const scrollBarWidth =
        window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      document.body.style.paddingRight = `${scrollBarWidth}px`;
    } else {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99]"
            onClick={onClose}
          />
          {/* Centering wrapper */}
          <div className="fixed inset-0 z-[101] flex items-center justify-center py-6 px-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 400 }}
              className="w-full max-w-lg max-h-[96vh] bg-white dark:bg-zinc-900 rounded-[24px] md:rounded-[32px] overflow-hidden shadow-2xl flex flex-col border border-black/5 dark:border-white/10 overscroll-contain pointer-events-auto"
            >
              {/* Sticky header */}
              <div className="flex items-center justify-between px-6 sm:px-8 pt-6 sm:pt-8 pb-3 flex-shrink-0">
                {title && (
                  <div className="text-2xl font-bold dark:text-white tracking-tight">
                    {title}
                  </div>
                )}
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-white/5 text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition-all flex items-center justify-center border border-black/5 dark:border-white/5"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Scrollable content */}
              <div className="px-6 sm:px-8 overflow-y-auto overscroll-contain flex-1 pb-4">
                {children}
              </div>

              {/* Sticky footer */}
              {footer && (
                <div className="px-6 sm:px-8 pb-6 sm:pb-8 pt-3 flex-shrink-0 border-t border-zinc-200 dark:border-white/10">
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
