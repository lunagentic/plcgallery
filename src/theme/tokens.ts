export const TEAM_COLORS = [
  { hex: '#F5EFE3', name: 'Cloud Dancer' },
  { hex: '#F4D35E', name: 'Lemon Icing' },
  { hex: '#E8A9B8', name: 'Raindrops on Roses' },
  { hex: '#A8C5D6', name: 'Ice Melt' },
  { hex: '#87B5A3', name: 'Oceanic Green' },
  { hex: '#E07856', name: 'Papaya' },
  { hex: '#C75B7A', name: 'Rebel Pink' },
  { hex: '#3A5A6C', name: 'Deep Ink' },
] as const;

/**
 * Pantone 2026 "Soft Joy" palette per the design spec
 * (`/Users/.../Downloads/plcdesign.md`).
 *
 * Naming convention (matches MD tokens):
 *   --paper / --paper-2 / --ink / --ink-2 / --ink-3 / --line / --c-accent
 *   plus 7 category hues (--c-art / --c-music / ...).
 *
 * The existing `AppTheme` shape is preserved for zero-churn on
 * components currently consuming `theme.brand`, `theme.surface`, etc. —
 * the legacy keys are remapped to the closest Soft-Joy equivalent.
 */
export interface AppTheme {
  mode: 'light';

  // Paper / surfaces
  paper: string;
  paper2: string;
  bg: string;        // alias of paper (legacy)
  surface: string;   // alias of paper-2 (cards in legacy code use surface)
  surface2: string;  // a hair darker than paper-2

  // Text
  ink: string;
  ink2: string;
  ink3: string;
  text: string;       // alias of ink (legacy)
  textMuted: string;  // alias of ink2 (legacy)
  textSoft: string;   // alias of ink3 (legacy)

  // Lines / borders
  line: string;
  border: string;        // alias of line
  borderStrong: string;

  // Accent (Coral Quartz)
  accent: string;
  brand: string;       // legacy alias
  brandHover: string;  // legacy alias (hover deepens accent)
  brandSoft: string;   // tinted accent surface
  brandInk: string;    // ink for placement on brand surfaces

  // Tip card (kept tonally close to accent, lighter)
  tipBg: string;
  tipBorder: string;
  tipInk: string;

  // CTA
  cta: string;
  ctaHover: string;
  ctaText: string;

  // Mint (used by some legacy components for invite box) — recolored to Spring Bouquet
  mint: string;
  mintBorder: string;
  mintDeep: string;

  // Shadows
  shadowSm: string;
  shadowMd: string;
  shadowLg: string;

  // 7 category hues
  cArt: string;
  cMusic: string;
  cLang: string;
  cNature: string;
  cBody: string;
  cLife: string;
  cEval: string;
}

const PAPER = '#F1ECE3';
const PAPER_2 = '#E6DFD2';
const PAPER_3 = '#D9D2C5'; // for surface2
const INK = '#2A2620';
const INK_2 = '#5C5851';
const INK_3 = '#8E887E';
const LINE = 'rgba(42, 38, 32, 0.10)';
const LINE_STRONG = 'rgba(42, 38, 32, 0.32)';
const ACCENT = '#E2725B';        // Coral Quartz
const ACCENT_DEEP = '#C95A45';   // hover/pressed
const ACCENT_SOFT = '#F6DDD3';   // tinted background

export const lightTheme: AppTheme = {
  mode: 'light',

  paper: PAPER,
  paper2: PAPER_2,
  bg: PAPER,
  surface: PAPER_2,
  surface2: PAPER_3,

  ink: INK,
  ink2: INK_2,
  ink3: INK_3,
  text: INK,
  textMuted: INK_2,
  textSoft: INK_3,

  line: LINE,
  border: LINE,
  borderStrong: LINE_STRONG,

  accent: ACCENT,
  brand: ACCENT,
  brandHover: ACCENT_DEEP,
  brandSoft: ACCENT_SOFT,
  brandInk: INK,

  tipBg: '#FBE6D6',
  tipBorder: '#E8B698',
  tipInk: '#7A3A24',

  cta: ACCENT,
  ctaHover: ACCENT_DEEP,
  ctaText: '#FFFFFF',

  // Spring Bouquet pastels for invite box
  mint: '#D6E8DA',
  mintBorder: '#9DBFA4',
  mintDeep: '#3F6B4D',

  shadowSm: '0 1px 2px rgba(42, 38, 32, 0.06)',
  shadowMd: '0 4px 12px rgba(42, 38, 32, 0.08)',
  shadowLg: '0 18px 40px -22px rgba(42, 38, 32, 0.18)',

  // 7 category hues — keep accessible to components that want
  // category-coded chips/borders.
  cArt: '#E2725B',     // Coral Quartz
  cMusic: '#F4B942',   // Saffron
  cLang: '#4A7FBF',    // Cornflower
  cNature: '#5BA66E',  // Spring Bouquet
  cBody: '#E589B0',    // Pink Carnation
  cLife: '#9876C6',    // Crocus Petal
  cEval: '#3A3530',    // Phantom
};
