import { create } from "zustand";
import {
  getEntitlements,
  type Entitlements,
  type PlanFeatureId,
} from "@/lib/api/client";

interface UpgradePrompt {
  feature: PlanFeatureId | null;
  quota: "generations" | "sandbox_hours" | "projects" | null;
  requiredPlan: "basic" | "standard" | "pro";
  message: string;
}

interface EntitlementsState {
  entitlements: Entitlements | null;
  loading: boolean;
  upgradePrompt: UpgradePrompt | null;

  loadEntitlements: () => Promise<void>;
  hasFeature: (feature: PlanFeatureId) => boolean;
  openUpgradeDialog: (prompt: UpgradePrompt) => void;
  closeUpgradeDialog: () => void;
}

export const useEntitlementsStore = create<EntitlementsState>((set, get) => ({
  entitlements: null,
  loading: false,
  upgradePrompt: null,

  loadEntitlements: async () => {
    set({ loading: true });
    try {
      const result = await getEntitlements();
      if (result.ok) {
        set({ entitlements: result.data });
      }
    } finally {
      set({ loading: false });
    }
  },

  hasFeature: (feature) => {
    const e = get().entitlements;
    // Until entitlements are loaded, don't block the UI — the backend gate
    // remains the source of truth and will surface PLAN_LIMIT errors.
    if (!e) return true;
    return e.features.includes(feature);
  },

  openUpgradeDialog: (prompt) => set({ upgradePrompt: prompt }),
  closeUpgradeDialog: () => set({ upgradePrompt: null }),
}));
