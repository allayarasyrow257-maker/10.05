"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus, X, Tag, Utensils, Coins } from "lucide-react";
import { useCartStore } from "@/store/cart-store";
import { getLocalizedName, formatCurrency } from "@/lib/utils";
import { getImageUrl } from "@/lib/api";

interface Product {
  id: number;
  name: Record<string, string>;
  description?: Record<string, string>;
  price: string;
  image?: string;
}

interface ProductCardProps {
  product: Product;
  language: string;
  index: number;
  categoryName?: Record<string, string>;
}

export function ProductCard({
  product,
  language,
  index,
  categoryName,
}: ProductCardProps) {
  const { items, addItem, updateQuantity } = useCartStore();
  const [mounted, setMounted] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (expanded) {
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
  }, [expanded]);

  const lang = mounted ? language : "en";

  const cartItem = items.find((i) => i.productId === product.id && !i.isGift && i.status === "active");
  const qty = cartItem?.quantity || 0;

  const handleAdd = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    addItem({
      productId: product.id,
      name: product.name,
      price: parseFloat(product.price),
      image: product.image,
    });
  };

  const handleDecrease = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (qty > 0) {
      updateQuantity(product.id, qty - 1);
    }
  };

  const description = product.description
    ? getLocalizedName(product.description, lang)
    : "";

  return (
    <>
      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        onClick={() => setExpanded(true)}
        className="relative z-0 flex flex-col bg-white dark:bg-zinc-900 rounded-[16px] overflow-hidden shadow-sm border border-[0.2px] border-black/5 dark:border-white/10 group hover:shadow-md transition-all h-full"
      >
        {/* Image */}
        <div className="relative h-32 md:h-40 overflow-hidden bg-zinc-50 dark:bg-zinc-800">
          {product.image ? (
            <img
              src={getImageUrl(product.image)}
              alt={getLocalizedName(product.name, lang)}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-4xl opacity-20">🍽️</span>
            </div>
          )}

          {/* Quantity badge */}
          <AnimatePresence>
            {qty > 0 && (
              <motion.div
                initial={{ scale: 0, rotate: -15 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0 }}
                className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shadow-lg z-20"
                style={{ backgroundColor: 'var(--accent-color, #f97316)' }}
              >
                {qty}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Info */}
        <div className="p-3 flex flex-col flex-1 justify-between gap-2">
          <div>
            <h3 className="font-bold text-[14px] dark:text-white text-zinc-800 truncate leading-tight mb-0.5">
              {getLocalizedName(product.name, lang)}
            </h3>
            {description && (
              <p className="text-[10px] text-zinc-400 line-clamp-1 mb-1">
                {description}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between mt-auto pt-1">
            <span className="font-bold text-sm" style={{ color: 'var(--accent-color, #f97316)' }}>
              {formatCurrency(parseFloat(product.price))}
            </span>

            <AnimatePresence mode="wait">
              {qty === 0 ? (
                <motion.button
                  key="add"
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  whileTap={{ scale: 0.85 }}
                  onClick={handleAdd}
                  className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-colors"
                  style={{
                    backgroundColor: 'var(--accent-color-light, rgba(249,115,22,0.08))',
                    border: '1px solid color-mix(in srgb, var(--accent-color, #f97316) 30%, transparent)',
                    color: 'var(--accent-color, #f97316)',
                  }}
                >
                  <Plus size={16} />
                </motion.button>
              ) : (
                <motion.div
                  key="controls"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="flex items-center gap-1 bg-zinc-50 dark:bg-white/5 rounded-full p-0.5 border border-black/5 dark:border-white/5"
                >
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={handleDecrease}
                    className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-red-500/10 text-zinc-400 hover:text-red-500 transition-colors"
                  >
                    <Minus size={14} />
                  </motion.button>
                  <span className="text-xs font-bold w-4 text-center dark:text-white">
                    {qty}
                  </span>
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={handleAdd}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white shadow-md transition-colors"
                    style={{ backgroundColor: 'var(--accent-color, #f97316)' }}
                  >
                    <Plus size={14} />
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* Expanded Detail Modal */}
      <AnimatePresence>
        {expanded && (
          <>
            {/* BACKDROP */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-xl z-[100]"
              onClick={() => setExpanded(false)}
            />

            {/* CARD */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 60 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 40 }}
              transition={{ type: "spring", damping: 22, stiffness: 260 }}
              className="fixed inset-0 p-8 sm:p-6 md:p-10 lg:p-16 z-[101] flex items-center justify-center"            >
              <div className="relative w-full h-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-3xl rounded-[28px] overflow-hidden bg-white dark:bg-zinc-900 shadow-2xl flex flex-col md:flex-row border border-black/5 dark:border-white/10">
                {/* CLOSE */}
                <button
                  onClick={() => setExpanded(false)}
                  className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/70 dark:bg-black/40 backdrop-blur-md hover:scale-105 transition"
                >
                  <X size={20} />
                </button>

                {/* IMAGE */}
                <div className="relative w-full md:w-2/3 h-[45%] md:h-full">
                  {product.image ? (
                    <motion.img
                      src={getImageUrl(product.image)}
                      alt={getLocalizedName(product.name, lang)}
                      initial={{ scale: 1.08 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.6 }}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-7xl opacity-10">
                      🍽️
                    </div>
                  )}

                  {/* gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/40 via-black/10 to-transparent" />
                </div>

                {/* CONTENT */}
                <div className="relative flex flex-col w-full md:w-1/3">

                  {/* SCROLL AREA */}
                  <div className="flex-1 overflow-y-auto px-6 md:px-8 pt-6 pb-28">

                    {/* CATEGORY */}
                    {categoryName && (
                      <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-widest mb-3 md:py-12" style={{ color: 'var(--accent-color, #f97316)' }}>
                        <Tag size={14} />
                        {getLocalizedName(categoryName, lang)}
                      </div>
                    )}

                    {/* TITLE */}
                    <h2 className="text-3xl flex justify-center md:text-3xl font-bold leading-tight mb-4 md:mb-12">
                      {getLocalizedName(product.name, lang)}
                    </h2>

                    {/* PRICE */}
                    <div className="mt-6 flex items-center justify-center gap-3 px-5 py-3 rounded-2xl mb-6" style={{ backgroundColor: 'var(--accent-color-light, rgba(249,115,22,0.08))' }}>
                      <Coins size={20} style={{ color: 'var(--accent-color, #f97316)' }} />
                      <span className="text-2xl font-bold" style={{ color: 'var(--accent-color, #f97316)' }}>
                        {formatCurrency(parseFloat(product.price))}
                      </span>
                    </div>
                  </div>

                  {/* 🔥 STICKY BOTTOM BAR */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border-t border-black/5 dark:border-white/10">

                    <div className="flex md:flex-col lg:flex-col items-center gap-4">

                      {/* TOTAL */}
                      {qty > 0 && (
                        <div className="flex-1">
                          <p className="text-xs text-zinc-400">
                            {lang === "tk"
                              ? "Jemi bahasy"
                              : lang === "ru"
                                ? "Итоговая сумма"
                                : lang === "tr"
                                  ? "Toplam"
                                  : "Total"}
                          </p>
                          <p className="text-xl font-bold">
                            {formatCurrency(parseFloat(product.price) * qty)}
                          </p>
                        </div>
                      )}


                      {/* ADD BUTTON */}
                      {qty === 0 && (
                        <button
                          onClick={handleAdd}
                          className="flex-1 py-3 w-full rounded-2xl text-white font-semibold hover:scale-[1.02] active:scale-[0.97] transition"
                          style={{ backgroundColor: 'var(--accent-color, #f97316)' }}
                        >
                          {lang === "tk"
                            ? "Goş"
                            : lang === "ru"
                              ? "Добавить"
                              : lang === "tr"
                                ? "Ekle"
                                : "Add"}
                        </button>
                      )}
                      {/* QTY CONTROL */}
                      <div className="flex items-center gap-3 bg-zinc-100 dark:bg-white/5 p-1 rounded-2xl">
                        <button
                          onClick={handleDecrease}
                          disabled={qty === 0}
                          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white dark:hover:bg-white/10 disabled:opacity-30"
                        >
                          <Minus size={18} />
                        </button>

                        <span className="w-6 text-center font-bold">
                          {qty}
                        </span>

                        <button
                          onClick={handleAdd}
                          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-white/10"
                        >
                          <Plus size={18} />
                        </button>
                      </div>


                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
