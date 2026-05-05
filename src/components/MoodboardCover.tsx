import styled from '@emotion/styled';
import { useEffect, useRef, useState } from 'react';

const Wrap = styled.div<{ grad: string }>`
  position: relative;
  width: 100%;
  height: 100%;
  background: ${({ grad }) => grad};
  overflow: hidden;
`;

/** Empty cover — gradient + placeholder icon. Inherits the parent's height
 *  (parent supplies the aspect ratio). */
const PlaceholderWrap = styled(Wrap)``;

const Placeholder = styled.div<{ grad: string }>`
  position: absolute;
  inset: 0;
  background: ${({ grad }) => grad};
  &::before,
  &::after {
    content: '';
    position: absolute;
    border-radius: 50%;
    filter: blur(28px);
    pointer-events: none;
  }
  &::before {
    width: 60%;
    height: 60%;
    top: -10%;
    left: -10%;
    background: rgba(255, 255, 255, 0.18);
  }
  &::after {
    width: 50%;
    height: 50%;
    bottom: -10%;
    right: -10%;
    background: rgba(255, 255, 255, 0.1);
  }
`;

const PlaceholderIcon = styled.svg`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: rgba(255, 255, 255, 0.78);
  opacity: 0.7;
  pointer-events: none;
`;

/** 2×2 collage — fills the parent frame (parent supplies aspect ratio). */
const CollageWrap = styled(Wrap)``;

const Grid = styled.div`
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 2px;
  background: ${({ theme }) => theme.bg};
  & > div {
    overflow: hidden;
  }
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.5s ease;
  }
`;

const OverlayImg = styled.img<{ visible: boolean }>`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: ${({ visible }) => (visible ? 1 : 0)};
  transition: opacity 0.9s ease;
`;

export type CoverLayout = 'auto' | 'collage' | 'rotate';

interface Props {
  grad: string;
  images: string[];
  layout?: CoverLayout;
  intervalMs?: number;
}

export function MoodboardCover({
  grad,
  images,
  layout = 'auto',
  intervalMs = 3500,
}: Props) {
  const [idx, setIdx] = useState(0);
  const indexRef = useRef(0);

  useEffect(() => {
    indexRef.current = 0;
    setIdx(0);
  }, [images.length, images[0]]);

  const shouldRotate =
    layout !== 'collage' && images.length > 1 && (images.length < 4 || layout === 'rotate');

  useEffect(() => {
    if (!shouldRotate) return;
    const id = window.setInterval(() => {
      indexRef.current = (indexRef.current + 1) % images.length;
      setIdx(indexRef.current);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [shouldRotate, intervalMs, images.length]);

  if (images.length === 0) {
    return (
      <PlaceholderWrap grad={grad}>
        <Placeholder grad={grad} />
        <PlaceholderIcon
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
        </PlaceholderIcon>
      </PlaceholderWrap>
    );
  }

  // 2×2 collage — only when 4+ unique images. Otherwise fall through to the
  // single-rotate layout below so a 1-image board doesn't render the same
  // photo four times.
  if (layout === 'collage' && images.length >= 4) {
    return (
      <CollageWrap grad={grad}>
        <Grid>
          {images.slice(0, 4).map((src, i) => (
            <div key={src + i}>
              <img src={src} alt="" loading="lazy" />
            </div>
          ))}
        </Grid>
      </CollageWrap>
    );
  }

  // auto: if 4+ images show grid, else single rotation
  if (layout === 'auto' && images.length >= 4) {
    return (
      <CollageWrap grad={grad}>
        <Grid>
          {images.slice(0, 4).map((src, i) => (
            <div key={src + i}>
              <img src={src} alt="" loading="lazy" />
            </div>
          ))}
        </Grid>
      </CollageWrap>
    );
  }

  /* Single image (or 1-3 rotating). Parent's frame supplies the aspect
   * ratio; images crossfade and `object-fit: cover` fills the frame. */
  return (
    <Wrap grad={grad}>
      {images.map((src, i) => (
        <OverlayImg key={src + i} src={src} alt="" loading="lazy" visible={i === idx} />
      ))}
    </Wrap>
  );
}
