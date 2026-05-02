import '@emotion/react';
import type { AppTheme } from './tokens';

declare module '@emotion/react' {
  export interface Theme extends AppTheme {}
}
