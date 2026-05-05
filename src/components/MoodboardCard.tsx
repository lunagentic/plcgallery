import styled from '@emotion/styled';
import { Link, useNavigate } from 'react-router-dom';
import type { Moodboard } from '@/types/database';
import { MoodboardCover } from './MoodboardCover';

const Card = styled(Link)<{ delay: number }>`
  display: flex;
  flex-direction: column;
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

const CoverFrame = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  overflow: hidden;
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

const Footer = styled.div`
  padding: 10px 4px 4px;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const PostTitle = styled.div`
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.text};
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const TeamLink = styled.button`
  align-self: flex-start;
  background: transparent;
  border: 0;
  padding: 0;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.textMuted};
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  &:hover {
    color: ${({ theme }) => theme.text};
    text-decoration: underline;
  }
`;

const Author = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: ${({ theme }) => theme.textMuted};
`;

const Avatar = styled.span<{ bg: string }>`
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: ${({ bg }) => bg};
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
  teamName?: string;
  nickname?: string;
  nickInitial?: string;
  nickColor?: string;
  coverImages?: string[];
}

export function MoodboardCard({
  mb,
  index = 0,
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
    <Card to={`/moodboards/${mb.id}`} delay={index * 40}>
      <CoverFrame>
        <MoodboardCover grad={grad} images={coverImages} layout="rotate" />
        <span className="overlay" />
      </CoverFrame>
      <Footer>
        <PostTitle>{mb.title}</PostTitle>
        {teamName && (
          <TeamLink
            type="button"
            title={`${teamName} 팀보드 보기`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              navigate('/teamboard');
            }}
          >
            {teamName}
          </TeamLink>
        )}
        {nickname && (
          <Author>
            <Avatar bg={nickColor}>{nickInitial ?? nickname.charAt(0)}</Avatar>
            <span>{nickname}</span>
          </Author>
        )}
      </Footer>
    </Card>
  );
}
