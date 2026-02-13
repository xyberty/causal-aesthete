import { create } from "zustand";
import { DEFAULT_CURRENCY, toCurrency } from "@/lib/currencies";

export type Category = "need" | "want";

export type PriorityMode = "rank" | "weight";

export type Item = {
  id: string;
  title: string;
  price: number;
  currency: string;
  category: Category;
  // In rank mode: 1..n (lower = higher priority)
  // In weight mode: higher = more important (0..100 recommended)
  priority: number;
  achieved: boolean;
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

export type PlanSettings = {
  /** One of the supported currencies (see Currency enum). */
  baseCurrency: string;
  startDate: string; // YYYY-MM-DD
  monthlyBudget: number; // in baseCurrency
  carryover: boolean;
  priorityMode: PriorityMode;
  fairnessRatioNeeds: number; // e.g., 2
  fairnessRatioWants: number; // e.g., 1
  maxMonths: number; // safety horizon
  alphaPricePenalty: number; // desirability / price^alpha
  /** Manual FX rates: 1 unit of key = value in base. Use supported Currency codes. */
  fxRates: Record<string, number>;
};

export type AppState = {
  version: 1;
  items: Item[];
  settings: PlanSettings;
};

export type PlanStore = AppState & {
  hydrated: boolean;
  setHydrated: (v: boolean) => void;

  addItem: (item: Omit<Item, "id" | "createdAt" | "updatedAt">) => void;
  updateItem: (id: string, patch: Partial<Omit<Item, "id" | "createdAt">>) => void;
  reorderItems: (category: Category, orderedIds: string[]) => void;
  deleteItem: (id: string) => void;
  toggleAchieved: (id: string) => void;

  setSettings: (patch: Partial<PlanSettings>) => void;

  importState: (state: AppState) => void;
  resetAll: () => void;
};

function uid() {
  return Math.random().toString(36).slice(2, 10) + "-" + Date.now().toString(36);
}

function nowIso() {
  return new Date().toISOString();
}

export const defaultState: AppState = {
  version: 1,
  items: [],
  settings: {
    baseCurrency: DEFAULT_CURRENCY,
    startDate: new Date().toISOString().slice(0, 10),
    monthlyBudget: 0,
    carryover: true,
    priorityMode: "rank",
    fairnessRatioNeeds: 2,
    fairnessRatioWants: 1,
    maxMonths: 36,
    alphaPricePenalty: 0.35,
    fxRates: {},
  },
};

export const usePlanStore = create<PlanStore>((set, get) => ({
  ...defaultState,
  hydrated: false,
  setHydrated: (v) => set({ hydrated: v }),

  addItem: (item) =>
    set((s) => ({
      items: [
        ...s.items,
        {
          ...item,
          id: uid(),
          createdAt: nowIso(),
          updatedAt: nowIso(),
        },
      ],
    })),

  updateItem: (id, patch) =>
    set((s) => ({
      items: s.items.map((it) =>
        it.id === id ? { ...it, ...patch, updatedAt: nowIso() } : it
      ),
    })),

  reorderItems: (category, orderedIds) =>
    set((s) => {
      const mode = s.settings.priorityMode;
      const n = orderedIds.length;
      const idToPriority = new Map<string, number>();
      orderedIds.forEach((id, index) => {
        if (mode === "rank") idToPriority.set(id, index + 1);
        else idToPriority.set(id, n - index);
      });
      return {
        items: s.items.map((it) => {
          const p = it.category === category ? idToPriority.get(it.id) : undefined;
          return p !== undefined ? { ...it, priority: p, updatedAt: nowIso() } : it;
        }),
      };
    }),

  deleteItem: (id) => set((s) => ({ items: s.items.filter((it) => it.id !== id) })),

  toggleAchieved: (id) =>
    set((s) => ({
      items: s.items.map((it) =>
        it.id === id ? { ...it, achieved: !it.achieved, updatedAt: nowIso() } : it
      ),
    })),

  setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

  importState: (state) => {
    // minimal validation / migration point
    if (!state || state.version !== 1) return;
    const merged = { ...defaultState.settings, ...(state.settings ?? {}) };
    merged.baseCurrency = toCurrency(merged.baseCurrency);
    if (!merged.fxRates || typeof merged.fxRates !== "object") merged.fxRates = {};
    set({
      version: 1,
      items: Array.isArray(state.items) ? state.items : [],
      settings: merged,
    });
  },

  resetAll: () => set({ ...defaultState }),
}));
