import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserPreferences } from '../types';

interface AuthStore {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    setAuth: (user: User, token: string) => void;
    updateUser: (user: Partial<User>) => void;
    updatePreferences: (prefs: Partial<UserPreferences>) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            isAuthenticated: false,

            setAuth: (user, token) => set({ user, token, isAuthenticated: true }),

            updateUser: (updatedUser) =>
                set((state) => ({
                    user: state.user ? { ...state.user, ...updatedUser } : null,
                })),

            updatePreferences: (prefs) =>
                set((state) => ({
                    user: state.user
                        ? { ...state.user, preferences: { ...state.user.preferences, ...prefs } }
                        : null,
                })),

            logout: () => set({ user: null, token: null, isAuthenticated: false }),
        }),
        { name: 'accessai-auth' }
    )
);

// App-wide UI state
interface AppStore {
    activeTab: string;
    sosActive: boolean;
    accessibilityMode: boolean;
    highContrast: boolean;
    setActiveTab: (tab: string) => void;
    setSosActive: (v: boolean) => void;
    toggleAccessibilityMode: () => void;
    toggleHighContrast: () => void;
}

export const useAppStore = create<AppStore>()((set) => ({
    activeTab: 'home',
    sosActive: false,
    accessibilityMode: false,
    highContrast: false,
    setActiveTab: (tab) => set({ activeTab: tab }),
    setSosActive: (v) => set({ sosActive: v }),
    toggleAccessibilityMode: () => set((s) => ({ accessibilityMode: !s.accessibilityMode })),
    toggleHighContrast: () => set((s) => ({ highContrast: !s.highContrast })),
}));
