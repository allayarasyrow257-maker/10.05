'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, TrendingUp, Filter, Package } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api, getImageUrl } from '@/lib/api';
import { formatCurrency, getLocalizedName } from '@/lib/utils';
import { useCartStore } from '@/store/cart-store';

const LABELS = {
  bestSellers: { en: 'Best Sellers', tk: 'Meşhur harytlar', ru: 'Хиты продаж', tr: 'Cok Satanlar' },
  subtitle: { en: 'Most popular items by quantity sold', tk: 'Satyş mukdary boýunça iň meşhur harytlar', ru: 'Самые популярные товары по количеству продаж', tr: 'Satilan miktara gore en popüler urunler' },
  topProduct: { en: 'Top Product', tk: 'Iň köp satylan', ru: 'Лучший товар', tr: 'En Iyi Urun' },
  totalQuantity: { en: 'Total Quantity', tk: 'Jemi mukdar', ru: 'Общее количество', tr: 'Toplam Miktar' },
  totalRevenue: { en: 'Total Revenue', tk: 'Jemi girdeji', ru: 'Общая выручка', tr: 'Toplam Gelir' },
  allCategories: { en: 'All Categories', tk: 'Ähli Kategoriýalar', ru: 'Все категории', tr: 'Tum Kategoriler' },
  product: { en: 'Product', tk: 'Haryt', ru: 'Товар', tr: 'Urun' },
  sold: { en: 'Sold', tk: 'Satyldy', ru: 'Продано', tr: 'Satilan' },
  revenue: { en: 'Revenue', tk: 'Girdeji', ru: 'Выручка', tr: 'Gelir' },
  rank: { en: 'Rank', tk: 'Dereje', ru: 'Ранг', tr: 'Sira' },
};

export default function BestSellersPage() {
  const [items, setItems] = useState<BestSeller[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const { language } = useCartStore();

  const t = (key: keyof typeof LABELS) => LABELS[key][language as keyof (typeof LABELS)[typeof key]] || LABELS[key].en;

  const fetchBestSellers = async (categoryId?: number | null) => {
    try {
      const params = categoryId ? `?categoryId=${categoryId}` : '';
      const data = await api.get<BestSeller[]>(`/analytics/best-sellers${params}`, true);
      setItems(data);
    } catch (error) {
      console.error('Failed to fetch best sellers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBestSellers();
    api.get<Category[]>('/menu/categories').then((cats) => {
      setCategories(cats.map((c: any) => ({ id: c.id, name: c.name })));
    }).catch(() => {});
  }, []);

  const handleCategoryChange = (catId: number | null) => {
    setSelectedCategory(catId);
    setLoading(true);
    fetchBestSellers(catId);
  };

  const totalRevenue = items.reduce((sum, item) => sum + item.revenue, 0);
  const totalSold = items.reduce((sum, item) => sum + item.totalSold, 0);

  if (loading && items.length === 0) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold dark:text-white">{t('bestSellers')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="dark:bg-zinc-900 border-black/5 dark:border-white/10 shadow-sm overflow-hidden group">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Trophy size={22} className="text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('topProduct')}</p>
                  <p className="text-lg font-bold dark:text-white truncate max-w-[150px]">
                    {items[0] ? getLocalizedName(items[0].name, language) : '-'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg">
                  <Package size={22} className="text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Items Sold</p>
                  <p className="text-lg font-bold">{totalSold}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                  <TrendingUp size={22} className="text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-lg font-bold">{formatCurrency(totalRevenue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Category filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={16} className="text-muted-foreground" />
        <button
          onClick={() => handleCategoryChange(null)}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            selectedCategory === null ? 'gradient-primary text-white' : 'glass text-muted-foreground hover:text-foreground'
          }`}
        >
          All Categories
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleCategoryChange(cat.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              selectedCategory === cat.id ? 'gradient-primary text-white' : 'glass text-muted-foreground hover:text-foreground'
            }`}
          >
            {getLocalizedName(cat.name, 'en')}
          </button>
        ))}
      </div>

      {/* Best sellers list */}
      <div className="space-y-2">
        {items.map((item, index) => (
          <motion.div
            key={`${item.productId}-${index}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.03 }}
          >
            <Card className="hover:border-purple-500/20 transition-all">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  {/* Rank */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                    index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white shadow-lg' :
                    index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-white shadow-lg' :
                    index === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-white shadow-lg' :
                    'glass text-muted-foreground'
                  }`}>
                    {index + 1}
                  </div>

                  {/* Image */}
                  {item.image ? (
                    <img
                      src={getImageUrl(item.image)}
                      alt=""
                      className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                      <Package size={18} className="text-purple-400" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {getLocalizedName(item.name, 'en')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {getLocalizedName(item.category, 'en')}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-bold">{item.totalSold}</p>
                      <p className="text-[10px] text-muted-foreground">sold</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-purple-400">{formatCurrency(item.revenue)}</p>
                      <p className="text-[10px] text-muted-foreground">revenue</p>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                {items[0] && (
                  <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(item.totalSold / items[0].totalSold) * 100}%` }}
                      transition={{ delay: index * 0.03 + 0.3, duration: 0.5 }}
                      className="h-full rounded-full gradient-primary"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}

        {items.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No sales data yet
          </div>
        )}
      </div>
    </div>
  );
}
