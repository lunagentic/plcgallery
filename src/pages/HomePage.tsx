import styled from '@emotion/styled';
import { Trans, useTranslation } from 'react-i18next';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMoodboards } from '@/hooks/useMoodboards';
import {
  useAllVisiblePosts,
  usePostsByCategory,
  useFeaturedPosts,
  useTogglePostLike,
  useDeletePost,
  useUpdatePost,
  useSetPostFeatured,
  useMyLikedPostIds,
  type PostWithAuthor,
} from '@/hooks/usePosts';
import { useUIStore } from '@/store/uiStore';
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

/** Admin-curated highlights, pinned above the category sections. Rendered
 *  without a heading — the picks surface as a clean band at the top of the
 *  feed, with just a divider separating them from the category sections. */
const FeaturedSection = styled.section`
  padding: 8px 0 28px;
  margin-bottom: 16px;
  border-bottom: 1px solid ${({ theme }) => theme.border};
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

export default function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: moodboards = [], isLoading: moodboardsLoading } = useMoodboards();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [createOpen, setCreateOpen] = useState(false);
  // Track which list the viewer is browsing — by category section in the
  // 'all' view, or by the active filter in the chip view. Storing the key
  // (not the list itself) lets the viewer auto-refresh when the underlying
  // query refetches (e.g. after a like or delete).
  const [viewer, setViewer] = useState<
    { source: 'category-section'; cat: MoodboardCategory; idx: number }
    | { source: 'category-filter'; idx: number }
    | { source: 'featured'; idx: number }
    | null
  >(null);

  const session = useAuthStore((s) => s.session);
  const membership = useAuthStore((s) => s.membership);
  const isAdmin =
    typeof window !== 'undefined' && !!localStorage.getItem('plc-admin-code');
  const toggleLike = useTogglePostLike();
  const deletePost = useDeletePost();
  const updatePost = useUpdatePost();
  const setFeatured = useSetPostFeatured();
  const showToast = useUIStore((s) => s.showToast);
  const { data: likedPostIds } = useMyLikedPostIds();
  const { data: featuredPosts = [] } = useFeaturedPosts();

  const moodboardMetaById = useMemo(() => {
    const map: Record<
      string,
      { title: string; category: MoodboardCategory; teamName: string | null; teamColor: string | null }
    > = {};
    for (const mb of moodboards) {
      map[mb.id] = {
        title: mb.title,
        category: (mb.category ?? 'inquiry') as MoodboardCategory,
        teamName: mb.team_name,
        teamColor: mb.team_color,
      };
    }
    return map;
  }, [moodboards]);

  // 'all' view: every visible post grouped by its moodboard's category.
  const { data: allPosts = [], isLoading: allPostsLoading } = useAllVisiblePosts();
  const postsByCategory = useMemo(() => {
    const groups: Record<MoodboardCategory, PostWithAuthor[]> = {
      activities: [],
      environment: [],
      play: [],
      inquiry: [],
      parents: [],
      annual: [],
    };
    for (const p of allPosts) {
      const cat = moodboardMetaById[p.moodboard_id]?.category;
      if (cat && groups[cat]) groups[cat].push(p);
    }
    return groups;
  }, [allPosts, moodboardMetaById]);

  // Category-filter view: posts of a single category.
  const categoryForPosts =
    filter === 'all' ? undefined : (filter as MoodboardCategory);
  const { data: categoryPosts = [], isLoading: postsLoading } =
    usePostsByCategory(categoryForPosts);

  const isLoading = moodboardsLoading || (filter === 'all' ? allPostsLoading : postsLoading);

  const ownTeamId = useAuthStore((s) => s.team?.id);

  /** Render one PostTile with home-page wiring.
   *  Team name comes from the POST's owning team (post.team_id), not the
   *  moodboard's team — users can post to other teams' public moodboards. */
  const renderTile = (
    p: PostWithAuthor,
    idx: number,
    open: () => void,
  ) => {
    const isOwnTeam = !!ownTeamId && p.team_id === ownTeamId;
    return (
      <PostTile
        key={p.id}
        post={p}
        index={idx}
        onClick={open}
        teamName={p.team_name ?? undefined}
        authorColor={p.team_color ?? undefined}
        onTeamClick={isOwnTeam ? () => navigate('/teamboard') : undefined}
        onToggleLike={(id) => toggleLike.mutate(id)}
        isAdmin={isAdmin}
        featured={p.is_featured}
        featurePending={setFeatured.isPending}
        onToggleFeatured={
          isAdmin
            ? (id, next) =>
                setFeatured
                  .mutateAsync({ postId: id, featured: next })
                  .then(() =>
                    showToast(next ? '메인에 노출했어요' : '메인에서 내렸어요'),
                  )
                  .catch((e) =>
                    showToast((e as Error).message ?? '처리 실패', 'error'),
                  )
            : undefined
        }
      />
    );
  };

  // Derive the live viewer list from current query data, keyed by
  // viewer.source so likes/deletes refresh the viewer in place.
  const viewerPosts: PostWithAuthor[] = !viewer
    ? []
    : viewer.source === 'category-section'
      ? postsByCategory[viewer.cat] ?? []
      : viewer.source === 'featured'
        ? featuredPosts
        : categoryPosts;

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
        ) : allPosts.length === 0 && filter === 'all' ? (
          <Empty>
            <div className="t">{t('empty.home.title')}</div>
            <div className="d">{t('empty.home.desc')}</div>
            <Button onClick={() => navigate('/upload')}>{t('empty.home.cta')}</Button>
          </Empty>
        ) : filter === 'all' ? (
          <>
            {/* Admin-curated highlights, pinned above the feed. The
                "메인 추천" label is intentionally hidden — the picks just
                surface at the top as a clean, unlabeled band. */}
            {featuredPosts.length > 0 && (
              <FeaturedSection>
                <PostGrid>
                  {featuredPosts.map((p, idx) =>
                    renderTile(p, idx, () =>
                      setViewer({ source: 'featured', idx }),
                    ),
                  )}
                </PostGrid>
              </FeaturedSection>
            )}
            {MOODBOARD_CATEGORIES.map((cat) => {
              const items = postsByCategory[cat];
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
                  <PostGrid>
                    {visible.map((p, idx) =>
                      renderTile(p, idx, () =>
                        setViewer({ source: 'category-section', cat, idx }),
                      ),
                    )}
                  </PostGrid>
                </Section>
              );
            })}
          </>
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
              {categoryPosts.map((p, idx) =>
                renderTile(p, idx, () =>
                  setViewer({ source: 'category-filter', idx }),
                ),
              )}
            </PostGrid>
          </Section>
        )}
      </SectionsWrap>

      {createOpen && (
        <CreateMoodboardModal onClose={() => setCreateOpen(false)} />
      )}

      {viewer && viewerPosts.length > 0 && (
        <Viewer
          posts={viewerPosts}
          index={Math.min(viewer.idx, viewerPosts.length - 1)}
          onIndexChange={(idx) => setViewer({ ...viewer, idx })}
          onClose={() => setViewer(null)}
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
