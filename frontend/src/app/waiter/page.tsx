"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart,
  BellRing,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle,
  ChefHat,
  History,
  CreditCard,
  Hash,
  Check,
  Receipt,
  Gift,
  Package,
  Sparkles,
  Tablet,
  X,
  Sun,
  Moon,
  LogOut,
  UtensilsCrossed,
  Languages,
  Bell,
  ShoppingBag,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { formatCurrency } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";
import { useCartStore } from "@/store/cart-store";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface OrderItem {
  id: number;
  quantity: number;
  price: string;
  notes?: string;
  isGift: boolean;
  delivered: boolean;
  product?: { name: Record<string, string>; image?: string };
  combo?: { name: Record<string, string>; image?: string };
}

interface Order {
  id: number;
  status: string;
  total: string;
  source?: string;
  sessionId?: string;
  billClosedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  items: OrderItem[];
}

interface Table {
  id: number;
  number: number;
  tableCode: string;
  name: string;
  status: string;
  orders: Order[];
}

const statusIcons: Record<string, any> = {
  pending: Clock,
  preparing: ChefHat,
  ready: CheckCircle,
};

const statusColors: Record<string, string> = {
  pending: "text-yellow-400",
  preparing: "text-blue-400",
  ready: "text-green-400",
};

const LANGUAGES = [
  { code: "tk", label: "Turkmen", flag: "🇹🇲" },
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "ru", label: "Russian", flag: "🇷🇺" },
  { code: "tr", label: "Turkish", flag: "🇹🇷" },
];

const LABELS = {
  title: { en: "Waiter Panel", tk: "Ofisiant paneli", ru: "Панель официанта", tr: "Garson Paneli" },
  tables: { en: "Tables", tk: "Stollar", ru: "Столы", tr: "Masalar" },
  subtitle: { en: "Manage orders and tables", tk: "Sargytlary we stollary dolandyryň", ru: "Управление заказами и столами", tr: "Siparişleri ve masaları yönetin" },
  closeBill: { en: "Close Bill", tk: "Hasaby ýap", ru: "Закрыть счет", tr: "Hesabi Kapat" },
  activeOrders: { en: "Active Orders", tk: "Işjeň sargytlar", ru: "Активные заказы", tr: "Aktif Siparisler" },
  noActiveOrders: { en: "No active orders", tk: "Işjeň sargyt ýok", ru: "Активных заказов нет", tr: "Aktif siparis yok" },
  waiterCalled: { en: "Waiter Called!", tk: "Ofisiant çagyryldy!", ru: "Вызвали официанта!", tr: "Garson Çağrıldı!" },
  viewHistory: { en: "View History", tk: "Taryhy gör", ru: "Посмотреть историю", tr: "Geçmişi Gör" },
  orderHistory: { en: "Order History", tk: "Sargyt taryhy", ru: "История заказов", tr: "Sipariş Geçmişi" },
  totalAmount: { en: "Total Amount", tk: "Jemi baha", ru: "Общая сумма", tr: "Toplam Tutar" },
  noHistory: { en: "No order history found", tk: "Sargyt taryhy tapylmady", ru: "История заказов не найдена", tr: "Sipariş geçmişi bulunamadı" },
  logout: { en: "Logout", tk: "Çykyş", ru: "Выход", tr: "Çıkış" },
  accept: { en: "Accept", tk: "Kabul et", ru: "Принять", tr: "Kabul Et" },
};

const WAITER_CALLS_KEY = "waiter_calls_active";

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
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(start); osc.stop(start + 0.4);
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
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(start); osc.stop(start + 0.5);
    });
    setTimeout(() => { try { ctx.close(); } catch {} }, 1500);
  } catch {}
}

export default function WaiterPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage } = useCartStore();

  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [waiterCalls, setWaiterCalls] = useState<Set<number>>(new Set());
  const [expandedTable, setExpandedTable] = useState<number | null>(null);
  const [historyTable, setHistoryTable] = useState<Table | null>(null);
  const [historyOrders, setHistoryOrders] = useState<Order[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [newOrderTables, setNewOrderTables] = useState<Set<number>>(new Set());
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const chimeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const langRef = useRef<HTMLDivElement>(null);

  const activeLang = LANGUAGES.find(l => l.code === language) || LANGUAGES[1];

  const t = (key: keyof typeof LABELS) =>
    LABELS[key][language as keyof (typeof LABELS)[typeof key]] || LABELS[key].en;

  const getLocalizedName = (nameObj: Record<string, string> | undefined): string => {
    if (!nameObj) return "Unknown Item";
    return nameObj[language] || nameObj["en"] || Object.values(nameObj)[0] || "Unknown Item";
  };

  const persistWaiterCalls = (calls: Set<number>) => {
    try { localStorage.setItem(WAITER_CALLS_KEY, JSON.stringify(Array.from(calls))); } catch {}
  };

  const acceptWaiterCall = (tableId: number) => {
    setWaiterCalls((prev) => {
      const next = new Set(prev);
      next.delete(tableId);
      persistWaiterCalls(next);
      return next;
    });
  };

  const fetchTables = async () => {
    try {
      const data = await api.get<Table[]>("/tables", true);
      setTables(data);
    } catch (error) {
      console.error("Failed to fetch tables:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(WAITER_CALLS_KEY);
      if (raw) {
        const arr = JSON.parse(raw) as number[];
        if (Array.isArray(arr) && arr.length) setWaiterCalls(new Set(arr));
      }
    } catch {}

    // Set waiter JWT token for authenticated API calls
    const waiterToken = localStorage.getItem('waiter_token');
    if (waiterToken) {
      localStorage.setItem('token', waiterToken);
    }

    fetchTables();

    const socket = getSocket();
    socket.emit("join-admin");

    socket.on("waiter-called", (data: any) => {
      setWaiterCalls((prev) => {
        const next = new Set(prev);
        next.add(data.tableId);
        persistWaiterCalls(next);
        return next;
      });
      toast(`Table ${data.tableNumber} needs a waiter!`, { icon: "🔔" });
      playWaiterChime();
    });

    socket.on("order-received", (data: any) => {
      if (data?.tableId) {
        setNewOrderTables((prev) => {
          const next = new Set(prev);
          next.add(data.tableId);
          return next;
        });
      }
      fetchTables();
      playNewOrderSound();
    });
    socket.on("order-status-updated", () => fetchTables());
    socket.on("table-updated", () => fetchTables());

    return () => {
      socket.off("waiter-called");
      socket.off("order-received");
      socket.off("order-status-updated");
      socket.off("table-updated");
    };
  }, []);

  useEffect(() => {
    if (waiterCalls.size > 0) {
      if (chimeIntervalRef.current) return;
      chimeIntervalRef.current = setInterval(() => playWaiterChime(), 3000);
    } else if (chimeIntervalRef.current) {
      clearInterval(chimeIntervalRef.current);
      chimeIntervalRef.current = null;
    }
    return () => {
      if (chimeIntervalRef.current) {
        clearInterval(chimeIntervalRef.current);
        chimeIntervalRef.current = null;
      }
    };
  }, [waiterCalls]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setShowLangDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCloseBill = async (table: Table) => {
    const total = table.orders.reduce((s, o) => s + parseFloat(o.total), 0);
    const undelivered = table.orders.filter((o) => o.status !== "delivered").length;
    if (undelivered > 0) {
      toast.error(`Cannot close bill: ${undelivered} order${undelivered === 1 ? " is" : "s are"} not yet delivered`);
      return;
    }
    const lines = [
      `Close bill for Table ${table.number}?`,
      `Total: ${formatCurrency(total)} (${table.orders.length} order${table.orders.length === 1 ? "" : "s"})`,
      "This will free the table for new customers.",
    ];
    if (!window.confirm(lines.join("\n\n"))) return;

    try {
      const res = await api.post<{ bill?: { total: number; ordersCount: number } }>(
        `/tables/${table.id}/close-bill`, {}, true
      );
      const billTotal = res?.bill?.total ?? total;
      toast.success(`Table ${table.number} closed · ${formatCurrency(billTotal)} settled`);
      setExpandedTable(null);
      fetchTables();
    } catch (error: any) {
      toast.error(error.message || "Failed to close bill");
    }
  };

  const toggleItemDelivered = async (orderId: number, itemId: number, tableId: number) => {
    const currentOrder = tables.flatMap((tb) => tb.orders).find((o) => o.id === orderId);
    const currentItem = currentOrder?.items.find((i) => i.id === itemId);
    const willBeDelivered = !currentItem?.delivered;
    const allWillBeDelivered =
      willBeDelivered && currentOrder?.items.every((i) => (i.id === itemId ? true : i.delivered)) === true;

    setTables((prev) =>
      prev.map((tb) => ({
        ...tb,
        orders: tb.orders.map((o) =>
          o.id === orderId
            ? {
                ...o,
                ...(allWillBeDelivered ? { status: "delivered" } : {}),
                items: o.items.map((item) => (item.id === itemId ? { ...item, delivered: !item.delivered } : item)),
              }
            : o
        ),
      }))
    );

    try {
      await api.put(`/orders/${orderId}/items/${itemId}/delivered`, {}, true);
      if (allWillBeDelivered && currentOrder?.status !== "delivered") {
        await api.put(`/orders/${orderId}/status`, { status: "delivered" }, true);
        toast.success(`All items delivered — Order #${orderId} marked as complete`);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to toggle item");
      fetchTables();
    }
  };

  const markOrderDelivered = async (orderId: number, tableNumber: number) => {
    setTables((prev) =>
      prev.map((tb) => ({
        ...tb,
        orders: tb.orders.map((o) =>
          o.id === orderId
            ? { ...o, status: "delivered", items: o.items.map((item) => ({ ...item, delivered: true })) }
            : o
        ),
      }))
    );
    try {
      await Promise.all([
        api.put(`/orders/${orderId}/items/deliver-all`, {}, true),
        api.put(`/orders/${orderId}/status`, { status: "delivered" }, true),
      ]);
      toast.success(`Order #${orderId} delivered (Table ${tableNumber})`);
    } catch (error: any) {
      toast.error(error.message || "Failed to mark delivered");
      fetchTables();
    }
  };

  const openHistory = async (table: Table) => {
    setHistoryTable(table);
    setHistoryLoading(true);
    try {
      const orders = await api.get<Order[]>(`/tables/${table.id}/history`, true);
      setHistoryOrders(orders);
    } catch {
      toast.error("Failed to load history");
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("waiter_authorized");
    localStorage.removeItem("waiter_token");
    localStorage.removeItem("token");
    router.push("/options");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "occupied": return "from-green-500 to-emerald-600";
      case "reserved": return "from-yellow-500 to-orange-600";
      default: return "from-gray-500 to-gray-600";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "occupied": return "success";
      case "reserved": return "warning";
      default: return "default";
    }
  };

  const getActiveTotal = (orders: Order[]) => {
    return orders.reduce((sum, o) => sum + parseFloat(o.total), 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-black/5 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
              <UtensilsCrossed size={20} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg dark:text-white leading-tight">{t("title")}</h1>
              <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">QR Menu</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Refresh */}
            <button
              onClick={() => fetchTables()}
              className="p-2.5 rounded-xl bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white/10 transition-all"
              title="Refresh"
            >
              <RefreshCw size={20} />
            </button>

            {/* Language */}
            <div className="relative" ref={langRef}>
              <button
                onClick={() => setShowLangDropdown(!showLangDropdown)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white/10 transition-all text-sm"
              >
                <span className="text-base leading-none">{activeLang.flag}</span>
                <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">{activeLang.code}</span>
                <ChevronDown size={14} className={`transition-transform duration-200 ${showLangDropdown ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {showLangDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-44 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-black/5 dark:border-white/10 overflow-hidden z-50"
                  >
                    <div className="p-1.5 space-y-0.5">
                      {LANGUAGES.map((lang) => (
                        <button key={lang.code}
                          onClick={() => { setLanguage(lang.code as any); setShowLangDropdown(false); }}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                            language === lang.code ? "bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white" : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-white/5"
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

            {/* Theme */}
            <button onClick={toggleTheme}
              className="p-2.5 rounded-xl bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white/10 transition-all">
              {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* Logout */}
            <button onClick={handleLogout}
              className="p-2.5 rounded-xl bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 hover:bg-red-100 dark:hover:bg-red-500/10 hover:text-red-500 transition-all"
              title={t("logout")}
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold dark:text-white">{t("tables")}</h2>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tables.map((table, index) => {
            const isExpanded = expandedTable === table.id;
            const activeOrders = table.orders;
            const activeTotal = getActiveTotal(activeOrders);

            return (
              <motion.div
                key={table.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className={`relative overflow-hidden transition-all ${
                    waiterCalls.has(table.id)
                      ? "border-2 border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.45)] bg-amber-500/5 animate-pulse"
                      : newOrderTables.has(table.id)
                        ? "border-2 border-emerald-400 shadow-[0_0_25px_rgba(52,211,153,0.4)] bg-emerald-500/5 animate-pulse"
                        : isExpanded ? "border-purple-500/40" : "hover:border-purple-500/20"
                  }`}
                >
                  {waiterCalls.has(table.id) && (
                    <button
                      onClick={(e) => { e.stopPropagation(); acceptWaiterCall(table.id); }}
                      className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-lg shadow-amber-500/40 transition-colors"
                    >
                      <Check size={14} /> {t("accept")}
                    </button>
                  )}

                  <CardContent className="p-0">
                    <button
                      onClick={() => {
                        const nextExpanded = isExpanded ? null : table.id;
                        setExpandedTable(nextExpanded);
                        if (nextExpanded !== null) {
                          setNewOrderTables((prev) => { const next = new Set(prev); next.delete(table.id); return next; });
                        }
                      }}
                      className="w-full p-4 text-left hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br ${
                          waiterCalls.has(table.id) ? "from-amber-400 to-red-500"
                            : newOrderTables.has(table.id) ? "from-emerald-400 to-green-600"
                            : getStatusColor(table.status)
                        } flex items-center justify-center shadow-lg flex-shrink-0`}>
                          <span className="text-white text-xl font-bold">{table.number}</span>
                          {newOrderTables.has(table.id) && !waiterCalls.has(table.id) && (
                            <motion.div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-950 flex items-center justify-center shadow-lg"
                              animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
                              <Sparkles size={13} className="text-white" />
                            </motion.div>
                          )}
                          {waiterCalls.has(table.id) && (
                            <motion.div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-red-500 border-2 border-white dark:border-zinc-950 flex items-center justify-center shadow-lg"
                              animate={{ rotate: [0, -18, 18, -18, 18, 0], scale: [1, 1.15, 1, 1.15, 1, 1] }}
                              transition={{ repeat: Infinity, duration: 1.2 }}>
                              <BellRing size={14} className="text-white" />
                            </motion.div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-semibold">{table.name || `Table ${table.number}`}</p>
                            <Badge variant={getStatusBadge(table.status) as any}>{table.status}</Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Hash size={11} /><span className="font-mono">{table.tableCode || "---"}</span>
                          </div>
                          {activeOrders.length > 0 && (
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <ShoppingCart size={11} /> {activeOrders.length} order{activeOrders.length > 1 ? "s" : ""}
                              </span>
                              <span className="text-xs font-semibold text-purple-400">{formatCurrency(activeTotal)}</span>
                              {newOrderTables.has(table.id) && (
                                <span className="text-[10px] font-bold text-emerald-400 animate-pulse">NEW ORDER!</span>
                              )}
                            </div>
                          )}
                        </div>
                        {isExpanded ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                      </div>
                    </button>

                    {/* Expanded Section */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden border-t border-border"
                        >
                          <div className="p-4 space-y-3">
                            {activeOrders.length > 0 ? (
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("activeOrders")}</p>
                                {activeOrders.map((order, idxInBill) => {
                                  const StatusIcon = statusIcons[order.status] || Clock;
                                  const isDelivered = order.status === "delivered";
                                  return (
                                    <div key={order.id} className={`glass rounded-xl p-3 transition-all ${isDelivered ? "opacity-50" : ""}`}>
                                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <label htmlFor={`w-order-${order.id}`} className="relative flex items-center cursor-pointer group/cb"
                                            onClick={(e) => e.stopPropagation()}>
                                            <input id={`w-order-${order.id}`} type="checkbox" checked={isDelivered} disabled={isDelivered}
                                              onChange={() => markOrderDelivered(order.id, table.number)} className="sr-only" />
                                            <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all group-hover/cb:border-emerald-400 ${isDelivered ? "bg-emerald-500 border-emerald-500" : "dark:border-white/20 border-zinc-600 bg-white/5"}`}>
                                              {isDelivered && <CheckCircle size={12} className="text-white" />}
                                            </span>
                                          </label>
                                          <StatusIcon size={14} className={statusColors[order.status] || "text-muted-foreground"} />
                                          <span className={`text-sm font-medium ${isDelivered ? "line-through" : ""}`}>Order #{idxInBill + 1}</span>
                                          <span className="text-[10px] text-muted-foreground font-mono">(id #{order.id})</span>
                                          <Badge variant={isDelivered ? "success" : order.status === "pending" ? "warning" : order.status === "ready" ? "success" : "default" as any}>
                                            {isDelivered ? "delivered" : order.status}
                                          </Badge>
                                          {order.source === "tablet" && (
                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                              <Tablet size={10} /> Tablet
                                            </span>
                                          )}
                                        </div>
                                        <span className="text-sm font-semibold text-purple-400">{formatCurrency(parseFloat(order.total))}</span>
                                      </div>
                                      <div className="space-y-1.5 mt-1">
                                        {order.items.map((item) => {
                                          const itemName = getLocalizedName(item.combo?.name || item.product?.name);
                                          return (
                                            <div key={item.id} className="flex items-center gap-2 text-xs group/item">
                                              <label className="relative flex items-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                                <input type="checkbox" checked={item.delivered}
                                                  onChange={() => toggleItemDelivered(order.id, item.id, table.id)} className="sr-only" />
                                                <span className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                                                  item.delivered ? "bg-emerald-500 border-emerald-500" : "border-zinc-600 dark:border-white/20 hover:border-emerald-400"}`}>
                                                  {item.delivered && <Check size={10} className="text-white" />}
                                                </span>
                                              </label>
                                              <span className={`flex-1 ${item.delivered ? "line-through text-muted-foreground" : ""}`}>
                                                {item.quantity}× {itemName}
                                              </span>
                                              {item.isGift && <Gift size={12} className="text-purple-400" />}
                                              {item.notes && <span className="text-muted-foreground italic truncate max-w-[120px]">"{item.notes}"</span>}
                                              <span className="text-muted-foreground">{formatCurrency(parseFloat(item.price) * item.quantity)}</span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground text-center py-4">{t("noActiveOrders")}</p>
                            )}

                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                              <Button variant="outline" size="sm" onClick={() => openHistory(table)} className="flex-1">
                                <History size={14} className="mr-1" /> {t("viewHistory")}
                              </Button>
                              {activeOrders.length > 0 && (
                                <Button variant="default" size="sm" onClick={() => handleCloseBill(table)} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                                  <CreditCard size={14} className="mr-1" /> {t("closeBill")}
                                </Button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </main>

      {/* History Modal */}
      <AnimatePresence>
        {historyTable && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setHistoryTable(null)} />
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col bg-white dark:bg-zinc-900 rounded-3xl border border-black/5 dark:border-white/10 shadow-2xl pointer-events-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/5">
                  <div>
                    <h3 className="font-bold dark:text-white">{t("orderHistory")} — {historyTable.name || `Table ${historyTable.number}`}</h3>
                  </div>
                  <button onClick={() => setHistoryTable(null)} className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-white/5 flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-white">
                    <X size={16} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                  {historyLoading ? (
                    <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
                  ) : historyOrders.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-12">{t("noHistory")}</p>
                  ) : (
                    <div className="space-y-3">
                      {historyOrders.map((order) => (
                        <div key={order.id} className="glass rounded-xl p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Receipt size={14} className="text-muted-foreground" />
                              <span className="text-sm font-medium">Order #{order.id}</span>
                              <Badge variant={order.status === "delivered" ? "success" : "default" as any}>{order.status}</Badge>
                            </div>
                            <span className="text-sm font-bold text-purple-400">{formatCurrency(parseFloat(order.total))}</span>
                          </div>
                          <div className="space-y-1">
                            {order.items.map((item) => (
                              <div key={item.id} className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>{item.quantity}× {getLocalizedName(item.combo?.name || item.product?.name)}</span>
                                <span>{formatCurrency(parseFloat(item.price) * item.quantity)}</span>
                              </div>
                            ))}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-2">{new Date(order.createdAt).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
