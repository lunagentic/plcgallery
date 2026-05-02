/**
 * Dark mode was removed per the design spec (Pantone Soft Joy, light only).
 * This store is kept as a thin shim so existing imports compile, but the
 * mode is fixed to 'light' and `toggle()` is a no-op.
 */
import { create } from 'zustand';

export type ThemeMode = 'light';

interface ThemeState {
  mode: ThemeMode;
  toggle: () => void;
  setMode: (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>(() => ({
  mode: 'light',
  toggle: () => {
    /* no-op: spec defines a single Light theme */
  },
  setMode: () => {
    /* no-op */
  },
}));
