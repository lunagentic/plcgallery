import styled from '@emotion/styled';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useCreatePostBundle } from '@/hooks/usePosts';
import { useMoodboards } from '@/hooks/useMoodboards';
import { Button } from '@/components/ui/Button';
import { Label, Field, FieldHint } from '@/components/ui/Input';
import { SlashInput, SlashTextarea } from '@/components/SlashMenu';
import { buildGroupsForCategory } from '@/components/SlashMenu/commands';
import { TagInput } from '@/components/TagInput';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { MOODBOARD_CATEGORIES, type MoodboardCategory } from '@/types/database';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

interface FileEntry {
  id: string;
  file: File;
  previewUrl: string;
}

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px 96px;
`;

const Head = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  gap: 12px;
  .crumb {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: ${({ theme }) => theme.textMuted};
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 32px;
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const DropZone = styled.label<{ hasFiles: boolean; isDragging: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2px dashed
    ${({ theme, isDragging }) => (isDragging ? theme.brand : theme.border)};
  border-radius: 16px;
  padding: 32px 20px;
  min-height: ${({ hasFiles }) => (hasFiles ? '120px' : '320px')};
  cursor: pointer;
  background: ${({ theme, isDragging }) => (isDragging ? theme.brandSoft : 'transparent')};
  transition: all 0.2s ease;
  text-align: center;
  &:hover {
    border-color: ${({ theme }) => theme.brand};
  }
  input {
    display: none;
  }
  .t {
    font-size: 14px;
    font-weight: 700;
    margin-top: 10px;
  }
  .s {
    font-size: 12px;
    color: ${({ theme }) => theme.textMuted};
    margin-top: 4px;
    line-height: 1.5;
  }
  .plus {
    font-size: 28px;
    color: ${({ theme }) => theme.textSoft};
  }
`;

const PreviewGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
  margin-top: 16px;
`;

const PreviewItem = styled.div`
  position: relative;
  aspect-ratio: 1 / 1;
  border-radius: 12px;
  overflow: hidden;
  background: ${({ theme }) => theme.surface};
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
`;

const RemoveBtn = styled.button`
  position: absolute;
  top: 6px;
  right: 6px;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  font-size: 13px;
  display: grid;
  place-items: center;
  &:hover {
    background: rgba(0, 0, 0, 0.9);
  }
`;

const IndexBadge = styled.span`
  position: absolute;
  bottom: 6px;
  left: 6px;
  background: rgba(255, 255, 255, 0.9);
  color: #1a1714;
  border-radius: 999px;
  padding: 3px 8px;
  font-size: 10px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
`;

const SizeBadge = styled.span<{ over: boolean }>`
  position: absolute;
  bottom: 6px;
  right: 6px;
  border-radius: 999px;
  padding: 3px 8px;
  font-size: 10px;
  font-weight: 600;
  background: ${({ over }) => (over ? 'rgba(224,69,69,0.92)' : 'rgba(0,0,0,0.6)')};
  color: #fff;
`;

const MetaBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  margin-bottom: 4px;
  font-size: 12px;
  color: ${({ theme }) => theme.textMuted};
  .clear {
    cursor: pointer;
    color: ${({ theme }) => theme.textSoft};
    font-size: 11px;
    &:hover {
      color: ${({ theme }) => theme.text};
    }
  }
`;

const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const MoodChip = styled.button<{ selected: boolean; disabled?: boolean }>`
  padding: 8px 14px;
  border-radius: 999px;
  border: 1.5px solid
    ${({ selected, theme }) => (selected ? theme.brand : theme.border)};
  background: ${({ selected, theme }) =>
    selected ? theme.brand : 'transparent'};
  color: ${({ selected, theme, disabled }) =>
    disabled ? theme.textSoft : selected ? theme.ctaText : theme.ink};
  font-size: 13px;
  font-weight: 600;
  cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ disabled }) => (disabled ? 0.55 : 1)};
  transition: all 0.15s ease;
  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.brand};
  }
`;

const SuggLabel = styled.div`
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.textSoft};
  margin: 8px 0 6px;
`;

const TitleChip = styled.button`
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.border};
  background: ${({ theme }) => theme.surface};
  color: ${({ theme }) => theme.textMuted};
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  &:hover {
    color: ${({ theme }) => theme.text};
    border-color: ${({ theme }) => theme.brand};
    background: ${({ theme }) => theme.brandSoft};
  }
`;

const RecentChip = styled(TitleChip)`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: inherit;
  .x {
    width: 14px;
    height: 14px;
    border-radius: 999px;
    display: grid;
    place-items: center;
    font-size: 9px;
    color: ${({ theme }) => theme.textSoft};
    cursor: pointer;
    &:hover {
      background: ${({ theme }) => theme.surface2};
      color: ${({ theme }) => theme.text};
    }
  }
`;

const ProgressBar = styled.div`
  height: 4px;
  background: ${({ theme }) => theme.surface};
  border-radius: 999px;
  overflow: hidden;
  margin-top: 12px;
`;

const ProgressFill = styled.div<{ pct: number }>`
  height: 100%;
  width: ${({ pct }) => pct}%;
  background: ${({ theme }) => theme.brand};
  transition: width 0.3s ease;
`;

const TAG_SUGGESTIONS = ['수업', '환경', '놀이', '탐구', '부모', '스토리북', 'AI', '아이디어'];

const TITLE_SUGGESTIONS = [
  '컬러링 만들기',
  '포스터 만들기',
  '게임 자료 만들기',
  '활동자료 만들기',
  '유초이음',
  '프로젝트 준비하기',
  '우리반 맞춤 스토리북',
  '행사 준비',
];

const PLACEHOLDER_ROTATE_MS = 2500;

const RECENT_TITLES_MAX = 5;
const RECENT_CATEGORY_KEY = 'plc-recent-mb-category';

const recentTitlesKey = (userId: string | undefined) =>
  `plc-recent-titles${userId ? `-${userId}` : ''}`;

function readRecentTitles(userId: string | undefined): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(recentTitlesKey(userId));
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function pushRecentTitle(userId: string | undefined, title: string): string[] {
  const next = [title, ...readRecentTitles(userId).filter((t) => t !== title)].slice(
    0,
    RECENT_TITLES_MAX,
  );
  try {
    localStorage.setItem(recentTitlesKey(userId), JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

function readRecentCategory(): MoodboardCategory | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(RECENT_CATEGORY_KEY);
  if (!raw) return null;
  return MOODBOARD_CATEGORIES.includes(raw as MoodboardCategory)
    ? (raw as MoodboardCategory)
    : null;
}

export default function UploadPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { moodboardId: paramMbId } = useParams<{ moodboardId?: string }>();
  const { data: moodboards = [] } = useMoodboards();
  const showToast = useUIStore((s) => s.showToast);
  const createBundle = useCreatePostBundle();

  const session = useAuthStore((s) => s.session);
  const userId = session?.user.id;

  const [moodboardId, setMoodboardId] = useState(paramMbId ?? '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [progress, setProgress] = useState<{ completed: number; total: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [recentTitles, setRecentTitles] = useState<string[]>(() =>
    readRecentTitles(userId),
  );
  const [placeholderIdx, setPlaceholderIdx] = useState(0);

  // Cycle the title placeholder through the suggestion list while the input
  // is empty. Pauses once the user starts typing — the value check inside the
  // tick keeps the interval cheap to leave running.
  useEffect(() => {
    if (title) return;
    const id = window.setInterval(
      () => setPlaceholderIdx((i) => (i + 1) % TITLE_SUGGESTIONS.length),
      PLACEHOLDER_ROTATE_MS,
    );
    return () => window.clearInterval(id);
  }, [title]);

  const titlePlaceholder = `예: ${TITLE_SUGGESTIONS[placeholderIdx]}`;

  // When auth resolves later, refresh the per-user recent list.
  useEffect(() => {
    setRecentTitles(readRecentTitles(userId));
  }, [userId]);

  // Pre-select only when navigated with /upload/:moodboardId. Otherwise prefer
  // the most-recently-used category, falling back to the first available.
  useEffect(() => {
    if (paramMbId && !moodboardId) setMoodboardId(paramMbId);
  }, [paramMbId, moodboardId]);

  useEffect(() => () => {
    files.forEach((f) => URL.revokeObjectURL(f.previewUrl));
  }, [files]);

  const totalBytes = useMemo(() => files.reduce((a, f) => a + f.file.size, 0), [files]);
  const hasOverSized = files.some((f) => f.file.size > MAX_FILE_BYTES);

  const moodboardsByCategory = useMemo(() => {
    const groups: Record<MoodboardCategory, typeof moodboards> = {
      activities: [],
      environment: [],
      play: [],
      inquiry: [],
      parents: [],
      annual: [],
    };
    for (const m of moodboards) {
      const cat = (m.category ?? 'inquiry') as MoodboardCategory;
      if (groups[cat]) groups[cat].push(m);
    }
    return groups;
  }, [moodboards]);

  // Pick the canonical (first) moodboard for each category — that's the
  // one we upload to when the user taps a category chip. Categories with
  // no moodboards stay disabled.
  const defaultMoodboardByCategory = useMemo(() => {
    const map = {} as Partial<Record<MoodboardCategory, string>>;
    for (const cat of MOODBOARD_CATEGORIES) {
      const first = moodboardsByCategory[cat]?.[0];
      if (first) map[cat] = first.id;
    }
    return map;
  }, [moodboardsByCategory]);

  const selectedCategory: MoodboardCategory | undefined = useMemo(() => {
    if (!moodboardId) return undefined;
    const mb = moodboards.find((m) => m.id === moodboardId);
    return (mb?.category ?? undefined) as MoodboardCategory | undefined;
  }, [moodboardId, moodboards]);

  // Auto-select recent category (or first available) once moodboards arrive.
  useEffect(() => {
    if (moodboardId || moodboards.length === 0) return;
    const recent = readRecentCategory();
    const picked =
      (recent && defaultMoodboardByCategory[recent]) ??
      MOODBOARD_CATEGORIES.map((c) => defaultMoodboardByCategory[c]).find(Boolean);
    if (picked) setMoodboardId(picked);
  }, [moodboards, moodboardId, defaultMoodboardByCategory]);

  const slashGroups = useMemo(
    () => buildGroupsForCategory(selectedCategory),
    [selectedCategory],
  );

  const pickCategory = (cat: MoodboardCategory) => {
    const id = defaultMoodboardByCategory[cat];
    if (!id) return;
    setMoodboardId(id);
    try {
      localStorage.setItem(RECENT_CATEGORY_KEY, cat);
    } catch {
      /* ignore */
    }
  };

  const dropRecentTitle = (s: string) => {
    const next = recentTitles.filter((t) => t !== s);
    try {
      localStorage.setItem(recentTitlesKey(userId), JSON.stringify(next));
    } catch {
      /* ignore */
    }
    setRecentTitles(next);
  };

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const accepted: FileEntry[] = [];
    const rejected: string[] = [];
    for (const file of Array.from(list)) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        rejected.push(`${file.name} (형식)`);
        continue;
      }
      accepted.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }
    setFiles((prev) => [...prev, ...accepted]);
    if (rejected.length) {
      showToast(`건너뜀: ${rejected.join(', ')}`, 'error');
    }
  };

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const out = prev.filter((f) => f.id !== id);
      const gone = prev.find((f) => f.id === id);
      if (gone) URL.revokeObjectURL(gone.previewUrl);
      return out;
    });
  };

  const clearAll = () => {
    files.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    setFiles([]);
  };

  const submit = async () => {
    if (!title.trim()) {
      showToast(t('toast.titleRequired'), 'error');
      return;
    }
    if (files.length === 0) {
      showToast(t('toast.imageRequired'), 'error');
      return;
    }
    if (hasOverSized) {
      showToast('10MB를 초과하는 파일이 있어요', 'error');
      return;
    }
    if (!moodboardId) {
      showToast(t('mb_modal.err_no_name'), 'error');
      return;
    }
    try {
      setProgress({ completed: 0, total: files.length });
      await createBundle.mutateAsync({
        moodboardId,
        title: title.trim(),
        description: description.trim() || undefined,
        postType: 'custom',
        tags,
        imageFiles: files.map((f) => f.file),
        onProgress: (completed, total) => setProgress({ completed, total }),
      });
      setRecentTitles(pushRecentTitle(userId, title.trim()));
      showToast(
        files.length > 1
          ? `${files.length}장이 한 게시물로 묶였어요`
          : t('toast.saved'),
      );
      nav(`/moodboards/${moodboardId}`);
    } catch (e) {
      setProgress(null);
      showToast((e as Error).message ?? 'Error', 'error');
    }
  };

  const pct = progress ? Math.round((progress.completed / progress.total) * 100) : 0;

  return (
    <Container>
      <Head>
        <div className="crumb">{t('upload.crumb')}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" size="sm" onClick={() => nav(-1)}>
            {t('upload.cancel')}
          </Button>
          <Button
            onClick={submit}
            disabled={createBundle.isPending || files.length === 0 || !moodboardId}
          >
            {createBundle.isPending && progress
              ? `${progress.completed}/${progress.total} 업로드 중...`
              : files.length > 1
                ? `${files.length}장 한 게시물로 저장`
                : t('upload.save')}
          </Button>
        </div>
      </Head>

      <Grid>
        <div>
          <DropZone
            hasFiles={files.length > 0}
            isDragging={isDragging}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              addFiles(e.dataTransfer.files);
            }}
          >
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = '';
              }}
            />
            {files.length === 0 ? (
              <>
                <div className="plus">＋</div>
                <div className="t">{t('upload.imageTitle')}</div>
                <div className="s">
                  클릭하거나 여러 장을 한 번에 드래그하세요
                  <br />
                  PNG, JPG, WEBP · 장당 최대 10MB
                </div>
              </>
            ) : (
              <>
                <div className="plus">＋</div>
                <div className="t">이미지 추가</div>
                <div className="s">
                  현재 {files.length}장 선택됨 · {(totalBytes / (1024 * 1024)).toFixed(1)}MB
                </div>
              </>
            )}
          </DropZone>

          {files.length > 0 && (
            <>
              <MetaBar>
                <span>
                  {files.length}장 · {(totalBytes / (1024 * 1024)).toFixed(1)}MB{' '}
                  {hasOverSized && <strong style={{ color: '#E04545' }}>· 초과 파일 있음</strong>}
                </span>
                <button className="clear" onClick={clearAll} type="button">
                  전체 삭제
                </button>
              </MetaBar>
              <PreviewGrid>
                {files.map((f, idx) => {
                  const mb = (f.file.size / (1024 * 1024)).toFixed(1);
                  const over = f.file.size > MAX_FILE_BYTES;
                  return (
                    <PreviewItem key={f.id}>
                      <img src={f.previewUrl} alt={f.file.name} />
                      <IndexBadge>
                        {idx === 0 ? '커버' : String(idx + 1).padStart(2, '0')}
                      </IndexBadge>
                      <SizeBadge over={over}>{mb}MB</SizeBadge>
                      <RemoveBtn
                        onClick={() => removeFile(f.id)}
                        type="button"
                        aria-label="Remove"
                      >
                        ✕
                      </RemoveBtn>
                    </PreviewItem>
                  );
                })}
              </PreviewGrid>
              {progress && (
                <ProgressBar>
                  <ProgressFill pct={pct} />
                </ProgressBar>
              )}
            </>
          )}
        </div>

        <div>
          <Field>
            <Label>무드보드 선택</Label>
            <ChipRow>
              {MOODBOARD_CATEGORIES.map((cat) => {
                const id = defaultMoodboardByCategory[cat];
                const isSelected = !!id && moodboardId === id;
                const isDisabled = !id;
                return (
                  <MoodChip
                    key={cat}
                    type="button"
                    selected={isSelected}
                    disabled={isDisabled}
                    onClick={() => pickCategory(cat)}
                    title={isDisabled ? '이 카테고리에는 무드보드가 없어요' : undefined}
                  >
                    {t(`filter.${cat}`)}
                  </MoodChip>
                );
              })}
              <MoodChip
                type="button"
                selected={false}
                disabled
                title="서비스 준비중"
              >
                + 직접 생성
              </MoodChip>
            </ChipRow>
            <FieldHint>최근 사용한 무드보드가 자동으로 선택돼요. 직접 생성은 준비중이에요.</FieldHint>
          </Field>
          <Field>
            <Label>제목</Label>
            <SlashInput
              value={title}
              onChange={setTitle}
              placeholder={titlePlaceholder}
            />
            {recentTitles.length > 0 && (
              <>
                <SuggLabel>최근 입력어</SuggLabel>
                <ChipRow>
                  {recentTitles.map((s) => (
                    <RecentChip
                      key={`recent-${s}`}
                      type="button"
                      onClick={() => setTitle(s)}
                    >
                      <span>{s}</span>
                      <span
                        className="x"
                        role="button"
                        aria-label="삭제"
                        onClick={(e) => {
                          e.stopPropagation();
                          dropRecentTitle(s);
                        }}
                      >
                        ✕
                      </span>
                    </RecentChip>
                  ))}
                </ChipRow>
              </>
            )}
            <FieldHint>
              <kbd>/</kbd> 입력 시 카테고리·템플릿 빠른 삽입
              {files.length > 1 && ` · ${files.length}장이 하나의 게시물로 묶입니다`}
            </FieldHint>
          </Field>
          <Field>
            <Label>내용</Label>
            <SlashTextarea
              value={description}
              onChange={setDescription}
              placeholder={t('upload.descPh')}
              groups={slashGroups}
            />
            <FieldHint>
              <kbd>/</kbd> 입력 시{' '}
              {selectedCategory ? `${t(`filter.${selectedCategory}`)} 예시 문구가 먼저 ` : ''}
              나타나요
            </FieldHint>
          </Field>
          <Field>
            <Label>태그</Label>
            <TagInput value={tags} onChange={setTags} suggestions={TAG_SUGGESTIONS} />
          </Field>
        </div>
      </Grid>
    </Container>
  );
}
