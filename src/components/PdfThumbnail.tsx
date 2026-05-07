import styled from '@emotion/styled';
import { useState } from 'react';

/**
 * Shared PDF thumbnail visual used everywhere a PDF post needs a tile.
 *
 * Two modes:
 *  - When `thumbUrl` resolves, render the auto-generated first-page JPEG
 *    cropped to the parent's frame; a small italic "PDF" badge sits in
 *    the top-right corner so viewers know it's a document, not a photo.
 *  - When the thumb is missing or 404s (legacy posts that predate the
 *    thumbnail pipeline), fall back to a paper-styled placeholder card
 *    with a serif "PDF" wordmark.
 *
 * `size` tunes badge density so the same component scales from postcard
 * tiles all the way down to the 38px thumb-strip pills.
 */
export type PdfThumbSize = 'sm' | 'md' | 'lg';

interface Props {
  /** Public URL of the auto-generated `.thumb.jpg` companion. */
  thumbUrl: string | null | undefined;
  /** Accessible alt text — defaults to "PDF". */
  alt?: string;
  /** Visual density. `sm` skips the wordmark / dog-ear for tiny strips. */
  size?: PdfThumbSize;
  className?: string;
}

const Wrap = styled.div<{ size: PdfThumbSize }>`
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  /* Cream-paper gradient with a soft warm corner glow — visible only as
   *  the placeholder background; covered by <img> when a thumb exists. */
  background:
    radial-gradient(ellipse at 28% 30%, rgba(255, 255, 255, 0.55), transparent 55%),
    linear-gradient(135deg, #fff7e8 0%, #f5dab2 55%, #e7b178 100%);
  & > img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top;
    display: block;
    position: relative;
    z-index: 1;
  }
  /* Subtle ruled-paper texture under the placeholder — hidden when the
   *  image overlay covers the whole frame. */
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: repeating-linear-gradient(
      0deg,
      rgba(120, 80, 30, 0.045) 0,
      rgba(120, 80, 30, 0.045) 1px,
      transparent 1px,
      transparent 22px
    );
    pointer-events: none;
    opacity: ${({ size }) => (size === 'sm' ? 0 : 1)};
  }
`;

const Wordmark = styled.span<{ size: PdfThumbSize }>`
  font-family: 'Fraunces', serif;
  font-style: italic;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: #5a3211;
  opacity: 0.55;
  text-shadow: 0 2px 8px rgba(255, 255, 255, 0.45);
  font-size: ${({ size }) =>
    size === 'sm' ? '11px' : size === 'md' ? '22px' : '46px'};
`;

const Badge = styled.span<{ size: PdfThumbSize }>`
  position: absolute;
  top: ${({ size }) => (size === 'sm' ? '3px' : size === 'md' ? '6px' : '10px')};
  right: ${({ size }) => (size === 'sm' ? '3px' : size === 'md' ? '6px' : '10px')};
  z-index: 2;
  padding: ${({ size }) =>
    size === 'sm' ? '0 4px' : size === 'md' ? '2px 7px' : '3px 10px'};
  background: rgba(26, 23, 20, 0.78);
  color: #ffd9a8;
  font-family: 'Fraunces', serif;
  font-style: italic;
  font-weight: 700;
  font-size: ${({ size }) =>
    size === 'sm' ? '8px' : size === 'md' ? '10px' : '12px'};
  letter-spacing: 0.12em;
  border-radius: 999px;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.22);
  pointer-events: none;
  user-select: none;
`;

export function PdfThumbnail({
  thumbUrl,
  alt = 'PDF',
  size = 'md',
  className,
}: Props) {
  const [broken, setBroken] = useState(false);
  const showImage = !!thumbUrl && !broken;
  return (
    <Wrap size={size} className={className}>
      {showImage ? (
        <img
          src={thumbUrl ?? undefined}
          alt={alt}
          loading="lazy"
          onError={() => setBroken(true)}
        />
      ) : (
        <Wordmark size={size}>PDF</Wordmark>
      )}
      <Badge size={size}>PDF</Badge>
    </Wrap>
  );
}
