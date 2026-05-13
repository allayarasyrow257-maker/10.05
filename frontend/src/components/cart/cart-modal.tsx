"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Minus,
  Plus,
  Trash2,
  Gift,
  ShoppingBag,
  CheckCircle,
  Sparkles,
  ShoppingCart,
  Clock,
} from "lucide-react";
import { useCartStore } from "@/store/cart-store";
import { getLocalizedName, formatCurrency } from "@/lib/utils";
import { api, getImageUrl } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTabletStore } from "@/store/tablet-store";
import toast from "react-hot-toast";

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface OrderResult {
  id: number;
  total: string;
  items: any[];
}

export function CartModal({ isOpen, onClose }: CartModalProps) {
  const {
    items,
    updateQuantity,
    removeItem,
    removeByCartItemId,
    lockItemsAfterOrder,
    tableId,
    sessionId,
    language,
  } = useCartStore();
  const { isTabletMode } = useTabletStore();
  const [submitting, setSubmitting] = React.useState(false);
  const [confirmedOrder, setConfirmedOrder] =
    React.useState<OrderResult | null>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const lang = mounted ? language : "en";

  const labels = {
    cart:
      lang === "tk" ? "Sebet" :
        lang === "ru" ? "Корзина" :
          lang === "tr" ? "Sepet" : "Your Cart",
    empty:
      lang === "tk" ? "Sebet boş" :
        lang === "ru" ? "Корзина пуста" :
          lang === "tr" ? "Sepet boş" : "Your cart is empty",
    emptyDesc:
      lang === "tk" ? "Menyudan haryt goşuň" :
        lang === "ru" ? "Добавьте товары из меню" :
          lang === "tr" ? "Menüden ürün ekleyin" : "Add items from the menu to get started",
    total:
      lang === "tk" ? "Jemi" :
        lang === "ru" ? "Итого" :
          lang === "tr" ? "Toplam" : "Total",
    items:
      lang === "tk" ? "haryt" :
        lang === "ru" ? "товар." :
          lang === "tr" ? "ürün" : "items",
    placeOrder:
      lang === "tk" ? "Sargyt ber" :
        lang === "ru" ? "Оформить заказ" :
          lang === "tr" ? "Sipariş ver" : "Place Order",
    orderPlaced:
      lang === "tk" ? "Sargyt kabul edildi!" :
        lang === "ru" ? "Заказ принят!" :
          lang === "tr" ? "Sipariş alındı!" : "Order Placed!",
    orderNumber:
      lang === "tk" ? "Sargyt belgisi" :
        lang === "ru" ? "Номер заказа" :
          lang === "tr" ? "Sipariş no" : "Order Number",
    preparing:
      lang === "tk" ? "Taýýarlanýar..." :
        lang === "ru" ? "Готовится..." :
          lang === "tr" ? "Hazırlanıyor..." : "Your order is being prepared...",
    close:
      lang === "tk" ? "Ýapmak" :
        lang === "ru" ? "Закрыть" :
          lang === "tr" ? "Kapat" : "Close",
    orderedSection:
      lang === "tk" ? "Sargyt edilenler" :
        lang === "ru" ? "Уже заказано" :
          lang === "tr" ? "Sipariş edilenler" : "Already Ordered",
    newSection:
      lang === "tk" ? "Täze sargyt" :
        lang === "ru" ? "Новый заказ" :
          lang === "tr" ? "Yeni sipariş" : "New Items",
    orderedSubtotal:
      lang === "tk" ? "Sargyt edildi" :
        lang === "ru" ? "Заказано" :
          lang === "tr" ? "Sipariş edildi" : "Ordered",
    newSubtotal:
      lang === "tk" ? "Täze" :
        lang === "ru" ? "Новый" :
          lang === "tr" ? "Yeni" : "New",
    grandTotal:
      lang === "tk" ? "Umumy jemi" :
        lang === "ru" ? "Общий итог" :
          lang === "tr" ? "Genel toplam" : "Grand Total",
  };

  // Split items into editable (active) and locked (ordered)
  const activeItems = items.filter((item) => item.status !== "ordered");
  const orderedItems = items.filter((item) => item.status === "ordered");

  const activeTotal = activeItems.reduce((t, i) => t + i.price * i.quantity, 0);
  const orderedTotal = orderedItems.reduce((t, i) => t + i.price * i.quantity, 0);
  const grandTotal = activeTotal + orderedTotal;

  const isEmpty = activeItems.length === 0 && orderedItems.length === 0;
  const totalActiveCount = activeItems.reduce((s, i) => s + i.quantity, 0);

  const handleSubmitOrder = async () => {
    if (!tableId || activeItems.length === 0) return;
    setSubmitting(true);

    try {
      // Only send active (new) items to backend
      const orderItems: any[] = [];
      activeItems.forEach((item) => {
        if (item.isCombo || item.comboId) {
          orderItems.push({
            comboId: item.comboId || item.productId,
            quantity: item.quantity,
            isGift: false,
          });
        } else {
          orderItems.push({
            productId: item.productId,
            quantity: item.quantity,
            isGift: item.isGift || false,
            receiverTableId: item.receiverTableId || undefined,
            receiverTableNumber: item.receiverTableNumber || undefined,
          });
        }
      });

      const order = await api.post<OrderResult>("/orders", {
        tableId,
        sessionId,
        items: orderItems,
        source: isTabletMode ? "tablet" : "qr",
      });

      const socket = getSocket();
      socket.emit("new-order", order);

      // Lock active items as "ordered" — they remain visible but non-editable
      lockItemsAfterOrder();
    } catch (error) {
      toast.error("Failed to place order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setConfirmedOrder(null);
    onClose();
  };

  // ─── Footer ────────────────────────────────────────────────────────────────
  const cartFooter = isEmpty ? null : (
    <div className="space-y-3">
      {/* Price breakdown */}
      <div className="space-y-1.5">
        {orderedItems.length > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{labels.orderedSubtotal}</span>
            <span className="font-medium text-amber-600 dark:text-amber-400">
              {formatCurrency(orderedTotal)}
            </span>
          </div>
        )}
        {activeItems.length > 0 && orderedItems.length > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{labels.newSubtotal}</span>
            <span className="font-medium">{formatCurrency(activeTotal)}</span>
          </div>
        )}
        <div className="flex justify-between items-center pt-1.5 border-t border-zinc-200 dark:border-white/10">
          <span className="text-sm font-medium text-muted-foreground">
            {orderedItems.length > 0 && activeItems.length > 0
              ? labels.grandTotal
              : labels.total}
          </span>
          <span className="text-2xl font-bold text-gradient">
            {formatCurrency(grandTotal)}
          </span>
        </div>
      </div>

      {/* Place Order button — only when there are new (active) items */}
      {activeItems.length > 0 && (
        <Button
          onClick={handleSubmitOrder}
          disabled={submitting}
          className="w-full h-14 text-base font-semibold"
        >
          {submitting ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
            />
          ) : (
            <>
              <Sparkles size={18} className="mr-2" />
              {labels.placeOrder}
            </>
          )}
        </Button>
      )}
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={labels.cart}
      footer={cartFooter}
    >
      <AnimatePresence mode="wait">
        {isEmpty ? (
          /* ── Empty state ── */
          <motion.div key="empty" className="text-center py-16 px-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-zinc-100 dark:bg-white/5 flex items-center justify-center mb-5">
              <ShoppingBag size={32} className="text-zinc-300 dark:text-zinc-600" />
            </div>
            <p className="font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
              {labels.empty}
            </p>
            <p className="text-sm text-zinc-400 dark:text-zinc-500">
              {labels.emptyDesc}
            </p>
          </motion.div>

        ) : (
          /* ── Cart contents ── */
          <motion.div key="cart" className="space-y-4">

            {/* ── Previously Ordered Items (locked / non-editable) ── */}
            {orderedItems.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock size={12} className="text-amber-500 flex-shrink-0" />
                  <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                    {labels.orderedSection}
                  </span>
                  <div className="flex-1 h-px bg-amber-200 dark:bg-amber-500/30" />
                </div>

                <div className="space-y-2 max-h-[28vh] overflow-y-auto pr-1">
                  {orderedItems.map((item) => (
                    <div
                      key={item.cartItemId}
                      className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-500/5 border border-amber-200/60 dark:border-amber-500/15"
                    >
                      <div className="flex items-center gap-3">
                        {/* Thumbnail */}
                        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-amber-100 dark:bg-white/5">
                          {item.image ? (
                            <img
                              src={getImageUrl(item.image)}
                              alt=""
                              className="w-full h-full object-cover opacity-80"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ShoppingBag size={16} className="text-amber-300 dark:text-amber-700" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-medium text-xs sm:text-sm truncate text-zinc-600 dark:text-zinc-300">
                              {getLocalizedName(item.name, language)}
                            </p>
                            {item.isGift && (
                              <Badge variant="gift">
                                <Gift size={10} className="mr-1" />
                                Gift
                              </Badge>
                            )}
                            {(item.isCombo || item.comboId) && (
                              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border-none">
                                <ShoppingCart size={10} className="mr-1" />
                                Combo
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground">
                              ×{item.quantity}
                            </span>
                            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                              {formatCurrency(item.price * item.quantity)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Divider between sections */}
            {orderedItems.length > 0 && activeItems.length > 0 && (
              <div className="flex items-center gap-2">
                <Sparkles size={12} className="text-purple-500 flex-shrink-0" />
                <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide">
                  {labels.newSection}
                </span>
                <div className="flex-1 h-px bg-purple-200 dark:bg-purple-500/30" />
                <span className="text-xs text-muted-foreground">
                  {totalActiveCount} {labels.items}
                </span>
              </div>
            )}

            {/* ── Active (new) Items — editable ── */}
            {activeItems.length > 0 && (
              <>
                {orderedItems.length === 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      {totalActiveCount} {labels.items}
                    </span>
                    <div className="flex-1 h-px bg-zinc-200 dark:bg-white/10" />
                  </div>
                )}

                <div className="space-y-2 max-h-[35vh] overflow-y-auto pr-1">
                  <AnimatePresence initial={false}>
                    {activeItems.map((item, index) => (
                      <motion.div
                        key={item.cartItemId}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <div
                          className={`p-3 rounded-xl transition-colors ${item.isGift
                            ? "bg-pink-50 dark:bg-pink-500/10 border border-pink-200 dark:border-pink-500/20"
                            : item.isCombo || item.comboId
                              ? "bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20"
                              : "bg-zinc-50 dark:bg-white/[0.03] border border-zinc-100 dark:border-white/[0.06] hover:border-zinc-200 dark:hover:border-white/10"
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-zinc-100 dark:bg-white/5">
                              {item.image ? (
                                <img
                                  src={getImageUrl(item.image)}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ShoppingBag size={18} className="text-zinc-300 dark:text-zinc-600" />
                                </div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-medium text-xs sm:text-sm truncate">
                                  {getLocalizedName(item.name, language)}
                                </p>
                                {item.isGift && (
                                  <Badge variant="gift">
                                    <Gift size={10} className="mr-1" />
                                    Gift
                                  </Badge>
                                )}
                                {(item.isCombo || item.comboId) && (
                                  <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-500/20 dark:text-amber-400 border-none">
                                    <ShoppingCart size={10} className="mr-1" />
                                    Combo
                                  </Badge>
                                )}
                              </div>
                              {item.isGift && item.receiverTableNumber && (
                                <p className="text-[10px] text-pink-400 mt-0.5">
                                  To Table {item.receiverTableNumber}
                                </p>
                              )}
                              <p className="text-xs sm:text-sm font-semibold text-purple-600 dark:text-purple-400 mt-0.5">
                                {formatCurrency(item.price * item.quantity)}
                              </p>
                            </div>
                          </div>

                          {/* Bottom row: stepper + delete */}
                          {item.isGift ? (
                            <div className="flex items-center justify-end mt-2 pt-2 border-t border-pink-200/30 dark:border-pink-500/10">
                              <button
                                onClick={() => removeByCartItemId(item.cartItemId)}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                              >
                                <Trash2 size={12} />
                                Remove
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-black/5 dark:border-white/5">
                              <div className="flex items-center gap-1 bg-zinc-100 dark:bg-white/[0.06] rounded-lg p-0.5">
                                <button
                                  onClick={() =>
                                    updateQuantity(item.productId, item.quantity - 1)
                                  }
                                  className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors"
                                >
                                  <Minus size={11} />
                                </button>
                                <span className="text-xs font-semibold w-5 text-center">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() =>
                                    updateQuantity(item.productId, item.quantity + 1)
                                  }
                                  className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors"
                                >
                                  <Plus size={11} />
                                </button>
                              </div>
                              <button
                                onClick={() => removeItem(item.productId)}
                                className="p-1.5 rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </>
            )}

            {/* If only ordered items (no active), show preparing message inline */}
            {orderedItems.length > 0 && activeItems.length === 0 && (
              <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-green-50 dark:bg-green-500/5 border border-green-200/50 dark:border-green-500/15">
                <motion.div
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="w-2 h-2 rounded-full bg-green-500"
                />
                <p className="text-xs font-medium text-green-700 dark:text-green-400">
                  {labels.preparing}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}
