import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: AdminUser | null;
  hydrated: boolean;
  login: (user: AdminUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      hydrated: false,
      login: (user) =>
        set({
          isAuthenticated: true,
          user,
        }),
      logout: () => set({ isAuthenticated: false, user: null }),
    }),
    {
      name: "lovecode-auth",
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.hydrated = true;
        }
      },
    }
  )
);
