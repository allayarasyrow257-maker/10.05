'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, getImageUrl } from '@/lib/api';
import { useCartStore } from '@/store/cart-store';
import { getLocalizedName } from '@/lib/utils';
import { useTheme } from '@/components/theme-provider';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sun,
  Moon,
  ChevronDown,
  ChevronRight,
  Coffee,
  Bell,
  Utensils,
  Pizza,
  UtensilsCrossed,
  GlassWater,
  IceCream,
  ChefHat,
  Leaf,
  BellRing
} from 'lucide-react';

interface Category {
  id: number;
  name: Record<string, string>;
  image?: string;
  products: any[];
}

interface CafeSettings {
  logo?: string;
  name?: string;
  backgroundColorLight?: string;
  backgroundColorDark?: string;
  accentColorLight?: string;
  accentColorDark?: string;
}

const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'tr', name: 'Turkce', flag: '🇹🇷' },
  { code: 'tk', name: 'Turkmen', flag: '🇹🇲' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
];

const categoryIcons: Record<string, any> = {
  'Hot Drinks': Coffee,
  'Starters': ChefHat,
  'Main Course': Utensils,
  'Burgers': UtensilsCrossed,
  'Pizza': Pizza,
  'Salads': Leaf,
  'Desserts': IceCream,
  'Drinks': GlassWater,
  'default': Utensils
};

function getCategoryIcon(name: string) {
  return categoryIcons[name] || categoryIcons['default'];
}

function getContrastColor(hex: string): 'light' | 'dark' {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? 'dark' : 'light';
}

interface CategoryPageProps {
  onSelectCategory: (categoryId: number) => void;
}

export function CategoryPage({ onSelectCategory }: CategoryPageProps) {
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [langOpen, setLangOpen] = React.useState(false);
  const [cafeSettings, setCafeSettings] = React.useState<CafeSettings>({});
  const { language, tableId, setLanguage } = useCartStore();
  const { theme, toggleTheme } = useTheme();
  const langRef = React.useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const fetchData = async () => {
      try {
        const [cats, settings] = await Promise.all([
          api.get<Category[]>('/menu/categories'),
          api.get<CafeSettings>('/admin/settings').catch(() => ({})),
        ]);
        setCategories(cats);
        setCafeSettings(settings);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const currentLang = languages.find((l) => l.code === (mounted ? language : 'en')) || languages[0];

  const tableLabel =
    (mounted ? language : 'en') === 'tk' ? 'Stol' :
      (mounted ? language : 'en') === 'ru' ? 'Стол' :
        (mounted ? language : 'en') === 'tr' ? 'Masa' : 'Table';

  const welcomeLabel =
    (mounted ? language : 'en') === 'tk' ? 'Hoş geldiňiz' :
      (mounted ? language : 'en') === 'ru' ? 'Добро пожаловать' :
        (mounted ? language : 'en') === 'tr' ? 'Hoş geldiniz' : 'WELCOME';

  const titleLabel =
    (mounted ? language : 'en') === 'tk' ? 'Sizi görmek begendirýär!' :
      (mounted ? language : 'en') === 'ru' ? 'Рады вас видеть!' :
        (mounted ? language : 'en') === 'tr' ? 'Sizi görmek güzel!' : 'Good to see you!';

  const subtitleLabel =
    (mounted ? language : 'en') === 'tk' ? 'Näme sargyt etmek isleýärsiňiz?' :
      (mounted ? language : 'en') === 'ru' ? 'Что бы вы хотели заказать?' :
        (mounted ? language : 'en') === 'tr' ? 'Ne sipariş etmek istersiniz?' : 'What would you like to order?';

  const itemsLabel =
    (mounted ? language : 'en') === 'tk' ? 'haryt' :
      (mounted ? language : 'en') === 'ru' ? 'товаров' :
        (mounted ? language : 'en') === 'tr' ? 'ürün' : 'items';

  const activeBg = theme === 'dark' ? cafeSettings.backgroundColorDark : cafeSettings.backgroundColorLight;
  const activeAccent = theme === 'dark' ? cafeSettings.accentColorDark : cafeSettings.accentColorLight;

  React.useEffect(() => {
    if (!activeAccent) return;
    const root = document.documentElement;
    root.style.setProperty('--accent-color', activeAccent);
    return () => { root.style.removeProperty('--accent-color'); };
  }, [activeAccent]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col p-4 bg-background">
        <div className="flex justify-between items-center mb-10">
          <Skeleton className="h-10 w-24 rounded-xl" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-10 w-10 rounded-xl" />
          </div>
          <Skeleton className="h-10 w-24 rounded-xl" />
        </div>
        <div className="flex flex-col items-center mb-8">
          <Skeleton className="h-8 w-8 rounded-full mb-4" />
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-32 w-full rounded-2xl" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-zinc-950 pb-10">
      {/* Header */}
      <header className="flex-shrink-0 px-4 pt-2 pb-2 sticky top-0 z-30 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-8xl mx-auto flex items-center justify-between">

          {/* Left - Table Indicator */}
          {tableId ? (
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 shadow-sm">
              <Utensils size={14} style={{ color: 'var(--accent-color, #f97316)' }} />
              <span className="text-sm font-bold">
                {tableLabel} {tableId}
              </span>
            </div>
          ) : (
            <div /> // keeps spacing when no table
          )}

          {/* Right - Notification, Theme, Language */}
          <div className="flex items-center gap-2">

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 shadow-sm active:scale-95 transition-all"
            >
              {theme === 'dark' ? (
                <Sun size={18} className="text-yellow-500" />
              ) : (
                <Moon size={18} className="text-zinc-500" />
              )}
            </button>

            {/* Language Selector */}
            <div ref={langRef} className="relative z-50">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 shadow-sm active:scale-95 transition-all text-sm"
              >
                <span className="text-base">{currentLang.flag}</span>
                <ChevronDown size={14} className={`text-muted-foreground transition-transform duration-300 ${langOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {langOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 top-full mt-2 w-40 rounded-2xl bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 shadow-xl overflow-hidden"
                  >
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setLanguage(lang.code);
                          setLangOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${language === lang.code ? 'text-purple-600 font-bold bg-purple-50 dark:bg-purple-500/10' : ''
                          }`}
                      >
                        <span className="text-base">{lang.flag}</span>
                        <span>{lang.name}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

        </div>
      </header>


      {/* Hero Section */}
      <section className="flex-shrink-0 px-6 py-16 md:py-24 flex flex-col items-center text-center relative overflow-hidden bg-white dark:bg-zinc-950 min-h-[6vh] md:min-h-0">
        {/* Left Image */}
        <div className="absolute top-40 -left-0 md:left-0 -translate-y-1/2 w-32 md:w-80 h-auto z-0 pointer-events-none select-none mix-blend-multiply dark:mix-blend-normal dark:opacity-80">
          <img
            src="/meal left.png"
            alt=""
            className="w-full h-full object-contain"
          />
        </div>

        {/* Right Image */}
        <div className="absolute top-40 -right-0 md:right-0 -translate-y-1/2 w-32 md:w-80 h-auto z-0 pointer-events-none select-none mix-blend-multiply dark:mix-blend-normal dark:opacity-80">
          <img
            src="/meal right.png"
            alt=""
            className="w-full h-full object-contain"
          />
        </div>

        <div className="relative z-10 max-w-2xl mx-auto">
          {cafeSettings.logo && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="-mt-14"
            >
              <img
                src={getImageUrl(cafeSettings.logo)}
                alt={cafeSettings.name}
                className="w-8 h-8 lg:w-20 lg:h-20 md:w-28 md:h-28 lg:mb-6 object-contain mx-auto drop-shadow-md"
              />
            </motion.div>
          )}

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className=""
          >
            <span className="text-xs lg:text-2xl lg:pb-6 font-normal tracking-[0.3em] uppercase" style={{ color: 'var(--accent-color, #f97316)' }}>
              {welcomeLabel}
            </span>
          </motion.div>

          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-2xl md:text-6xl lg:pb-6 font-serif font-bold text-zinc-800 dark:text-white mb-2 drop-shadow-[0_2px_4px_rgba(255,255,255,0.8)] dark:drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
          >
            {titleLabel}
          </motion.h1>

          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-base text-xs md:text-lg text-zinc-400 dark:text-zinc-400 font-medium max-w-lg mx-auto"
          >
            {subtitleLabel}
          </motion.p>
        </div>
      </section>

      {/* Category Grid */}
      <main className="flex-1 px-3 max-w-8xl mx-auto w-full relative z-10 -mt-10 md:-mt-14">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 justify-center">
          {categories.map((category, index) => {
            const Icon = getCategoryIcon(category.name.en);
            return (

              <motion.button
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.05 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => onSelectCategory(category.id)}
                className="relative flex flex-col bg-white dark:bg-zinc-900 rounded-[16px] overflow-hidden shadow-sm border border-[0.2px] group hover:shadow-md transition-all h-36 md:h-64 lg:72"
              >
                {/* Image fills entire card */}
                {category.image ? (
                  <img
                    src={getImageUrl(category.image)}
                    alt={getLocalizedName(category.name, mounted ? language : 'en')}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                ) : (
                  <div className="absolute inset-0 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                    <Icon size={40} className="text-zinc-300 dark:text-zinc-700" />
                  </div>
                )}

                {/* Gradient fade behind text */}
                <div className="absolute bottom-0 inset-x-0 h-24 dark:bg-gradient-to-t dark:from-black/100 from-gray-200  dark:to-transparent" />

                {/* Bottom overlay content */}
                <div className="absolute bottom-0 inset-x-0 px-2 pb-2 pt-1 flex items-center gap-2 bg-gradient-to-t dark:from-black/60 from-white/80 dark:to-transparent to-white border-white/20 dark:border-white/10">
                  {/* Icon circle */}
                  <div className="w-8 h-8 lg:w-10 lg:h-10 md:h-10 md:w-10 rounded-full bg-white/80 dark:bg-black/40 backdrop-blur-sm border-[0.2px] flex items-center justify-center shrink-0 shadow-sm" style={{ borderColor: 'color-mix(in srgb, var(--accent-color, #f97316) 40%, transparent)' }}>
                    <Icon size={16} style={{ color: 'var(--accent-color, #f97316)' }} />
                  </div>

                  {/* Text */}
                  <div className="flex-1 text-left min-w-0 ps-0 lg:ps-2 ">
                    <h3 className="text-[12px] lg:text-[16px] md:text-[16px] sm:text-[12px] font-bold dark:text-white text-black/60 drop-shadow-sm truncate leading-tight">
                      {getLocalizedName(category.name, mounted ? language : 'en')}
                    </h3>
                    <p className="text-[10px] lg:text-[12px] md:text-[12px] sm:text-[10px] dark:text-white/70 text-gray-400 font-medium">
                      {category.products.length} {itemsLabel}
                    </p>
                  </div>

                  {/* Arrow */}
                  <div className="w-9 h-9 hidden lg:flex md:flex sm:flex rounded-full bg-white/20 dark:bg-black/40 border-[0.2px] flex items-center justify-center shrink-0 group-hover:bg-white/30 transition-colors" style={{ borderColor: 'color-mix(in srgb, var(--accent-color, #f97316) 40%, transparent)' }}>
                    <ChevronRight size={16} style={{ color: 'var(--accent-color, #f97316)' }} />
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </main >

      {/* Decorative footer line */}
      < footer className="mt-12 flex flex-col items-center" >
        <div className="flex items-center gap-4" style={{ color: 'color-mix(in srgb, var(--accent-color, #f97316) 30%, transparent)' }}>
          <div className="h-[1px] w-12 bg-current" />
          <Utensils size={16} style={{ color: 'color-mix(in srgb, var(--accent-color, #f97316) 60%, transparent)' }} />
          <div className="h-[1px] w-12 bg-current" />
        </div>
      </footer >
    </div >
  );
}
