import { create } from "zustand";

export interface CartItem {
  cartItemId: string; // Unique identifier for this cart item instance
  productId: number;
  name: Record<string, string>;
  price: number;
  quantity: number;
  image?: string;
  notes?: string;
  isGift?: boolean;
  giftFrom?: string;
  receiverTableId?: number;
  receiverTableNumber?: string | number;
  // Combo support
  isCombo?: boolean;
  comboId?: number;
  comboName?: Record<string, string>;
  comboItems?: any[];
  // Status tracking
  status?: "active" | "ordered" | "locked"; // active: editable, ordered/locked: non-editable
  fromBackend?: boolean; // true if synced from backend (other sessions), false/undefined if placed locally
}

function generateSessionId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateCartItemId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getOrCreateSessionId(tableNumber: string): string {
  const storageKey = `session_${tableNumber}`;
  const existing = sessionStorage.getItem(storageKey);
  if (existing) return existing;
  const sessionId = generateSessionId();
  sessionStorage.setItem(storageKey, sessionId);
  return sessionId;
}

// Scoped localStorage helpers — key includes tableId when available
function getCartKey(tableId: number | null): string {
  return tableId ? `qrmenu_cart_${tableId}` : "qrmenu_cart";
}

function getLangKey(tableId: number | null): string {
  return tableId ? `qrmenu_lang_${tableId}` : "qrmenu_lang";
}

function getBillClosedKey(tableId: number | null): string {
  return tableId ? `qrmenu_billclosed_${tableId}` : "qrmenu_billclosed";
}

// Auto-acknowledge a closed-bill notice if it's older than this (10 sec).
// After admin closes the bill, the customer sees a 5s countdown then the
// session resets. If the page is refreshed during or after that window,
// this TTL ensures the stale closed-bill banner is immediately cleared.
const BILL_CLOSED_TTL_MS = 10 * 1000;

function saveCart(items: CartItem[], tableId: number | null) {
  try {
    localStorage.setItem(getCartKey(tableId), JSON.stringify(items));
  } catch {}
}

function loadCart(tableId: number | null): CartItem[] {
  try {
    const stored = localStorage.getItem(getCartKey(tableId));
    if (stored) {
      const items = JSON.parse(stored);
      // Ensure all items have a cartItemId (for backward compatibility)
      return items.map((item: CartItem) => ({
        ...item,
        cartItemId: item.cartItemId || generateCartItemId(),
      }));
    }
  } catch {}
  return [];
}

function loadLanguage(tableId: number | null): string {
  try {
    return localStorage.getItem(getLangKey(tableId)) || "en";
  } catch {
    return "en";
  }
}

function saveBillClosedAt(value: string | null, tableId: number | null) {
  try {
    if (value) {
      localStorage.setItem(getBillClosedKey(tableId), value);
    } else {
      localStorage.removeItem(getBillClosedKey(tableId));
    }
  } catch {}
}

function loadBillClosedAt(tableId: number | null): string | null {
  try {
    const stored = localStorage.getItem(getBillClosedKey(tableId));
    if (!stored) return null;
    const ts = Date.parse(stored);
    if (Number.isNaN(ts)) return null;
    if (Date.now() - ts > BILL_CLOSED_TTL_MS) {
      // stale — drop it and any leftover cart so a returning device starts clean
      localStorage.removeItem(getBillClosedKey(tableId));
      localStorage.removeItem(getCartKey(tableId));
      return null;
    }
    return stored;
  } catch {
    return null;
  }
}

interface CartState {
  items: CartItem[];
  tableId: number | null;
  tableNumber: string | null;
  tableCode: string | null;
  sessionId: string | null;
  language: string;
  billClosedAt: string | null; // ISO timestamp set when admin closes bill; UI banner stays until acknowledged
  _hydrated: boolean;
  hydrate: () => void;
  addItem: (item: Omit<CartItem, "quantity" | "status">) => void;
  removeItem: (productId: number) => void;
  removeByCartItemId: (cartItemId: string) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  updateItemNotes: (productId: number, notes: string) => void;
  clearCart: () => void;
  lockItemsAfterOrder: () => void; // Lock items as "ordered" after placing order
  clearLockedCart: () => void; // Clear cart with locked items (when admin closes bill)
  markBillClosed: (timestamp?: string) => void; // Show closed-bill banner without dropping items
  acknowledgeClosedBill: () => void; // User dismissed the banner — clear cart + flag
  setOrderedItemsFromBackend: (orderedItems: CartItem[]) => void; // Sync ordered items from backend
  setTableData: (id: number, number: number, code: string) => void;
  setTableId: (id: number) => void;
  setTableSession: (tableNumber: string) => void;
  setLanguage: (lang: string) => void;
  getTotal: () => number;
  getItemCount: () => number;
  getOrderedTotal: () => number; // Calculate total of only "ordered" items
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  tableId: null,
  tableNumber: null,
  tableCode: null,
  sessionId: null,
  language: "en",
  billClosedAt: null,
  _hydrated: false,

  hydrate: () => {
    if (get()._hydrated) return;
    const { tableId } = get();
    const billClosedAt = loadBillClosedAt(tableId);
    set({
      items: billClosedAt ? loadCart(tableId) : loadCart(tableId),
      language: loadLanguage(tableId),
      billClosedAt,
      _hydrated: true,
    });
  },

  addItem: (item) => {
    set((state) => {
      const existing = state.items.find(
        (i) =>
          i.productId === item.productId &&
          !i.isGift &&
          !item.isGift &&
          !!i.isCombo === !!item.isCombo &&
          i.notes === item.notes &&
          i.status === "active", // Only merge if active
      );

      let newItems;
      if (existing && !item.isGift && existing.status === "active") {
        newItems = state.items.map((i) =>
          i.productId === item.productId &&
          !i.isGift &&
          !!i.isCombo === !!item.isCombo &&
          i.notes === item.notes &&
          i.status === "active"
            ? { ...i, quantity: i.quantity + 1 }
            : i,
        );
      } else {
        newItems = [
          ...state.items,
          {
            ...item,
            cartItemId: generateCartItemId(),
            status: "active",
            quantity: 1,
          },
        ];
      }
      saveCart(newItems, state.tableId);
      return { items: newItems };
    });
  },

  removeItem: (productId) => {
    set((state) => {
      const newItems = state.items.filter(
        (i) => i.productId !== productId || i.status === "ordered",
      );
      saveCart(newItems, state.tableId);
      return { items: newItems };
    });
  },

  removeByCartItemId: (cartItemId) => {
    set((state) => {
      const newItems = state.items.filter((i) => i.cartItemId !== cartItemId);
      saveCart(newItems, state.tableId);
      return { items: newItems };
    });
  },

  updateQuantity: (productId, quantity) => {
    set((state) => {
      let newItems;
      if (quantity <= 0) {
        newItems = state.items.filter(
          (i) => i.productId !== productId || i.status === "ordered",
        );
      } else {
        newItems = state.items.map((i) =>
          i.productId === productId && i.status === "active"
            ? { ...i, quantity }
            : i,
        );
      }
      saveCart(newItems, state.tableId);
      return { items: newItems };
    });
  },

  updateItemNotes: (productId, notes) => {
    set((state) => {
      const newItems = state.items.map((i) =>
        i.productId === productId ? { ...i, notes } : i,
      );
      saveCart(newItems, state.tableId);
      return { items: newItems };
    });
  },

  clearCart: () => {
    const { tableId } = get();
    saveCart([], tableId);
    set({ items: [] });
  },

  lockItemsAfterOrder: () => {
    set((state) => {
      // Mark all active items as "ordered" (locked) after order placement
      const newItems = state.items.map((i) =>
        i.status === "active" ? { ...i, status: "ordered" } : i,
      );
      saveCart(newItems, state.tableId);
      return { items: newItems };
    });
  },

  clearLockedCart: () => {
    // Called when admin closes bill - clears EVERYTHING (ordered and active items)
    const { tableId } = get();
    saveCart([], tableId);
    saveBillClosedAt(null, tableId);
    set({ items: [], billClosedAt: null });
  },

  markBillClosed: (timestamp) => {
    // Bill closed by admin — keep ordered items visible behind a "closed" banner
    // until the customer acknowledges it. Active (un-submitted) items are dropped
    // because there's no longer an open session to attach them to.
    const ts = timestamp || new Date().toISOString();
    set((state) => {
      const lockedItems = state.items.filter((i) => i.status === "ordered");
      saveCart(lockedItems, state.tableId);
      saveBillClosedAt(ts, state.tableId);
      return { items: lockedItems, billClosedAt: ts };
    });
  },

  acknowledgeClosedBill: () => {
    const { tableId, tableNumber } = get();
    saveCart([], tableId);
    saveBillClosedAt(null, tableId);
    // Generate a fresh sessionId so the new customer group starts clean
    // and doesn't see orders from the previous group
    let newSessionId: string | null = null;
    if (tableNumber) {
      const storageKey = `session_${tableNumber}`;
      const freshId = generateSessionId();
      sessionStorage.setItem(storageKey, freshId);
      newSessionId = freshId;
    }
    set({ items: [], billClosedAt: null, ...(newSessionId ? { sessionId: newSessionId } : {}) });
  },

  setOrderedItemsFromBackend: (orderedItems) => {
    set((state) => {
      // Keep active items and LOCAL ordered items (our session's combos etc)
      // Only replace items that came from backend sync previously
      const activeItems = state.items.filter((i) => i.status !== "ordered");
      const localOrderedItems = state.items.filter(
        (i) => i.status === "ordered" && !i.fromBackend,
      );
      // Tag incoming backend items so we can distinguish them next time
      const taggedBackendItems = orderedItems.map((i) => ({
        ...i,
        cartItemId: i.cartItemId || generateCartItemId(),
        fromBackend: true,
      }));
      const newItems = [
        ...activeItems,
        ...localOrderedItems,
        ...taggedBackendItems,
      ];
      const { tableId } = get();
      saveCart(newItems, tableId);
      return { items: newItems };
    });
  },
  setTableId: (id) => {
    const items = loadCart(id);
    const language = loadLanguage(id);
    const billClosedAt = loadBillClosedAt(id);
    set({ tableId: id, items, language, billClosedAt, _hydrated: true });
  },

  setTableSession: (tableNumber: string) => {
    const sessionId = getOrCreateSessionId(tableNumber);
    set({ tableNumber, sessionId });
  },

  setTableData: (id, number, code) => {
    const items = loadCart(id);
    const language = loadLanguage(id);
    const sessionId = getOrCreateSessionId(number.toString());
    const billClosedAt = loadBillClosedAt(id);
    set({
      tableId: id,
      tableNumber: number.toString(),
      tableCode: code,
      sessionId,
      items,
      language,
      billClosedAt,
      _hydrated: true,
    });
  },

  setLanguage: (lang) => {
    const { tableId } = get();
    try {
      localStorage.setItem(getLangKey(tableId), lang);
    } catch {}
    set({ language: lang });
  },

  getTotal: () => {
    return get().items.reduce(
      (total, item) => total + item.price * item.quantity,
      0,
    );
  },

  getItemCount: () => {
    return get()
      .items.filter((i) => i.status !== "ordered")
      .reduce((count, item) => count + item.quantity, 0);
  },

  getOrderedTotal: () => {
    // Calculate total of only ordered items
    return get()
      .items.filter((item) => item.status === "ordered")
      .reduce((total, item) => total + item.price * item.quantity, 0);
  },
}));
