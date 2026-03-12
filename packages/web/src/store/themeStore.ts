/**
 * @file themeStore.ts
 * @description 主题状态（深色/亮色），持久化到 localStorage，并同步到 document
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'vibe-theme';

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'light') {
    root.classList.add('light');
  } else {
    root.classList.remove('light');
  }
}

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'dark',
      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
      },
      toggleTheme: () => {
        set((state) => {
          const next = state.theme === 'dark' ? 'light' : 'dark';
          applyTheme(next);
          return { theme: next };
        });
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({ theme: state.theme }),
      onRehydrateStorage: () => (state) => {
        if (state?.theme) applyTheme(state.theme);
      },
    }
  )
);
