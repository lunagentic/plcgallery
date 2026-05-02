import styled from '@emotion/styled';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PostWithAuthor } from '@/hooks/usePosts';
import { getPublicImageUrl } from '@/lib/supabase';
import { copyToClipboard } from '@/lib/clipboard';
import { useUIStore } from '@/store/uiStore';

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
  height: 64px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(20px);
  z-index: 14;
  .title {
    flex: 1;
    font-size: 14px;
    font-weight: 600;
    color: rgba(26, 23, 20, 0.85);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .idx {
    font-variant-numeric: tabular-nums;
    font-size: 12px;
    color: rgba(26, 23, 20, 0.55);
    padding-right: 4px;
  }
`;

const TitleInfoBtn = styled.button<{ visible: boolean }>`
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.78);
  color: #1a1714;
  font-size: 14px;
  font-weight: 700;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  opacity: ${({ visible }) => (visible ? 1 : 0)};
  transform: scale(${({ visible }) => (visible ? 1 : 0.6)});
  pointer-events: ${({ visible }) => (visible ? 'auto' : 'none')};
  transition:
    opacity 200ms ease,
    transform 200ms cubic-bezier(0.2, 0.85, 0.25, 1),
    background 160ms ease;
  &:hover {
    background: #fff;
  }
  &::before {
    content: 'ℹ';
    font-style: italic;
    font-family: 'Fraunces', serif;
    line-height: 1;
  }
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

const Stage = styled.div`
  flex: 1;
  display: grid;
  place-items: center;
  padding: 96px 80px;
  position: relative;
  overflow: hidden;
  @media (max-width: 900px) {
    padding: 88px 16px 72px;
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

/** The image's positioning context — hugs the photo so the InfoPanel can
 *  be inset relative to the actual image rectangle. */
const ImageHost = styled.div`
  position: relative;
  display: inline-flex;
  max-width: 100%;
  max-height: calc(100vh - 240px);
`;

const Img = styled.img`
  max-width: 100%;
  max-height: calc(100vh - 240px);
  object-fit: contain;
  box-shadow: 0 30px 80px -20px rgba(0, 0, 0, 0.25);
  display: block;
`;

const InfoPanel = styled.aside<{ visible: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 20px 56px 20px 24px;
  background: linear-gradient(
    to bottom,
    rgba(12, 10, 8, 0.62) 0%,
    rgba(12, 10, 8, 0.42) 70%,
    rgba(12, 10, 8, 0.06) 100%
  );
  backdrop-filter: blur(14px) saturate(130%);
  -webkit-backdrop-filter: blur(14px) saturate(130%);
  color: #ffffff;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 70%;
  overflow-y: auto;
  border-radius: 8px 8px 0 0;
  z-index: 11;
  pointer-events: ${({ visible }) => (visible ? 'auto' : 'none')};
  opacity: ${({ visible }) => (visible ? 1 : 0)};
  transform: translateY(${({ visible }) => (visible ? '0' : '-8%')});
  transition:
    transform 320ms cubic-bezier(0.2, 0.85, 0.25, 1),
    opacity 220ms cubic-bezier(0.4, 0, 0.2, 1);
  @media (max-width: 900px) {
    padding: 16px 44px 16px 18px;
  }
`;

const PanelCloseBtn = styled.button`
  position: absolute;
  top: 12px;
  right: 12px;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(8px);
  color: rgba(255, 255, 255, 0.95);
  font-size: 14px;
  font-weight: 700;
  display: grid;
  place-items: center;
  &:hover {
    background: rgba(255, 255, 255, 0.32);
  }
`;

const PanelCopyBtn = styled.button`
  position: absolute;
  top: 14px;
  right: 50px;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(8px);
  color: rgba(255, 255, 255, 0.95);
  font-size: 11px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  &:hover {
    background: rgba(255, 255, 255, 0.32);
  }
`;

const Title = styled.h2`
  font-family: 'Fraunces', serif;
  font-style: italic;
  font-size: 32px;
  font-weight: 400;
  letter-spacing: -0.01em;
  line-height: 1.15;
  color: #ffffff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
`;

const AuthorRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  .name {
    font-size: 14px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.95);
  }
  .desc {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
    margin-top: 2px;
  }
`;

const Avatar = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 999px;
  background: linear-gradient(135deg, #f4d35e, #e07856);
  color: #fff;
  font-weight: 700;
  display: grid;
  place-items: center;
  flex-shrink: 0;
`;

const TagRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const TagPill = styled.span`
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  color: rgba(255, 255, 255, 0.92);
  font-size: 11px;
  font-weight: 600;
`;

const Body = styled.p`
  font-size: 13px;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.85);
  white-space: pre-wrap;
  word-break: keep-all;
`;

const TipBox = styled.div`
  background: rgba(255, 174, 92, 0.18);
  border-left: 2px solid rgba(255, 174, 92, 0.7);
  padding: 10px 12px;
  border-radius: 0 8px 8px 0;
  font-size: 12px;
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.92);
  &::before {
    content: '💡 입력 꿀팁';
    display: block;
    font-size: 10px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgba(255, 174, 92, 0.95);
    font-weight: 700;
    margin-bottom: 4px;
  }
`;

const PanelFooter = styled.div`
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
`;

const LikeBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 16px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  font-size: 13px;
  font-weight: 700;
  color: #1a1714;
  &:hover {
    background: #fff;
  }
`;

const DeleteBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(220, 38, 38, 0.18);
  border: 1px solid rgba(220, 38, 38, 0.4);
  font-size: 12px;
  font-weight: 700;
  color: #fff5f5;
  &:hover {
    background: rgba(220, 38, 38, 0.32);
    border-color: rgba(220, 38, 38, 0.7);
  }
`;

const NavBtn = styled.button<{ dir: 'left' | 'right' }>`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  ${({ dir }) => (dir === 'left' ? 'left: 24px;' : 'right: 24px;')}
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
  &:hover {
    background: #fff;
  }
  @media (max-width: 900px) {
    width: 40px;
    height: 40px;
    ${({ dir }) => (dir === 'left' ? 'left: 10px;' : 'right: 10px;')}
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
`;

const BottomBar = styled.div`
  position: absolute;
  bottom: 16px;
  right: 24px;
  z-index: 13;
  display: flex;
  gap: 8px;
  @media (max-width: 900px) {
    bottom: 56px;
    right: 12px;
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
  /** Optional: pass to enable the delete button on permitted posts. */
  onDeletePost?: (postId: string) => Promise<void> | void;
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
  onDeletePost,
  currentUserId,
  isTeamLeader,
  isAdmin,
}: ViewerProps) {
  const { t } = useTranslation();
  /**
   * Panel visibility model:
   *  - Hover the image area → panel slides down from below the TopBar.
   *  - Mouse leaves the image area → panel slides back up.
   *  - Explicit X button → panel hides AND we set "manualClosed" so hover
   *    no longer auto-shows it. The user must use the ℹ button next to
   *    the title to re-open.
   *  - Click the title-side ℹ button → panel re-opens (and clears
   *    manualClosed so hover behavior resumes).
   *  - The ℹ button is visible whenever the panel is closed.
   */
  const [panelVisible, setPanelVisible] = useState(false);
  const [manualClosed, setManualClosed] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  const showToast = useUIStore((s) => s.showToast);
  const post = posts[index];

  const handleHoverEnter = useCallback(() => {
    if (manualClosed) return;
    setPanelVisible(true);
  }, [manualClosed]);

  const handleHoverLeave = useCallback(() => {
    if (manualClosed) return;
    setPanelVisible(false);
  }, [manualClosed]);

  const handleClosePanel = useCallback(() => {
    setPanelVisible(false);
    setManualClosed(true);
  }, []);

  const handleOpenPanel = useCallback(() => {
    setManualClosed(false);
    setPanelVisible(true);
  }, []);

  // Reset state on each post change
  useEffect(() => {
    setImgIdx(0);
    setPanelVisible(false);
    setManualClosed(false);
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
  const hasInfo =
    !!post.description ||
    !!post.tip_text ||
    (post.tags && post.tags.length > 0) ||
    !!post.title;

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

  return (
    <Overlay role="dialog" aria-modal bg={stageBg}>
      <TopBar>
        <span className="title">{post.title}</span>
        {hasInfo && (
          <TitleInfoBtn
            visible={!panelVisible}
            type="button"
            onClick={handleOpenPanel}
            aria-label="정보 보기"
            title="정보 보기"
          />
        )}
        <span className="idx">
          {index + 1} / {posts.length}
        </span>
        <RoundBtn onClick={onClose} aria-label="Close">
          ✕
        </RoundBtn>
      </TopBar>

      {index > 0 && (
        <NavBtn dir="left" onClick={() => onIndexChange(index - 1)} aria-label="Previous">
          ←
        </NavBtn>
      )}
      {index < posts.length - 1 && (
        <NavBtn dir="right" onClick={() => onIndexChange(index + 1)} aria-label="Next">
          →
        </NavBtn>
      )}

      <Stage>
        <ImageColumn>
        <ImageHost
          onMouseEnter={handleHoverEnter}
          onMouseLeave={handleHoverLeave}
        >
          <Img
            src={currentImageUrl}
            alt={post.title}
            style={{ background: 'rgba(255,255,255,0.2)' }}
          />

          {hasInfo && (
            <InfoPanel visible={panelVisible} aria-hidden={!panelVisible}>
              <PanelCopyBtn onClick={copyPanelContent} type="button" title="내용 복사">
                📋 복사
              </PanelCopyBtn>
              <PanelCloseBtn
                onClick={handleClosePanel}
                type="button"
                aria-label="패널 닫기"
                title="닫기"
              >
                ✕
              </PanelCloseBtn>
              <Title>{post.title}</Title>
              <AuthorRow>
                <Avatar>
                  {(post.author_nickname ?? post.title ?? '?').charAt(0).toUpperCase()}
                </Avatar>
                <div>
                  <div className="name">{post.author_nickname ?? '작가 미상'}</div>
                  <div className="desc">팀 보드 게시물</div>
                </div>
              </AuthorRow>
              {post.tags && post.tags.length > 0 && (
                <TagRow>
                  {post.tags.map((tag) => (
                    <TagPill key={tag}>#{tag}</TagPill>
                  ))}
                </TagRow>
              )}
              {post.tip_text && <TipBox>{post.tip_text}</TipBox>}
              {post.description && <Body>{post.description}</Body>}
              <PanelFooter>
                <LikeBtn onClick={() => onToggleLike(post.id)}>♥ {post.likes_count}</LikeBtn>
              </PanelFooter>
            </InfoPanel>
          )}
        </ImageHost>

        {imageBundle.length > 1 && (
          <ThumbStrip>
            {imageBundle.map((url, i) => (
              <Thumb
                key={url + i}
                active={i === imgIdx}
                onClick={() => setImgIdx(i)}
                type="button"
                aria-label={`이미지 ${i + 1}`}
              >
                <img src={url} alt="" />
              </Thumb>
            ))}
          </ThumbStrip>
        )}
        </ImageColumn>
      </Stage>

      <Hint>{t('viewer.hint')}</Hint>

      {(post.author_id === currentUserId || isTeamLeader || isAdmin) &&
        onDeletePost && (
          <BottomBar>
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
              title={isAdmin ? '관리자 권한 삭제' : '삭제'}
            >
              🗑 삭제
            </DeleteBtn>
          </BottomBar>
        )}
    </Overlay>
  );
}
