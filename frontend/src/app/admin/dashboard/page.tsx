'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  TrendingUp,
  Calendar,
  ShoppingCart,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface KPIs {
  dailyRevenue: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  totalOrders: number;
}

interface ChartData {
  hour?: number;
  date?: string | number;
  day?: string;
  revenue: number;
  orders: number;
}

import { useCartStore } from '@/store/cart-store';

const LABELS = {
  dashboard: { en: 'Dashboard', tk: 'Dolandyryş', ru: 'Панель', tr: 'Panel' },
  subtitle: { en: 'Everything you need to know about your restaurant performance', tk: 'Restoranyňyzyň netijeliligi barada ähli zatlar', ru: 'Все, что нужно знать о работе вашего ресторана', tr: 'Restoran performansınız hakkında bilmeniz gereken her şey' },
  dailyRevenue: { en: 'Daily Revenue', tk: 'Gündelik Girdeji', ru: 'Дневная выручка', tr: 'Günlük Gelir' },
  weeklyRevenue: { en: 'Weekly Revenue', tk: 'Hepdelik Girdeji', ru: 'Недельная выручка', tr: 'Haftalık Gelir' },
  monthlyRevenue: { en: 'Monthly Revenue', tk: 'Aýlyk Girdeji', ru: 'Месячная выручка', tr: 'Aylık Gelir' },
  totalOrders: { en: 'Total Orders', tk: 'Jemi Sargytlar', ru: 'Всего заказов', tr: 'Toplam Sipariş' },
  vsLastMonth: { en: 'vs last month', tk: 'geçen aý bilen deňeşdirilende', ru: 'по сравнению с прошлым месяцем', tr: 'geçen aya göre' },
  revenueOverview: { en: 'Revenue Overview', tk: 'Girdeji Syny', ru: 'Обзор выручки', tr: 'Gelir Genel Bakış' },
  revenueDesc: { en: 'Daily income and order volume tracking', tk: 'Gündelik girdeji we sargyt möçberini yzarlaýyş', ru: 'Отслеживание ежедневного дохода и объема заказов', tr: 'Günlük gelir ve sipariş hacmi takibi' },
  revenueByPeriod: { en: 'Revenue by Period', tk: 'Döwür boýunça Girdeji', ru: 'Выручка по периодам', tr: 'Döneme Göre Gelir' },
  periodDesc: { en: 'Detailed breakdown of income per day', tk: 'Gündelik girdejiniň jikme-jik görnüşi', ru: 'Подробная детализация дохода по дням', tr: 'Günlük gelirin detaylı dökümü' },
  period: { en: 'Period', tk: 'Döwür', ru: 'Период', tr: 'Dönem' },
  revenue: { en: 'Revenue', tk: 'Girdeji', ru: 'Выручка', tr: 'Gelir' },
  orders: { en: 'Orders', tk: 'Sargytlar', ru: 'Заказы', tr: 'Siparişler' },
  status: { en: 'Status', tk: 'Ýagdaýy', ru: 'Статус', tr: 'Durum' },
  complete: { en: 'Complete', tk: 'Tamamlandy', ru: 'Завершено', tr: 'Tamamlandı' },
  daily: { en: 'Daily', tk: 'Günlük', ru: 'День', tr: 'Günlük' },
  weekly: { en: 'Weekly', tk: 'Hepdelik', ru: 'Неделя', tr: 'Haftalık' },
  monthly: { en: 'Monthly', tk: 'Aýlyk', ru: 'Месяц', tr: 'Aylık' },
};

export default function DashboardPage() {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [dailyData, setDailyData] = useState<ChartData[]>([]);
  const [weeklyData, setWeeklyData] = useState<ChartData[]>([]);
  const [monthlyData, setMonthlyData] = useState<ChartData[]>([]);
  const [activeChart, setActiveChart] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [loading, setLoading] = useState(true);
  const { language } = useCartStore();

  const t = (key: keyof typeof LABELS) => LABELS[key][language as keyof (typeof LABELS)[typeof key]] || LABELS[key].en;

  const kpiCards = [
    { key: 'dailyRevenue', label: t('dailyRevenue'), icon: DollarSign, color: 'from-orange-500 to-orange-600', shadow: 'shadow-orange-500/20' },
    { key: 'weeklyRevenue', label: t('weeklyRevenue'), icon: TrendingUp, color: 'from-zinc-800 to-zinc-900', shadow: 'shadow-zinc-800/20' },
    { key: 'monthlyRevenue', label: t('monthlyRevenue'), icon: Calendar, color: 'from-orange-600 to-orange-700', shadow: 'shadow-orange-600/20' },
    { key: 'totalOrders', label: t('totalOrders'), icon: ShoppingCart, color: 'from-zinc-900 to-black', shadow: 'shadow-black/20' },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [kpiData, daily, weekly, monthly] = await Promise.all([
          api.get<KPIs>('/analytics/dashboard', true),
          api.get<ChartData[]>('/analytics/revenue/daily', true),
          api.get<ChartData[]>('/analytics/revenue/weekly', true),
          api.get<ChartData[]>('/analytics/revenue/monthly', true),
        ]);
        setKpis(kpiData);
        setDailyData(daily);
        setWeeklyData(weekly);
        setMonthlyData(monthly);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getChartData = () => {
    switch (activeChart) {
      case 'daily':
        return dailyData.map((d) => ({ ...d, label: `${d.hour}:00` }));
      case 'weekly':
        return weeklyData.map((d) => ({ ...d, label: d.day }));
      case 'monthly':
        return monthlyData.map((d) => ({ ...d, label: `${d.date}` }));
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-zinc-900 rounded-[12px] p-3 shadow-xl border border-black/5 dark:border-white/10">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">{label}</p>
          <p className="text-sm font-bold text-orange-600 dark:text-orange-400">
            {t('revenue')}: {formatCurrency(payload[0].value)}
          </p>
          {payload[1] && (
            <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mt-1">{t('orders')}: {payload[1].value}</p>
          )}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-2xl font-bold dark:text-white">{t('dashboard')}</h1>
        <p className="text-sm text-zinc-500 font-medium mt-1">{t('subtitle')}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi, index) => (
          <motion.div
            key={kpi.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-[20px] shadow-sm border border-black/5 dark:border-white/10 relative overflow-hidden group">
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.15em] mb-1">{kpi.label}</p>
                  <p className="text-2xl font-bold dark:text-white">
                    {kpi.key === 'totalOrders'
                      ? kpis?.[kpi.key as keyof KPIs]
                      : formatCurrency(Number(kpis?.[kpi.key as keyof KPIs] || 0))}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-[14px] bg-gradient-to-br ${kpi.color} flex items-center justify-center shadow-lg ${kpi.shadow} group-hover:scale-110 transition-transform`}>
                  <kpi.icon size={22} className="text-white" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">+12.5%</span>
                <span className="text-[10px] text-zinc-400 font-medium">{t('vsLastMonth')}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Revenue Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="bg-white dark:bg-zinc-900 rounded-[24px] shadow-sm border border-black/5 dark:border-white/10 overflow-hidden">
          <div className="p-6 border-b border-black/5 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold dark:text-white">{t('revenueOverview')}</h3>
              <p className="text-xs text-zinc-400 font-medium">{t('revenueDesc')}</p>
            </div>
            <div className="flex gap-1 bg-zinc-50 dark:bg-black/20 rounded-xl p-1 border border-black/5 dark:border-white/5">
              {(['daily', 'weekly', 'monthly'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setActiveChart(period)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    activeChart === period
                      ? 'bg-white dark:bg-zinc-800 text-orange-600 dark:text-orange-400 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  {t(period)}
                </button>
              ))}
            </div>
          </div>
          <div className="p-6">
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                {activeChart === 'weekly' ? (
                  <BarChart data={getChartData()}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                    <XAxis 
                      dataKey="label" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
                      dx={-10}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="revenue" fill="#f97316" radius={[6, 6, 0, 0]} barSize={32} />
                  </BarChart>
                ) : (
                  <AreaChart data={getChartData()}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                    <XAxis 
                      dataKey="label" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
                      dx={-10}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <defs>
                      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f97316" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#f97316"
                      fill="url(#areaGradient)"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Revenue Details Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="bg-white dark:bg-zinc-900 rounded-[24px] shadow-sm border border-black/5 dark:border-white/10 overflow-hidden">
          <div className="p-6 border-b border-black/5 dark:border-white/5">
            <h3 className="text-lg font-bold dark:text-white">{t('revenueByPeriod')}</h3>
            <p className="text-xs text-zinc-400 font-medium">{t('periodDesc')}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-zinc-50 dark:bg-black/20 text-left">
                  <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-zinc-400">{t('period')}</th>
                  <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-right">{t('revenue')}</th>
                  <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-right">{t('orders')}</th>
                  <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-right">{t('status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {weeklyData.map((day, i) => (
                  <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
                    <td className="py-4 px-6 text-sm font-bold dark:text-white">{day.day} <span className="text-zinc-400 font-medium ml-1">({day.date})</span></td>
                    <td className="py-4 px-6 text-sm text-right font-bold text-orange-600 dark:text-orange-400">
                      {formatCurrency(day.revenue)}
                    </td>
                    <td className="py-4 px-6 text-sm text-right font-medium dark:text-zinc-300">{day.orders}</td>
                    <td className="py-4 px-6 text-right">
                      <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full uppercase">{t('complete')}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
