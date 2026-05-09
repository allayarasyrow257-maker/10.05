"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  ShoppingCart,
  BellRing,
  QrCode,
  Download,
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
  Lock,
  Gift,
  Package,
  Sparkles,
  Tablet,
  Key,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { formatCurrency } from "@/lib/utils";
import { QRCodeCanvas } from "qrcode.react";
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
  tabletPin?: string;
  status: string;
  orders: Order[];
}

const BASE_URL =
  typeof window !== "undefined"
    ? window.location.origin.replace("localhost", window.location.hostname)
    : "http://localhost:3000";

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

import { useCartStore } from "@/store/cart-store";

const LABELS = {
  tables: { en: "Tables", tk: "Stollar", ru: "Столы", tr: "Masalar" },
  subtitle: {
    en: "Manage restaurant seating and QR codes",
    tk: "Restoran oturgyçlaryny we QR kodlaryny dolandyryň",
    ru: "Управление столами и QR-кодами ресторана",
    tr: "Restoran oturma planini ve QR kodlarini yonetin",
  },
  addTable: {
    en: "Add Table",
    tk: "Stol goş",
    ru: "Добавить стол",
    tr: "Masa Ekle",
  },
  tableNumber: {
    en: "Table Number",
    tk: "Stol belgisi",
    ru: "Номер стола",
    tr: "Masa Numarasi",
  },
  tableName: {
    en: "Table Name",
    tk: "Stol ady (islege görä)",
    ru: "Название стола (опционально)",
    tr: "Masa Adi (istege bagli)",
  },
  cancel: { en: "Cancel", tk: "Yza al", ru: "Отмена", tr: "Iptal" },
  create: { en: "Create", tk: "Döret", ru: "Создать", tr: "Olustur" },
  orderHistory: {
    en: "Order History",
    tk: "Sargyt taryhy",
    ru: "История заказов",
    tr: "Siparis Gecmisi",
  },
  closeBill: {
    en: "Close Bill",
    tk: "Hasaby ýap",
    ru: "Закрыть счет",
    tr: "Hesabi Kapat",
  },
  activeOrders: {
    en: "Active Orders",
    tk: "Işjeň sargytlar",
    ru: "Активные заказы",
    tr: "Aktif Siparisler",
  },
  noActiveOrders: {
    en: "No active orders",
    tk: "Işjeň sargyt ýok",
    ru: "Активных заказов нет",
    tr: "Aktif siparis yok",
  },
  downloadQR: {
    en: "Download QR",
    tk: "QR göçürip al",
    ru: "Скачать QR",
    tr: "QR Indir",
  },
  waiterCalled: {
    en: "Waiter Called!",
    tk: "Ofisiant çagyryldy!",
    ru: "Вызвали официанта!",
    tr: "Garson Cagrildi!",
  },
  viewHistory: {
    en: "View History",
    tk: "Taryhy gör",
    ru: "Посмотреть историю",
    tr: "Gecmisi Gor",
  },
  totalAmount: {
    en: "Total Amount",
    tk: "Jemi baha",
    ru: "Общая сумма",
    tr: "Toplam Tutar",
  },
  noHistory: {
    en: "No order history found for this table",
    tk: "Bu stol üçin sargyt taryhy tapylmady",
    ru: "История заказов для этого стола не найдена",
    tr: "Bu masa icin siparis gecmisi bulunamadi",
  },
};

const WAITER_CALLS_KEY = "waiter_calls_active";

function playNewOrderSound() {
  if (typeof window === "undefined") return;
  try {
    const Ctx = (window.AudioContext ||
      (window as any).webkitAudioContext) as typeof AudioContext;
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
    const Ctx = (window.AudioContext ||
      (window as any).webkitAudioContext) as typeof AudioContext;
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
    setTimeout(() => {
      try {
        ctx.close();
      } catch {}
    }, 1500);
  } catch {
    /* audio unavailable / blocked */
  }
}

export default function TablesPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState("");
  const [newTableName, setNewTableName] = useState("");
  const [newTablePin, setNewTablePin] = useState("");
  const [pinEditTable, setPinEditTable] = useState<Table | null>(null);
  const [pinEditValue, setPinEditValue] = useState("");
  const [savingPin, setSavingPin] = useState(false);
  const [waiterCalls, setWaiterCalls] = useState<Set<number>>(new Set());
  const [qrTable, setQrTable] = useState<Table | null>(null);
  const [expandedTable, setExpandedTable] = useState<number | null>(null);
  const [historyTable, setHistoryTable] = useState<Table | null>(null);
  const [historyOrders, setHistoryOrders] = useState<Order[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [newOrderTables, setNewOrderTables] = useState<Set<number>>(new Set());
  const qrRef = useRef<HTMLDivElement>(null);
  const chimeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { language } = useCartStore();

  const t = (key: keyof typeof LABELS) =>
    LABELS[key][language as keyof (typeof LABELS)[typeof key]] ||
    LABELS[key].en;

  const persistWaiterCalls = (calls: Set<number>) => {
    try {
      localStorage.setItem(WAITER_CALLS_KEY, JSON.stringify(Array.from(calls)));
    } catch {}
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
    // Restore active calls from previous session
    try {
      const raw = localStorage.getItem(WAITER_CALLS_KEY);
      if (raw) {
        const arr = JSON.parse(raw) as number[];
        if (Array.isArray(arr) && arr.length) setWaiterCalls(new Set(arr));
      }
    } catch {}

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

  // Loop chime while there's at least one active waiter call
  useEffect(() => {
    if (waiterCalls.size > 0) {
      if (chimeIntervalRef.current) return;
      chimeIntervalRef.current = setInterval(() => playWaiterChime(), 3000);
    } else if (chimeIntervalRef.current) {
      clearInterval(chimeIntervalRef.current);
      chimeIntervalRef.current = null;
    }
    return () => {
      if (chimeIntervalRef.current && waiterCalls.size === 0) {
        clearInterval(chimeIntervalRef.current);
        chimeIntervalRef.current = null;
      }
    };
  }, [waiterCalls]);

  const handleCreateTable = async () => {
    if (!newTableNumber) return;
    try {
      await api.post(
        "/tables",
        {
          number: parseInt(newTableNumber),
          name: newTableName || `Table ${newTableNumber}`,
          tabletPin: newTablePin || undefined,
        },
        true,
      );
      setShowCreate(false);
      setNewTableNumber("");
      setNewTableName("");
      setNewTablePin("");
      fetchTables();
      toast.success("Table created");
    } catch (error: any) {
      toast.error(error.message || "Failed to create table");
    }
  };

  const handleSavePin = async () => {
    if (!pinEditTable) return;
    if (pinEditValue && !/^\d{4,6}$/.test(pinEditValue)) {
      toast.error("PIN must be 4-6 digits");
      return;
    }
    setSavingPin(true);
    try {
      await api.put(`/tables/${pinEditTable.id}`, { tabletPin: pinEditValue || null }, true);
      toast.success(pinEditValue ? "Tablet PIN updated" : "Tablet PIN removed");
      setPinEditTable(null);
      fetchTables();
    } catch (error: any) {
      toast.error(error.message || "Failed to update PIN");
    } finally {
      setSavingPin(false);
    }
  };

  const handleCloseBill = async (table: Table) => {
    const total = table.orders.reduce((s, o) => s + parseFloat(o.total), 0);
    const undelivered = table.orders.filter(
      (o) => o.status !== "delivered",
    ).length;
    if (undelivered > 0) {
      toast.error(
        `Cannot close bill: ${undelivered} order${undelivered === 1 ? " is" : "s are"} not yet delivered`,
      );
      return;
    }
    const lines = [
      `Close bill for Table ${table.number}?`,
      `Total: ${formatCurrency(total)} (${table.orders.length} order${table.orders.length === 1 ? "" : "s"})`,
    ];
    lines.push("This will free the table for new customers.");
    if (!window.confirm(lines.join("\n\n"))) return;

    try {
      const res = await api.post<{
        bill?: { total: number; ordersCount: number };
      }>(`/tables/${table.id}/close-bill`, {}, true);
      const billTotal = res?.bill?.total ?? total;
      toast.success(
        `Table ${table.number} closed · ${formatCurrency(billTotal)} settled`,
      );
      setExpandedTable(null);
      fetchTables();
    } catch (error: any) {
      toast.error(error.message || "Failed to close bill");
    }
  };

  const toggleItemDelivered = async (orderId: number, itemId: number, tableId: number) => {
    // Optimistic UI
    setTables((prev) =>
      prev.map((tb) => ({
        ...tb,
        orders: tb.orders.map((o) =>
          o.id === orderId
            ? {
                ...o,
                items: o.items.map((item) =>
                  item.id === itemId ? { ...item, delivered: !item.delivered } : item
                ),
              }
            : o
        ),
      }))
    );
    try {
      await api.put(`/orders/${orderId}/items/${itemId}/delivered`, {}, true);
    } catch (error: any) {
      toast.error(error.message || "Failed to toggle item");
      fetchTables();
    }
  };

  const markOrderDelivered = async (orderId: number, tableNumber: number) => {
    // Optimistic UI: keep the order visible, just flip its status to delivered.
    // It stays in the active list until "Close Bill" archives the session.
    setTables((prev) =>
      prev.map((tb) => ({
        ...tb,
        orders: tb.orders.map((o) =>
          o.id === orderId ? { ...o, status: "delivered" } : o,
        ),
      })),
    );
    try {
      await api.put(`/orders/${orderId}/status`, { status: "delivered" }, true);
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
      const orders = await api.get<Order[]>(
        `/tables/${table.id}/history`,
        true,
      );
      setHistoryOrders(orders);
    } catch {
      toast.error("Failed to load history");
    } finally {
      setHistoryLoading(false);
    }
  };

  const getMenuUrl = (table: Table) =>
    `${BASE_URL}/menu?table=${table.tableCode || table.number}`;

  const downloadQR = (table: Table) => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;
    const exportCanvas = document.createElement("canvas");
    const ctx = exportCanvas.getContext("2d")!;
    const padding = 40;
    const textHeight = 50;
    exportCanvas.width = canvas.width + padding * 2;
    exportCanvas.height = canvas.height + padding * 2 + textHeight;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    ctx.drawImage(canvas, padding, padding);
    ctx.fillStyle = "#000000";
    ctx.font = "bold 24px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
      table.name || `Table ${table.number}`,
      exportCanvas.width / 2,
      canvas.height + padding + 35,
    );
    const link = document.createElement("a");
    link.download = `table-${table.number}-qr.png`;
    link.href = exportCanvas.toDataURL("image/png");
    link.click();
    toast.success("QR code downloaded");
  };

  const downloadAllQR = async () => {
    const { QRCodeCanvas: QRC } = await import("qrcode.react");
    const React = await import("react");
    const { createRoot } = await import("react-dom/client");
    for (const table of tables) {
      const wrapper = document.createElement("div");
      wrapper.style.position = "fixed";
      wrapper.style.left = "-9999px";
      document.body.appendChild(wrapper);
      const root = createRoot(wrapper);
      root.render(
        React.createElement(QRC, {
          value: getMenuUrl(table),
          size: 256,
          level: "H",
        }),
      );
      await new Promise((r) => setTimeout(r, 150));
      const canvas = wrapper.querySelector("canvas");
      if (canvas) {
        const exportCanvas = document.createElement("canvas");
        const ctx = exportCanvas.getContext("2d")!;
        const padding = 40,
          textHeight = 50;
        exportCanvas.width = canvas.width + padding * 2;
        exportCanvas.height = canvas.height + padding * 2 + textHeight;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
        ctx.drawImage(canvas, padding, padding);
        ctx.fillStyle = "#000000";
        ctx.font = "bold 24px Arial";
        ctx.textAlign = "center";
        ctx.fillText(
          table.name || `Table ${table.number}`,
          exportCanvas.width / 2,
          canvas.height + padding + 35,
        );
        const link = document.createElement("a");
        link.download = `table-${table.number}-qr.png`;
        link.href = exportCanvas.toDataURL("image/png");
        link.click();
      }
      root.unmount();
      wrapper.remove();
    }
    toast.success(`${tables.length} QR codes downloaded`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "occupied":
        return "from-green-500 to-emerald-600";
      case "reserved":
        return "from-yellow-500 to-orange-600";
      default:
        return "from-gray-500 to-gray-600";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "occupied":
        return "success";
      case "reserved":
        return "warning";
      default:
        return "default";
    }
  };

  const getActiveTotal = (orders: Order[]) => {
    return orders.reduce((sum, o) => sum + parseFloat(o.total), 0);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">{t("tables")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={downloadAllQR}>
            <Download size={18} className="mr-2" />
            {language === "tk"
              ? "Ähli QR göçürip al"
              : language === "ru"
                ? "Скачать все QR"
                : language === "tr"
                  ? "Tum QR lari Indir"
                  : "Export All QR"}
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={18} className="mr-2" />
            {t("addTable")}
          </Button>
        </div>
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
                      : isExpanded
                        ? "border-purple-500/40"
                        : "hover:border-purple-500/20"
                }`}
              >
                {waiterCalls.has(table.id) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      acceptWaiterCall(table.id);
                    }}
                    className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-lg shadow-amber-500/40 transition-colors"
                    title="Mark as accepted"
                  >
                    <Check size={14} />
                    {language === "tr"
                      ? "Kabul Et"
                      : language === "tk"
                        ? "Kabul et"
                        : language === "ru"
                          ? "Принять"
                          : "Accept"}
                  </button>
                )}

                <CardContent className="p-0">
                  {/* Table header - clickable */}
                  <button
                    onClick={() => {
                      const nextExpanded = isExpanded ? null : table.id;
                      setExpandedTable(nextExpanded);
                      if (nextExpanded !== null) {
                        setNewOrderTables((prev) => {
                          const next = new Set(prev);
                          next.delete(table.id);
                          return next;
                        });
                      }
                    }}
                    className="w-full p-4 text-left hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br ${
                          waiterCalls.has(table.id)
                            ? "from-amber-400 to-red-500"
                            : newOrderTables.has(table.id)
                              ? "from-emerald-400 to-green-600"
                              : getStatusColor(table.status)
                        } flex items-center justify-center shadow-lg flex-shrink-0`}
                      >
                        <span className="text-white text-xl font-bold">
                          {table.number}
                        </span>
                        {newOrderTables.has(table.id) && !waiterCalls.has(table.id) && (
                          <motion.div
                            className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-950 flex items-center justify-center shadow-lg"
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ repeat: Infinity, duration: 1, ease: "easeInOut" }}
                          >
                            <Sparkles size={13} className="text-white" />
                          </motion.div>
                        )}
                        {waiterCalls.has(table.id) && (
                          <motion.div
                            className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-red-500 border-2 border-white dark:border-zinc-950 flex items-center justify-center shadow-lg"
                            animate={{
                              rotate: [0, -18, 18, -18, 18, 0],
                              scale: [1, 1.15, 1, 1.15, 1, 1],
                            }}
                            transition={{
                              repeat: Infinity,
                              duration: 1.2,
                              ease: "easeInOut",
                            }}
                          >
                            <BellRing size={14} className="text-white" />
                          </motion.div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-semibold">
                            {table.name || `Table ${table.number}`}
                          </p>
                          <Badge variant={getStatusBadge(table.status) as any}>
                            {table.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Hash size={11} />
                          <span className="font-mono">
                            {table.tableCode || "---"}
                          </span>
                        </div>
                        {activeOrders.length > 0 && (
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <ShoppingCart size={11} />
                              {activeOrders.length} order
                              {activeOrders.length > 1 ? "s" : ""}
                            </span>
                            <span className="text-xs font-semibold text-purple-400">
                              {formatCurrency(activeTotal)}
                            </span>
                            {newOrderTables.has(table.id) && (
                              <span className="text-[10px] font-bold text-emerald-400 animate-pulse">
                                NEW ORDER!
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronUp
                            size={18}
                            className="text-muted-foreground"
                          />
                        ) : (
                          <ChevronDown
                            size={18}
                            className="text-muted-foreground"
                          />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Expanded dropdown */}
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
                          {/* Active orders — re-numbered per current open bill (#1, #2 …) */}
                          {activeOrders.length > 0 ? (
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Active Orders
                              </p>
                              {activeOrders.map((order, idxInBill) => {
                                const StatusIcon =
                                  statusIcons[order.status] || Clock;
                                const isDelivered =
                                  order.status === "delivered";
                                return (
                                  <div
                                    key={order.id}
                                    className={`glass rounded-xl p-3 transition-all ${isDelivered ? "opacity-50" : ""}`}
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <label
                                          className="relative flex items-center cursor-pointer group/cb"
                                          title={
                                            isDelivered
                                              ? "Already delivered"
                                              : "Mark as delivered"
                                          }
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isDelivered}
                                            disabled={isDelivered}
                                            onChange={() =>
                                              markOrderDelivered(
                                                order.id,
                                                table.number,
                                              )
                                            }
                                            className="peer sr-only"
                                          />
                                          <span className="w-5 h-5 rounded-md border-2 border-white/20 bg-white/5 flex items-center justify-center transition-all peer-checked:bg-emerald-500 peer-checked:border-emerald-500 group-hover/cb:border-emerald-400">
                                            {isDelivered && (
                                              <CheckCircle
                                                size={12}
                                                className="text-white"
                                              />
                                            )}
                                          </span>
                                        </label>
                                        <StatusIcon
                                          size={14}
                                          className={
                                            statusColors[order.status] ||
                                            "text-muted-foreground"
                                          }
                                        />
                                        <span
                                          className={`text-sm font-medium ${isDelivered ? "line-through" : ""}`}
                                        >
                                          Order #{idxInBill + 1}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground font-mono">
                                          (id #{order.id})
                                        </span>
                                        <Badge
                                          variant={
                                            isDelivered
                                              ? "success"
                                              : order.status === "pending"
                                                ? "warning"
                                                : order.status === "ready"
                                                  ? "success"
                                                  : "default"
                                          }
                                        >
                                          {isDelivered
                                            ? "delivered"
                                            : order.status}
                                        </Badge>
                                        {order.source === "tablet" && (
                                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                            <Tablet size={10} /> Tablet
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-sm font-semibold text-purple-400">
                                        {formatCurrency(
                                          parseFloat(order.total),
                                        )}
                                      </span>
                                    </div>
                                    <div className="space-y-1.5 mt-1">
                                      {order.items.map((item) => {
                                        const itemName = item.combo?.name?.en ||
                                          (item.combo?.name
                                            ? Object.values(item.combo.name)[0]
                                            : item.product?.name?.en ||
                                              (item.product?.name
                                                ? Object.values(item.product.name)[0]
                                                : "Unknown Item"));
                                        const isCombo = !!item.combo;
                                        const isGiftItem = item.isGift;
                                        const isItemDelivered = item.delivered;

                                        // ── GIFT ITEM ──
                                        if (isGiftItem) {
                                          return (
                                            <div
                                              key={item.id}
                                              className={`relative rounded-xl overflow-hidden transition-all ${isItemDelivered ? "opacity-40" : ""}`}
                                            >
                                              <div className="bg-gradient-to-r from-pink-500/15 via-fuchsia-500/10 to-purple-500/15 border border-pink-500/30 rounded-xl p-2.5">
                                                {/* Top row */}
                                                <div className="flex items-start gap-2">
                                                  <label
                                                    className="relative flex items-center cursor-pointer group/item mt-0.5"
                                                    onClick={(e) => e.stopPropagation()}
                                                  >
                                                    <input
                                                      type="checkbox"
                                                      checked={isItemDelivered}
                                                      onChange={() => toggleItemDelivered(order.id, item.id, table.id)}
                                                      className="peer sr-only"
                                                    />
                                                    <span className={`w-[18px] h-[18px] rounded-md border-2 flex items-center justify-center transition-all ${
                                                      isItemDelivered
                                                        ? "bg-emerald-500 border-emerald-500"
                                                        : "border-pink-400/40 bg-pink-500/10 group-hover/item:border-pink-400"
                                                    }`}>
                                                      {isItemDelivered && <Check size={11} className="text-white" />}
                                                    </span>
                                                  </label>

                                                  <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                      <Gift size={14} className="text-pink-400 flex-shrink-0" />
                                                      <span className="px-2 py-0.5 rounded-lg text-[11px] font-black uppercase tracking-widest bg-pink-500/25 text-pink-300 border border-pink-500/30">
                                                        GIFT
                                                      </span>
                                                    </div>
                                                    <p className={`text-xs font-semibold ${isItemDelivered ? "line-through text-muted-foreground" : "text-white"}`}>
                                                      {item.quantity}x {itemName}
                                                    </p>
                                                    {item.notes && (
                                                      <div className="flex items-center gap-1.5 mt-1.5 px-2 py-1 rounded-lg bg-pink-500/10 border border-pink-500/20">
                                                        <span className="text-[10px] text-pink-300/60">→</span>
                                                        <span className="text-[11px] font-bold text-pink-300">
                                                          {item.notes}
                                                        </span>
                                                      </div>
                                                    )}
                                                  </div>

                                                  <span className="text-sm font-bold text-pink-400 tabular-nums shrink-0">
                                                    {formatCurrency(parseFloat(item.price) * item.quantity)}
                                                  </span>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        }

                                        // ── COMBO ITEM ──
                                        if (isCombo) {
                                          return (
                                            <div
                                              key={item.id}
                                              className={`relative rounded-xl overflow-hidden transition-all ${isItemDelivered ? "opacity-40" : ""}`}
                                            >
                                              <div className="bg-gradient-to-r from-violet-500/15 via-indigo-500/10 to-blue-500/10 border border-violet-500/25 rounded-xl p-2.5">
                                                <div className="flex items-start gap-2">
                                                  <label
                                                    className="relative flex items-center cursor-pointer group/item mt-0.5"
                                                    onClick={(e) => e.stopPropagation()}
                                                  >
                                                    <input
                                                      type="checkbox"
                                                      checked={isItemDelivered}
                                                      onChange={() => toggleItemDelivered(order.id, item.id, table.id)}
                                                      className="peer sr-only"
                                                    />
                                                    <span className={`w-[18px] h-[18px] rounded-md border-2 flex items-center justify-center transition-all ${
                                                      isItemDelivered
                                                        ? "bg-emerald-500 border-emerald-500"
                                                        : "border-violet-400/40 bg-violet-500/10 group-hover/item:border-violet-400"
                                                    }`}>
                                                      {isItemDelivered && <Check size={11} className="text-white" />}
                                                    </span>
                                                  </label>

                                                  <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                      <Package size={14} className="text-violet-400 flex-shrink-0" />
                                                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-violet-500/25 text-violet-300 border border-violet-500/30">
                                                        COMBO SET
                                                      </span>
                                                    </div>
                                                    <p className={`text-xs font-semibold ${isItemDelivered ? "line-through text-muted-foreground" : "text-white"}`}>
                                                      {item.quantity}x {itemName}
                                                    </p>
                                                  </div>

                                                  <span className="text-sm font-bold text-violet-400 tabular-nums shrink-0">
                                                    {formatCurrency(parseFloat(item.price) * item.quantity)}
                                                  </span>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        }

                                        // ── REGULAR ITEM ──
                                        return (
                                          <div
                                            key={item.id}
                                            className={`flex items-center gap-2 rounded-lg px-2 py-1.5 transition-all bg-white/5 ${isItemDelivered ? "opacity-40" : ""}`}
                                          >
                                            <label
                                              className="relative flex items-center cursor-pointer group/item"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <input
                                                type="checkbox"
                                                checked={isItemDelivered}
                                                onChange={() => toggleItemDelivered(order.id, item.id, table.id)}
                                                className="peer sr-only"
                                              />
                                              <span className={`w-[18px] h-[18px] rounded-md border-2 flex items-center justify-center transition-all ${
                                                isItemDelivered
                                                  ? "bg-emerald-500 border-emerald-500"
                                                  : "border-white/20 bg-white/5 group-hover/item:border-emerald-400"
                                              }`}>
                                                {isItemDelivered && <Check size={11} className="text-white" />}
                                              </span>
                                            </label>
                                            <span className={`flex-1 text-xs font-medium truncate ${isItemDelivered ? "line-through text-muted-foreground" : ""}`}>
                                              {item.quantity}x {itemName}
                                            </span>
                                            <span className="text-xs font-semibold tabular-nums flex-shrink-0">
                                              {formatCurrency(parseFloat(item.price) * item.quantity)}
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}

                              {/* Total */}
                              <div className="flex items-center justify-between px-1 pt-1">
                                <span className="text-sm font-semibold">
                                  Total
                                </span>
                                <span className="text-lg font-bold text-gradient">
                                  {formatCurrency(activeTotal)}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-3">
                              No active orders
                            </p>
                          )}

                          {/* Session progress — item-level tracking */}
                          {activeOrders.length > 0 &&
                            (() => {
                              const totalItems = activeOrders.reduce((s, o) => s + o.items.length, 0);
                              const deliveredItems = activeOrders.reduce(
                                (s, o) => s + o.items.filter((i) => i.delivered).length, 0
                              );
                              const orderDelivered = activeOrders.filter(
                                (o) => o.status === "delivered",
                              ).length;
                              const allOrdersDelivered =
                                orderDelivered === activeOrders.length;
                              const allItemsDelivered = deliveredItems === totalItems && totalItems > 0;
                              return (
                                <div className="space-y-1.5">
                                  <div
                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${
                                      allItemsDelivered
                                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                        : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                    }`}
                                  >
                                    <CheckCircle size={14} />
                                    <span>
                                      {deliveredItems} / {totalItems} items served
                                    </span>
                                    {allOrdersDelivered && (
                                      <span className="ml-auto text-[10px] uppercase tracking-wider font-bold">
                                        Ready to close
                                      </span>
                                    )}
                                  </div>
                                  {/* Progress bar */}
                                  {totalItems > 0 && (
                                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all duration-500 ${
                                          allItemsDelivered ? "bg-emerald-500" : "bg-blue-500"
                                        }`}
                                        style={{ width: `${(deliveredItems / totalItems) * 100}%` }}
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })()}

                          {/* Action buttons */}
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={() => openHistory(table)}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium glass hover:bg-white/10 transition-colors"
                            >
                              <History size={14} />
                              History
                            </button>
                            <button
                              onClick={() => setQrTable(table)}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors"
                            >
                              <QrCode size={14} />
                              QR Code
                            </button>
                            <button
                              onClick={() => {
                                setPinEditTable(table);
                                setPinEditValue(table.tabletPin || "");
                              }}
                              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-colors ${
                                table.tabletPin
                                  ? "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                                  : "glass hover:bg-white/10"
                              }`}
                            >
                              <Key size={14} />
                              PIN
                            </button>
                            {activeOrders.length > 0 &&
                              (() => {
                                const allDelivered = activeOrders.every(
                                  (o) => o.status === "delivered",
                                );
                                return (
                                  <button
                                    onClick={() => handleCloseBill(table)}
                                    disabled={!allDelivered}
                                    title={
                                      !allDelivered
                                        ? "All orders must be delivered before closing the bill"
                                        : "Close bill"
                                    }
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
                                      allDelivered
                                        ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 cursor-pointer"
                                        : "bg-zinc-500/10 text-zinc-400 cursor-not-allowed opacity-50"
                                    }`}
                                  >
                                    <CreditCard size={14} />
                                    Close Bill
                                  </button>
                                );
                              })()}
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

      {/* QR Code Modal */}
      <Modal
        isOpen={!!qrTable}
        onClose={() => setQrTable(null)}
        title={`QR Code - ${qrTable?.name || `Table ${qrTable?.number}`}`}
      >
        {qrTable && (
          <div className="flex flex-col items-center gap-4">
            <div ref={qrRef} className="bg-white p-6 rounded-2xl">
              <QRCodeCanvas
                value={getMenuUrl(qrTable)}
                size={256}
                level="H"
                includeMargin={false}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center break-all px-4">
              {getMenuUrl(qrTable)}
            </p>
            <div className="flex gap-2 w-full">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={async () => {
                  const url = getMenuUrl(qrTable);
                  try {
                    if (
                      typeof navigator !== "undefined" &&
                      navigator.clipboard
                    ) {
                      await navigator.clipboard.writeText(url);
                      toast.success("URL copied!");
                    } else {
                      // Fallback for older browsers or non-secure contexts
                      const textarea = document.createElement("textarea");
                      textarea.value = url;
                      textarea.style.position = "fixed";
                      textarea.style.opacity = "0";
                      document.body.appendChild(textarea);
                      textarea.select();
                      document.execCommand("copy");
                      document.body.removeChild(textarea);
                      toast.success("URL copied!");
                    }
                  } catch (error) {
                    console.error("Copy failed:", error);
                    toast.error("Failed to copy URL");
                  }
                }}
              >
                Copy URL
              </Button>
              <Button className="flex-1" onClick={() => downloadQR(qrTable)}>
                <Download size={16} className="mr-2" />
                Download PNG
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Table History Modal — bills grouped, per-bill numbering */}
      <Modal
        isOpen={!!historyTable}
        onClose={() => setHistoryTable(null)}
        title={`History - ${historyTable?.name || `Table ${historyTable?.number}`}`}
      >
        {historyLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : historyOrders.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No order history
          </p>
        ) : (
          (() => {
            // Group by billClosedAt. Orders inside one bill are sorted oldest→newest
            // and re-numbered per-bill (1, 2, 3...) so each customer group's
            // receipt reads naturally instead of using global DB ids.
            type BillGroup = {
              key: string;
              billClosedAt: string | null;
              orders: Order[];
              total: number;
            };
            const map = new Map<string, BillGroup>();
            for (const o of historyOrders) {
              const key = o.billClosedAt ?? "open";
              let g = map.get(key);
              if (!g) {
                g = {
                  key,
                  billClosedAt: o.billClosedAt ?? null,
                  orders: [],
                  total: 0,
                };
                map.set(key, g);
              }
              g.orders.push(o);
              g.total += parseFloat(o.total);
            }
            for (const g of map.values()) {
              g.orders.sort(
                (a, b) =>
                  new Date(a.createdAt).getTime() -
                  new Date(b.createdAt).getTime(),
              );
            }
            const bills = Array.from(map.values()).sort((a, b) => {
              if (!a.billClosedAt && b.billClosedAt) return -1;
              if (a.billClosedAt && !b.billClosedAt) return 1;
              if (!a.billClosedAt && !b.billClosedAt) return 0;
              return (
                new Date(b.billClosedAt!).getTime() -
                new Date(a.billClosedAt!).getTime()
              );
            });

            return (
              <div className="space-y-5 max-h-[65vh] overflow-y-auto pr-1">
                {bills.map((bill, billIdx) => {
                  const isOpen = !bill.billClosedAt;
                  const closedAt = bill.billClosedAt
                    ? new Date(bill.billClosedAt)
                    : null;
                  return (
                    <div
                      key={bill.key}
                      className={`rounded-2xl border-2 overflow-hidden ${
                        isOpen
                          ? "border-amber-400/60 bg-amber-50/40 dark:bg-amber-500/5"
                          : "border-emerald-400/50 bg-emerald-50/40 dark:bg-emerald-500/5"
                      }`}
                    >
                      {/* Bill header */}
                      <div
                        className={`px-4 py-3 flex items-center justify-between ${
                          isOpen
                            ? "bg-gradient-to-r from-amber-500/15 to-orange-500/10"
                            : "bg-gradient-to-r from-emerald-500/15 to-teal-500/10"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-md ${
                              isOpen
                                ? "bg-gradient-to-br from-amber-500 to-orange-500"
                                : "bg-gradient-to-br from-emerald-500 to-teal-600"
                            }`}
                          >
                            {isOpen ? (
                              <Clock size={16} className="text-white" />
                            ) : (
                              <Receipt size={16} className="text-white" />
                            )}
                          </div>
                          <div>
                            <p
                              className={`text-[10px] font-bold uppercase tracking-widest ${
                                isOpen
                                  ? "text-amber-700 dark:text-amber-400"
                                  : "text-emerald-700 dark:text-emerald-400"
                              }`}
                            >
                              {isOpen
                                ? "Open Bill — In Progress"
                                : `Bill #${bills.length - billIdx}`}
                            </p>
                            <p className="text-xs font-semibold flex items-center gap-1">
                              {closedAt ? (
                                <>
                                  <Lock
                                    size={11}
                                    className="text-emerald-500"
                                  />
                                  Closed at{" "}
                                  {closedAt.toLocaleString(undefined, {
                                    year: "numeric",
                                    month: "short",
                                    day: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </>
                              ) : (
                                <span className="text-amber-600 dark:text-amber-400">
                                  Active session
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                            Total
                          </p>
                          <p className="text-base font-black tabular-nums">
                            {formatCurrency(bill.total)}
                          </p>
                        </div>
                      </div>

                      {/* Orders inside the bill — per-bill sequence numbers */}
                      <div className="divide-y divide-black/5 dark:divide-white/5">
                        {bill.orders.map((order, orderIdxInBill) => (
                          <div
                            key={order.id}
                            className="p-3 bg-white dark:bg-zinc-900"
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-bold">
                                  Order #{orderIdxInBill + 1}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  (id #{order.id})
                                </span>
                                <Badge
                                  variant={
                                    order.status === "delivered"
                                      ? "success"
                                      : order.status === "cancelled"
                                        ? "error"
                                        : order.status === "pending"
                                          ? "warning"
                                          : "default"
                                  }
                                >
                                  {order.status}
                                </Badge>
                              </div>
                              <span className="text-sm font-semibold text-purple-400 tabular-nums">
                                {formatCurrency(parseFloat(order.total))}
                              </span>
                            </div>
                            <div className="space-y-1">
                              {order.items.map((item) => {
                                const isCombo = !!item.combo;
                                const isGiftItem = item.isGift;
                                return (
                                  <div
                                    key={item.id}
                                    className={`flex items-center gap-2 text-xs rounded-md px-2 py-1 ${
                                      isCombo
                                        ? "bg-amber-500/10 border border-amber-500/15"
                                        : isGiftItem
                                          ? "bg-pink-500/10 border border-pink-500/15"
                                          : ""
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                      {isCombo && <Package size={12} className="text-amber-500 flex-shrink-0" />}
                                      {isGiftItem && <Gift size={12} className="text-pink-500 flex-shrink-0" />}
                                      <span className="text-muted-foreground truncate">
                                        {item.quantity}x{" "}
                                        {item.combo?.name?.en ||
                                          (item.combo?.name
                                            ? Object.values(item.combo.name)[0]
                                            : item.product?.name?.en ||
                                              (item.product?.name
                                                ? Object.values(item.product.name)[0]
                                                : "Unknown Item"))}
                                      </span>
                                      {isCombo && (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-500/20 text-amber-400">
                                          COMBO
                                        </span>
                                      )}
                                      {isGiftItem && (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-pink-500/20 text-pink-400">
                                          GIFT
                                        </span>
                                      )}
                                    </div>
                                    <span className={`tabular-nums font-medium flex-shrink-0 ${
                                      isGiftItem ? "text-pink-400" : isCombo ? "text-amber-400" : "text-muted-foreground"
                                    }`}>
                                      {formatCurrency(parseFloat(item.price) * item.quantity)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1.5">
                              {new Date(order.createdAt).toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()
        )}
      </Modal>

      {/* Create Table Modal */}
      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Add New Table"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">
              Table Number
            </label>
            <input
              type="number"
              value={newTableNumber}
              onChange={(e) => setNewTableNumber(e.target.value)}
              placeholder="e.g., 13"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-purple-500/50"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">
              Table Name (optional)
            </label>
            <input
              type="text"
              value={newTableName}
              onChange={(e) => setNewTableName(e.target.value)}
              placeholder="e.g., Window Seat"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-purple-500/50"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">
              Tablet PIN (optional)
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={newTablePin}
              onChange={(e) => setNewTablePin(e.target.value.replace(/\D/g, ''))}
              placeholder="e.g., 1234"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-purple-500/50"
            />
            <p className="text-[10px] text-muted-foreground mt-1">4-6 digits. Set this to enable tablet mode for this table.</p>
          </div>
          <p className="text-xs text-muted-foreground">
            A unique 8-character Table ID will be generated automatically.
          </p>
          <Button onClick={handleCreateTable} className="w-full">
            Create Table
          </Button>
        </div>
      </Modal>

      {/* PIN Edit Modal */}
      <Modal
        isOpen={!!pinEditTable}
        onClose={() => setPinEditTable(null)}
        title={`Tablet PIN — Table ${pinEditTable?.number}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Set a 4-6 digit PIN to enable tablet mode for this table. Leave empty to disable.
          </p>
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">PIN</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={pinEditValue}
              onChange={(e) => setPinEditValue(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter 4-6 digit PIN"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-blue-500/50 text-center text-xl font-bold tracking-[0.3em]"
            />
          </div>
          <div className="flex gap-2">
            {pinEditTable?.tabletPin && (
              <Button
                variant="destructive"
                onClick={() => { setPinEditValue(""); handleSavePin(); }}
                disabled={savingPin}
                className="flex-1"
              >
                Remove PIN
              </Button>
            )}
            <Button
              onClick={handleSavePin}
              disabled={savingPin || (!!pinEditValue && !/^\d{4,6}$/.test(pinEditValue))}
              className="flex-1"
            >
              {savingPin ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : 'Save PIN'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
