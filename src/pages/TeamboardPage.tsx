import styled from '@emotion/styled';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import {
  useTeamPosts,
  useTogglePostLike,
  useDeletePost,
  useUpdatePost,
  useMyLikedPostIds,
} from '@/hooks/usePosts';
import { Button } from '@/components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { PostTile } from '@/components/PostTile';
import { Viewer } from '@/components/Viewer';

const Page = styled.div`
  background: ${({ theme }) => theme.bg};
`;

const Header = styled.header`
  max-width: 1440px;
  margin: 0 auto;
  padding: 56px 32px 28px;
  display: grid;
  grid-template-columns: 120px 1fr auto;
  gap: 28px;
  align-items: end;
  border-bottom: 1px solid ${({ theme }) => theme.border};
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    padding: 32px 24px 20px;
  }
`;

const TeamDot = styled.div<{ c: string }>`
  width: 120px;
  height: 120px;
  background: ${({ c }) => c};
  position: relative;
  overflow: hidden;
  &::before,
  &::after {
    content: '';
    position: absolute;
    border-radius: 50%;
    filter: blur(24px);
  }
  &::before {
    width: 70%;
    height: 70%;
    top: -10%;
    left: -10%;
    background: rgba(255, 255, 255, 0.22);
  }
  @media (max-width: 900px) {
    width: 72px;
    height: 72px;
  }
`;

const Info = styled.div`
  h1 {
    font-family: 'Fraunces', serif;
    font-style: italic;
    font-size: 48px;
    font-weight: 400;
    letter-spacing: -0.02em;
    line-height: 1.05;
    color: ${({ theme }) => theme.text};
    margin-bottom: 10px;
  }
  p {
    font-size: 14px;
    color: ${({ theme }) => theme.textMuted};
    max-width: 640px;
    line-height: 1.65;
  }
  .meta {
    font-size: 12px;
    color: ${({ theme }) => theme.textSoft};
    margin-top: 10px;
    display: flex;
    gap: 8px;
  }
  @media (max-width: 900px) {
    h1 {
      font-size: 32px;
    }
  }
`;

const Gallery = styled.div`
  max-width: 1440px;
  margin: 0 auto;
  padding: 32px 32px 120px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  @media (max-width: 1200px) {
    grid-template-columns: repeat(3, 1fr);
  }
  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
    padding: 24px 24px 80px;
  }
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const Empty = styled.div`
  grid-column: 1 / -1;
  text-align: center;
  padding: 80px 20px;
  color: ${({ theme }) => theme.textMuted};
  .t {
    font-size: 16px;
    font-weight: 700;
    color: ${({ theme }) => theme.text};
    margin-bottom: 8px;
  }
  .d {
    font-size: 13px;
    margin-bottom: 20px;
  }
`;

export default function TeamboardPage() {
  const { t } = useTranslation();
  const team = useAuthStore((s) => s.team);
  const session = useAuthStore((s) => s.session);
  const membership = useAuthStore((s) => s.membership);
  const { data: posts = [] } = useTeamPosts(team?.id);
  const navigate = useNavigate();
  const [viewerIdx, setViewerIdx] = useState<number | null>(null);
  const toggleLike = useTogglePostLike();
  const deletePost = useDeletePost();
  const updatePost = useUpdatePost();
  const { data: likedPostIds } = useMyLikedPostIds();
  const isAdmin =
    typeof window !== 'undefined' && !!localStorage.getItem('plc-admin-code');

  const authors = new Set(posts.map((p) => p.author_id));
  const lastUpdated = posts.reduce<string | null>((acc, p) => {
    const ts = (p as { updated_at?: string; created_at?: string }).updated_at
      ?? (p as { created_at?: string }).created_at
      ?? null;
    if (!ts) return acc;
    return !acc || ts > acc ? ts : acc;
  }, null);
  const lastUpdatedLabel = lastUpdated
    ? new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(lastUpdated))
    : null;

  return (
    <Page>
      <Header>
        <TeamDot c={team?.color ?? '#FF7A1A'} />
        <Info>
          <h1>{`${team?.name ?? '우리 팀'}의 팀보드입니다.`}</h1>
          <div className="meta">
            <span>
              {t('teamboard.totalPrefix')}
              {authors.size}
              {t('teamboard.membersSuffix')}
            </span>
            <span>·</span>
            <span>
              {posts.length}
              {t('teamboard.postsSuffix')}
            </span>
            {lastUpdatedLabel && (
              <>
                <span>·</span>
                <span>업데이트 {lastUpdatedLabel}</span>
              </>
            )}
          </div>
        </Info>
        <Button onClick={() => navigate('/upload')}>{t('home.newMoodboard')}</Button>
      </Header>

      <Gallery>
        {posts.length === 0 ? (
          <Empty>
            <div className="t">{t('teamboard.empty.title')}</div>
            <div className="d">{t('teamboard.empty.desc')}</div>
            <Button onClick={() => navigate('/upload')}>{t('teamboard.empty.cta')}</Button>
          </Empty>
        ) : (
          posts.map((p, idx) => (
            <PostTile
              key={p.id}
              post={p}
              index={idx}
              onClick={() => setViewerIdx(idx)}
              teamName={team?.name ?? undefined}
              authorColor={team?.color ?? undefined}
              onTeamClick={() => navigate('/teamboard')}
              onToggleLike={(id) => toggleLike.mutate(id)}
            />
          ))
        )}
      </Gallery>

      {viewerIdx !== null && (
        <Viewer
          posts={posts}
          index={viewerIdx}
          onIndexChange={setViewerIdx}
          onClose={() => setViewerIdx(null)}
          onToggleLike={(id) => toggleLike.mutate(id)}
          likedPostIds={likedPostIds}
          onDeletePost={(id) => deletePost.mutateAsync(id).then(() => undefined)}
          onUpdatePost={(input) => updatePost.mutateAsync(input).then(() => undefined)}
          currentUserId={session?.user.id ?? null}
          isTeamLeader={membership?.role === 'leader'}
          isAdmin={isAdmin}
        />
      )}
    </Page>
  );
}
