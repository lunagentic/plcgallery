import styled from '@emotion/styled';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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

const Overlay = styled.div<{ bg: string }>`
  position: fixed;
  inset: 0;
  background: ${({ bg }) => bg};
  z-index: 1000;
  display: flex;
  flex-direction: column;
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

const TopBar = styled.header`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 18px 24px 16px;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  background: rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(22px) saturate(140%);
  -webkit-backdrop-filter: blur(22px) saturate(140%);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  z-index: 14;
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
  font-size: clamp(22px, 3.4vw, 34px);
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
    color: rgba(26, 23, 20, 0.78);
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
  &:hover {
    background: rgba(255, 255, 255, 0.95);
  }
`;

const Stage = styled.div<{ panelOpen: boolean }>`
  flex: 1;
  display: grid;
  place-items: center;
  padding: 96px 80px;
  /* When the comment sidebar slides in, reserve its width on the right
   *  so the image visibly shrinks and the right NavBtn sits cleanly on
   *  the new edge instead of being hidden behind the panel. */
  padding-right: ${({ panelOpen }) => (panelOpen ? '460px' : '80px')};
  position: relative;
  overflow: hidden;
  transition: padding-right 280ms cubic-bezier(0.2, 0.85, 0.25, 1);
  @media (max-width: 900px) {
    padding: 88px 16px 72px;
    padding-right: ${({ panelOpen }) => (panelOpen ? '100vw' : '16px')};
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
 *  shrinks to image width — MediaCard inherits that natural width. */
const MediaCard = styled.div`
  display: inline-flex;
  flex-direction: column;
  max-width: 100%;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 30px 80px -20px rgba(0, 0, 0, 0.25);
  background: rgba(255, 255, 255, 0.2);
`;

const Img = styled.img`
  max-width: 100%;
  /* Leaves room for the always-visible CaptionStrip below the photo. */
  max-height: calc(100vh - 320px);
  object-fit: contain;
  display: block;
`;

/** PDFs render via the browser's native viewer in an iframe. Keep size
 *  in lockstep with <Img> so the layout stays consistent. */
const PdfFrame = styled.iframe`
  width: min(900px, 92vw);
  height: calc(100vh - 320px);
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
 * Caption strip rendered immediately below the photo. Replaces the old
 * hover-only InfoPanel with a permanently visible preview that doesn't
 * cover the image. Click anywhere on the strip to open the right
 * sidebar with the full content + comments.
 */
const CaptionStrip = styled.button`
  /* Sits inside MediaCard which already owns radius / clip / shadow,
   *  so the strip itself is borderless and seamlessly attached to the
   *  image's bottom edge. */
  width: 100%;
  padding: 12px 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  text-align: left;
  border: 0;
  /* Dark glass, matches the comment sidebar concept so the panel-open
   *  transition looks like one consistent surface family. */
  background: linear-gradient(
    to bottom,
    rgba(12, 10, 8, 0.62) 0%,
    rgba(12, 10, 8, 0.52) 100%
  );
  backdrop-filter: blur(14px) saturate(140%);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
  color: rgba(255, 255, 255, 0.92);
  cursor: pointer;
  transition: background 0.18s ease, transform 0.18s ease, opacity 0.2s ease;
  &:hover {
    background: linear-gradient(
      to bottom,
      rgba(12, 10, 8, 0.72) 0%,
      rgba(12, 10, 8, 0.62) 100%
    );
  }
  &:active {
    transform: scale(0.995);
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
    background: rgba(255, 174, 92, 0.18);
    border: 1px solid rgba(255, 174, 92, 0.32);
    padding: 3px 9px;
    border-radius: 999px;
  }
  .desc {
    font-size: 13px;
    line-height: 1.55;
    color: rgba(255, 255, 255, 0.88);
    word-break: keep-all;
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .tip {
    font-size: 11px;
    line-height: 1.45;
    color: rgba(255, 220, 180, 0.95);
    background: rgba(255, 174, 92, 0.18);
    border-left: 2px solid rgba(255, 174, 92, 0.65);
    padding: 6px 8px;
    border-radius: 0 6px 6px 0;
    word-break: keep-all;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
  }
  .footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: rgba(255, 255, 255, 0.55);
  }
  @media (max-width: 700px) {
    padding: 10px 14px;
    gap: 6px;
    .desc { font-size: 12px; }
    .tag { font-size: 10px; padding: 2px 7px; }
  }
`;

const LikeBtn = styled.button<{ liked: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 999px;
  background: transparent;
  border: 0;
  font-size: 13px;
  font-weight: 700;
  color: ${({ liked }) => (liked ? '#E2725B' : '#1a1714')};
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, transform 0.18s cubic-bezier(0.2, 0.85, 0.25, 1);
  &:hover {
    background: rgba(0, 0, 0, 0.06);
  }
  &:active {
    transform: scale(0.92);
  }
`;

const CopyBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 999px;
  background: transparent;
  border: 0;
  font-size: 12px;
  font-weight: 700;
  color: #1a1714;
  cursor: pointer;
  &:hover {
    background: rgba(0, 0, 0, 0.06);
  }
`;

const DeleteBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(220, 38, 38, 0.12);
  border: 1px solid rgba(220, 38, 38, 0.32);
  font-size: 12px;
  font-weight: 700;
  color: #b91c1c;
  cursor: pointer;
  &:hover {
    background: rgba(220, 38, 38, 0.22);
    border-color: rgba(220, 38, 38, 0.55);
  }
`;

const NavBtn = styled.button<{ dir: 'left' | 'right'; panelOpen: boolean }>`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  /* Right arrow shifts past the comment sidebar when it slides in so it
   *  doesn't get hidden under the panel. Left arrow stays put. */
  ${({ dir, panelOpen }) =>
    dir === 'left'
      ? 'left: 24px;'
      : `right: ${panelOpen ? '404px' : '24px'};`}
  width: 52px;
  height: 52px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.85);
  color: #1a1714;
  font-size: 18px;
  display: grid;
  place-items: center;
  z-index: 12;
  box-shadow: 0 10px 24px -8px rgba(0, 0, 0, 0.2);
  transition: right 280ms cubic-bezier(0.2, 0.85, 0.25, 1);
  &:hover {
    background: #fff;
  }
  @media (max-width: 900px) {
    width: 40px;
    height: 40px;
    ${({ dir }) => (dir === 'left' ? 'left: 10px;' : 'right: 10px;')}
  }
  /* On mobile the sidebar takes the whole screen — the photo isn't
   *  visible behind it, so the navigation arrows are useless and just
   *  collide with sidebar content. Hide them. */
  @media (max-width: 700px) {
    display: ${({ panelOpen }) => (panelOpen ? 'none' : 'grid')};
  }
`;

const Hint = styled.div`
  position: absolute;
  bottom: 18px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 11px;
  color: rgba(26, 23, 20, 0.45);
  letter-spacing: 0.05em;
  z-index: 10;
  @media (max-width: 700px) {
    display: none;
  }
`;

const BottomBar = styled.div<{ panelOpen: boolean }>`
  position: absolute;
  bottom: 18px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 13;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  box-shadow: 0 12px 28px -12px rgba(0, 0, 0, 0.18);
  flex-wrap: wrap;
  justify-content: center;
  max-width: calc(100vw - 32px);
  @media (max-width: 900px) {
    bottom: 12px;
  }
  @media (max-width: 700px) {
    /* Sidebar covers the viewport on mobile — hide the bar so it
     *  doesn't compete with sidebar content. */
    display: ${({ panelOpen }) => (panelOpen ? 'none' : 'inline-flex')};
  }
`;

const ThumbStrip = styled.div`
  display: inline-flex;
  gap: 6px;
  padding: 6px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(12px);
`;

/** Inline comment toggle: lives inside the BottomBar next to the like button. */
const CommentBtn = styled.button<{ active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 999px;
  background: ${({ active }) => (active ? 'rgba(0, 0, 0, 0.08)' : 'transparent')};
  border: 0;
  font-size: 13px;
  font-weight: 700;
  color: #1a1714;
  cursor: pointer;
  font-variant-numeric: tabular-nums;
  transition: background 0.15s ease, transform 0.18s cubic-bezier(0.2, 0.85, 0.25, 1);
  &:hover {
    background: rgba(0, 0, 0, 0.06);
  }
  &:active {
    transform: scale(0.92);
  }
`;

const CommentPanel = styled.aside<{ open: boolean }>`
  position: absolute;
  /* Anchor below the TopBar so the title / author / index stay visible
   *  while the panel is open. The TopBar's height is ~76px for a single-
   *  line title; we round up a little so two-line titles don't peek
   *  underneath. The panel still extends to the bottom of the viewport. */
  top: 88px;
  right: 0;
  bottom: 0;
  width: 380px;
  max-width: 100vw;
  /* TopBar is z-index 14 — keep the panel below it so it can never cover
   *  the header even on narrow screens. */
  z-index: 13;
  display: flex;
  flex-direction: column;
  /* Glass-overlay style — matches the on-image InfoPanel "투명창" so the
   *  whole sidebar reads as one transparent surface that floats above the
   *  artwork. */
  background: linear-gradient(
    to bottom,
    rgba(12, 10, 8, 0.72) 0%,
    rgba(12, 10, 8, 0.62) 100%
  );
  backdrop-filter: blur(22px) saturate(140%);
  -webkit-backdrop-filter: blur(22px) saturate(140%);
  border-left: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: -10px 0 28px -16px rgba(0, 0, 0, 0.4);
  color: rgba(255, 255, 255, 0.92);
  transform: translateX(${({ open }) => (open ? '0' : '105%')});
  transition: transform 280ms cubic-bezier(0.2, 0.85, 0.25, 1);
  @media (max-width: 900px) {
    top: 96px;
  }
  @media (max-width: 700px) {
    width: 100vw;
  }
`;

/** Floating chevron handle anchored to the left edge of the comment
 *  panel. Toggles the entire panel open/closed. Stays visible when the
 *  panel is closed (sticks to the right viewport edge) so users always
 *  have a panel-level reopen affordance without going back to the
 *  bottom-bar comment button. */
const PanelCollapseHandle = styled.button<{ open: boolean }>`
  position: fixed;
  /* Top-right anchor: tucked just below the TopBar (~88px) so the
   *  handle reads as a drawer-toggle for the right sidebar without
   *  competing with NavBtn (centered) or BottomBar (bottom). */
  top: 110px;
  right: ${({ open }) => (open ? '380px' : '0')};
  z-index: 15;
  width: 26px;
  height: 56px;
  border: 0;
  border-top-left-radius: 10px;
  border-bottom-left-radius: 10px;
  background: rgba(12, 10, 8, 0.62);
  backdrop-filter: blur(14px) saturate(140%);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
  box-shadow: -6px 0 16px -8px rgba(0, 0, 0, 0.35);
  color: rgba(255, 255, 255, 0.92);
  font-size: 12px;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition:
    right 280ms cubic-bezier(0.2, 0.85, 0.25, 1),
    background 0.15s ease;
  &:hover {
    background: rgba(12, 10, 8, 0.82);
  }
  @media (max-width: 700px) {
    right: ${({ open }) => (open ? 'calc(100vw - 12px)' : '0')};
  }
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

const EditBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 999px;
  background: transparent;
  border: 0;
  font-size: 12px;
  font-weight: 700;
  color: #1a1714;
  cursor: pointer;
  &:hover {
    background: rgba(0, 0, 0, 0.06);
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
  const { t } = useTranslation();
  const [imgIdx, setImgIdx] = useState(0);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  // Whether the sidebar's details section shows the full description.
  // Default true (full view). When false, descriptions over 150 chars
  // truncate with an inline 더보기 button; tip + tags stay visible.
  const [detailsExpanded, setDetailsExpanded] = useState(true);
  const [composeText, setComposeText] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; nickname: string | null } | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState('');
  const showToast = useUIStore((s) => s.showToast);
  const post = posts[index];

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
  }, [index]);

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
    showToast(ok ? t('toast.copied') : t('toast.copyFail'), ok ? 'success' : 'error');
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
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
  }, [index, posts, onClose, onIndexChange]);

  if (!post) return null;

  const stageBg = post.stage_bg ?? '#F8D5C4';
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

  return (
    <Overlay role="dialog" aria-modal bg={stageBg}>
      <TopBar>
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
          <span className="idx">
            {index + 1} / {posts.length}
          </span>
          <RoundBtn onClick={onClose} aria-label="Close">
            <CloseIcon />
          </RoundBtn>
        </HeaderTopRight>
      </TopBar>

      {index > 0 && (
        <NavBtn
          dir="left"
          panelOpen={commentsOpen}
          onClick={() => onIndexChange(index - 1)}
          aria-label="Previous"
        >
          ←
        </NavBtn>
      )}
      {index < posts.length - 1 && (
        <NavBtn
          dir="right"
          panelOpen={commentsOpen}
          onClick={() => onIndexChange(index + 1)}
          aria-label="Next"
        >
          →
        </NavBtn>
      )}

      <Stage panelOpen={commentsOpen}>
        <ImageColumn>
        <MediaCard>
          {currentIsPdf ? (
            <PdfFrame
              src={currentImageUrl}
              title={post.title}
              // Sandboxing the PDF viewer is overkill — PDFs are rendered by the
              // browser's native plugin in a same-origin iframe. We intentionally
              // do NOT pass `sandbox` so the toolbar (zoom, page nav) works.
            />
          ) : (
            <Img src={currentImageUrl} alt={post.title} />
          )}

          {/* Caption strip sits flush against the image's bottom edge —
           *  same MediaCard, so they read as one continuous Instagram-
           *  style media card. Hidden while the sidebar is open since
           *  SidebarDetails carries the same payload. */}
          {hasBody && !commentsOpen && (
            <CaptionStrip
              type="button"
              onClick={() => {
                setDetailsExpanded(true);
                setCommentsOpen(true);
              }}
              aria-label="내용 자세히 보기"
              title="내용 자세히 보기"
            >
              {post.tags && post.tags.length > 0 && (
                <div className="tags">
                  {post.tags.slice(0, 6).map((tag) => (
                    <span key={tag} className="tag">#{tag}</span>
                  ))}
                </div>
              )}
              {post.description && <p className="desc">{post.description}</p>}
              {post.tip_text && <div className="tip">💡 {post.tip_text}</div>}
              <div className="footer">자세히 →</div>
            </CaptionStrip>
          )}
        </MediaCard>

        {imageBundle.length > 1 && (
          <ThumbStrip>
            {imageBundle.map((url, i) => {
              const isPdf = /\.pdf(?:[?#]|$)/i.test(url);
              const thumbUrl = isPdf
                ? url.replace(/\.pdf(?=[?#]|$)/i, '.pdf.thumb.jpg')
                : url;
              return (
                <Thumb
                  key={url + i}
                  active={i === imgIdx}
                  onClick={() => setImgIdx(i)}
                  type="button"
                  aria-label={isPdf ? `PDF ${i + 1}` : `이미지 ${i + 1}`}
                >
                  {isPdf ? (
                    <PdfThumbnail
                      thumbUrl={thumbUrl === url ? null : thumbUrl}
                      size="sm"
                    />
                  ) : (
                    <img src={url} alt="" />
                  )}
                </Thumb>
              );
            })}
          </ThumbStrip>
        )}
        </ImageColumn>
      </Stage>

      <Hint>{t('viewer.hint')}</Hint>

      <BottomBar panelOpen={commentsOpen}>
        <LikeBtn
          liked={isLiked}
          onClick={() => onToggleLike(post.id)}
          title={isLiked ? '좋아요 취소' : '좋아요'}
          aria-pressed={isLiked}
        >
          {isLiked ? <HeartFilledIcon /> : <HeartOutlineIcon />}
          {post.likes_count}
        </LikeBtn>
        <CommentBtn
          type="button"
          active={commentsOpen}
          onClick={() => setCommentsOpen((v) => !v)}
          title={commentsOpen ? '댓글 닫기' : '댓글 보기'}
          aria-label="댓글"
          aria-expanded={commentsOpen}
        >
          <ChatIcon />
          {totalComments}
        </CommentBtn>
        <CopyBtn
          onClick={downloadCurrentImage}
          type="button"
          title="이미지 다운로드"
          aria-label="이미지 다운로드"
        >
          <DownloadIcon /> {post.download_count ?? 0}
        </CopyBtn>
        <CopyBtn onClick={copyPanelContent} type="button" title="내용 복사">
          <ClipboardIcon /> 복사
        </CopyBtn>
        {canEditPost && onUpdatePost && (
          <EditBtn
            type="button"
            onClick={() => {
              setEditTitle(post.title);
              setEditDesc(post.description ?? '');
              setEditTags((post.tags ?? []).join(', '));
              setEditing(true);
            }}
            title="수정"
          >
            <PencilIcon /> 수정
          </EditBtn>
        )}
        {canDeletePost && onDeletePost && (
          <DeleteBtn
            type="button"
            onClick={async () => {
              if (!confirm('이 게시물을 삭제할까요? 되돌릴 수 없어요.')) return;
              try {
                await onDeletePost(post.id);
                if (posts.length <= 1) onClose();
              } catch (e) {
                showToast((e as Error).message ?? '삭제 실패', 'error');
              }
            }}
            title="삭제"
          >
            <TrashIcon /> 삭제
          </DeleteBtn>
        )}
      </BottomBar>

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

      {/* Close-only handle on the panel's left edge. We don't render an
       *  open variant because the panel is already reachable from the
       *  BottomBar 💬 button and from any "더보기" link in the on-image
       *  InfoPanel — a separate viewport-edge open button just adds
       *  visual noise to a closed viewer. */}
      {commentsOpen && (
        <PanelCollapseHandle
          type="button"
          open={commentsOpen}
          onClick={() => setCommentsOpen(false)}
          aria-label="패널 접기"
          title="패널 접기"
          aria-expanded={commentsOpen}
          aria-controls="viewer-comment-panel"
        >
          ▶
        </PanelCollapseHandle>
      )}
      <CommentPanel id="viewer-comment-panel" open={commentsOpen} aria-hidden={!commentsOpen}>
        {hasBody && post.description && post.description.length > PANEL_DESC_TRUNCATE && (
          <DetailsToggle
            type="button"
            onClick={() => setDetailsExpanded((v) => !v)}
            aria-expanded={detailsExpanded}
            aria-controls="viewer-details-panel"
            aria-label={detailsExpanded ? '내용 접기' : '내용 펼치기'}
            title={detailsExpanded ? '내용 접기' : '내용 펼치기'}
          >
            {/* Two distinct glyphs (no rotate transform) so the arrow is
             *  always upright. ▴ = currently expanded, click to collapse. */}
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
                  <InlineMoreBtn
                    type="button"
                    onClick={() => setDetailsExpanded(true)}
                  >
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
            threads.map((t) => (
              <CommentThread
                key={t.id}
                thread={t}
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
              // Enter submits, Shift+Enter (or IME composition) keeps the
              // newline. `isComposing` guards against accidental submit while
              // the user is still finishing a Korean character.
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
      </CommentPanel>
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
            <button
              type="button"
              className={likedCommentIds.has(c.id) ? 'liked' : ''}
              onClick={() => onToggleLike(c)}
              disabled={!currentUserId}
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
