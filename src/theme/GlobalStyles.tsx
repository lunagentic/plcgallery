import { Global, css, useTheme } from '@emotion/react';

export function GlobalStyles() {
  const theme = useTheme();
  return (
    <Global
      styles={css`
        *,
        *::before,
        *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        html,
        body,
        #root {
          height: 100%;
        }

        html,
        body {
          background: ${theme.paper};
          color: ${theme.ink};
          font-family: 'Pretendard Variable', 'Pretendard', -apple-system, BlinkMacSystemFont,
            'Segoe UI', sans-serif;
          font-size: 14px;
          line-height: 1.5;
          letter-spacing: -0.01em;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        /* Paper Grain — subtle SVG fractalNoise overlay per design spec.
           Multiplied at 35% opacity to add a tactile magazine texture
           without distracting from content. */
        body::before {
          content: '';
          position: fixed;
          inset: 0;
          z-index: 1;
          pointer-events: none;
          mix-blend-mode: multiply;
          opacity: 0.35;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.16 0 0 0 0 0.15 0 0 0 0 0.13 0 0 0 0.18 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
          background-repeat: repeat;
        }

        /* Lift main app content above the grain layer */
        #root {
          position: relative;
          z-index: 2;
        }

        a {
          color: inherit;
          text-decoration: none;
        }
        button {
          font-family: inherit;
          cursor: pointer;
          border: none;
          background: none;
          color: inherit;
        }
        input,
        textarea {
          font-family: inherit;
        }
        img {
          display: block;
          max-width: 100%;
        }

        /* Display / serif headings — Fraunces variable with optical sizing
           and SOFT axis applied per the design spec.
           Components opt-in by setting their font-family to Fraunces. */
        :where(h1, h2, h3, h4) {
          font-variation-settings:
            'opsz' 144,
            'SOFT' 100;
        }

        /* Monospace eyebrow / code blocks */
        :where(code, kbd, samp, pre, .mono) {
          font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace;
          font-variant-numeric: tabular-nums;
        }

        /* Scroll */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: ${theme.border};
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: ${theme.textSoft};
        }

        @keyframes shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}
    />
  );
}
