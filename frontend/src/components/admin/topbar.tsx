import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Bell, X, Sun, Moon, Languages, ChevronDown, Check, ShoppingBag, UtensilsCrossed, Gift } from 'lucide-react';
import { getSocket } from '@/lib/socket';
import { useTheme } from '@/components/theme-provider';
import { useCartStore } from '@/store/cart-store';

const LANGUAGES = [
  { code: "tk", label: "Turkmen", flag: "🇹🇲" },
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "ru", label: "Russian", flag: "🇷🇺" },
  { code: "tr", label: "Turkish", flag: "🇹🇷" },
];

interface Notification {
  id: string;
  type: 'order' | 'waiter' | 'gift';
  message: string;
  timestamp: string;
  dismissed: boolean;
}

interface TopbarProps {
  onMenuToggle: () => void;
}

// ───── Sound helpers ─────

function playNewOrderSound() {
  if (typeof window === "undefined") return;
  try {
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [523, 659, 784, 1047].forEach((freq, i) => {
      const start = now + i * 0.12;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.22, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.4);
    });
    setTimeout(() => { try { ctx.close(); } catch {} }, 1500);
  } catch {}
}

function playWaiterChime() {
  if (typeof window === "undefined") return;
  try {
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [880, 1175, 1480].forEach((freq, i) => {
      const start = now + i * 0.16;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.28, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.5);
    });
    setTimeout(() => { try { ctx.close(); } catch {} }, 1500);
  } catch {}
}

function playGiftSound() {
  if (typeof window === "undefined") return;
  try {
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [660, 880].forEach((freq, i) => {
      const start = now + i * 0.2;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.2, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.45);
    });
    setTimeout(() => { try { ctx.close(); } catch {} }, 1200);
  } catch {}
}

// ───── Component ─────

export function AdminTopbar({ onMenuToggle }: TopbarProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLanguages, setShowLanguages] = useState(false);
  const [activePopup, setActivePopup] = useState<Notification | null>(null);
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage } = useCartStore();
  const langRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const chimeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeWaiterCalls = useRef(0);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setShowLanguages(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const pushNotification = useCallback((notif: Notification) => {
    setNotifications((prev) => [notif, ...prev].slice(0, 50));
    setActivePopup(notif);
  }, []);

  // Auto-dismiss popup after 8 seconds if not waiter call
  useEffect(() => {
    if (!activePopup || activePopup.type === 'waiter') return;
    const t = setTimeout(() => setActivePopup(null), 8000);
    return () => clearTimeout(t);
  }, [activePopup]);

  // Socket listeners — these fire on EVERY admin page
  useEffect(() => {
    const socket = getSocket();
    socket.emit('join-admin');

    socket.on('order-received', (order: any) => {
      const notif: Notification = {
        id: `order-${Date.now()}`,
        type: 'order',
        message: `Table ${order.table?.number || order.tableId}`,
        timestamp: new Date().toISOString(),
        dismissed: false,
      };
      pushNotification(notif);
      playNewOrderSound();
    });

    socket.on('waiter-called', (data: any) => {
      const notif: Notification = {
        id: `waiter-${Date.now()}-${data.tableId}`,
        type: 'waiter',
        message: `Table ${data.tableNumber}`,
        timestamp: data.timestamp || new Date().toISOString(),
        dismissed: false,
      };
      pushNotification(notif);
      playWaiterChime();
      activeWaiterCalls.current += 1;
    });

    socket.on('gift-sent', (gift: any) => {
      const notif: Notification = {
        id: `gift-${Date.now()}`,
        type: 'gift',
        message: `Table ${gift.senderTable?.number} → Table ${gift.receiverTable?.number}`,
        timestamp: new Date().toISOString(),
        dismissed: false,
      };
      pushNotification(notif);
      playGiftSound();
    });

    return () => {
      socket.off('order-received');
      socket.off('waiter-called');
      socket.off('gift-sent');
    };
  }, [pushNotification]);

  // Repeating chime for undismissed waiter calls
  useEffect(() => {
    const undismissedWaiters = notifications.filter(n => n.type === 'waiter' && !n.dismissed).length;
    if (undismissedWaiters > 0) {
      if (chimeIntervalRef.current) return;
      chimeIntervalRef.current = setInterval(() => playWaiterChime(), 4000);
    } else {
      if (chimeIntervalRef.current) {
        clearInterval(chimeIntervalRef.current);
        chimeIntervalRef.current = null;
      }
    }
    return () => {
      if (chimeIntervalRef.current && undismissedWaiters === 0) {
        clearInterval(chimeIntervalRef.current);
        chimeIntervalRef.current = null;
      }
    };
  }, [notifications]);

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, dismissed: true } : n));
    if (activePopup?.id === id) setActivePopup(null);
  };

  const dismissPopup = () => {
    if (activePopup) {
      dismissNotification(activePopup.id);
    }
  };

  const clearAll = () => {
    setNotifications([]);
    setActivePopup(null);
    if (chimeIntervalRef.current) {
      clearInterval(chimeIntervalRef.current);
      chimeIntervalRef.current = null;
    }
  };

  const undismissedCount = notifications.filter(n => !n.dismissed).length;
  const activeLang = LANGUAGES.find(l => l.code === language) || LANGUAGES[1];

  const popupConfig = {
    order: { icon: ShoppingBag, label: 'New Order', color: 'emerald', bg: 'bg-emerald-500', ring: 'ring-emerald-500/30' },
    waiter: { icon: UtensilsCrossed, label: 'Waiter Called', color: 'amber', bg: 'bg-amber-500', ring: 'ring-amber-500/30' },
    gift: { icon: Gift, label: 'Gift Sent', color: 'indigo', bg: 'bg-indigo-500', ring: 'ring-indigo-500/30' },
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-black/5 dark:border-white/5 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 rounded-xl bg-zinc-50 dark:bg-white/5 hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors"
          >
            <Menu size={20} className="text-zinc-600 dark:text-zinc-400" />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            {/* Language Selector */}
            <div className="relative" ref={langRef}>
              <button
                onClick={() => setShowLanguages(!showLanguages)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-50 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/10 transition-all border border-transparent hover:border-black/5 dark:hover:border-white/5"
              >
                <span className="text-base leading-none">{activeLang.flag}</span>
                <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">{activeLang.code}</span>
                <ChevronDown size={14} className={`transition-transform duration-200 ${showLanguages ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showLanguages && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-black/5 dark:border-white/10 overflow-hidden"
                  >
                    <div className="p-1.5 space-y-0.5">
                      {LANGUAGES.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => {
                            setLanguage(lang.code as any);
                            setShowLanguages(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                            language === lang.code
                              ? 'bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white'
                              : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-base leading-none">{lang.flag}</span>
                            <span>{lang.label}</span>
                          </div>
                          {language === lang.code && <Check size={14} />}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl bg-zinc-50 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/10 transition-all border border-transparent hover:border-black/5 dark:hover:border-white/5"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`relative p-2.5 rounded-xl transition-all border border-transparent ${
                  showNotifications
                    ? 'bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white border-black/5 dark:border-white/10'
                    : 'bg-zinc-50 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/10 hover:border-black/5 dark:hover:border-white/5'
                }`}
              >
                <Bell size={20} />
                {undismissedCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold border-2 border-white dark:border-zinc-950"
                  >
                    {undismissedCount > 9 ? '9+' : undismissedCount}
                  </motion.span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-80 bg-white dark:bg-zinc-900 rounded-[24px] shadow-2xl border border-black/5 dark:border-white/10 overflow-hidden"
                  >
                    <div className="p-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
                      <h3 className="font-bold text-sm dark:text-white">Notifications</h3>
                      {notifications.length > 0 && (
                        <button
                          onClick={clearAll}
                          className="text-[10px] font-bold uppercase tracking-wider text-red-500 hover:text-red-600"
                        >
                          Clear all
                        </button>
                      )}
                    </div>
                    <div className="max-h-96 overflow-y-auto p-3 space-y-2">
                      {notifications.length === 0 ? (
                        <div className="text-center py-10">
                          <div className="w-12 h-12 bg-zinc-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Bell size={20} className="text-zinc-300 dark:text-zinc-700" />
                          </div>
                          <p className="text-xs text-zinc-400">
                            Everything's quiet right now
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {notifications.map((notif) => {
                            const cfg = popupConfig[notif.type];
                            return (
                              <motion.div
                                key={notif.id}
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className={`p-3 rounded-xl text-[13px] border flex items-start gap-3 ${
                                  notif.dismissed ? 'opacity-40' : ''
                                } ${
                                  notif.type === 'order'
                                    ? 'bg-emerald-50/50 dark:bg-emerald-500/10 border-emerald-100/50 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-400'
                                    : notif.type === 'waiter'
                                    ? 'bg-amber-50/50 dark:bg-amber-500/10 border-amber-100/50 dark:border-amber-500/20 text-amber-800 dark:text-amber-400'
                                    : 'bg-indigo-50/50 dark:bg-indigo-500/10 border-indigo-100/50 dark:border-indigo-500/20 text-indigo-800 dark:text-indigo-400'
                                }`}
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-70 mb-0.5">{cfg.label}</p>
                                  <p className="font-bold">{notif.message}</p>
                                  <p className="text-[10px] opacity-60 mt-0.5">
                                    {new Date(notif.timestamp).toLocaleTimeString()}
                                  </p>
                                </div>
                                {!notif.dismissed && (
                                  <button
                                    onClick={() => dismissNotification(notif.id)}
                                    className="shrink-0 p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                                  >
                                    <X size={14} />
                                  </button>
                                )}
                              </motion.div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* ───── Persistent Notification Popup ───── */}
      <AnimatePresence>
        {activePopup && (
          <motion.div
            key={activePopup.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed top-20 right-6 z-50 w-80"
          >
            {(() => {
              const cfg = popupConfig[activePopup.type];
              const Icon = cfg.icon;
              return (
                <div
                  className={`rounded-2xl shadow-2xl border border-white/10 overflow-hidden ring-4 ${cfg.ring} ${
                    activePopup.type === 'waiter' ? 'animate-pulse' : ''
                  }`}
                >
                  <div className={`${cfg.bg} px-4 py-3 flex items-center gap-3`}>
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                      <Icon size={20} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white/70 text-[10px] font-bold uppercase tracking-wider">{cfg.label}</p>
                      <p className="text-white font-bold text-lg truncate">{activePopup.message}</p>
                    </div>
                    <button
                      onClick={dismissPopup}
                      className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  {activePopup.type === 'waiter' && (
                    <div className="bg-amber-600 px-4 py-2 text-center">
                      <button
                        onClick={dismissPopup}
                        className="text-white text-xs font-bold uppercase tracking-wider hover:underline"
                      >
                        Accept / Dismiss
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
