import styled from '@emotion/styled';
import { useEffect, useRef, useState } from 'react';
import { useIncrementDownloadCount, type PostWithAuthor } from '@/hooks/usePosts';
import { PdfThumbnail } from '@/components/PdfThumbnail';
import {
  usePostComments,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
  useToggleCommentLike,
  useMyLikedCommentIds,
  type CommentRow,
} from '@/hooks/useComments';
import { getPublicImageUrl } from '@/lib/supabase';
import { copyToClipboard } from '@/lib/clipboard';
import { useUIStore } from '@/store/uiStore';

/** Hard cut-off for the InfoPanel description before we collapse it.
 *  Beyond this we render a "더보기" link that opens the comment sidebar's
 *  expanded details section so the user can read the full text without
 *  the panel covering more of the image. */
const PANEL_DESC_TRUNCATE = 150;

/** Mobile breakpoint shared with the rest of the app (Topbar, Stage, etc.).
 *  Centralized so the hook + media queries can't drift apart. */
const MOBILE_BREAKPOINT = 700;

/** Reactive boolean for "viewport is phone-sized." Mirrors the existing
 *  700px media-query convention so CSS branches and React branches agree
 *  even mid-resize. We register the listener inside an effect so SSR
 *  doesn't crash on `window`. */
function useIsMobile() {
  const [m, setM] = useState(() =>
    typeof window !== 'undefined' &&
    window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const fn = (e: MediaQueryListEvent) => setM(e.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);
  return m;
}

/* ── Heroicons-style 24×24 outline SVGs (Tailwind defaults).
 *    `currentColor` lets them inherit the button's color. */
const Icon = ({
  d,
  fill = 'none',
  size = 18,
}: {
  d: string;
  fill?: string;
  size?: number;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
);
const HeartOutlineIcon = () => (
  <Icon d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733C11.285 4.876 9.623 3.75 7.688 3.75 5.099 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
);
const HeartFilledIcon = () => (
  <Icon
    d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733C11.285 4.876 9.623 3.75 7.688 3.75 5.099 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
    fill="currentColor"
  />
);
const ClipboardIcon = () => (
  <Icon d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5-.124m7.5 10.5h2.25c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.5-7.5-10.5" />
);
const TrashIcon = () => (
  <Icon d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12.56.597c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
);
const DownloadIcon = () => (
  <Icon d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-6L12 15m0 0 4.5-4.5M12 15V2.25" />
);
const PencilIcon = () => (
  <Icon d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
);
const ChatIcon = () => (
  <Icon d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
);
const ReplyIcon = () => (
  <Icon d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
);
const CloseIcon = () => (
  <Icon d="M6 18 18 6M6 6l12 12" />
);
const HomeIcon = () => (
  <Icon d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" />
);

/**
 * Outermost viewer shell. The bg prop lets each post override the stage
 * tint via legacy `stage_bg`; the fallback `#F8D5C4` matches the home
 * page's warm cream so the viewer reads as a continuation of the
 * gallery rather than a darkroom modal.
 *
 * `overflow: clip` (not hidden) keeps the side panel's `backdrop-filter`
 * working — `hidden` would create a containing block that breaks the
 * blur in some engines.
 */
const Overlay = styled.div<{ bg: string }>`
  position: fixed;
  inset: 0;
  background: ${({ bg }) => bg};
  z-index: 1000;
  overflow: clip;
  animation: fadeInBg 0.3s ease;
  @keyframes fadeInBg {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

/**
 * Desktop layout grid. One row for the TopBar across the full width,
 * then a 2-column row: image stage on the left, glass side panel on
 * the right. Animating `grid-template-columns` collapses the panel
 * track to 0 when closed — a single transition that replaces the old
 * 4-point sync (Stage padding-right + CornerNavBtn right + CommentPanel
 * translateX + PanelCollapseHandle right).
 *
 * `minmax(0, 1fr)` on the second row is critical: the default `1fr`
 * floors at `min-content`, which lets a tall photo push the Stage
 * past the viewport bottom (PageIndex drifts off-screen, TopBar stays
 * pinned, the whole composition shifts). minmax(0,...) lets the row
 * shrink the Stage to its track size — Img's own `max-height`
 * constraint takes over from there, so big photos render as big as
 * the lane allows without ever moving the chrome.
 */
const DesktopGrid = styled.div<{ panelOpen: boolean }>`
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  grid-template-columns: 1fr ${({ panelOpen }) => (panelOpen ? '300px' : '0px')};
  transition: grid-template-columns 0.3s ease;
  @media (max-width: 900px) {
    grid-template-columns: 1fr ${({ panelOpen }) => (panelOpen ? '260px' : '0px')};
  }
`;

const TopBar = styled.header`
  grid-column: 1 / -1;
  padding: 14px 24px 12px;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  background: rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(22px) saturate(140%);
  -webkit-backdrop-filter: blur(22px) saturate(140%);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  z-index: 14;
  color: #1a1714;
  .idx {
    font-variant-numeric: tabular-nums;
    font-size: 12px;
    color: rgba(26, 23, 20, 0.55);
  }
`;

const HeaderColumn = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const HeaderTitle = styled.h1`
  margin: 0;
  font-family: 'Fraunces', serif;
  font-style: italic;
  font-weight: 500;
  font-size: clamp(20px, 2.8vw, 28px);
  line-height: 1.15;
  letter-spacing: -0.015em;
  color: #1a1714;
  word-break: keep-all;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const HeaderSubMeta = styled.div`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: rgba(26, 23, 20, 0.65);
  letter-spacing: 0.01em;
  .author {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: rgba(26, 23, 20, 0.85);
  }
  .team {
    color: rgba(26, 23, 20, 0.6);
  }
  .sep {
    color: rgba(26, 23, 20, 0.3);
  }
`;

const HeaderTopRight = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  padding-top: 4px;
`;

const MiniAvatar = styled.span`
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: linear-gradient(135deg, #f4d35e, #e07856);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;

const RoundBtn = styled.button`
  width: 36px;
  height: 36px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.7);
  color: #1a1714;
  font-size: 16px;
  display: grid;
  place-items: center;
  border: 0;
  cursor: pointer;
  transition: background 0.15s ease;
  &:hover {
    background: rgba(255, 255, 255, 0.95);
  }
`;

/**
 * Image stage — left grid cell on desktop. Transparent so the parent
 * Overlay's `stage_bg` tint (warm cream by default) shows through;
 * the surrounding sidebar supplies the glass treatment on top.
 *
 * `padding` only reserves room for the TopBar (top) and the
 * FullscreenCaptionOverlay (bottom). The corner nav arrows are now
 * vertically centered, not bottom-anchored, so they don't reserve a
 * lane.
 */
const Stage = styled.div`
  grid-column: 1;
  grid-row: 2;
  position: relative;
  display: grid;
  place-items: center;
  /* Tight padding so the photo gets the lion's share of the lane.
   *  Bottom reserves just enough room for the PageIndex pill (28px
   *  tall + 18px offset + small gap = ~52px). */
  padding: 24px 60px 52px;
  overflow: hidden;
  /* min-height: 0 + parent's minmax(0,1fr) row are both required to
   *  keep the Stage pinned to its grid track height. Without this
   *  combo, a tall photo's intrinsic size pushes the row open and
   *  PageIndex (anchored to Stage.bottom) ends up off-screen. */
  min-height: 0;
  @media (max-width: 900px) {
    padding: 20px 12px 52px;
  }
`;

/** Wraps image + thumb strip so the strip sits *below* the photo, not on it.
 *  The InfoPanel is still anchored inside ImageHost (top banner). */
const ImageColumn = styled.div`
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  max-width: 100%;
`;

/** Single visual card that owns the image + caption strip together so
 *  they read as one Instagram-style media card. The radius / shadow /
 *  overflow live here so the image and caption can sit flush against
 *  each other with no visible seam. ImageColumn is `inline-flex` and
 *  shrinks to image width — MediaCard inherits that natural width.
 *
 *  The entry `cardLift` animation mimics the Behance editorial feel:
 *  the card eases up from a slightly smaller scale + soft blur the
 *  moment the viewer mounts, so opening a post feels like the photo
 *  is rising into focus rather than just flashing in. */
const MediaCard = styled.div`
  display: flex;
  flex-direction: column;
  /* Pin a consistent card width so the viewer doesn't jump in size as
   *  the user pages through posts with different aspect ratios. The
   *  photo inside is centered and keeps its natural aspect via
   *  object-fit: contain — extra room reads as a soft letterbox
   *  rather than a layout shift. Bumped from 900 → 1100 to give the
   *  artwork more breathing room (Behance-feed feel). */
  width: min(1100px, 94vw);
  max-width: 100%;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 30px 80px -20px rgba(0, 0, 0, 0.25);
  background: rgba(255, 255, 255, 0.2);
  animation: cardLift 460ms cubic-bezier(0.2, 0.85, 0.25, 1) both;
  @keyframes cardLift {
    from {
      transform: scale(0.94) translateY(12px);
      opacity: 0;
      filter: blur(6px);
    }
    to {
      transform: scale(1) translateY(0);
      opacity: 1;
      filter: blur(0);
    }
  }
`;

const Img = styled.img`
  max-width: 100%;
  /* Cap the photo so it fills the Stage lane without ever overflowing
   *  it. TopBar (~85) + Stage padding (24 top + 52 bottom) ≈ 161;
   *  100vh - 165 gives the image the largest box that's still
   *  comfortably above the PageIndex pill — wide / tall / square
   *  aspect ratios all letterbox inside this same fixed envelope so
   *  the surrounding chrome never shifts. */
  max-height: calc(100vh - 165px);
  object-fit: contain;
  display: block;
`;

/** Behance-style image-zoom trigger. Wraps the image so the whole
 *  photo block is one click target with a zoom-in cursor. The press
 *  reaction is a tiny scale dip + brightness lift — enough feedback to
 *  feel responsive without being noisy. */
const ImagePressable = styled.button`
  border: 0;
  padding: 0;
  margin: 0;
  background: transparent;
  /* Flex-center the photo inside its host box. When the caption's
   *  720px reading cap pushes MediaCard wider than the image's
   *  natural width, the image would otherwise stick to the left edge
   *  — centering keeps the photo visually balanced under the caption. */
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  cursor: zoom-in;
  overflow: hidden;
  & img {
    transition: transform 360ms cubic-bezier(0.2, 0.85, 0.25, 1),
      filter 280ms ease;
    will-change: transform;
  }
  &:hover img {
    transform: scale(1.015);
    filter: brightness(1.03);
  }
  &:active img {
    transform: scale(0.99);
  }
`;

/** Full-screen lightbox overlay rendered on top of the viewer when the
 *  user clicks the photo. Animates a soft fade + scale-in (Behance vibe),
 *  shows the image at near-full viewport size. Cream backdrop matches
 *  the rest of the viewer so the zoom feels like the same page just
 *  bigger, not a separate darkroom modal. */
const ZoomOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  cursor: zoom-out;
  background: rgba(248, 213, 196, 0.96);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  animation: zoomBgIn 220ms cubic-bezier(0.4, 0, 0.2, 1);
  padding: 24px;
  @keyframes zoomBgIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const ZoomedImg = styled.img`
  max-width: 96vw;
  max-height: 96vh;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 60px 120px -20px rgba(0, 0, 0, 0.6);
  /* Animation runs once on mount (the lightbox opening). We deliberately
   *  keep the same <img> DOM node across post changes (no React key) so
   *  navigating with ← → or the ZoomNavBtns swaps the src in place
   *  instead of re-running the keyframes — that re-run was causing a
   *  visible opacity flicker on every navigation. */
  animation: zoomLift 360ms cubic-bezier(0.2, 0.85, 0.25, 1);
  /* Same hover reaction as the in-card ImagePressable: a tiny lift on
   *  scale + brightness so the lightbox feels alive when the cursor
   *  passes over it. transition covers the smooth fall-back when the
   *  cursor leaves and the src-swap fade window. */
  transition:
    transform 280ms cubic-bezier(0.2, 0.85, 0.25, 1),
    filter 280ms ease,
    opacity 180ms ease;
  will-change: transform;
  &:hover {
    transform: scale(1.015);
    filter: brightness(1.05);
  }
  @keyframes zoomLift {
    from {
      transform: scale(0.96);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }
`;

/** Edge nav arrows inside the lightbox so users can click through
 *  posts without leaving the zoomed view. Light glass pills matching
 *  the rest of the viewer chrome — dark icon on translucent white. */
const ZoomNavBtn = styled.button<{ dir: 'left' | 'right' }>`
  position: fixed;
  top: 50%;
  transform: translateY(-50%);
  ${({ dir }) => (dir === 'left' ? 'left: 24px;' : 'right: 24px;')}
  width: 48px;
  height: 48px;
  border-radius: 999px;
  border: 0;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: #1a1714;
  font-size: 18px;
  font-weight: 700;
  display: grid;
  place-items: center;
  z-index: 102;
  cursor: pointer;
  box-shadow: 0 8px 20px -8px rgba(0, 0, 0, 0.2);
  transition: background 0.18s ease, transform 0.18s ease;
  &:hover {
    background: #fff;
    transform: translateY(-50%) scale(1.05);
  }
  @media (max-width: 700px) {
    width: 40px;
    height: 40px;
    ${({ dir }) => (dir === 'left' ? 'left: 12px;' : 'right: 12px;')}
  }
`;

/** Hint pill in the zoom overlay's corner — gives a soft "esc to close"
 *  affordance. Fades in on first reveal, then auto-hides after 3s per
 *  photo so it doesn't linger over the artwork. */
const ZoomHint = styled.div<{ visible: boolean }>`
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 101;
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(8px);
  color: rgba(26, 23, 20, 0.7);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  pointer-events: none;
  opacity: ${({ visible }) => (visible ? 1 : 0)};
  transform: translateY(${({ visible }) => (visible ? '0' : '-4px')});
  transition:
    opacity 480ms ease,
    transform 480ms ease;
`;

/** PDFs render via the browser's native viewer in an iframe. Keep size
 *  in lockstep with <Img> so the layout stays consistent. */
const PdfFrame = styled.iframe`
  width: min(1100px, 94vw);
  height: calc(100vh - 165px);
  border: 0;
  background: #fff;
  display: block;
`;

/** Inline "더보기" link rendered after the truncated description in the
 *  sidebar's compact mode. */
const InlineMoreBtn = styled.button`
  margin-left: 6px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #ffd9a8;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
  &:hover {
    color: #ffe6c2;
  }
`;


/**
 * Behance-style vertical-center nav arrow. Pinned to the Overlay
 * (full viewport) — NOT the Stage — so the on-screen position is
 * deterministic regardless of:
 *   • the current post's photo aspect ratio (MediaCard recenters
 *     visually per photo, but Stage extents stay the same — anchoring
 *     to Overlay removes even any layout-induced repaint variance)
 *   • the side panel's open / closed state (the right arrow shifts
 *     left by 300px when the panel slides in, smoothly transitioned).
 *
 * Light-on-cream palette matches the page background — the dark
 * variant clashed with the warm stage tone.
 */
const CornerNavBtn = styled.button<{ dir: 'left' | 'right'; panelOpen: boolean }>`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  ${({ dir, panelOpen }) =>
    dir === 'left'
      ? 'left: 24px;'
      : `right: ${panelOpen ? '324px' : '24px'};`}
  width: 48px;
  height: 48px;
  border-radius: 999px;
  border: 0;
  background: rgba(255, 255, 255, 0.92);
  color: #1a1714;
  font-size: 18px;
  font-weight: 700;
  display: grid;
  place-items: center;
  z-index: 13;
  cursor: pointer;
  box-shadow: 0 10px 24px -10px rgba(0, 0, 0, 0.25);
  transition:
    right 280ms cubic-bezier(0.2, 0.85, 0.25, 1),
    background 0.15s ease,
    transform 0.15s ease;
  &:hover:not(:disabled) {
    background: #fff;
    transform: translateY(-50%) scale(1.05);
  }
  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
  @media (max-width: 900px) {
    width: 40px;
    height: 40px;
    ${({ dir, panelOpen }) =>
      dir === 'left'
        ? 'left: 12px;'
        : `right: ${panelOpen ? '272px' : '12px'};`}
  }
`;

/**
 * Multi-image thumb pill — anchored to the Stage so it tracks the
 * image's coordinate space. Floats just above the FullscreenCaptionOverlay
 * lane. Hidden on mobile (the mobile shell renders an in-flow strip
 * inside MobileImageRegion instead, so it never overlaps the action bar).
 */
const ThumbStrip = styled.div`
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 12;
  display: inline-flex;
  gap: 6px;
  padding: 6px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 8px 20px -8px rgba(0, 0, 0, 0.3);
  max-width: calc(100vw - 64px);
  overflow-x: auto;
  &::-webkit-scrollbar { display: none; }
`;

/**
 * Glass side panel — now a regular grid cell. The DesktopGrid parent
 * animates its column from 300px↔0; this panel just overflow-clips its
 * own contents so the inner sections (details, comments) crisply slide
 * in/out without `transform` tricks.
 *
 * `overflow: clip` (not hidden) on the panel preserves the
 * `backdrop-filter` blur — `hidden` creates a containing block that
 * disables blur in WebKit.
 */
const CommentPanel = styled.aside`
  grid-column: 2;
  grid-row: 2;
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: linear-gradient(
    to bottom,
    rgba(30, 26, 22, 0.65) 0%,
    rgba(30, 26, 22, 0.55) 100%
  );
  backdrop-filter: blur(22px) saturate(140%);
  -webkit-backdrop-filter: blur(22px) saturate(140%);
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.92);
  overflow: clip;
`;

/** Sidebar toggle for the details panel. Pinned at the top of the
 *  sidebar when the post has body content; clicking it expands or
 *  collapses the panel below. Renders as a minimal chevron-only handle —
 *  no label text — so the sidebar reads like a clean reading surface. */
const DetailsToggle = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 8px 18px;
  background: transparent;
  border: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  cursor: pointer;
  flex-shrink: 0;
  font-size: 14px;
  line-height: 1;
  color: rgba(255, 255, 255, 0.6);
  &:hover {
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.95);
  }
`;

/** Glass-overlay details panel (mirrors the InfoPanel "투명창" look) that
 *  drops down inside the sidebar when expanded. Dark translucent
 *  background + light text so it reads like the on-image overlay. */
const SidebarDetails = styled.section`
  padding: 14px 18px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  /* Slightly darker than the parent panel so the section visually nests. */
  background: rgba(0, 0, 0, 0.18);
  max-height: 50%;
  overflow-y: auto;
  flex-shrink: 0;
  .desc {
    font-size: 13px;
    line-height: 1.7;
    color: rgba(255, 255, 255, 0.92);
    white-space: pre-wrap;
    word-break: keep-all;
    margin: 0;
  }
  .tip {
    font-size: 12px;
    line-height: 1.55;
    background: rgba(255, 174, 92, 0.18);
    border-left: 2px solid rgba(255, 174, 92, 0.7);
    color: rgba(255, 255, 255, 0.95);
    padding: 8px 10px;
    border-radius: 0 8px 8px 0;
    word-break: keep-all;
  }
  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .tag {
    font-size: 11px;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.92);
    background: rgba(255, 255, 255, 0.18);
    border: 1px solid rgba(255, 255, 255, 0.25);
    padding: 3px 9px;
    border-radius: 999px;
  }
`;

const CommentHeader = styled.header`
  padding: 14px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  flex-shrink: 0;
  h2 {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.95);
  }
  .count {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
    margin-left: 6px;
    font-variant-numeric: tabular-nums;
  }
  .chev {
    background: transparent;
    border: 0;
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 14px;
    line-height: 1;
    color: rgba(255, 255, 255, 0.65);
    cursor: pointer;
    &:hover {
      background: rgba(255, 255, 255, 0.10);
      color: rgba(255, 255, 255, 0.95);
    }
  }
`;

const CommentList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 8px 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const CommentItem = styled.div<{ depth: number }>`
  margin-left: ${({ depth }) => (depth > 0 ? '24px' : '0')};
  padding: 10px 12px;
  background: ${({ depth }) =>
    depth > 0 ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.04)'};
  border-radius: 12px;
  border: 1px solid
    ${({ depth }) =>
      depth > 0 ? 'transparent' : 'rgba(255, 255, 255, 0.10)'};
  display: flex;
  flex-direction: column;
  gap: 6px;
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .who {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.95);
  }
  .when {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.55);
    font-weight: 500;
  }
  .body {
    font-size: 13px;
    line-height: 1.55;
    color: rgba(255, 255, 255, 0.88);
    white-space: pre-wrap;
    word-break: keep-all;
  }
  .actions {
    display: inline-flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  .actions button {
    background: transparent;
    border: 0;
    padding: 2px 6px;
    font-size: 11px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.65);
    cursor: pointer;
    border-radius: 6px;
    display: inline-flex;
    align-items: center;
    gap: 3px;
  }
  .actions button:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.10);
  }
  .actions button.danger {
    color: #fca5a5;
  }
  .actions button.liked {
    color: #ffb7a4;
    background: rgba(226, 114, 91, 0.18);
  }
  .actions button.liked:hover {
    color: #ffd1c2;
    background: rgba(226, 114, 91, 0.28);
  }
  .actions button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const CommentCompose = styled.form`
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  textarea {
    resize: none;
    min-height: 60px;
    max-height: 160px;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.18);
    background: rgba(255, 255, 255, 0.08);
    padding: 10px 12px;
    font-size: 13px;
    line-height: 1.5;
    font-family: inherit;
    color: rgba(255, 255, 255, 0.95);
    &::placeholder {
      color: rgba(255, 255, 255, 0.45);
    }
    &:focus {
      outline: none;
      border-color: rgba(255, 174, 92, 0.7);
      background: rgba(255, 255, 255, 0.12);
    }
    &:disabled {
      opacity: 0.55;
    }
  }
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.55);
  }
  button.send {
    padding: 8px 14px;
    border-radius: 999px;
    border: 0;
    background: ${({ theme }) => theme.brand};
    color: ${({ theme }) => theme.ctaText};
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }
  button.send:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .replying {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 600;
    color: rgba(255, 220, 180, 0.95);
    background: rgba(255, 174, 92, 0.22);
    border: 1px solid rgba(255, 174, 92, 0.35);
    padding: 4px 10px;
    border-radius: 999px;
  }
  .replying button {
    background: transparent;
    border: 0;
    color: inherit;
    cursor: pointer;
    padding: 0;
    font-size: 11px;
    line-height: 1;
  }
`;

const EditBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1100;
  background: rgba(20, 17, 13, 0.55);
  backdrop-filter: blur(8px);
  display: grid;
  place-items: center;
  padding: 24px;
`;

const EditSheet = styled.form`
  width: 100%;
  max-width: 520px;
  padding: 28px 26px 22px;
  border-radius: 20px;
  background: ${({ theme }) => theme.paper};
  border: 1px solid ${({ theme }) => theme.border};
  box-shadow: ${({ theme }) => theme.shadowLg};
  display: flex;
  flex-direction: column;
  gap: 14px;
  h3 {
    font-family: 'Fraunces', serif;
    font-style: italic;
    font-size: 24px;
    font-weight: 500;
    margin: 0 0 4px;
    color: ${({ theme }) => theme.ink};
  }
  label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${({ theme }) => theme.ink2};
    margin-bottom: 4px;
    display: block;
  }
  input,
  textarea {
    width: 100%;
    padding: 10px 12px;
    border-radius: 10px;
    border: 1px solid ${({ theme }) => theme.border};
    background: ${({ theme }) => theme.surface};
    color: ${({ theme }) => theme.text};
    font-size: 14px;
    font-family: inherit;
    resize: vertical;
    &:focus {
      outline: none;
      border-color: ${({ theme }) => theme.brand};
    }
  }
  textarea {
    min-height: 90px;
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 6px;
  }
  .actions button {
    padding: 9px 16px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
  }
  .actions .cancel {
    background: ${({ theme }) => theme.surface};
    color: ${({ theme }) => theme.ink2};
    border: 1px solid ${({ theme }) => theme.border};
  }
  .actions .save {
    background: ${({ theme }) => theme.brand};
    color: ${({ theme }) => theme.ctaText};
    border: 0;
  }
  .actions .save:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Thumb = styled.button<{ active: boolean }>`
  width: ${({ active }) => (active ? '52px' : '38px')};
  height: 38px;
  border-radius: 8px;
  overflow: hidden;
  padding: 0;
  border: 2px solid ${({ active }) => (active ? '#fff' : 'transparent')};
  transition:
    width 240ms cubic-bezier(0.2, 0.85, 0.25, 1),
    border-color 200ms ease;
  cursor: pointer;
  & img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  &:hover {
    border-color: rgba(255, 255, 255, 0.7);
  }
`;


/* ── New components introduced for the dark/glass redesign ─────────── */

/** Pill badge anchored to the bottom-center of the Stage showing
 *  `current / total` post position. Tucked just above the bottom edge
 *  so it doesn't fight with the photo. */
const PageIndex = styled.div`
  position: absolute;
  bottom: 18px;
  left: 50%;
  transform: translateX(-50%);
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
  color: rgba(26, 23, 20, 0.55);
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(0, 0, 0, 0.06);
  z-index: 12;
  pointer-events: none;
`;

/**
 * Vertical tab handle that sticks out from the side panel's left edge.
 * Reads as a drawer pull — half-attached to the panel, half-protruding
 * into the stage — so it never gets mistaken for a play button (the
 * old centered round-pill design did). Slides with the panel: when the
 * panel collapses the handle rides to the viewport's right edge so it
 * stays reachable as a re-open affordance.
 *
 * Wider + bigger when the panel is closed so the "click here to open"
 * affordance is unmistakable (it's the only entry point back to the
 * comments/details when the panel is hidden).
 */
const PanelToggleButton = styled.button<{ panelOpen: boolean }>`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  right: ${({ panelOpen }) => (panelOpen ? '300px' : '0px')};
  width: ${({ panelOpen }) => (panelOpen ? '22px' : '28px')};
  height: ${({ panelOpen }) => (panelOpen ? '64px' : '80px')};
  border: 0;
  border-top-left-radius: 12px;
  border-bottom-left-radius: 12px;
  background: rgba(30, 26, 22, ${({ panelOpen }) => (panelOpen ? '0.62' : '0.78')});
  backdrop-filter: blur(14px) saturate(140%);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
  box-shadow: -8px 0 20px -8px rgba(0, 0, 0, 0.35);
  color: rgba(255, 255, 255, 0.95);
  font-size: ${({ panelOpen }) => (panelOpen ? '11px' : '14px')};
  font-weight: 700;
  display: grid;
  place-items: center;
  cursor: pointer;
  z-index: 15;
  transition:
    right 280ms cubic-bezier(0.2, 0.85, 0.25, 1),
    width 200ms ease,
    height 200ms ease,
    background 0.18s ease;
  &:hover {
    background: rgba(30, 26, 22, 0.92);
  }
  @media (max-width: 900px) {
    right: ${({ panelOpen }) => (panelOpen ? '260px' : '0px')};
  }
`;

/**
 * Full-screen mode bottom overlay. Mounts only when the side panel is
 * closed on desktop — gives the user a glance-able caption + action
 * buttons without ever having to leave the immersive image-first view.
 * Gradient fades into transparency at the top so the photo's bottom
 * pixels stay visible behind the overlay.
 */
const FullscreenCaptionOverlay = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 12;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding: 48px 24px 18px;
  background: linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.6));
  color: rgba(255, 255, 255, 0.92);
  pointer-events: none;
  /* The title/author bubble doubles as a panel-toggle hotspot: clicking
   *  it slides the side panel open so users can dive straight into the
   *  full caption + comments without hunting for the corner toggle. */
  .meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    pointer-events: auto;
    cursor: pointer;
    background: transparent;
    border: 0;
    padding: 4px 0;
    text-align: left;
    color: inherit;
    font: inherit;
    transition: opacity 0.15s ease;
  }
  .meta:hover { opacity: 0.85; }
  .meta:active { opacity: 0.7; }
  .meta-title { font-size: 14px; font-weight: 600; color: rgba(255, 255, 255, 0.96); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .meta-author { font-size: 11px; color: rgba(255, 255, 255, 0.6); }
  .actions { display: inline-flex; gap: 8px; pointer-events: auto; flex-shrink: 0; }
`;

/** Compact, glass-on-dark pill used inside the FullscreenCaptionOverlay
 *  for like / comment / download. Mirrors the spec's "반투명 pill, each
 *  44×44 touch area" requirement. */
const OverlayActionBtn = styled.button<{ active?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 44px;
  min-height: 44px;
  padding: 0 12px;
  border-radius: 999px;
  border: 0;
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ active }) => (active ? '#ffb7a4' : 'rgba(255, 255, 255, 0.92)')};
  background: ${({ active }) => (active ? 'rgba(226, 114, 91, 0.22)' : 'rgba(255, 255, 255, 0.14)')};
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  cursor: pointer;
  transition: background 0.15s ease, transform 0.18s cubic-bezier(0.2, 0.85, 0.25, 1);
  &:hover { background: rgba(255, 255, 255, 0.24); }
  &:active { transform: scale(0.94); }
`;

/* ── Mobile layout (≤700px) ────────────────────────────────────────── */

const MobileShell = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
`;

const MobileTopBar = styled.header`
  flex-shrink: 0;
  height: calc(44px + env(safe-area-inset-top, 0px));
  padding-top: env(safe-area-inset-top, 0px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-left: 8px;
  padding-right: 8px;
  background: rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(14px) saturate(140%);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  color: #1a1714;
  z-index: 20;
`;

const MobileIconBtn = styled.button`
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: transparent;
  border: 0;
  color: #1a1714;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  padding: 0 10px;
  border-radius: 8px;
  &:hover { background: rgba(0, 0, 0, 0.06); }
`;

const MobileImageRegion = styled.div`
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px;
  overflow: hidden;
  touch-action: pan-y;
  & > img,
  & > iframe {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    display: block;
    border-radius: 12px;
    box-shadow: 0 16px 36px -12px rgba(0, 0, 0, 0.25);
  }
  & > iframe { background: #fff; width: 100%; height: 100%; border: 0; }
`;

const MobileThumbStrip = styled.div`
  flex-shrink: 0;
  display: inline-flex;
  gap: 6px;
  padding: 6px;
  margin-top: 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 4px 12px -4px rgba(0, 0, 0, 0.15);
  max-width: 100%;
  overflow-x: auto;
  &::-webkit-scrollbar { display: none; }
`;

const MobileActionBar = styled.div`
  flex-shrink: 0;
  height: calc(44px + env(safe-area-inset-bottom, 0px));
  padding-bottom: env(safe-area-inset-bottom, 0px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  padding-left: 4px;
  padding-right: 12px;
  background: rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(14px) saturate(140%);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  z-index: 20;
  .group { display: inline-flex; align-items: center; gap: 2px; flex: 1; min-width: 0; }
  .idx { font-size: 11px; font-variant-numeric: tabular-nums; color: rgba(26, 23, 20, 0.6); flex-shrink: 0; }
`;

const MobileActionBtn = styled.button<{ active?: boolean }>`
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: transparent;
  border: 0;
  color: ${({ active }) => (active ? '#E2725B' : '#1a1714')};
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  border-radius: 8px;
  padding: 0 6px;
  &:hover { background: rgba(0, 0, 0, 0.06); }
  &:active { transform: scale(0.94); }
`;

const MobileSheetBackdrop = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 30;
  animation: sheetBgIn 0.2s ease;
  @keyframes sheetBgIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const MobileSheet = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 31;
  max-height: 70vh;
  background: rgba(20, 17, 14, 0.92);
  backdrop-filter: blur(24px) saturate(140%);
  -webkit-backdrop-filter: blur(24px) saturate(140%);
  border-top-left-radius: 18px;
  border-top-right-radius: 18px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  color: rgba(255, 255, 255, 0.92);
  animation: sheetSlideUp 0.3s ease;
  @keyframes sheetSlideUp {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }
`;

const MobileSheetHandle = styled.div`
  width: 40px;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.3);
  margin: 8px auto 4px;
  flex-shrink: 0;
`;

interface ViewerProps {
  posts: PostWithAuthor[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
  onToggleLike: (postId: string) => void;
  /** Set of post ids the current user has liked. Drives the heart fill. */
  likedPostIds?: Set<string>;
  /** Optional: pass to enable the delete button on permitted posts. */
  onDeletePost?: (postId: string) => Promise<void> | void;
  /** Optional: pass to enable the edit button. Receives the patch the user
   *  submitted from the inline edit form. */
  onUpdatePost?: (input: {
    postId: string;
    title: string;
    description: string | null;
    tags: string[];
  }) => Promise<void> | void;
  /** The current viewer's user_id (auth.uid()), used to gate the delete button. */
  currentUserId?: string | null;
  /** True if the current user is the leader of the team. */
  isTeamLeader?: boolean;
  /** True if an admin code is saved locally. */
  isAdmin?: boolean;
}

export function Viewer({
  posts,
  index,
  onIndexChange,
  onClose,
  onToggleLike,
  likedPostIds,
  onDeletePost,
  onUpdatePost,
  currentUserId,
  isAdmin,
}: ViewerProps) {
  const isMobile = useIsMobile();
  const [imgIdx, setImgIdx] = useState(0);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  // Desktop side panel — opens by default so the viewer reads as a
  // post-with-comments view on first mount (mirrors Behance's project
  // pane). On mobile we use a separate `sheetOpen` state instead.
  const [panelOpen, setPanelOpen] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  // Whether the sidebar's details section shows the full description.
  // Default true (full view). When false, descriptions over 150 chars
  // truncate with an inline 더보기 button; tip + tags stay visible.
  const [detailsExpanded, setDetailsExpanded] = useState(true);
  // Behance-style image zoom: clicking the photo expands it to a
  // full-screen lightbox with a darker backdrop. Click anywhere or hit
  // Esc to exit. Doesn't apply to PDFs (they have their own viewer).
  const [imageZoomed, setImageZoomed] = useState(false);
  // Lightbox hint pill visibility. Reset (re-shown) on every photo
  // change while zoomed; auto-fades after 3s so the artwork can
  // breathe.
  const [zoomHintVisible, setZoomHintVisible] = useState(true);
  const [composeText, setComposeText] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; nickname: string | null } | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState('');
  // Swipe state for mobile gesture nav. Refs (not state) — we mutate
  // them on every touch event and don't need re-renders.
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const showToast = useUIStore((s) => s.showToast);
  const post = posts[index];

  // "Comments / panel content is visible" — used to gate the comments
  // data fetch so we don't pull threads until the user actually opens
  // the panel (desktop) or sheet (mobile).
  const commentsOpen = isMobile ? sheetOpen : panelOpen;

  const { data: threads = [] } = usePostComments(commentsOpen ? post?.id : undefined);
  const { data: likedCommentIds } = useMyLikedCommentIds(
    commentsOpen ? post?.id : undefined,
  );
  const createComment = useCreateComment();
  const updateComment = useUpdateComment();
  const deleteComment = useDeleteComment();
  const toggleCommentLike = useToggleCommentLike();
  const incrementDownload = useIncrementDownloadCount();
  const totalComments = threads.reduce((acc, t) => acc + 1 + t.replies.length, 0);

  // Reset state on each post change
  useEffect(() => {
    setImgIdx(0);
    setReplyTo(null);
    setEditingCommentId(null);
    setEditingDraft('');
    setComposeText('');
    setDetailsExpanded(true);
    // Intentionally NOT clearing `imageZoomed` here so the user can
    // arrow / click through posts while staying in the lightbox view.
  }, [index]);

  // Resize boundary cleanup: when the viewport crosses into desktop
  // territory, dismiss the mobile sheet so it can't be left half-open
  // off-screen. The desktop side panel persists across crossings.
  useEffect(() => {
    if (!isMobile && sheetOpen) setSheetOpen(false);
  }, [isMobile, sheetOpen]);

  // Show the lightbox hint pill for 3s every time the user opens the
  // zoom OR moves to a new photo while zoomed, then auto-fade it.
  useEffect(() => {
    if (!imageZoomed) return;
    setZoomHintVisible(true);
    const timer = setTimeout(() => setZoomHintVisible(false), 3000);
    return () => clearTimeout(timer);
  }, [imageZoomed, index, imgIdx]);

  const copyPanelContent = async () => {
    if (!post) return;
    const lines: string[] = [];
    lines.push(post.title);
    if (post.tip_text) lines.push('', `[꿀팁] ${post.tip_text}`);
    if (post.description) lines.push('', post.description);
    if (post.tags && post.tags.length > 0) {
      lines.push('', post.tags.map((tag) => `#${tag}`).join(' '));
    }
    const ok = await copyToClipboard(lines.join('\n'));
    showToast(
      ok ? '텍스트가 복사되었습니다' : '복사에 실패했어요',
      ok ? 'success' : 'error',
    );
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Esc: collapse the zoom lightbox first if it's open, otherwise
        // close the whole viewer. Lets users back out of zoom without
        // losing their place in the post stack.
        if (imageZoomed) {
          setImageZoomed(false);
          return;
        }
        onClose();
        return;
      }
      const bundleLen =
        posts[index]?.image_paths && posts[index].image_paths.length > 0
          ? posts[index].image_paths.length
          : 1;
      // Shift+Arrow → cycle inner bundle images. Plain Arrow → next/prev post.
      if (e.shiftKey && bundleLen > 1) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setImgIdx((i) => (i - 1 + bundleLen) % bundleLen);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          setImgIdx((i) => (i + 1) % bundleLen);
        }
        return;
      }
      if (e.key === 'ArrowLeft' && index > 0) onIndexChange(index - 1);
      else if (e.key === 'ArrowRight' && index < posts.length - 1) onIndexChange(index + 1);
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [index, posts, onClose, onIndexChange, imageZoomed]);

  if (!post) return null;

  // Transparent panel holds tags + tip + description (the long-form body).
  // Title/author/team stay in the solid TopBar for instant glance.
  const hasBody =
    !!post.description ||
    !!post.tip_text ||
    (post.tags && post.tags.length > 0);

  // Build the bundle list. Prefer image_paths (new bundled format).
  // Fall back to the single image_path for legacy posts.
  const imageBundle: string[] = (
    post.image_paths && post.image_paths.length > 0
      ? post.image_paths
      : post.image_path
        ? [post.image_path]
        : []
  )
    .map((p) => getPublicImageUrl(p) ?? '')
    .filter(Boolean);

  const safeIdx = Math.min(imgIdx, Math.max(0, imageBundle.length - 1));
  const currentImageUrl = imageBundle[safeIdx] ?? '';
  const currentIsPdf = /\.pdf(?:[?#]|$)/i.test(currentImageUrl);

  /*
   * Preload the neighboring posts' first images so navigation feels
   * instant. The Supabase storage CDN already sets `max-age=3600`
   * which keeps the browser cache warm once an image has been fetched
   * once — preloading just makes that first-fetch happen while the
   * user is still looking at the current photo instead of after they
   * click the arrow.
   *
   * We only preload one frame deep (n-1 and n+1) — going further is
   * usually wasted bandwidth because most viewers don't paginate
   * past 1-2 posts before leaving the viewer.
   */
  useEffect(() => {
    const preloadFirstImage = (i: number) => {
      const p = posts[i];
      if (!p) return;
      const path =
        p.image_paths && p.image_paths.length > 0
          ? p.image_paths[0]
          : p.image_path;
      if (!path) return;
      // Skip PDFs — they render via an iframe, not <img>, so an
      // Image() prefetch would waste bandwidth that the iframe won't
      // reuse anyway.
      if (/\.pdf(?:[?#]|$)/i.test(path)) return;
      const url = getPublicImageUrl(path);
      if (!url) return;
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
    };
    preloadFirstImage(index - 1);
    preloadFirstImage(index + 1);
    // Also warm up the rest of the current post's bundle so flipping
    // through multi-image posts via the thumb strip is instant.
    for (let i = 1; i < imageBundle.length; i++) {
      const url = imageBundle[i];
      if (!url) continue;
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
    }
    // `imageBundle` is a fresh array each render but the URLs inside
    // are stable for a given post — depend on `index` + posts ref so
    // the effect only re-runs on actual post navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, posts]);

  // Per-post stage tint (legacy `stage_bg`) — falls back to the warm
  // cream that matches the home page so the viewer reads as part of
  // the gallery rather than a darkroom modal.
  const stageBg = post.stage_bg ?? '#F8D5C4';

  const initial = (post.author_nickname ?? post.title ?? '?').charAt(0).toUpperCase();
  const isLiked = !!likedPostIds?.has(post.id);

  /**
   * Edit + delete share the same gate per product spec:
   *   1. Author can act on their own post.
   *   2. Saved admin code grants act-on-anyone.
   *   3. Browse mode (no auth session) is blocked entirely — even if an
   *      admin code happens to live in localStorage, we don't trust it
   *      without an authed user.
   *   4. Everyone else (regular team members on someone else's post) is blocked.
   */
  const canEditPost =
    !!currentUserId && (post.author_id === currentUserId || !!isAdmin);
  const canDeletePost = canEditPost;

  /**
   * Single entry point for the heart button — guards against the
   * unauthenticated case (browse mode) before kicking off the toggle
   * mutation. Without this guard, the parent's `toggleLike.mutate(...)`
   * fires straight into a 401 RPC, the optimistic update flips and
   * snaps back, and the user perceives the button as "broken with no
   * feedback". Show the same toast we use for comment likes so the
   * affordance is consistent across post-like and comment-like.
   */
  const handleTogglePostLike = () => {
    if (!currentUserId) {
      showToast('좋아요는 로그인 후에 가능해요', 'error');
      return;
    }
    onToggleLike(post.id);
  };

  const downloadCurrentImage = async () => {
    if (!currentImageUrl) return;
    try {
      const res = await fetch(currentImageUrl, { mode: 'cors' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const ext =
        currentImageUrl.split('.').pop()?.split('?')[0]?.toLowerCase() ?? 'jpg';
      const safeTitle = (post.title || 'image')
        .replace(/[\\/:*?"<>|]/g, '')
        .slice(0, 60);
      const suffix = imageBundle.length > 1 ? `-${safeIdx + 1}` : '';
      const a = document.createElement('a');
      const objectUrl = URL.createObjectURL(blob);
      a.href = objectUrl;
      a.download = `${safeTitle}${suffix}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
      showToast('다운로드를 시작했어요');
      // Best-effort counter bump — don't block the user if this fails.
      incrementDownload.mutate(post.id);
    } catch (e) {
      showToast(`다운로드 실패: ${(e as Error).message}`, 'error');
    }
  };

  /* ── Touch handlers for mobile swipe nav ───────────────────────── */
  const SWIPE_THRESHOLD = 50;
  const VERTICAL_CANCEL = 40;
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null || touchStartY.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;
    // Cancel if the gesture is more vertical than horizontal — keeps
    // scroll/zoom intent from being hijacked as a page swipe.
    if (Math.abs(dy) > VERTICAL_CANCEL && Math.abs(dy) > Math.abs(dx)) return;
    if (dx > SWIPE_THRESHOLD && index > 0) onIndexChange(index - 1);
    else if (dx < -SWIPE_THRESHOLD && index < posts.length - 1) onIndexChange(index + 1);
  };

  /* ── Shared rendering pieces used by both layouts ──────────────── */

  // The image (or PDF iframe) for the current post, rendered identically
  // in desktop MediaCard and the mobile image region. Click toggles the
  // zoom lightbox; PDFs use the native browser viewer.
  // The image (or PDF iframe) for the current post. Loading hints
  // (`eager` + `fetchpriority="high"` + `decoding="async"`) tell the
  // browser this is the focal image of the page so it gets prioritized
  // over the background-prefetched neighbor posts.
  const renderedMedia = currentIsPdf ? (
    <PdfFrame src={currentImageUrl} title={post.title} />
  ) : (
    <ImagePressable
      type="button"
      onClick={() => setImageZoomed(true)}
      aria-label="이미지 크게 보기"
      title="크게 보기"
    >
      <Img
        src={currentImageUrl}
        alt={post.title}
        loading="eager"
        decoding="async"
        // @ts-expect-error — fetchPriority is valid HTML but missing from React's type defs in this version
        fetchpriority="high"
      />
    </ImagePressable>
  );

  const renderedMobileMedia = currentIsPdf ? (
    <iframe src={currentImageUrl} title={post.title} />
  ) : (
    <img
      src={currentImageUrl}
      alt={post.title}
      loading="eager"
      decoding="async"
      // @ts-expect-error — see note on the desktop variant above
      fetchpriority="high"
      onClick={() => setImageZoomed(true)}
      style={{ cursor: 'zoom-in' }}
    />
  );

  // Thumb strip is shared but the *positioning* differs per layout
  // (absolute on desktop, in-flow on mobile). We only render the
  // <Thumb> children here; the container wrapper is layout-specific.
  // `loading="eager"` because these tiny strips ride right beneath
  // the main photo — lazy would defer them past the user's expected
  // click target.
  const thumbChildren = imageBundle.length > 1 && imageBundle.map((url, i) => {
    const isPdf = /\.pdf(?:[?#]|$)/i.test(url);
    const thumbUrl = isPdf ? url.replace(/\.pdf(?=[?#]|$)/i, '.pdf.thumb.jpg') : url;
    return (
      <Thumb
        key={url + i}
        active={i === imgIdx}
        onClick={() => setImgIdx(i)}
        type="button"
        aria-label={isPdf ? `PDF ${i + 1}` : `이미지 ${i + 1}`}
      >
        {isPdf ? (
          <PdfThumbnail thumbUrl={thumbUrl === url ? null : thumbUrl} size="sm" />
        ) : (
          <img src={url} alt="" loading="eager" decoding="async" />
        )}
      </Thumb>
    );
  });

  // Side-panel / bottom-sheet content. Same JSX for both layouts so
  // the comment-thread state, reply form, and edit form all live in
  // one place. Inlined (not extracted) because it closes over ~15
  // variables/handlers — pulling it out would require a 15-prop
  // component signature that's harder to read than this in-place body.
  const panelContent = (
    <>
      {hasBody && post.description && post.description.length > PANEL_DESC_TRUNCATE && (
        <DetailsToggle
          type="button"
          onClick={() => setDetailsExpanded((v) => !v)}
          aria-expanded={detailsExpanded}
          aria-controls="viewer-details-panel"
          aria-label={detailsExpanded ? '내용 접기' : '내용 펼치기'}
          title={detailsExpanded ? '내용 접기' : '내용 펼치기'}
        >
          {detailsExpanded ? '▴' : '▾'}
        </DetailsToggle>
      )}
      {hasBody && (
        <SidebarDetails id="viewer-details-panel" aria-label="게시물 상세 내용">
          {post.tip_text && <div className="tip">💡 {post.tip_text}</div>}
          {post.description && (
            detailsExpanded || post.description.length <= PANEL_DESC_TRUNCATE ? (
              <p className="desc">{post.description}</p>
            ) : (
              <p className="desc">
                {post.description.slice(0, PANEL_DESC_TRUNCATE).trimEnd()}…{' '}
                <InlineMoreBtn type="button" onClick={() => setDetailsExpanded(true)}>
                  더보기
                </InlineMoreBtn>
              </p>
            )
          )}
          {post.tags && post.tags.length > 0 && (
            <div className="tags">
              {post.tags.map((tag) => (
                <span key={tag} className="tag">#{tag}</span>
              ))}
            </div>
          )}
        </SidebarDetails>
      )}

      <CommentHeader>
        <h2>
          댓글<span className="count">{totalComments}</span>
        </h2>
      </CommentHeader>

      <CommentList id="viewer-comments-list">
        {threads.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.55)', fontSize: 12, padding: '32px 0' }}>
            아직 댓글이 없어요. 첫 댓글을 남겨보세요!
          </div>
        ) : (
          threads.map((th) => (
            <CommentThread
              key={th.id}
              thread={th}
              currentUserId={currentUserId ?? null}
              isAdmin={!!isAdmin}
              editingId={editingCommentId}
              editingDraft={editingDraft}
              likedCommentIds={likedCommentIds ?? new Set()}
              onStartEdit={(c) => {
                setEditingCommentId(c.id);
                setEditingDraft(c.content);
              }}
              onCancelEdit={() => {
                setEditingCommentId(null);
                setEditingDraft('');
              }}
              onChangeEdit={setEditingDraft}
              onSaveEdit={async (c) => {
                if (!editingDraft.trim()) return;
                try {
                  await updateComment.mutateAsync({
                    commentId: c.id,
                    postId: post.id,
                    content: editingDraft,
                  });
                  setEditingCommentId(null);
                  setEditingDraft('');
                } catch (e) {
                  showToast((e as Error).message ?? '수정 실패', 'error');
                }
              }}
              onDelete={async (c, asAdmin) => {
                if (!confirm('댓글을 삭제할까요?')) return;
                try {
                  await deleteComment.mutateAsync({
                    commentId: c.id,
                    postId: post.id,
                    asAdmin,
                  });
                } catch (e) {
                  showToast((e as Error).message ?? '삭제 실패', 'error');
                }
              }}
              onReply={(c) =>
                setReplyTo({ id: c.id, nickname: c.author_nickname ?? '작가' })
              }
              onToggleLike={(c) => {
                if (!currentUserId) {
                  showToast('좋아요는 로그인 후에 가능해요', 'error');
                  return;
                }
                toggleCommentLike
                  .mutateAsync({ commentId: c.id, postId: post.id })
                  .catch((e) => {
                    showToast((e as Error).message ?? '실패', 'error');
                  });
              }}
            />
          ))
        )}
      </CommentList>

      <CommentCompose
        onSubmit={async (e) => {
          e.preventDefault();
          if (!composeText.trim() || createComment.isPending) return;
          if (!currentUserId) {
            showToast('댓글을 달려면 팀에 들어와주세요', 'error');
            return;
          }
          try {
            await createComment.mutateAsync({
              postId: post.id,
              content: composeText,
              parentId: replyTo?.id ?? null,
            });
            setComposeText('');
            setReplyTo(null);
          } catch (err) {
            showToast((err as Error).message ?? '댓글 작성 실패', 'error');
          }
        }}
      >
        {replyTo && (
          <span className="replying">
            ↳ {replyTo.nickname}에게 답글
            <button type="button" onClick={() => setReplyTo(null)} aria-label="답글 취소">
              ✕
            </button>
          </span>
        )}
        <textarea
          value={composeText}
          onChange={(e) => setComposeText(e.target.value)}
          onKeyDown={(e) => {
            if (
              e.key === 'Enter' &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder={
            currentUserId
              ? '댓글을 입력하세요… (Enter로 등록, Shift+Enter는 줄바꿈)'
              : '댓글을 달려면 팀에 들어와주세요'
          }
          disabled={!currentUserId || createComment.isPending}
          maxLength={1000}
        />
        <div className="row">
          <span>{composeText.length}/1000</span>
          <button
            type="submit"
            className="send"
            disabled={
              !currentUserId ||
              !composeText.trim() ||
              createComment.isPending
            }
          >
            {createComment.isPending ? '작성 중…' : replyTo ? '답글 달기' : '댓글 달기'}
          </button>
        </div>
      </CommentCompose>
    </>
  );

  // Edit-post launcher button shared between both layouts.
  const onOpenEdit = () => {
    setEditTitle(post.title);
    setEditDesc(post.description ?? '');
    setEditTags((post.tags ?? []).join(', '));
    setEditing(true);
  };

  // Delete-post handler shared between both layouts.
  const onDeleteCurrent = async () => {
    if (!onDeletePost) return;
    if (!confirm('이 게시물을 삭제할까요? 되돌릴 수 없어요.')) return;
    try {
      await onDeletePost(post.id);
      if (posts.length <= 1) onClose();
    } catch (e) {
      showToast((e as Error).message ?? '삭제 실패', 'error');
    }
  };

  return (
    <Overlay role="dialog" aria-modal bg={stageBg}>
      {isMobile ? (
        /* ── Mobile shell ────────────────────────────────────────── */
        <MobileShell>
          <MobileTopBar>
            <MobileIconBtn onClick={onClose} aria-label="갤러리로 돌아가기" title="홈(갤러리)으로 돌아가기">
              <HomeIcon />
            </MobileIconBtn>
            <span style={{ fontSize: 11, color: 'rgba(26,23,20,0.6)', fontVariantNumeric: 'tabular-nums' }}>
              {index + 1} / {posts.length}
            </span>
            <MobileIconBtn
              onClick={() => setSheetOpen((v) => !v)}
              aria-label={sheetOpen ? '정보 닫기' : '정보 열기'}
              aria-expanded={sheetOpen}
            >
              정보 {sheetOpen ? '▲' : '▼'}
            </MobileIconBtn>
          </MobileTopBar>

          <MobileImageRegion
            onTouchStart={imageZoomed ? undefined : handleTouchStart}
            onTouchEnd={imageZoomed ? undefined : handleTouchEnd}
          >
            {renderedMobileMedia}
            {imageBundle.length > 1 && (
              <MobileThumbStrip>{thumbChildren}</MobileThumbStrip>
            )}
          </MobileImageRegion>

          <MobileActionBar>
            <div className="group">
              <MobileActionBtn
                active={isLiked}
                onClick={handleTogglePostLike}
                aria-pressed={isLiked}
                aria-label="좋아요"
                title={isLiked ? '좋아요 취소' : '좋아요'}
              >
                {isLiked ? <HeartFilledIcon /> : <HeartOutlineIcon />}
                {post.likes_count}
              </MobileActionBtn>
              <MobileActionBtn
                onClick={() => setSheetOpen((v) => !v)}
                aria-label="댓글"
                aria-pressed={sheetOpen}
                title="댓글 보기"
              >
                <ChatIcon />
                {totalComments}
              </MobileActionBtn>
              <MobileActionBtn
                onClick={downloadCurrentImage}
                aria-label="이미지 다운로드"
                title="이미지 다운로드"
              >
                <DownloadIcon />
                {post.download_count ?? 0}
              </MobileActionBtn>
              <MobileActionBtn
                onClick={copyPanelContent}
                aria-label="제목·태그·설명 복사"
                title="제목·태그·설명 복사"
              >
                <ClipboardIcon />
              </MobileActionBtn>
              {canEditPost && onUpdatePost && (
                <MobileActionBtn onClick={onOpenEdit} aria-label="게시물 수정" title="게시물 수정">
                  <PencilIcon />
                </MobileActionBtn>
              )}
              {canDeletePost && onDeletePost && (
                <MobileActionBtn
                  onClick={onDeleteCurrent}
                  aria-label="게시물 삭제"
                  title="게시물 삭제"
                  style={{ color: '#fca5a5' }}
                >
                  <TrashIcon />
                </MobileActionBtn>
              )}
            </div>
            <span className="idx">{index + 1} / {posts.length}</span>
          </MobileActionBar>

          {sheetOpen && (
            <>
              <MobileSheetBackdrop onClick={() => setSheetOpen(false)} aria-label="시트 닫기" />
              <MobileSheet role="dialog" aria-label="게시물 정보 및 댓글">
                <MobileSheetHandle />
                <div style={{ padding: '4px 16px 8px' }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.95)' }}>
                    {post.title}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
                    {post.team_name ? `${post.team_name} · ` : ''}
                    {post.author_nickname ?? '작가 미상'}
                  </div>
                </div>
                {panelContent}
              </MobileSheet>
            </>
          )}
        </MobileShell>
      ) : (
        /* ── Desktop grid shell ──────────────────────────────────── */
        <DesktopGrid panelOpen={panelOpen}>
          <TopBar>
            <RoundBtn
              onClick={onClose}
              aria-label="갤러리로 돌아가기"
              title="홈(갤러리)으로 돌아가기 (Esc)"
              style={{ flexShrink: 0 }}
            >
              <HomeIcon />
            </RoundBtn>
            <HeaderColumn>
              <HeaderTitle>{post.title}</HeaderTitle>
              <HeaderSubMeta>
                {post.team_name && <span className="team">{post.team_name}</span>}
                {post.team_name && <span className="sep">·</span>}
                <span className="author">
                  <MiniAvatar>{initial}</MiniAvatar>
                  {post.author_nickname ?? '작가 미상'}
                </span>
              </HeaderSubMeta>
            </HeaderColumn>
            <HeaderTopRight>
              <RoundBtn onClick={onClose} aria-label="뷰어 닫기" title="닫기 (Esc)">
                <CloseIcon />
              </RoundBtn>
            </HeaderTopRight>
          </TopBar>

          <Stage>
            <ImageColumn>
              <MediaCard>{renderedMedia}</MediaCard>
            </ImageColumn>

            <PageIndex aria-live="polite">
              {index + 1} / {posts.length}
            </PageIndex>

            {imageBundle.length > 1 && (
              <ThumbStrip>{thumbChildren}</ThumbStrip>
            )}

            {/* Caption overlay is always rendered so the title doubles as
             *  the panel toggle in both directions — click to open
             *  when the panel is closed, click again to close it. Action
             *  buttons collapse to nothing when the panel is open since
             *  the panel itself carries the same row. */}
            <FullscreenCaptionOverlay>
              <button
                type="button"
                className="meta"
                onClick={() => setPanelOpen((v) => !v)}
                aria-label={panelOpen ? '패널 닫기' : '패널 열기'}
                aria-expanded={panelOpen}
                title={panelOpen ? '제목을 다시 클릭하면 패널이 닫혀요' : '제목을 클릭하면 패널이 열려요'}
              >
                <div className="meta-title">{post.title}</div>
                <div className="meta-author">
                  {post.team_name ? `${post.team_name} · ` : ''}
                  {post.author_nickname ?? '작가 미상'}
                </div>
              </button>
              {!panelOpen && (
                <div className="actions">
                  <OverlayActionBtn
                    active={isLiked}
                    onClick={handleTogglePostLike}
                    aria-pressed={isLiked}
                    aria-label="좋아요"
                    title={isLiked ? '좋아요 취소' : '좋아요'}
                  >
                    {isLiked ? <HeartFilledIcon /> : <HeartOutlineIcon />}
                    {post.likes_count}
                  </OverlayActionBtn>
                  <OverlayActionBtn
                    onClick={() => setPanelOpen(true)}
                    aria-label="댓글 보기"
                    title="댓글 보기"
                  >
                    <ChatIcon />
                    {totalComments}
                  </OverlayActionBtn>
                  <OverlayActionBtn
                    onClick={downloadCurrentImage}
                    aria-label="이미지 다운로드"
                    title="이미지 다운로드"
                  >
                    <DownloadIcon />
                    {post.download_count ?? 0}
                  </OverlayActionBtn>
                  <OverlayActionBtn
                    onClick={copyPanelContent}
                    aria-label="제목·태그·설명 복사"
                    title="제목·태그·설명 복사"
                  >
                    <ClipboardIcon />
                  </OverlayActionBtn>
                </div>
              )}
            </FullscreenCaptionOverlay>
          </Stage>

          <CommentPanel id="viewer-comment-panel" aria-hidden={!panelOpen}>
            {/* Desktop action row at the top of the side panel. Mirrors the
             *  spec's section 4-2 order: like / download / copy / edit /
             *  delete. Slim padding so the comment list dominates. */}
            <div
              style={{
                display: 'flex',
                gap: 4,
                flexWrap: 'wrap',
                padding: '12px 14px 8px',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                flexShrink: 0,
              }}
            >
              <OverlayActionBtn
                active={isLiked}
                onClick={handleTogglePostLike}
                aria-pressed={isLiked}
                aria-label="좋아요"
                title={isLiked ? '좋아요 취소' : '좋아요'}
                style={{ minWidth: 0, padding: '0 10px', height: 36, minHeight: 36 }}
              >
                {isLiked ? <HeartFilledIcon /> : <HeartOutlineIcon />}
                {post.likes_count}
              </OverlayActionBtn>
              <OverlayActionBtn
                onClick={downloadCurrentImage}
                aria-label="이미지 다운로드"
                title="이미지 다운로드"
                style={{ minWidth: 0, padding: '0 10px', height: 36, minHeight: 36 }}
              >
                <DownloadIcon />
                {post.download_count ?? 0}
              </OverlayActionBtn>
              <OverlayActionBtn
                onClick={copyPanelContent}
                aria-label="제목·태그·설명 복사"
                title="제목·태그·설명 복사"
                style={{ minWidth: 0, padding: '0 10px', height: 36, minHeight: 36 }}
              >
                <ClipboardIcon />
              </OverlayActionBtn>
              {canEditPost && onUpdatePost && (
                <OverlayActionBtn
                  onClick={onOpenEdit}
                  aria-label="게시물 수정"
                  title="게시물 수정"
                  style={{ minWidth: 0, padding: '0 10px', height: 36, minHeight: 36 }}
                >
                  <PencilIcon />
                </OverlayActionBtn>
              )}
              {canDeletePost && onDeletePost && (
                <OverlayActionBtn
                  onClick={onDeleteCurrent}
                  aria-label="게시물 삭제"
                  title="게시물 삭제"
                  style={{
                    minWidth: 0,
                    padding: '0 10px',
                    height: 36,
                    minHeight: 36,
                    background: 'rgba(220, 38, 38, 0.18)',
                    color: '#fca5a5',
                  }}
                >
                  <TrashIcon />
                </OverlayActionBtn>
              )}
            </div>
            {panelContent}
          </CommentPanel>

          {/* Corner nav arrows live OUTSIDE the Stage cell so their
           *  position is anchored to the full-viewport DesktopGrid, not
           *  to the Stage grid column. This means the on-screen
           *  position never shifts with the current photo's aspect
           *  ratio — only the right arrow gently slides left when the
           *  side panel opens (via the panelOpen prop's `right` offset).
           */}
          <CornerNavBtn
            type="button"
            dir="left"
            panelOpen={panelOpen}
            onClick={() => index > 0 && onIndexChange(index - 1)}
            disabled={index === 0}
            aria-label="이전 게시물"
            title="이전 게시물"
          >
            ←
          </CornerNavBtn>
          <CornerNavBtn
            type="button"
            dir="right"
            panelOpen={panelOpen}
            onClick={() => index < posts.length - 1 && onIndexChange(index + 1)}
            disabled={index === posts.length - 1}
            aria-label="다음 게시물"
            title="다음 게시물"
          >
            →
          </CornerNavBtn>

          {/* Drawer-pull tab handle hugging the side panel's left edge.
           *  Half-attached to the panel, half-protruding into the stage,
           *  so it reads as a tab/handle rather than a centered button. */}
          <PanelToggleButton
            type="button"
            panelOpen={panelOpen}
            onClick={() => setPanelOpen((v) => !v)}
            aria-label={panelOpen ? '패널 닫기' : '패널 열기'}
            aria-expanded={panelOpen}
            title={panelOpen ? '패널 닫기' : '패널 열기'}
          >
            {panelOpen ? '❯' : '❮'}
          </PanelToggleButton>
        </DesktopGrid>
      )}

      {editing && onUpdatePost && (
        <EditBackdrop onClick={(e) => e.target === e.currentTarget && setEditing(false)}>
          <EditSheet
            onSubmit={async (e) => {
              e.preventDefault();
              if (!editTitle.trim() || editSaving) return;
              setEditSaving(true);
              try {
                const tags = editTags
                  .split(',')
                  .map((t) => t.trim().replace(/^#/, ''))
                  .filter(Boolean);
                await onUpdatePost({
                  postId: post.id,
                  title: editTitle.trim(),
                  description: editDesc.trim() || null,
                  tags,
                });
                showToast('게시물이 수정됐어요');
                setEditing(false);
              } catch (err) {
                showToast((err as Error).message ?? '수정 실패', 'error');
              } finally {
                setEditSaving(false);
              }
            }}
          >
            <h3>게시물 수정</h3>
            <div>
              <label htmlFor="edit-title">제목</label>
              <input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                maxLength={120}
                autoFocus
                required
              />
            </div>
            <div>
              <label htmlFor="edit-desc">내용</label>
              <textarea
                id="edit-desc"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={5}
              />
            </div>
            <div>
              <label htmlFor="edit-tags">태그 (쉼표로 구분)</label>
              <input
                id="edit-tags"
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                placeholder="예: 환경, 컬러링, AI"
              />
            </div>
            <div className="actions">
              <button
                type="button"
                className="cancel"
                onClick={() => setEditing(false)}
                disabled={editSaving}
              >
                취소
              </button>
              <button
                type="submit"
                className="save"
                disabled={editSaving || !editTitle.trim()}
              >
                {editSaving ? '저장 중...' : '저장'}
              </button>
            </div>
          </EditSheet>
        </EditBackdrop>
      )}

      {imageZoomed && !currentIsPdf && currentImageUrl && (
        <>
          <ZoomOverlay
            onClick={() => setImageZoomed(false)}
            role="dialog"
            aria-modal
            aria-label="이미지 확대 보기"
          >
            {/* Click anywhere — image or backdrop — to dismiss; mirrors
             *  the way Behance's lightbox treats the image as a single
             *  toggle target. Nav arrows below stop propagation so they
             *  page through posts without dismissing the lightbox. */}
            <ZoomedImg
              src={currentImageUrl}
              alt={post.title}
              loading="eager"
              decoding="async"
              // @ts-expect-error — fetchPriority is valid HTML but missing from React's type defs
              fetchpriority="high"
            />
          </ZoomOverlay>
          {index > 0 && (
            <ZoomNavBtn
              type="button"
              dir="left"
              aria-label="이전 게시물"
              onClick={(e) => {
                e.stopPropagation();
                onIndexChange(index - 1);
              }}
            >
              ←
            </ZoomNavBtn>
          )}
          {index < posts.length - 1 && (
            <ZoomNavBtn
              type="button"
              dir="right"
              aria-label="다음 게시물"
              onClick={(e) => {
                e.stopPropagation();
                onIndexChange(index + 1);
              }}
            >
              →
            </ZoomNavBtn>
          )}
          <ZoomHint visible={zoomHintVisible}>
            클릭 또는 ESC로 닫기 · ← → 이동
          </ZoomHint>
        </>
      )}
    </Overlay>
  );
}

/* ── Sub-components ──────────────────────────────────────────────────── */

const InlineEditForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  textarea {
    resize: vertical;
    min-height: 56px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.18);
    background: rgba(255, 255, 255, 0.08);
    padding: 8px 10px;
    font-size: 13px;
    line-height: 1.5;
    font-family: inherit;
    color: rgba(255, 255, 255, 0.95);
    &:focus {
      outline: none;
      border-color: rgba(255, 174, 92, 0.7);
      background: rgba(255, 255, 255, 0.12);
    }
  }
  .actions {
    display: inline-flex;
    gap: 6px;
    justify-content: flex-end;
  }
  .actions button {
    padding: 5px 10px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    border: 1px solid rgba(255, 255, 255, 0.18);
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.92);
  }
  .actions button.primary {
    background: ${({ theme }) => theme.brand};
    color: ${({ theme }) => theme.ctaText};
    border-color: ${({ theme }) => theme.brand};
  }
`;

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const min = Math.floor(diffMs / 60000);
    if (min < 1) return '방금';
    if (min < 60) return `${min}분 전`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}시간 전`;
    const day = Math.floor(hr / 24);
    if (day < 7) return `${day}일 전`;
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch {
    return iso;
  }
}

interface CommentThreadProps {
  thread: { replies: CommentRow[] } & CommentRow;
  currentUserId: string | null;
  isAdmin: boolean;
  editingId: string | null;
  editingDraft: string;
  likedCommentIds: Set<string>;
  onStartEdit: (c: CommentRow) => void;
  onCancelEdit: () => void;
  onChangeEdit: (next: string) => void;
  onSaveEdit: (c: CommentRow) => void;
  onDelete: (c: CommentRow, asAdmin: boolean) => void;
  onReply: (c: CommentRow) => void;
  onToggleLike: (c: CommentRow) => void;
}

function CommentThread({
  thread,
  currentUserId,
  isAdmin,
  editingId,
  editingDraft,
  likedCommentIds,
  onStartEdit,
  onCancelEdit,
  onChangeEdit,
  onSaveEdit,
  onDelete,
  onReply,
  onToggleLike,
}: CommentThreadProps) {
  const renderRow = (c: CommentRow, depth: 0 | 1) => {
    const isOwn = !!currentUserId && c.author_id === currentUserId;
    const editing = editingId === c.id;
    const replyCount =
      depth === 0 ? thread.replies.length : 0;
    const repliesFull = depth === 0 && replyCount >= 10;
    return (
      <CommentItem key={c.id} depth={depth}>
        <div className="row">
          <span className="who">
            {c.author_nickname ?? '익명'}
            {c.is_edited && (
              <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
                · 수정됨
              </span>
            )}
          </span>
          <span className="when">{formatWhen(c.created_at)}</span>
        </div>
        {editing ? (
          <InlineEditForm>
            <textarea
              value={editingDraft}
              onChange={(e) => onChangeEdit(e.target.value)}
              maxLength={1000}
              autoFocus
            />
            <div className="actions">
              <button type="button" onClick={onCancelEdit}>
                취소
              </button>
              <button
                type="button"
                className="primary"
                onClick={() => onSaveEdit(c)}
                disabled={!editingDraft.trim()}
              >
                저장
              </button>
            </div>
          </InlineEditForm>
        ) : (
          <div className="body">{c.content}</div>
        )}
        {!editing && (
          <div className="actions">
            {/*
             * Like button stays clickable even when the user is signed
             * out — disabling it would suppress the click, and the
             * parent's onToggleLike already shows a friendly "로그인 후
             * 가능" toast on no-auth. Disabled-button-with-tooltip read
             * as "comment like isn't implemented" in user testing.
             */}
            <button
              type="button"
              className={likedCommentIds.has(c.id) ? 'liked' : ''}
              onClick={() => onToggleLike(c)}
              title={
                !currentUserId
                  ? '좋아요는 로그인 후에 가능해요'
                  : likedCommentIds.has(c.id)
                    ? '좋아요 취소'
                    : '좋아요'
              }
              aria-pressed={likedCommentIds.has(c.id)}
            >
              {likedCommentIds.has(c.id) ? <HeartFilledIcon /> : <HeartOutlineIcon />}
              {c.likes_count > 0 ? ` ${c.likes_count}` : ''}
            </button>
            {depth === 0 && currentUserId && (
              <button
                type="button"
                onClick={() => onReply(c)}
                disabled={repliesFull}
                title={repliesFull ? '대댓글은 최대 10개까지' : '답글'}
              >
                <ReplyIcon /> 답글
                {replyCount > 0 ? ` ${replyCount}` : ''}
              </button>
            )}
            {isOwn && (
              <button type="button" onClick={() => onStartEdit(c)}>
                수정
              </button>
            )}
            {isOwn && (
              <button
                type="button"
                className="danger"
                onClick={() => onDelete(c, false)}
              >
                삭제
              </button>
            )}
            {!isOwn && isAdmin && (
              <button
                type="button"
                className="danger"
                onClick={() => onDelete(c, true)}
                title="관리자 권한으로 삭제"
              >
                관리자 삭제
              </button>
            )}
          </div>
        )}
      </CommentItem>
    );
  };
  return (
    <div>
      {renderRow(thread, 0)}
      {thread.replies.map((r) => renderRow(r, 1))}
    </div>
  );
}
