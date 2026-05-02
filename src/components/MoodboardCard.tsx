import styled from '@emotion/styled';
import { Link, useNavigate } from 'react-router-dom';
import type { Moodboard } from '@/types/database';
import { MoodboardCover } from './MoodboardCover';

const Card = styled(Link)<{ delay: number; featured?: boolean }>`
  display: block;
  cursor: pointer;
  color: inherit;
  opacity: 0;
  transform: translateY(12px);
  animation: rise 0.6s ease-out forwards;
  animation-delay: ${({ delay }) => delay}ms;

  @keyframes rise {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

/**
 * Cover frame: when the card has actual cover images we let the image
 * dictate the natural height (masonry rhythm). For empty/placeholder
 * boards we fall back to a fixed 4:3 so they don't collapse.
 */
const CoverFrame = styled.div<{ hasImages: boolean }>`
  position: relative;
  width: 100%;
  aspect-ratio: ${({ hasImages }) => (hasImages ? 'auto' : '4 / 3')};
  overflow: hidden;
  margin-bottom: 12px;
  border-radius: 14px;
  background: ${({ theme }) => theme.surface};

  ${Card}:hover img {
    transform: scale(1.03);
  }

  .overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.35), transparent 40%);
    opacity: 0;
    transition: opacity 0.25s ease;
    pointer-events: none;
    z-index: 2;
  }
  ${Card}:hover & .overlay {
    opacity: 1;
  }
`;

const Badge = styled.div`
  position: absolute;
  top: 12px;
  left: 12px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: #1a1714;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  z-index: 3;
`;

const Dot = styled.span<{ c: string }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ c }) => c};
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.12);
`;

const TeamPill = styled.button`
  position: absolute;
  bottom: 12px;
  right: 12px;
  background: rgba(0, 0, 0, 0.72);
  color: #fff;
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  border: 0;
  cursor: pointer;
  opacity: 0;
  transform: translateY(4px);
  transition: all 0.25s ease;
  z-index: 4;

  ${Card}:hover & {
    opacity: 1;
    transform: translateY(0);
  }

  &:hover {
    background: rgba(0, 0, 0, 0.88);
  }
`;

const Title = styled.h3`
  font-family: 'Pretendard Variable', 'Pretendard', sans-serif;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.015em;
  line-height: 1.35;
  margin-bottom: 4px;
  color: ${({ theme }) => theme.ink};
  text-wrap: balance;
`;

const Meta = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: ${({ theme }) => theme.textMuted};
`;

const MiniAvatar = styled.span<{ c: string }>`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: ${({ c }) => c};
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

interface Props {
  mb: Moodboard;
  count?: number;
  index?: number;
  featured?: boolean;
  teamName?: string;
  nickname?: string;
  nickInitial?: string;
  nickColor?: string;
  coverImages?: string[];
}

export function MoodboardCard({
  mb,
  index = 0,
  featured = false,
  teamName,
  nickname,
  nickInitial,
  nickColor = '#87B5A3',
  coverImages = [],
}: Props) {
  const navigate = useNavigate();
  const dot = mb.team_dot ?? '#FF7A1A';
  const grad = mb.cover_gradient || `linear-gradient(135deg, ${dot}66, ${dot})`;

  return (
    <Card to={`/moodboards/${mb.id}`} delay={index * 40} featured={featured}>
      <CoverFrame hasImages={coverImages.length > 0}>
        <MoodboardCover
          grad={grad}
          images={coverImages}
          layout={featured ? 'collage' : 'rotate'}
        />
        {teamName && (
          <Badge>
            <Dot c={dot} />
            {teamName}
          </Badge>
        )}
        {teamName && (
          <TeamPill
            type="button"
            title={`${teamName} 팀보드 보기`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              navigate('/teamboard');
            }}
          >
            {teamName} →
          </TeamPill>
        )}
        <span className="overlay" />
      </CoverFrame>
      <Title>{mb.title}</Title>
      {nickname && (
        <Meta>
          <MiniAvatar c={nickColor}>{nickInitial ?? nickname.charAt(0)}</MiniAvatar>
          <span style={{ fontWeight: 500 }}>{nickname}</span>
        </Meta>
      )}
    </Card>
  );
}
