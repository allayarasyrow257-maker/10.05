'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Filter,
  RefreshCw,
  Receipt,
  TrendingUp,
  ShoppingBag,
  CheckCircle,
  Clock,
  ChefHat,
  Truck,
  XCircle,
  Gift,
  ChevronDown,
  ChevronUp,
  Hash,
  Search,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useCartStore } from '@/store/cart-store';
import toast from 'react-hot-toast';

interface OrderItem {
  id: number;
  quantity: number;
  price: string;
  isGift: boolean;
  notes?: string;
  product?: { name: Record<string, string>; image?: string };
  combo?: { name: Record<string, string>; image?: string; price?: string };
}

interface Order {
  id: number;
  tableId: number;
  table?: { number: number; name?: string | null };
  status: string;
  total: string;
  notes?: string;
  sessionId?: string;
  billClosedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}

interface Bill {
  key: string;
  tableId: number;
  table?: { number: number; name?: string | null };
  billClosedAt: string | null;
  orders: Order[];
  total: number;
  itemCount: number;
  firstOrderAt: string;
}

interface Table {
  id: number;
  number: number;
  name?: string | null;
}

interface Stats {
  totalOrders: number;
  totalRevenue: number;
  deliveredOrders: number;
  deliveredRevenue: number;
}

const STATUS_LABELS: Record<string, Record<string, string>> = {
  pending: { en: 'Pending', tk: 'Garaşylýar', ru: 'Ожидание', tr: 'Beklemede' },
  preparing: { en: 'Preparing', tk: 'Taýýarlanýar', ru: 'Готовится', tr: 'Hazirlaniyor' },
  ready: { en: 'Ready', tk: 'Taýýar', ru: 'Готово', tr: 'Hazir' },
  delivered: { en: 'Delivered', tk: 'Gowşuryldy', ru: 'Доставлено', tr: 'Teslim Edildi' },
  cancelled: { en: 'Cancelled', tk: 'Yza alyndy', ru: 'Отменено', tr: 'Iptal Edildi' },
};

const LABELS = {
  history: { en: 'Order History', tk: 'Sargyt taryhy', ru: 'История заказов', tr: 'Siparis Gecmisi' },
  subtitle: { en: 'Browse and filter all past orders', tk: 'Geçmiş sargytlary süzgüçläň', ru: 'Просмотр и фильтрация всех прошлых заказов', tr: 'Tum gecmis siparisleri filtrele ve incele' },
  dateRange: { en: 'Date Range', tk: 'Sene aralygy', ru: 'Диапазон дат', tr: 'Tarih Araligi' },
  from: { en: 'From', tk: 'Başlangyç', ru: 'С', tr: 'Baslangic' },
  to: { en: 'To', tk: 'Soň', ru: 'По', tr: 'Bitis' },
  table: { en: 'Table', tk: 'Stol', ru: 'Стол', tr: 'Masa' },
  allTables: { en: 'All Tables', tk: 'Ähli Stollar', ru: 'Все столы', tr: 'Tum Masalar' },
  status: { en: 'Status', tk: 'Ýagdaý', ru: 'Статус', tr: 'Durum' },
  allStatuses: { en: 'All Statuses', tk: 'Ähli ýagdaýlar', ru: 'Все статусы', tr: 'Tum Durumlar' },
  totalOrders: { en: 'Total Orders', tk: 'Jemi sargyt', ru: 'Всего заказов', tr: 'Toplam Siparis' },
  totalRevenue: { en: 'Total Revenue', tk: 'Jemi girdeji', ru: 'Общая выручка', tr: 'Toplam Gelir' },
  delivered: { en: 'Delivered', tk: 'Gowşurylan', ru: 'Доставленные', tr: 'Teslim Edilen' },
  collected: { en: 'Collected', tk: 'Ýygnan', ru: 'Получено', tr: 'Tahsil Edilen' },
  refresh: { en: 'Refresh', tk: 'Tazele', ru: 'Обновить', tr: 'Yenile' },
  empty: { en: 'No orders match your filters', tk: 'Süzgüçleriňize laýyk sargyt ýok', ru: 'По вашим фильтрам заказов нет', tr: 'Filtrelerinize uygun siparis yok' },
  today: { en: 'Today', tk: 'Şu gün', ru: 'Сегодня', tr: 'Bugun' },
  last7: { en: 'Last 7 days', tk: 'Soňky 7 gün', ru: 'Последние 7 дней', tr: 'Son 7 gun' },
  last30: { en: 'Last 30 days', tk: 'Soňky 30 gün', ru: 'Последние 30 дней', tr: 'Son 30 gun' },
  thisYear: { en: 'This year', tk: 'Şu ýyl', ru: 'Этот год', tr: 'Bu yil' },
  allTime: { en: 'All time', tk: 'Ähli wagt', ru: 'Все время', tr: 'Tum Zamanlar' },
  closedAt: { en: 'Closed at', tk: 'Ýapylan wagty', ru: 'Закрыто в', tr: 'Kapatildi' },
  items: { en: 'items', tk: 'önüm', ru: 'позиций', tr: 'urun' },
  search: { en: 'Search by table or order #', tk: 'Stol ýa-da sargyt # gözle', ru: 'Поиск по столу или № заказа', tr: 'Masa veya siparis # ara' },
  billClosed: { en: 'Bill Closed', tk: 'Hasap ýapyldy', ru: 'Счёт закрыт', tr: 'Hesap Kapatildi' },
  openBill: { en: 'Open Bill — In Progress', tk: 'Açyk hasap — Dowam edýär', ru: 'Открытый счёт — в процессе', tr: 'Acik Hesap — Devam Ediyor' },
  ordersWord: { en: 'orders', tk: 'sargyt', ru: 'заказов', tr: 'siparis' },
  orderWord: { en: 'order', tk: 'sargyt', ru: 'заказ', tr: 'siparis' },
  orderShort: { en: 'Order', tk: 'Sargyt', ru: 'Заказ', tr: 'Siparis' },
  startedAt: { en: 'Started at', tk: 'Başlanan wagty', ru: 'Начато в', tr: 'Baslangic' },
  bills: { en: 'bills', tk: 'hasap', ru: 'счетов', tr: 'hesap' },
};

const STATUS_ICONS: Record<string, any> = {
  pending: Clock,
  preparing: ChefHat,
  ready: CheckCircle,
  delivered: Truck,
  cancelled: XCircle,
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
  preparing: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  ready: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  delivered: 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20',
  cancelled: 'text-red-500 bg-red-500/10 border-red-500/20',
};

function toDateInput(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function startOfDay(s: string) {
  const d = new Date(s + 'T00:00:00');
  return d.toISOString();
}
function endOfDay(s: string) {
  const d = new Date(s + 'T23:59:59.999');
  return d.toISOString();
}

export default function HistoryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalOrders: 0,
    totalRevenue: 0,
    deliveredOrders: 0,
    deliveredRevenue: 0,
  });

  const today = toDateInput(new Date());
  const monthAgo = toDateInput(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [tableFilter, setTableFilter] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const { language } = useCartStore();
  const t = (key: keyof typeof LABELS) =>
    LABELS[key][language as keyof (typeof LABELS)[typeof key]] || LABELS[key].en;
  const ts = (status: string) =>
    STATUS_LABELS[status]?.[language as keyof (typeof STATUS_LABELS)[typeof status]] ||
    STATUS_LABELS[status]?.en ||
    status;

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', startOfDay(from));
      if (to) params.set('to', endOfDay(to));
      if (tableFilter) params.set('tableId', tableFilter.toString());
      if (statusFilter) params.set('status', statusFilter);
      params.set('limit', '500');
      const data = await api.get<{ orders: Order[]; stats: Stats }>(
        `/orders?${params.toString()}`,
        true,
      );
      setOrders(data.orders);
      if (data.stats) setStats(data.stats);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.get<Table[]>('/tables').then(setTables).catch(() => {});
  }, []);

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, tableFilter, statusFilter]);

  const applyPreset = (preset: 'today' | 'last7' | 'last30' | 'thisYear' | 'allTime') => {
    const now = new Date();
    if (preset === 'today') {
      const d = toDateInput(now);
      setFrom(d);
      setTo(d);
    } else if (preset === 'last7') {
      setFrom(toDateInput(new Date(Date.now() - 7 * 86400000)));
      setTo(toDateInput(now));
    } else if (preset === 'last30') {
      setFrom(toDateInput(new Date(Date.now() - 30 * 86400000)));
      setTo(toDateInput(now));
    } else if (preset === 'thisYear') {
      setFrom(`${now.getFullYear()}-01-01`);
      setTo(toDateInput(now));
    } else if (preset === 'allTime') {
      setFrom('2000-01-01');
      setTo(toDateInput(now));
    }
  };

  const visibleOrders = useMemo(() => {
    if (!search.trim()) return orders;
    const s = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (String(o.id).includes(s)) return true;
      if (o.table?.number && String(o.table.number).includes(s)) return true;
      if (o.table?.name && o.table.name.toLowerCase().includes(s)) return true;
      if (o.sessionId && o.sessionId.toLowerCase().includes(s)) return true;
      return false;
    });
  }, [orders, search]);

  // Group orders into bills. A bill is the set of orders sharing the same
  // billClosedAt timestamp + tableId — i.e. one customer group's full session.
  // Open bills (billClosedAt: null) are grouped per-table as the live session.
  const bills = useMemo<Bill[]>(() => {
    const map = new Map<string, Bill>();
    for (const o of visibleOrders) {
      const key = `${o.tableId}-${o.billClosedAt ?? 'open'}`;
      let bill = map.get(key);
      if (!bill) {
        bill = {
          key,
          tableId: o.tableId,
          table: o.table,
          billClosedAt: o.billClosedAt,
          orders: [],
          total: 0,
          itemCount: 0,
          firstOrderAt: o.createdAt,
        };
        map.set(key, bill);
      }
      bill.orders.push(o);
      bill.total += parseFloat(o.total);
      bill.itemCount += o.items.reduce((s, i) => s + i.quantity, 0);
      if (new Date(o.createdAt) < new Date(bill.firstOrderAt)) {
        bill.firstOrderAt = o.createdAt;
      }
    }

    // Sort orders inside each bill chronologically (oldest → newest)
    for (const bill of map.values()) {
      bill.orders.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    }

    // Sort bills: open ones first (they're the live customers), then closed
    // bills by closure time descending (most recently settled first).
    return Array.from(map.values()).sort((a, b) => {
      if (!a.billClosedAt && b.billClosedAt) return -1;
      if (a.billClosedAt && !b.billClosedAt) return 1;
      if (!a.billClosedAt && !b.billClosedAt) {
        return new Date(b.firstOrderAt).getTime() - new Date(a.firstOrderAt).getTime();
      }
      return new Date(b.billClosedAt!).getTime() - new Date(a.billClosedAt!).getTime();
    });
  }, [visibleOrders]);

  // Group bills by calendar day (closure date for closed bills, start date for open)
  const billsByDay = useMemo(() => {
    const groups: Record<string, Bill[]> = {};
    for (const bill of bills) {
      const ref = bill.billClosedAt || bill.firstOrderAt;
      const day = new Date(ref).toLocaleDateString();
      (groups[day] ||= []).push(bill);
    }
    return groups;
  }, [bills]);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('history')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('subtitle')}</p>
        </div>
        <button
          onClick={fetchOrders}
          className="self-start md:self-auto flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 transition-all text-sm font-bold text-zinc-600 dark:text-white"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {t('refresh')}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<ShoppingBag size={18} />}
          label={t('totalOrders')}
          value={stats.totalOrders.toLocaleString()}
          tint="purple"
        />
        <StatCard
          icon={<TrendingUp size={18} />}
          label={t('totalRevenue')}
          value={formatCurrency(stats.totalRevenue)}
          tint="emerald"
        />
        <StatCard
          icon={<Truck size={18} />}
          label={t('delivered')}
          value={stats.deliveredOrders.toLocaleString()}
          tint="blue"
        />
        <StatCard
          icon={<Receipt size={18} />}
          label={t('collected')}
          value={formatCurrency(stats.deliveredRevenue)}
          tint="amber"
        />
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-zinc-900 rounded-[24px] p-5 shadow-sm border border-black/5 dark:border-white/10 space-y-5">
        {/* Date presets */}
        <div className="flex flex-wrap gap-2">
          {(['today', 'last7', 'last30', 'thisYear', 'allTime'] as const).map((p) => (
            <button
              key={p}
              onClick={() => applyPreset(p)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-zinc-50 dark:bg-black/20 text-zinc-600 dark:text-zinc-400 border border-black/5 dark:border-white/5 hover:bg-zinc-100 dark:hover:bg-white/5 transition-all"
            >
              {t(p)}
            </button>
          ))}
        </div>

        {/* Date range */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 block flex items-center gap-1.5">
              <Calendar size={11} /> {t('from')}
            </label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-black/20 border border-black/5 dark:border-white/10 text-sm focus:outline-none focus:border-purple-500/50"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 block flex items-center gap-1.5">
              <Calendar size={11} /> {t('to')}
            </label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-black/20 border border-black/5 dark:border-white/10 text-sm focus:outline-none focus:border-purple-500/50"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 block flex items-center gap-1.5">
              <Search size={11} /> {t('search')}
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('search')}
              className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-black/20 border border-black/5 dark:border-white/10 text-sm focus:outline-none focus:border-purple-500/50"
            />
          </div>
        </div>

        {/* Status filter */}
        <div>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">
            {t('status')}
          </p>
          <div className="flex flex-wrap gap-2">
            <FilterPill
              active={!statusFilter}
              onClick={() => setStatusFilter('')}
              label={t('allStatuses')}
            />
            {Object.keys(STATUS_LABELS).map((key) => {
              const Icon = STATUS_ICONS[key];
              return (
                <FilterPill
                  key={key}
                  active={statusFilter === key}
                  onClick={() => setStatusFilter(key)}
                  label={ts(key)}
                  icon={<Icon size={12} />}
                />
              );
            })}
          </div>
        </div>

        {/* Table filter */}
        {tables.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              <Filter size={11} /> {t('table')}
            </p>
            <div className="flex flex-wrap gap-2">
              <FilterPill
                active={tableFilter === null}
                onClick={() => setTableFilter(null)}
                label={t('allTables')}
              />
              {tables.map((tb) => (
                <FilterPill
                  key={tb.id}
                  active={tableFilter === tb.id}
                  onClick={() => setTableFilter(tb.id)}
                  label={tb.name || `${t('table')} ${tb.number}`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Orders */}
      {loading && orders.length === 0 ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : visibleOrders.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-[24px] border border-black/5 dark:border-white/10">
          <div className="w-16 h-16 bg-zinc-50 dark:bg-black/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Receipt size={28} className="text-zinc-300" />
          </div>
          <p className="text-sm text-zinc-400 font-medium">{t('empty')}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(billsByDay).map(([day, dayBills]) => {
            const dayTotal = dayBills.reduce((s, b) => s + b.total, 0);
            return (
              <div key={day} className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{day}</h3>
                  <span className="text-xs text-muted-foreground">
                    {dayBills.length} {t('bills')} • {formatCurrency(dayTotal)}
                  </span>
                </div>
                <AnimatePresence mode="popLayout">
                  {dayBills.map((bill) => (
                    <BillCard
                      key={bill.key}
                      bill={bill}
                      expanded={expanded === bill.key}
                      onToggle={() => setExpanded(expanded === bill.key ? null : bill.key)}
                      ts={ts}
                      t={t}
                    />
                  ))}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tint: 'purple' | 'emerald' | 'blue' | 'amber';
}) {
  const tintMap: Record<string, string> = {
    purple: 'from-purple-500/10 to-fuchsia-500/10 text-purple-500 border-purple-500/20',
    emerald: 'from-emerald-500/10 to-teal-500/10 text-emerald-500 border-emerald-500/20',
    blue: 'from-blue-500/10 to-indigo-500/10 text-blue-500 border-blue-500/20',
    amber: 'from-amber-500/10 to-orange-500/10 text-amber-500 border-amber-500/20',
  };
  return (
    <div className={`relative overflow-hidden rounded-2xl border p-4 bg-gradient-to-br ${tintMap[tint]}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="opacity-80">{icon}</span>
      </div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-1">
        {label}
      </p>
      <p className="text-xl font-black text-zinc-900 dark:text-white tabular-nums">{value}</p>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5 ${
        active
          ? 'bg-orange-600 text-white border-orange-600 shadow-md shadow-orange-600/20'
          : 'bg-zinc-50 dark:bg-black/20 text-zinc-500 dark:text-zinc-400 border-black/5 dark:border-white/5 hover:bg-zinc-100 dark:hover:bg-white/5'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function BillCard({
  bill,
  expanded,
  onToggle,
  ts,
  t,
}: {
  bill: Bill;
  expanded: boolean;
  onToggle: () => void;
  ts: (s: string) => string;
  t: (k: any) => string;
}) {
  const isOpen = !bill.billClosedAt;
  const closedAt = bill.billClosedAt ? new Date(bill.billClosedAt) : null;
  const startedAt = new Date(bill.firstOrderAt);

  // Visual style: open bills lean orange/amber (live), closed bills emerald (settled)
  const accent = isOpen
    ? {
        ring: 'border-amber-400/60 dark:border-amber-500/40',
        chip: 'bg-amber-500 text-white shadow-amber-500/30',
        soft: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
        avatarBg: 'bg-gradient-to-br from-amber-500 to-orange-500',
        Icon: Clock,
      }
    : {
        ring: 'border-emerald-400/40 dark:border-emerald-500/30',
        chip: 'bg-emerald-500 text-white shadow-emerald-500/30',
        soft: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
        avatarBg: 'bg-gradient-to-br from-emerald-500 to-teal-600',
        Icon: Receipt,
      };

  const AvatarIcon = accent.Icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className={`bg-white dark:bg-zinc-900 rounded-[20px] border-2 ${accent.ring} overflow-hidden shadow-sm`}
    >
      {/* Bill header */}
      <button
        onClick={onToggle}
        className="w-full p-4 text-left hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 ${accent.avatarBg}`}>
            <AvatarIcon size={20} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 shadow-md ${accent.chip}`}>
                {isOpen ? (
                  <>
                    <Clock size={10} />
                    {t('openBill')}
                  </>
                ) : (
                  <>
                    <Receipt size={10} />
                    {t('billClosed')}
                  </>
                )}
              </span>
              <span className="text-sm font-bold flex items-center gap-1">
                <Hash size={12} className="text-zinc-400" />
                {t('table')} {bill.table?.number ?? bill.tableId}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
              {closedAt ? (
                <span className="flex items-center gap-1">
                  <Receipt size={11} className="text-emerald-500" />
                  {t('closedAt')}{' '}
                  {closedAt.toLocaleString(undefined, {
                    month: 'short',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                  <Clock size={11} />
                  {t('startedAt')}{' '}
                  {startedAt.toLocaleString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
              <span>•</span>
              <span>
                {bill.orders.length} {bill.orders.length === 1 ? t('orderWord') : t('ordersWord')}
              </span>
              <span>•</span>
              <span>
                {bill.itemCount} {t('items')}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-black tabular-nums">{formatCurrency(bill.total)}</div>
          </div>
          {expanded ? (
            <ChevronUp size={20} className="text-muted-foreground flex-shrink-0" />
          ) : (
            <ChevronDown size={20} className="text-muted-foreground flex-shrink-0" />
          )}
        </div>
      </button>

      {/* Orders inside this bill */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={`overflow-hidden border-t-2 ${accent.ring} bg-zinc-50/40 dark:bg-black/20`}
          >
            <div className="divide-y divide-black/5 dark:divide-white/5">
              {bill.orders.map((order, idx) => (
                <OrderInBill key={order.id} order={order} positionInBill={idx + 1} ts={ts} t={t} />
              ))}
            </div>
            {/* Bill total footer */}
            <div className="p-4 flex items-center justify-between border-t-2 border-dashed border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                {isOpen ? t('startedAt') : t('billClosed')}
              </span>
              <span className="text-2xl font-black tabular-nums">{formatCurrency(bill.total)}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function OrderInBill({
  order,
  positionInBill,
  ts,
  t,
}: {
  order: Order;
  positionInBill: number;
  ts: (s: string) => string;
  t: (k: any) => string;
}) {
  const Icon = STATUS_ICONS[order.status] || Clock;
  const colorClass = STATUS_COLORS[order.status] || STATUS_COLORS.pending;
  const hasGift = order.items.some((i) => i.isGift);
  const created = new Date(order.createdAt);

  return (
    <div className="p-4 space-y-2">
      {/* Order header — re-numbered per bill so each receipt reads naturally */}
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${colorClass}`}>
          <Icon size={15} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold">
              {t('orderShort')} #{positionInBill}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              (id #{order.id})
            </span>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${colorClass}`}>
              {ts(order.status)}
            </span>
            {hasGift && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-500/20 text-pink-600 dark:text-pink-400">
                <Gift size={10} className="inline mr-1" />
                Gift
              </span>
            )}
            <span className="text-[11px] text-muted-foreground">
              {created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
        <span className="text-sm font-bold tabular-nums text-purple-500">
          {formatCurrency(parseFloat(order.total))}
        </span>
      </div>

      {/* Items */}
      <div className="ml-12 space-y-1">
        {order.items.map((item) => {
          const isCombo = !!item.combo;
          const nameObj = isCombo ? item.combo?.name : item.product?.name;
          const displayName =
            nameObj?.en || (nameObj ? Object.values(nameObj)[0] : 'Unknown');
          return (
            <div
              key={item.id}
              className="flex items-center justify-between text-xs text-muted-foreground"
            >
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-white dark:bg-zinc-800 text-[10px] font-bold flex items-center justify-center">
                  {item.quantity}x
                </span>
                <span>{displayName}</span>
                {isCombo && (
                  <span className="text-[9px] font-bold text-amber-500 uppercase tracking-tight">
                    (Combo)
                  </span>
                )}
                {item.isGift && <Gift size={10} className="text-pink-500" />}
              </div>
              <span className="tabular-nums">
                {formatCurrency(parseFloat(item.price) * item.quantity)}
              </span>
            </div>
          );
        })}
        {order.notes && (
          <div className="mt-2 p-2 rounded-lg bg-orange-50/50 dark:bg-orange-500/5 border border-orange-100 dark:border-orange-500/10">
            <p className="text-[10px] font-bold uppercase tracking-widest text-orange-500 mb-0.5">
              Notes
            </p>
            <p className="text-xs">{order.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
