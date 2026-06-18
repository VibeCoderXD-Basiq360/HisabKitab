import { create } from 'zustand';

const saved = localStorage.getItem('theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const initialDark = saved ? saved === 'dark' : prefersDark;

export const useThemeStore = create((set) => ({
  dark: initialDark,
  toggle: () =>
    set((s) => {
      const next = !s.dark;
      localStorage.setItem('theme', next ? 'dark' : 'light');
      return { dark: next };
    }),
}));
