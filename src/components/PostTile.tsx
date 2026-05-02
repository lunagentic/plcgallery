import styled from '@emotion/styled';
import { getPublicImageUrl } from '@/lib/supabase';
import type { PostWithAuthor } from '@/hooks/usePosts';

const Card = styled.div<{ delay: number; spanWide: boolean }>`
  display: flex;
  flex-direction: column;
  text-align: left;
  opacity: 0;
  transform: translateY(12px);
  animation: riseTile 0.6s ease-out forwards;
  animation-delay: ${({ delay }) => delay}ms;
  grid-column: ${({ spanWide }) => (spanWide ? 'span 2' : 'auto')};

  @keyframes riseTile {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 900px) {
    grid-column: auto;
  }
`;

const Tile = styled.button<{ ratio: string }>`
  position: relative;
  overflow: hidden;
  background: ${({ theme }) => theme.surface};
  cursor: pointer;
  padding: 0;
  border: 0;
  border-radius: 14px;

  aspect-ratio: ${({ ratio }) => {
    switch (ratio) {
      case '1':
      case '1:1':
        return '1 / 1';
      case '3:4':
        return '3 / 4';
      case '16:9':
        return '16 / 9';
      case '4:3':
      default:
        return '4 / 3';
    }
  }};
`;

const Img = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: rgba(0, 0, 0, 0.04);
  display: block;
  transition: transform 0.6s ease;
  ${Tile}:hover & {
    transform: scale(1.03);
  }
`;

const EmptyStage = styled.div<{ bg: string }>`
  width: 100%;
  height: 100%;
  background: ${({ bg }) => bg};
`;

const Overlay = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.65) 0%, rgba(0, 0, 0, 0) 55%);
  opacity: 0;
  transition: opacity 0.25s ease;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 20px;
  color: #fff;
  ${Tile}:hover & {
    opacity: 1;
  }
`;

const TagRow = styled.div`
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
`;

const Tag = styled.span`
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(4px);
  font-size: 10px;
  font-weight: 600;
  color: #fff;
`;

const Stats = styled.div`
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  gap: 6px;
  opacity: 0;
  transform: translateY(-4px);
  transition: all 0.25s ease;
  ${Tile}:hover & {
    opacity: 1;
    transform: translateY(0);
  }
`;

const StatChip = styled.span`
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(8px);
  color: #fff;
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 4px;
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

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
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

const LikePill = styled.button<{ liked: boolean }>`
  background: ${({ liked, theme }) => (liked ? theme.brandSoft : 'transparent')};
  border: 1px solid ${({ liked, theme }) => (liked ? theme.brand : theme.border)};
  color: ${({ liked, theme }) => (liked ? theme.brand : theme.textMuted)};
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all 0.15s ease;
  &:hover {
    color: ${({ theme }) => theme.brand};
    border-color: ${({ theme }) => theme.brand};
  }
`;

interface Props {
  post: PostWithAuthor;
  index: number;
  onClick: () => void;
  /** Optional override; defaults to `post.author_nickname`. */
  authorName?: string;
  /** Team name shown as a link below the title. Click → /teamboard. */
  teamName?: string;
  /** Hex color for the author avatar (typically the team color). */
  authorColor?: string;
  /** Whether the current viewer has already liked this post. */
  liked?: boolean;
  /** Toggle-like handler; renders the like pill when provided. */
  onToggleLike?: (postId: string) => void;
  /** Click on the team link; defaults to navigating to /teamboard. */
  onTeamClick?: () => void;
}

export function PostTile({
  post,
  index,
  onClick,
  authorName,
  teamName,
  authorColor = '#87B5A3',
  liked = false,
  onToggleLike,
  onTeamClick,
}: Props) {
  const url = getPublicImageUrl(post.image_path);
  const ratio = post.image_ratio ?? '4:3';
  const stage = post.stage_bg ?? '#F2EFE9';
  const displayAuthor = authorName ?? post.author_nickname ?? '작가 미상';
  const initial = displayAuthor.charAt(0).toUpperCase();

  return (
    <Card delay={index * 40} spanWide={ratio === '16:9'}>
      <Tile ratio={ratio} onClick={onClick} aria-label={post.title}>
        {url ? (
          <Img src={url} alt={post.title} loading="lazy" />
        ) : (
          <EmptyStage bg={stage} />
        )}
        <Stats>
          {post.image_paths && post.image_paths.length > 1 && (
            <StatChip>📚 +{post.image_paths.length - 1}</StatChip>
          )}
        </Stats>
        <Overlay>
          {post.tags && post.tags.length > 0 && (
            <TagRow>
              {post.tags.slice(0, 4).map((tag) => (
                <Tag key={tag}>#{tag}</Tag>
              ))}
            </TagRow>
          )}
        </Overlay>
      </Tile>
      <Footer>
        <PostTitle>{post.title}</PostTitle>
        {teamName && (
          <TeamLink type="button" onClick={onTeamClick} title={`${teamName} 팀보드 보기`}>
            {teamName} →
          </TeamLink>
        )}
        <MetaRow>
          <Author>
            <Avatar bg={authorColor}>{initial}</Avatar>
            <span>{displayAuthor}</span>
          </Author>
          {onToggleLike && (
            <LikePill
              type="button"
              liked={liked}
              onClick={(e) => {
                e.stopPropagation();
                onToggleLike(post.id);
              }}
              aria-label="좋아요"
            >
              ♥ {post.likes_count}
            </LikePill>
          )}
        </MetaRow>
      </Footer>
    </Card>
  );
}
