import styled from '@emotion/styled';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useMoodboard } from '@/hooks/useMoodboards';
import { useMoodboardPosts, useTogglePostLike, useDeletePost } from '@/hooks/usePosts';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Viewer } from '@/components/Viewer';
import { PostTile } from '@/components/PostTile';
import { MoodboardCover } from '@/components/MoodboardCover';
import { getPublicImageUrl } from '@/lib/supabase';
import { useMemo } from 'react';

const Page = styled.div`
  background: ${({ theme }) => theme.bg};
`;

const Header = styled.header`
  max-width: 1440px;
  margin: 0 auto;
  padding: 56px 32px 32px;
  display: grid;
  grid-template-columns: 180px 1fr auto;
  gap: 32px;
  align-items: end;
  border-bottom: 1px solid ${({ theme }) => theme.border};
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    padding: 32px 24px 20px;
  }
`;

const CoverFrame = styled.div`
  position: relative;
  width: 180px;
  height: 180px;
  overflow: hidden;
  @media (max-width: 900px) {
    width: 120px;
    height: 120px;
  }
`;

const Info = styled.div`
  h1 {
    font-family: 'Fraunces', serif;
    font-style: italic;
    font-size: 56px;
    font-weight: 400;
    letter-spacing: -0.02em;
    line-height: 1.05;
    color: ${({ theme }) => theme.text};
    margin-bottom: 14px;
  }
  .meta {
    font-size: 13px;
    color: ${({ theme }) => theme.textMuted};
    display: flex;
    gap: 12px;
  }
  .desc {
    margin-top: 14px;
    font-size: 14px;
    color: ${({ theme }) => theme.textMuted};
    line-height: 1.6;
    max-width: 540px;
  }
  @media (max-width: 900px) {
    h1 {
      font-size: 36px;
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

export default function MoodboardPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const nav = useNavigate();
  const { data: mb } = useMoodboard(id);
  const { data: posts = [] } = useMoodboardPosts(id);
  const [viewerIdx, setViewerIdx] = useState<number | null>(null);
  const toggleLike = useTogglePostLike();
  const deletePost = useDeletePost();
  const session = useAuthStore((s) => s.session);
  const membership = useAuthStore((s) => s.membership);
  const isAdmin =
    typeof window !== 'undefined' && !!localStorage.getItem('plc-admin-code');

  const dot = mb?.team_dot ?? '#FF7A1A';
  const grad = mb?.cover_gradient || `linear-gradient(135deg, ${dot}66, ${dot})`;
  const coverImages = useMemo(
    () =>
      posts
        .filter((p) => p.image_path)
        .slice(0, 4)
        .map((p) => getPublicImageUrl(p.image_path) ?? '')
        .filter(Boolean),
    [posts],
  );

  return (
    <Page>
      <Header>
        <CoverFrame>
          <MoodboardCover grad={grad} images={coverImages} layout="collage" />
        </CoverFrame>
        <Info>
          <h1>{mb?.title ?? '…'}</h1>
          <div className="meta">
            <span>
              {posts.length}
              {t('mb.items')}
            </span>
            <span>·</span>
            <span>{t('mb.updatedAt')}</span>
          </div>
          {mb?.description && <p className="desc">{mb.description}</p>}
        </Info>
        <Button onClick={() => id && nav(`/upload/${id}`)}>{t('mb.addProject')}</Button>
      </Header>

      <Gallery>
        {posts.length === 0 ? (
          <Empty>
            <div className="t">{t('empty.mb.title')}</div>
            <div className="d">{t('empty.mb.desc')}</div>
            <Button onClick={() => id && nav(`/upload/${id}`)}>{t('empty.mb.cta')}</Button>
          </Empty>
        ) : (
          posts.map((p, idx) => (
            <PostTile key={p.id} post={p} index={idx} onClick={() => setViewerIdx(idx)} />
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
          onDeletePost={(id) => deletePost.mutateAsync(id).then(() => undefined)}
          currentUserId={session?.user.id ?? null}
          isTeamLeader={membership?.role === 'leader'}
          isAdmin={isAdmin}
        />
      )}
    </Page>
  );
}
