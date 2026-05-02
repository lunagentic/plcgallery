import { ThemeProvider as EmotionThemeProvider } from '@emotion/react';
import { type ReactNode } from 'react';
import { lightTheme } from './tokens';

/**
 * Single-theme provider per design spec (Pantone 2026 Soft Joy, light only).
 * Dark mode was intentionally removed — see plcdesign.md.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return <EmotionThemeProvider theme={lightTheme}>{children}</EmotionThemeProvider>;
}
