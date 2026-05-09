import { create } from "zustand";

const SESSION_KEY = "tablet_session";

interface TabletTable {
  id: number;
  number: number;
  tableCode: string;
  name?: string;
}

interface TabletState {
  isTabletMode: boolean;
  tableId: number | null;
  tableNumber: number | null;
  tableCode: string | null;
  tableName: string | null;
  enterTabletMode: (table: TabletTable) => void;
  exitTabletMode: () => void;
  loadFromSession: () => void;
}

export const useTabletStore = create<TabletState>((set) => ({
  isTabletMode: false,
  tableId: null,
  tableNumber: null,
  tableCode: null,
  tableName: null,

  enterTabletMode: (table) => {
    const data = {
      tableId: table.id,
      tableNumber: table.number,
      tableCode: table.tableCode,
      tableName: table.name || null,
    };
    if (typeof window !== "undefined") {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
    }
    set({ isTabletMode: true, ...data });
  },

  exitTabletMode: () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(SESSION_KEY);
    }
    set({
      isTabletMode: false,
      tableId: null,
      tableNumber: null,
      tableCode: null,
      tableName: null,
    });
  },

  loadFromSession: () => {
    if (typeof window === "undefined") return;
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        set({ isTabletMode: true, ...data });
      }
    } catch {}
  },
}));
