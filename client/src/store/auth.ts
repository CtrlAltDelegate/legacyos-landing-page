import { create } from 'zustand';
import { api, tokenStore } from '@/api/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  userId: string;
  email: string;
  fullName: string;
  plan: 'free' | 'core' | 'premium';
  onboardingComplete: boolean;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isInitialized: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
  setUser: (user: AuthUser) => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  isInitialized: false,

  setUser: (user) => set({ user }),

  initialize: async () => {
    const token = tokenStore.getAccess();
    if (!token) {
      set({ isInitialized: true });
      return;
    }
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data.user, isInitialized: true });
    } catch {
      tokenStore.clear();
      set({ user: null, isInitialized: true });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/auth/login', { email, password });
      tokenStore.set(data.accessToken, data.refreshToken);
      set({ user: data.user });
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (email, password, fullName) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/auth/register', { email, password, fullName });
      tokenStore.set(data.accessToken, data.refreshToken);
      set({ user: data.user });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout', { refreshToken: tokenStore.getRefresh() });
    } catch {
      // swallow — clear tokens regardless
    }
    tokenStore.clear();
    set({ user: null });
  },
}));
