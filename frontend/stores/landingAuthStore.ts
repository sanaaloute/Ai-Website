import { create } from "zustand";
import type { LlmProviderInfo } from "@/lib/api/client";

interface LandingAuthState {
  // Auth
  isAuthenticated: boolean;
  authChecked: boolean;

  // Profile
  profileAvatarUrl: string | null;
  profileDisplayName: string;

  // Login dialog
  loginDialogOpen: boolean;

  // API Key dialog
  apiKeyDialogOpen: boolean;
  apiKeyDialogDescription: string | null;
  apiKeyDialogShowActions: boolean;
  apiKeyInput: string;
  apiKeyError: string | null;
  apiKeyLoading: boolean;
  apiKeySaving: boolean;
  apiKeyDeleting: boolean;
  apiKeyHasValue: boolean;
  apiKeyPreview: string | null;
  apiKeyEditing: boolean;
  apiKeyProvider: string;
  apiKeyProviders: LlmProviderInfo[];
  apiKeyPreviews: Record<string, string>;
  apiKeyActiveProvider: string | null;

  // Actions — auth / profile
  setIsAuthenticated: (v: boolean) => void;
  setAuthChecked: (v: boolean) => void;
  setProfile: (avatarUrl: string | null, displayName: string) => void;
  resetProfile: () => void;

  // Actions — login dialog
  openLoginDialog: () => void;
  closeLoginDialog: () => void;

  // Actions — API key dialog
  openApiKeyDialog: (description?: string | null, showActions?: boolean) => void;
  closeApiKeyDialog: () => void;
  setApiKeyInput: (v: string) => void;
  setApiKeyError: (v: string | null) => void;
  setApiKeyLoading: (v: boolean) => void;
  setApiKeySaving: (v: boolean) => void;
  setApiKeyDeleting: (v: boolean) => void;
  setApiKeyHasValue: (v: boolean) => void;
  setApiKeyPreview: (v: string | null) => void;
  setApiKeyEditing: (v: boolean) => void;
  setApiKeyProvider: (v: string) => void;
  setApiKeyProviders: (v: LlmProviderInfo[]) => void;
  setApiKeyPreviews: (v: Record<string, string>) => void;
  setApiKeyActiveProvider: (v: string | null) => void;
}

export const useLandingAuthStore = create<LandingAuthState>((set) => ({
  // Auth
  isAuthenticated: false,
  authChecked: false,

  // Profile
  profileAvatarUrl: null,
  profileDisplayName: "Profile",

  // Login dialog
  loginDialogOpen: false,

  // API Key dialog
  apiKeyDialogOpen: false,
  apiKeyDialogDescription: null,
  apiKeyDialogShowActions: true,
  apiKeyInput: "",
  apiKeyError: null,
  apiKeyLoading: false,
  apiKeySaving: false,
  apiKeyDeleting: false,
  apiKeyHasValue: false,
  apiKeyPreview: null,
  apiKeyEditing: true,
  apiKeyProvider: "tokenfree",
  apiKeyProviders: [],
  apiKeyPreviews: {},
  apiKeyActiveProvider: null,

  // Auth / profile
  setIsAuthenticated: (v) => set({ isAuthenticated: v }),
  setAuthChecked: (v) => set({ authChecked: v }),
  setProfile: (avatarUrl, displayName) =>
    set({ profileAvatarUrl: avatarUrl, profileDisplayName: displayName }),
  resetProfile: () =>
    set({ profileAvatarUrl: null, profileDisplayName: "Profile" }),

  // Login dialog
  openLoginDialog: () => set({ loginDialogOpen: true }),
  closeLoginDialog: () => set({ loginDialogOpen: false }),

  // API key dialog
  openApiKeyDialog: (description, showActions) =>
    set({
      apiKeyDialogOpen: true,
      apiKeyError: null,
      apiKeyDialogDescription: description ?? null,
      apiKeyDialogShowActions: showActions ?? true,
    }),
  closeApiKeyDialog: () =>
    set({
      apiKeyDialogOpen: false,
      apiKeyError: null,
      apiKeyDialogDescription: null,
      apiKeyDialogShowActions: true,
    }),
  setApiKeyInput: (v) => set({ apiKeyInput: v }),
  setApiKeyError: (v) => set({ apiKeyError: v }),
  setApiKeyLoading: (v) => set({ apiKeyLoading: v }),
  setApiKeySaving: (v) => set({ apiKeySaving: v }),
  setApiKeyDeleting: (v) => set({ apiKeyDeleting: v }),
  setApiKeyHasValue: (v) => set({ apiKeyHasValue: v }),
  setApiKeyPreview: (v) => set({ apiKeyPreview: v }),
  setApiKeyEditing: (v) => set({ apiKeyEditing: v }),
  setApiKeyProvider: (v) => set({ apiKeyProvider: v }),
  setApiKeyProviders: (v) => set({ apiKeyProviders: v }),
  setApiKeyPreviews: (v) => set({ apiKeyPreviews: v }),
  setApiKeyActiveProvider: (v) => set({ apiKeyActiveProvider: v }),
}));
