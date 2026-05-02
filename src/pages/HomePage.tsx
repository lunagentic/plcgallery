import styled from '@emotion/styled';
import { Trans, useTranslation } from 'react-i18next';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMoodboards, type MoodboardWithCreator } from '@/hooks/useMoodboards';
import { useMoodboardCovers } from '@/hooks/useMoodboardCovers';
import { usePostsByCategory, useTogglePostLike, useDeletePost } from '@/hooks/usePosts';
import { MoodboardCard } from '@/components/MoodboardCard';
import { PostTile } from '@/components/PostTile';
import { Viewer } from '@/components/Viewer';
import { Button } from '@/components/ui/Button';
import { FilterChips, type FilterKey } from '@/components/FilterChips';
import { CreateMoodboardModal } from '@/components/CreateMoodboardModal';
import { MOODBOARD_CATEGORIES, type MoodboardCategory } from '@/types/database';
import { useAuthStore } from '@/store/authStore';

const SECTION_PREVIEW_LIMIT = 6;

const Page = styled.div`
  background: ${({ theme }) => theme.bg};
`;

const HeroWrap = styled.section`
  max-width: 1480px;
  margin: 0 auto;
  padding: 60px 32px 56px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 40px;
  align-items: end;
  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
    padding: 40px 24px 32px;
    gap: 24px;
  }
`;

const HeroText = styled.div`
  h1 {
    font-family: 'Nanum Myeongjo', 'Pretendard Variable', serif;
    font-weight: 400;
    font-size: clamp(40px, 7.7vw, 118px);
    line-height: 0.98;
    letter-spacing: -0.045em;
    color: ${({ theme }) => theme.ink};
    margin: 0;
    word-break: keep-all;
  }
  .black {
    font-style: normal;
  }
  em {
    color: ${({ theme }) => theme.accent};
    font-style: italic;
    font-family: 'Nanum Myeongjo', 'Fraunces', serif;
    font-weight: 800;
  }
`;

const HeroAside = styled.div`
  align-self: end;
  max-width: 280px;
  padding-bottom: 16px;
  .label {
    display: block;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.22em;
    color: ${({ theme }) => theme.ink2};
    text-transform: uppercase;
    margin-bottom: 14px;
  }
  .body {
    color: ${({ theme }) => theme.ink2};
    font-size: 14px;
    line-height: 1.65;
  }
  @media (max-width: 1100px) {
    max-width: none;
  }
`;

const Toolbar = styled.div`
  max-width: 1440px;
  margin: 0 auto;
  padding: 28px 32px;
  display: flex;
  align-items: center;
  gap: 16px;
  border-bottom: 1px solid ${({ theme }) => theme.border};
  @media (max-width: 900px) {
    padding: 20px 24px;
    flex-wrap: wrap;
  }
`;

const SectionsWrap = styled.div`
  max-width: 1480px;
  margin: 0 auto;
  padding: 32px 32px 120px;
  @media (max-width: 900px) {
    padding: 20px 24px 80px;
  }
`;

const Section = styled.section`
  padding: 24px 0 8px;
  & + & {
    border-top: 1px solid ${({ theme }) => theme.border};
    margin-top: 16px;
    padding-top: 32px;
  }
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
  h2 {
    font-family: 'Fraunces', serif;
    font-style: italic;
    font-weight: 500;
    font-size: clamp(22px, 2.2vw, 30px);
    letter-spacing: -0.01em;
    color: ${({ theme }) => theme.ink};
    margin: 0;
    .count {
      font-family: 'JetBrains Mono', ui-monospace, monospace;
      font-style: normal;
      font-weight: 500;
      font-size: 13px;
      color: ${({ theme }) => theme.ink3};
      margin-left: 10px;
      letter-spacing: 0.04em;
    }
  }
`;

const MoreLink = styled.button`
  background: transparent;
  border: 0;
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
  color: ${({ theme }) => theme.ink2};
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.01em;
  transition: all 0.15s ease;
  &:hover {
    color: ${({ theme }) => theme.brand};
    background: ${({ theme }) => theme.brandSoft};
  }
`;

const Gallery = styled.div`
  /* CSS columns masonry */
  column-count: 4;
  column-gap: 24px;
  @media (max-width: 1200px) {
    column-count: 3;
  }
  @media (max-width: 900px) {
    column-count: 2;
  }
  @media (max-width: 600px) {
    column-count: 1;
  }
  & > * {
    break-inside: avoid;
    margin-bottom: 24px;
    display: block;
  }
`;

const PostGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  @media (max-width: 1200px) {
    grid-template-columns: repeat(3, 1fr);
  }
  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const Empty = styled.div`
  grid-column: 1 / -1;
  text-align: center;
  padding: 96px 20px;
  color: ${({ theme }) => theme.textMuted};
  .t {
    font-size: 18px;
    font-weight: 700;
    color: ${({ theme }) => theme.text};
    margin-bottom: 8px;
  }
  .d {
    font-size: 14px;
    margin-bottom: 24px;
  }
`;

const SectionEmpty = styled.div`
  padding: 24px 0 8px;
  color: ${({ theme }) => theme.textSoft};
  font-size: 13px;
`;

const CtaRow = styled.div`
  margin-left: auto;
  display: flex;
  gap: 8px;
`;

interface CoverData {
  counts: Record<string, number>;
  covers: Record<string, string[]>;
}

function MoodboardGrid({
  items,
  coverData,
  startIndex = 0,
}: {
  items: MoodboardWithCreator[];
  coverData: CoverData | undefined;
  startIndex?: number;
}) {
  return (
    <Gallery>
      {items.map((mb, idx) => (
        <MoodboardCard
          key={mb.id}
          mb={mb}
          index={startIndex + idx}
          featured={startIndex + idx === 0}
          teamName={mb.team_name ?? undefined}
          nickname={mb.creator_nickname ?? undefined}
          nickInitial={mb.creator_nickname?.charAt(0).toUpperCase()}
          nickColor={mb.team_color ?? undefined}
          count={coverData?.counts[mb.id] ?? 0}
          coverImages={coverData?.covers[mb.id] ?? []}
        />
      ))}
    </Gallery>
  );
}

export default function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: moodboards = [], isLoading } = useMoodboards();
  const moodboardIds = useMemo(() => moodboards.map((m) => m.id), [moodboards]);
  const { data: coverData } = useMoodboardCovers(moodboardIds);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [viewerIdx, setViewerIdx] = useState<number | null>(null);

  const session = useAuthStore((s) => s.session);
  const membership = useAuthStore((s) => s.membership);
  const isAdmin =
    typeof window !== 'undefined' && !!localStorage.getItem('plc-admin-code');
  const toggleLike = useTogglePostLike();
  const deletePost = useDeletePost();

  // When a category chip is selected, fetch all posts whose moodboard is in
  // that category. Skipped when filter==='all' (we render moodboard cards).
  const categoryForPosts =
    filter === 'all' ? undefined : (filter as MoodboardCategory);
  const { data: categoryPosts = [], isLoading: postsLoading } =
    usePostsByCategory(categoryForPosts);

  const groupedByCategory = useMemo(() => {
    const groups: Record<MoodboardCategory, MoodboardWithCreator[]> = {
      activities: [],
      environment: [],
      play: [],
      inquiry: [],
      parents: [],
      annual: [],
    };
    for (const mb of moodboards) {
      const cat = (mb.category ?? 'inquiry') as MoodboardCategory;
      if (groups[cat]) groups[cat].push(mb);
    }
    return groups;
  }, [moodboards]);

  const moodboardMetaById = useMemo(() => {
    const map: Record<string, { title: string; teamName: string | null; teamColor: string | null }> = {};
    for (const mb of moodboards) {
      map[mb.id] = { title: mb.title, teamName: mb.team_name, teamColor: mb.team_color };
    }
    return map;
  }, [moodboards]);

  return (
    <Page>
      <HeroWrap>
        <HeroText>
          <h1>
            <Trans i18nKey="home.heroTitle" components={{ em: <em />, br: <br /> }} />
          </h1>
        </HeroText>
        <HeroAside>
          <span className="label">{t('home.heroLabel')}</span>
          <p className="body">
            <Trans i18nKey="home.heroSub" components={{ br: <br /> }} />
          </p>
        </HeroAside>
      </HeroWrap>

      <Toolbar>
        <FilterChips
          value={filter}
          onChange={setFilter}
          onAdd={() => setCreateOpen(true)}
          addLabel="새 무드보드 만들기"
        />
        <CtaRow>
          <Button variant="secondary" onClick={() => setCreateOpen(true)}>
            + 새 무드보드 만들기
          </Button>
          <Button onClick={() => navigate('/upload')}>{t('home.newMoodboard')}</Button>
        </CtaRow>
      </Toolbar>

      <SectionsWrap>
        {isLoading ? (
          <Empty>
            <div className="t">…</div>
          </Empty>
        ) : moodboards.length === 0 ? (
          <Empty>
            <div className="t">{t('empty.home.title')}</div>
            <div className="d">{t('empty.home.desc')}</div>
            <Button onClick={() => navigate('/upload')}>{t('empty.home.cta')}</Button>
          </Empty>
        ) : filter === 'all' ? (
          <>
            {MOODBOARD_CATEGORIES.map((cat) => {
              const items = groupedByCategory[cat];
              if (!items || items.length === 0) return null;
              const visible = items.slice(0, SECTION_PREVIEW_LIMIT);
              const hasMore = items.length > SECTION_PREVIEW_LIMIT;
              return (
                <Section key={cat}>
                  <SectionHeader>
                    <h2>
                      {t(`filter.${cat}`)}
                      <span className="count">{items.length}</span>
                    </h2>
                    {hasMore && (
                      <MoreLink type="button" onClick={() => setFilter(cat)}>
                        {t('home.more')}
                      </MoreLink>
                    )}
                  </SectionHeader>
                  <MoodboardGrid items={visible} coverData={coverData} />
                </Section>
              );
            })}
          </>
        ) : postsLoading ? (
          <SectionEmpty>…</SectionEmpty>
        ) : categoryPosts.length === 0 ? (
          <SectionEmpty>{t('empty.category')}</SectionEmpty>
        ) : (
          <Section>
            <SectionHeader>
              <h2>
                {t(`filter.${filter}`)}
                <span className="count">{categoryPosts.length}</span>
              </h2>
            </SectionHeader>
            <PostGrid>
              {categoryPosts.map((p, idx) => {
                const meta = moodboardMetaById[p.moodboard_id];
                return (
                  <PostTile
                    key={p.id}
                    post={p}
                    index={idx}
                    onClick={() => setViewerIdx(idx)}
                    teamName={meta?.teamName ?? undefined}
                    authorColor={meta?.teamColor ?? undefined}
                    onTeamClick={() => navigate('/teamboard')}
                    onToggleLike={(id) => toggleLike.mutate(id)}
                  />
                );
              })}
            </PostGrid>
          </Section>
        )}
      </SectionsWrap>

      {createOpen && (
        <CreateMoodboardModal onClose={() => setCreateOpen(false)} />
      )}

      {viewerIdx !== null && (
        <Viewer
          posts={categoryPosts}
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
