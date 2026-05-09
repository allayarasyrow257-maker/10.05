"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api, getImageUrl } from "@/lib/api";
import { useCartStore } from "@/store/cart-store";
import { getLocalizedName, formatCurrency } from "@/lib/utils";
import { ProductCard } from "./product-card";
import { CategoryTabs } from "./category-tabs";
import { GiftButton } from "@/components/gift/gift-button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/components/theme-provider";
import {
  Sun,
  Moon,
  ChevronDown,
  ChevronLeft,
  Coffee,
  Package,
  X,
  ChevronRight,
  Utensils,
} from "lucide-react";

interface Category {
  id: number;
  name: Record<string, string>;
  icon?: string | null;
  products: Product[];
}

interface Product {
  id: number;
  name: Record<string, string>;
  description?: Record<string, string>;
  price: string;
  image?: string;
  categoryId: number;
}

interface ComboItem {
  id: number;
  quantity: number;
  product: {
    id: number;
    name: Record<string, string>;
    price: string;
    image?: string;
  };
}

interface Combo {
  id: number;
  name: Record<string, string>;
  description?: Record<string, string>;
  price: string;
  image?: string;
  items: ComboItem[];
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
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "tr", name: "Turkce", flag: "🇹🇷" },
  { code: "tk", name: "Turkmen", flag: "🇹🇲" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
];

function getContrastColor(hex: string): "light" | "dark" {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "dark" : "light";
}

function adjustBrightness(hex: string, percent: number): string {
  const r = Math.min(255, Math.max(0, parseInt(hex.slice(1, 3), 16) + Math.round(255 * percent / 100)));
  const g = Math.min(255, Math.max(0, parseInt(hex.slice(3, 5), 16) + Math.round(255 * percent / 100)));
  const b = Math.min(255, Math.max(0, parseInt(hex.slice(5, 7), 16) + Math.round(255 * percent / 100)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function shiftHue(hex: string, degrees: number): string {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0,
    l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  h = ((h * 360 + degrees) % 360) / 360;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const ro = Math.round(hue2rgb(p, q, h + 1 / 3) * 255);
  const go = Math.round(hue2rgb(p, q, h) * 255);
  const bo = Math.round(hue2rgb(p, q, h - 1 / 3) * 255);
  return `#${ro.toString(16).padStart(2, "0")}${go.toString(16).padStart(2, "0")}${bo.toString(16).padStart(2, "0")}`;
}

interface MenuContentProps {
  initialCategoryId?: number | null;
  onBack?: () => void;
}

export function MenuContent({ initialCategoryId, onBack }: MenuContentProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<number>(0);
  const [mounted, setMounted] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [cafeSettings, setCafeSettings] = useState<CafeSettings>({});
  const [expandedCombo, setExpandedCombo] = useState<number | null>(null);
  const [activeComboIndex, setActiveComboIndex] = useState(0);
  const { language, tableId, setLanguage, addItem } = useCartStore();
  const { theme, toggleTheme } = useTheme();
  const sectionRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const langRef = useRef<HTMLDivElement>(null);
  const comboScrollRef = useRef<HTMLDivElement>(null);
  const isScrollingByClick = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const [data, comboData] = await Promise.all([
          api.get<Category[]>("/menu/categories"),
          api.get<Combo[]>("/menu/combos").catch(() => []),
        ]);
        setCategories(data);
        setCombos(comboData);
        if (initialCategoryId) {
          setActiveCategory(initialCategoryId);
        } else if (data.length > 0) {
          setActiveCategory(data[0].id);
        }
      } catch (error) {
        console.error("Failed to fetch menu:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
    api
      .get<CafeSettings>("/admin/settings")
      .then(setCafeSettings)
      .catch(() => {});
  }, [initialCategoryId]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (isScrollingByClick.current) return;
      const scrollPosition = window.scrollY + 180;
      for (const category of categories) {
        const element = sectionRefs.current[category.id];
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (
            scrollPosition >= offsetTop &&
            scrollPosition < offsetTop + offsetHeight
          ) {
            setActiveCategory(category.id);
            break;
          }
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [categories]);

  useEffect(() => {
    if (
      !loading &&
      initialCategoryId &&
      sectionRefs.current[initialCategoryId]
    ) {
      setTimeout(() => {
        const element = sectionRefs.current[initialCategoryId];
        if (element) {
          const offset = 160;
          const top = element.offsetTop - offset;
          window.scrollTo({ top, behavior: "smooth" });
        }
      }, 100);
    }
  }, [loading, initialCategoryId]);

  const scrollToCategory = useCallback((categoryId: number) => {
    setActiveCategory(categoryId);
    isScrollingByClick.current = true;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    const element = sectionRefs.current[categoryId];
    if (element) {
      const offset = 160;
      const top = element.offsetTop - offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingByClick.current = false;
    }, 600);
  }, []);

  // Combo scroll snap handlers
  const handleComboScroll = useCallback(() => {
    const el = comboScrollRef.current;
    if (!el || combos.length === 0) return;
    // card width = 320px (w-80) + 16px gap
    const cardWidth = 320 + 16;
    const index = Math.round(el.scrollLeft / cardWidth);
    setActiveComboIndex(Math.min(Math.max(index, 0), combos.length - 1));
  }, [combos.length]);

  const scrollComboToIndex = useCallback((i: number) => {
    const el = comboScrollRef.current;
    if (!el) return;
    const cardWidth = 320 + 16;
    el.scrollTo({ left: cardWidth * i, behavior: "smooth" });
    setActiveComboIndex(i);
  }, []);

  const handleAddComboToCart = (combo: Combo) => {
    addItem({
      productId: combo.id,
      name: combo.name,
      price: parseFloat(combo.price),
      image: combo.image || "",
      isCombo: true,
      comboId: combo.id,
      comboItems: combo.items,
    });
  };

  const currentLang =
    languages.find((l) => l.code === language) || languages[0];
  const lang = mounted ? language : "en";

  const tableLabel =
    lang === "tk"
      ? "Stol"
      : lang === "ru"
        ? "Стол"
        : lang === "tr"
          ? "Masa"
          : "Table";

  const setLabel =
    lang === "tk"
      ? "Taýýar setler"
      : lang === "ru"
        ? "Готовые сеты"
        : lang === "tr"
          ? "Hazir Setler"
          : "Ready Sets";

  const activeBg =
    theme === "dark"
      ? cafeSettings.backgroundColorDark
      : cafeSettings.backgroundColorLight;
  const activeAccent =
    theme === "dark"
      ? cafeSettings.accentColorDark
      : cafeSettings.accentColorLight;

  // Apply accent color as CSS custom properties globally
  useEffect(() => {
    if (!activeAccent) return;
    const root = document.documentElement;
    root.style.setProperty('--accent-color', activeAccent);
    root.style.setProperty('--accent-color-hover', adjustBrightness(activeAccent, -15));
    root.style.setProperty('--accent-color-muted', adjustBrightness(activeAccent, 30));
    root.style.setProperty('--accent-color-light', theme === 'dark'
      ? hexToRgba(activeAccent, 0.1)
      : hexToRgba(activeAccent, 0.08));
    return () => {
      root.style.removeProperty('--accent-color');
      root.style.removeProperty('--accent-color-hover');
      root.style.removeProperty('--accent-color-muted');
      root.style.removeProperty('--accent-color-light');
    };
  }, [activeAccent, theme]);

  if (loading) {
    return (
      <div className="p-4 space-y-6 pt-20">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-zinc-950 pb-28">
      {/* Header */}
      <header className="flex-shrink-0 px-4 pt-2 pb-2 sticky top-0 z-30 dark:bg-black bg-white border-b border-black/5 dark:border-white/10">
        <div className="6xl mx-auto flex items-center justify-between">
          {/* Left - Back + Table */}
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 shadow-sm active:scale-95 transition-all"
              >
                <ChevronLeft
                  size={18}
                  className="text-zinc-600 dark:text-zinc-400"
                />
              </button>
            )}
            <div className="flex flex-col">
              {tableId ? (
                <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 shadow-sm">
                  <Utensils size={14} style={{ color: 'var(--accent-color, #f97316)' }} />
                  <span className="text-sm font-bold">
                    {tableLabel} {tableId}
                  </span>
                </div>
              ) : (
                <div />
              )}
            </div>
          </div>

          {/* Right - Theme, Language */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 shadow-sm active:scale-95 transition-all"
            >
              {theme === "dark" ? (
                <Sun size={18} className="text-yellow-500" />
              ) : (
                <Moon size={18} className="text-zinc-500" />
              )}
            </button>

            <div ref={langRef} className="relative z-50">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 shadow-sm active:scale-95 transition-all text-sm"
              >
                <span className="text-base">{currentLang.flag}</span>
                <ChevronDown
                  size={14}
                  className={`text-muted-foreground transition-transform duration-300 ${langOpen ? "rotate-180" : ""}`}
                />
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
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${
                          language === lang.code
                            ? "text-purple-600 font-bold bg-purple-50 dark:bg-purple-500/10"
                            : ""
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

      {/* Main Content Wrapper */}
      <div className="max-w-8xl mx-auto w-full">
        {/* Combo Section */}
        {combos.length > 0 && (
          <div className="px-4 pt-6">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-[0.2em] mb-4">
              {setLabel}
            </h3>

            {/* Scroll container with snap */}
            <div
              ref={comboScrollRef}
              onScroll={handleComboScroll}
              className="-mx-4 px-4 flex gap-4 overflow-x-auto pb-4"
              style={{
                scrollbarWidth: "none",
                msOverflowStyle: "none",
                scrollSnapType: "x mandatory",
                WebkitOverflowScrolling: "touch",
                scrollPaddingLeft: "1rem",
              }}
            >
              {combos.map((combo, i) => (
                <motion.div
                  key={combo.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="flex-shrink-0 w-80"
                  style={{ scrollSnapAlign: "start", scrollSnapStop: "always" }}
                >
                  <div
                    className="relative rounded-[20px] overflow-hidden bg-white dark:bg-zinc-900 shadow-sm border border-black/5 dark:border-white/5 cursor-pointer group"
                    onClick={() =>
                      setExpandedCombo(
                        expandedCombo === combo.id ? null : combo.id,
                      )
                    }
                  >
                    {/* Image */}
                    <div className="h-40 relative overflow-hidden">
                      {combo.image ? (
                        <img
                          src={getImageUrl(combo.image)}
                          alt=""
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                          <Package
                            size={40}
                            className="text-zinc-300 dark:text-zinc-700"
                          />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-white text-lg font-bold truncate drop-shadow-sm">
                            {getLocalizedName(combo.name, language)}
                          </h4>
                          <span className="text-white/70 text-xs font-medium">
                            {combo.items.reduce((s, ci) => s + ci.quantity, 0)}{" "}
                            items
                          </span>
                        </div>
                        <span className="text-white text-sm font-bold px-3 py-1 rounded-full shadow-lg" style={{ backgroundColor: 'var(--accent-color, #f97316)' }}>
                          {formatCurrency(parseFloat(combo.price))}
                        </span>
                      </div>
                    </div>

                    {/* Price comparison bar */}
                    {(() => {
                      const individualTotal = combo.items.reduce(
                        (sum, ci) => sum + parseFloat(ci.product.price) * ci.quantity, 0
                      );
                      const comboPrice = parseFloat(combo.price);
                      const savings = individualTotal - comboPrice;
                      if (savings <= 0) return null;
                      const savingsLabel = lang === "tk" ? "Tygşytlylygyňyz" : lang === "ru" ? "Вы экономите" : lang === "tr" ? "Tasarrufunuz" : "You save";
                      const separateLabel = lang === "tk" ? "Aýratyn alsaňyz" : lang === "ru" ? "По отдельности" : lang === "tr" ? "Ayrı alsanız" : "Separately";
                      return (
                        <div className="px-4 py-2.5 flex items-center justify-between border-t border-black/5 dark:border-white/5">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-zinc-400">{separateLabel}:</span>
                            <span className="text-[11px] text-zinc-400 line-through">{formatCurrency(individualTotal)}</span>
                          </div>
                          <span className="text-[11px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                            -{formatCurrency(savings)} {savingsLabel.toLowerCase()}
                          </span>
                        </div>
                      );
                    })()}

                    <div className="px-4 py-3 flex items-center justify-between dark:text-white border-t border-black/5 dark:border-white/5">
                      <span className="text-xs font-medium text-zinc-400">
                        {lang === "tk" ? "Düzümini gör" : lang === "ru" ? "Состав" : lang === "tr" ? "İçeriği gör" : "View contents"}
                      </span>
                      <ChevronRight
                        size={18}
                        className={`text-zinc-400 transition-transform duration-300 ${expandedCombo === combo.id ? "rotate-90" : ""}`}
                      />
                    </div>
                  </div>

                  {/* Expanded details */}
                  <AnimatePresence>
                    {expandedCombo === combo.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 glass rounded-2xl p-4 space-y-3">
                          {combo.items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-3"
                            >
                              {item.product.image ? (
                                <img
                                  src={getImageUrl(item.product.image)}
                                  alt=""
                                  className="w-10 h-10 rounded-xl object-cover"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                                  <span className="text-sm">🍽️</span>
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {getLocalizedName(
                                    item.product.name,
                                    language,
                                  )}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] text-muted-foreground">x{item.quantity}</span>
                                <span className="text-xs font-medium text-zinc-500">{formatCurrency(parseFloat(item.product.price) * item.quantity)}</span>
                              </div>
                            </div>
                          ))}

                          {/* Total comparison */}
                          {(() => {
                            const individualTotal = combo.items.reduce(
                              (sum, ci) => sum + parseFloat(ci.product.price) * ci.quantity, 0
                            );
                            const comboPrice = parseFloat(combo.price);
                            return (
                              <div className="pt-3 border-t border-white/10 space-y-1.5">
                                {individualTotal > comboPrice && (
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-zinc-400">{lang === "tk" ? "Aýratyn bahasy" : lang === "ru" ? "По отдельности" : lang === "tr" ? "Ayrı fiyatı" : "Separate price"}</span>
                                    <span className="text-zinc-400 line-through">{formatCurrency(individualTotal)}</span>
                                  </div>
                                )}
                                <div className="flex items-center justify-between text-sm">
                                  <span className="font-bold" style={{ color: 'var(--accent-color, #f97316)' }}>{lang === "tk" ? "Setiň bahasy" : lang === "ru" ? "Цена комбо" : lang === "tr" ? "Kombo fiyatı" : "Combo price"}</span>
                                  <span className="font-bold text-lg" style={{ color: 'var(--accent-color, #f97316)' }}>{formatCurrency(comboPrice)}</span>
                                </div>
                              </div>
                            );
                          })()}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddComboToCart(combo);
                              setExpandedCombo(null);
                            }}
                            className="w-full py-3 rounded-xl gradient-primary text-white text-sm font-semibold mt-2 shadow-lg active:scale-95 transition-transform"
                          >
                            {lang === "tk"
                              ? "Sebede goş"
                              : lang === "ru"
                                ? "В корзину"
                                : lang === "tr"
                                  ? "Sepete ekle"
                                  : "Add to Cart"}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>

            {/* Dot indicators */}
            {combos.length > 1 && (
              <div className="flex justify-center items-center gap-1.5 mt-3 mb-2">
                {combos.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => scrollComboToIndex(i)}
                    className={`transition-all duration-300 rounded-full ${
                      activeComboIndex === i
                        ? "h-1.5 w-5"
                        : "bg-zinc-300 dark:bg-zinc-600 h-1.5 w-1.5"
                    }`}
                    style={activeComboIndex === i ? { backgroundColor: 'var(--accent-color, #f97316)' } : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Category Tabs */}
        <div className="sticky top-[56px] z-10 bg-white dark:bg-zinc-950 border-b border-black/5 dark:border-white/10 shadow-sm">
          <div className="max-w-8xl mx-auto py-2">
            <CategoryTabs
              categories={categories}
              activeCategory={activeCategory}
              onSelect={scrollToCategory}
              language={language}
            />
          </div>
        </div>

        {/* Products Grid */}
        <div className="p-4 space-y-12">
          {categories.map((category, catIndex) => (
            <motion.div
              key={category.id}
              ref={(el) => {
                sectionRefs.current[category.id] = el;
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: catIndex * 0.1 }}
            >
              <h2 className="text-2xl font-bold mb-6 text-gradient inline-block border-b-2 pb-1" style={{ borderColor: 'color-mix(in srgb, var(--accent-color, #f97316) 20%, transparent)' }}>
                {getLocalizedName(category.name, language)}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 justify-center items-stretch">
                {category.products.map((product, index) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    language={language}
                    index={index}
                    categoryName={category.name}
                  />
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
