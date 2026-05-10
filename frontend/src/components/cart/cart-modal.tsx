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
    clearCart,
    tableId,
    sessionId,
    language,
  } = useCartStore();
  const { isTabletMode } = useTabletStore();
  const [submitting, setSubmitting] = React.useState(false);
  const [confirmedOrder, setConfirmedOrder] =
    React.useState<OrderResult | null>(null);
  const [lastOrderTotal, setLastOrderTotal] = React.useState(0);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);


  const lang = mounted ? language : "en";

  const labels = {
    cart:
      lang === "tk"
        ? "Sebet"
        : lang === "ru"
          ? "Корзина"
          : lang === "tr"
            ? "Sepet"
            : "Your Cart",
    empty:
      lang === "tk"
        ? "Sebet boş"
        : lang === "ru"
          ? "Корзина пуста"
          : lang === "tr"
            ? "Sepet bos"
            : "Your cart is empty",
    emptyDesc:
      lang === "tk"
        ? "Menyudan haryt gosung"
        : lang === "ru"
          ? "Добавьте товары из меню"
          : lang === "tr"
            ? "Menuden urun ekleyin"
            : "Add items from the menu to get started",
    total:
      lang === "tk"
        ? "Jemi"
        : lang === "ru"
          ? "Итого"
          : lang === "tr"
            ? "Toplam"
            : "Total",
    items:
      lang === "tk"
        ? "haryt"
        : lang === "ru"
          ? "товар."
          : lang === "tr"
            ? "urun"
            : "items",
    placeOrder:
      lang === "tk"
        ? "Sargyt ber"
        : lang === "ru"
          ? "Оформить заказ"
          : lang === "tr"
            ? "Siparis ver"
            : "Place Order",
    orderPlaced:
      lang === "tk"
        ? "Sargyt kabul edildi!"
        : lang === "ru"
          ? "Заказ принят!"
          : lang === "tr"
            ? "Siparis alindi!"
            : "Order Placed!",
    orderNumber:
      lang === "tk"
        ? "Sargyt belgisi"
        : lang === "ru"
          ? "Номер заказа"
          : lang === "tr"
            ? "Siparis no"
            : "Order Number",
    preparing:
      lang === "tk"
        ? "Taýýarlanýar..."
        : lang === "ru"
          ? "Готовится..."
          : lang === "tr"
            ? "Hazirlaniyor..."
            : "Your order is being prepared...",
    close:
      lang === "tk"
        ? "Ýapmak"
        : lang === "ru"
          ? "Закрыть"
          : lang === "tr"
            ? "Kapat"
            : "Close",

  };

  // Active (not-yet-ordered) items only
  const activeItems = items.filter((item) => item.status !== "ordered");

  const handleSubmitOrder = async () => {
    if (!tableId || activeItems.length === 0) return;
    setSubmitting(true);

    try {
      const orderItems: any[] = [];
      activeItems.forEach((item) => {
        if (item.isCombo || item.comboId) {
          orderItems.push({
            comboId: item.comboId || item.productId, // Use comboId if available, fallback to productId which is reused for combos
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
        source: isTabletMode ? 'tablet' : 'qr',
      });

      const socket = getSocket();
      socket.emit("new-order", order);

      // Save the local total before clearing cart
      const localTotal = activeItems.reduce(
        (t, i) => t + i.price * i.quantity,
        0,
      );
      setLastOrderTotal(localTotal);

      // Clear cart after order is placed — no "ordered" items shown
      clearCart();
      setConfirmedOrder(order);
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

  const totalItems = activeItems.reduce((sum, item) => sum + item.quantity, 0);

  const cartFooter = confirmedOrder ? (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">{labels.total}</span>
        <span className="text-2xl font-bold text-gradient">
          {formatCurrency(lastOrderTotal)}
        </span>
      </div>
      <Button onClick={handleClose} className="w-full h-12">
        {labels.close}
      </Button>
    </div>
  ) : activeItems.length > 0 ? (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">
          {labels.total}
        </span>
        <span className="text-2xl font-bold text-gradient">
          {formatCurrency(
            activeItems.reduce((t, i) => t + i.price * i.quantity, 0),
          )}
        </span>
      </div>
      <Button
        onClick={handleSubmitOrder}
        disabled={submitting || activeItems.length === 0}
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
    </div>
  ) : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={confirmedOrder ? undefined : labels.cart}
      footer={cartFooter}
    >
      <AnimatePresence mode="wait">
        {confirmedOrder ? (
          <motion.div
            key="confirmed"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-6"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", bounce: 0.4, delay: 0.1 }}
              className="w-20 h-20 mx-auto rounded-full bg-green-500/20 flex items-center justify-center mb-4"
            >
              <CheckCircle size={40} className="text-green-500" />
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl font-bold mb-2"
            >
              {labels.orderPlaced}
            </motion.h2>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl p-4 mb-4 inline-block bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20"
            >
              <p className="text-xs text-muted-foreground mb-1">
                {labels.orderNumber}
              </p>
              <p className="text-3xl font-bold text-gradient">
                #{confirmedOrder.id}
              </p>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-sm text-muted-foreground"
            >
              {labels.preparing}
            </motion.p>
          </motion.div>
        ) : activeItems.length === 0 ? (
          <motion.div key="empty" className="text-center py-16 px-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-zinc-100 dark:bg-white/5 flex items-center justify-center mb-5">
              <ShoppingBag
                size={32}
                className="text-zinc-300 dark:text-zinc-600"
              />
            </div>
            <p className="font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
              {labels.empty}
            </p>
            <p className="text-sm text-zinc-400 dark:text-zinc-500">
              {labels.emptyDesc}
            </p>
          </motion.div>
        ) : (
          <motion.div key="cart" className="space-y-4">
            {/* Active Items */}
            {activeItems.length > 0 && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    {totalItems} {labels.items}
                  </span>
                  <div className="flex-1 h-px bg-zinc-200 dark:bg-white/10" />
                </div>

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
                          className={`p-3 rounded-xl transition-colors ${
                            item.isGift
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
                                  <ShoppingBag
                                    size={18}
                                    className="text-zinc-300 dark:text-zinc-600"
                                  />
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
                          {/* closes top flex row */}

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
                              <div className="flex items-center gap-1 bg-zinc-100 dark:bg-white/[0.06] rounded-lg p.0.5">
                                <button
                                  onClick={() =>
                                    updateQuantity(
                                      item.productId,
                                      item.quantity - 1,
                                    )
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
                                    updateQuantity(
                                      item.productId,
                                      item.quantity + 1,
                                    )
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

            {/* Ordered items section removed — customer only sees active cart items */}
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}
