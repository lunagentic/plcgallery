import styled from '@emotion/styled';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useCreatePostBundle } from '@/hooks/usePosts';
import {
  useMoodboards,
  useEnsureTeamDefaultMoodboard,
} from '@/hooks/useMoodboards';
import { Button } from '@/components/ui/Button';
import { Label, Field, FieldHint } from '@/components/ui/Input';
import { SlashInput, SlashTextarea } from '@/components/SlashMenu';
import { buildGroupsForCategory } from '@/components/SlashMenu/commands';
import { TagInput } from '@/components/TagInput';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { MOODBOARD_CATEGORIES, type MoodboardCategory } from '@/types/database';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const ACCEPTED_INPUT_ATTR =
  'image/png,image/jpeg,image/webp,application/pdf,.pdf';

function isPdfFile(file: File): boolean {
  return (
    file.type === 'application/pdf' ||
    file.name.toLowerCase().endsWith('.pdf')
  );
}

interface FileEntry {
  id: string;
  file: File;
  /** Object URL — for images this powers <img>, for PDFs we just keep it
   *  around so the preview tile can link to the file if needed. */
  previewUrl: string;
  kind: 'image' | 'pdf';
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

const PdfPreview = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: linear-gradient(135deg, #fff5e6, #ffe1c2);
  color: #5a3211;
  text-align: center;
  .badge {
    font-family: 'Fraunces', serif;
    font-style: italic;
    font-weight: 700;
    font-size: 22px;
    letter-spacing: 0.04em;
    padding: 4px 14px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.7);
    border: 1px solid rgba(90, 50, 17, 0.2);
  }
  .name {
    font-size: 11px;
    font-weight: 600;
    line-height: 1.3;
    word-break: break-all;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    opacity: 0.85;
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
  const ensureBoard = useEnsureTeamDefaultMoodboard();

  const session = useAuthStore((s) => s.session);
  const team = useAuthStore((s) => s.team);
  const userId = session?.user.id;
  const teamId = team?.id;

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

  // Each chip should land posts in the CALLING TEAM's own board for that
  // category — not some other team's public board. So the picker is built
  // from `moodboards` filtered to the current team only. Missing categories
  // are still clickable; we'll lazily ensure-create on click.
  const myTeamMoodboardByCategory = useMemo(() => {
    const map = {} as Partial<Record<MoodboardCategory, string>>;
    if (!teamId) return map;
    for (const m of moodboards) {
      if (m.team_id !== teamId || !m.is_visible) continue;
      const cat = (m.category ?? 'inquiry') as MoodboardCategory;
      if (!map[cat]) map[cat] = m.id;
    }
    return map;
  }, [moodboards, teamId]);

  const selectedCategory: MoodboardCategory | undefined = useMemo(() => {
    if (!moodboardId) return undefined;
    const mb = moodboards.find((m) => m.id === moodboardId);
    return (mb?.category ?? undefined) as MoodboardCategory | undefined;
  }, [moodboardId, moodboards]);

  // Auto-select on mount: prefer the recently-used category. If the user
  // has never uploaded, pick whichever category their team has a board for
  // (or none — pickCategory will create one on first click).
  useEffect(() => {
    if (moodboardId) return;
    const recent = readRecentCategory();
    const picked =
      (recent && myTeamMoodboardByCategory[recent]) ??
      MOODBOARD_CATEGORIES.map((c) => myTeamMoodboardByCategory[c]).find(Boolean);
    if (picked) setMoodboardId(picked);
  }, [moodboardId, myTeamMoodboardByCategory]);

  const slashGroups = useMemo(
    () => buildGroupsForCategory(selectedCategory),
    [selectedCategory],
  );

  const pickCategory = async (cat: MoodboardCategory) => {
    if (!teamId) {
      showToast('팀에 들어와야 업로드할 수 있어요', 'error');
      return;
    }
    const existing = myTeamMoodboardByCategory[cat];
    if (existing) {
      setMoodboardId(existing);
    } else {
      try {
        // Lazy-create the team's board for this category on first use so the
        // user never lands posts in another team's board by accident.
        const newId = await ensureBoard.mutateAsync(cat);
        setMoodboardId(newId);
      } catch (e) {
        showToast((e as Error).message ?? '보드를 준비하지 못했어요', 'error');
        return;
      }
    }
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

  const addFiles = (list: FileList | File[] | null) => {
    if (!list) return;
    const accepted: FileEntry[] = [];
    const rejected: string[] = [];
    const items = list instanceof FileList ? Array.from(list) : list;
    for (const file of items) {
      const pdf = isPdfFile(file);
      const allowed = pdf || ACCEPTED_IMAGE_TYPES.includes(file.type);
      if (!allowed) {
        rejected.push(`${file.name || '(이름 없음)'} (형식)`);
        continue;
      }
      accepted.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        kind: pdf ? 'pdf' : 'image',
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

  // Keep the latest addFiles in a ref so the document-level paste listener
  // doesn't re-bind on every render but still uses the freshest closure.
  const addFilesRef = useRef(addFiles);
  addFilesRef.current = addFiles;

  /**
   * Document-level Cmd/Ctrl+V handler. We grab any image or PDF blobs from
   * the clipboard and route them through the same addFiles pipeline as the
   * picker / drop zone. If the clipboard only carries text we don't touch the
   * event, so pasting text into title / description / textarea still works.
   */
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const picked: File[] = [];
      for (const item of Array.from(items)) {
        if (item.kind !== 'file') continue;
        const f = item.getAsFile();
        if (!f) continue;
        if (f.type.startsWith('image/') || isPdfFile(f)) picked.push(f);
      }
      if (picked.length === 0) return;
      e.preventDefault();
      addFilesRef.current(picked);
      showToast(`클립보드에서 ${picked.length}개 추가`);
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [showToast]);

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
              accept={ACCEPTED_INPUT_ATTR}
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
                  클릭 · 드래그 · 붙여넣기(⌘/Ctrl+V) 모두 OK
                  <br />
                  PNG, JPG, WEBP, PDF · 파일당 최대 10MB
                </div>
              </>
            ) : (
              <>
                <div className="plus">＋</div>
                <div className="t">파일 추가</div>
                <div className="s">
                  현재 {files.length}개 선택됨 · {(totalBytes / (1024 * 1024)).toFixed(1)}MB
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
                      {f.kind === 'pdf' ? (
                        <PdfPreview title={f.file.name}>
                          <span className="badge">PDF</span>
                          <span className="name">{f.file.name}</span>
                        </PdfPreview>
                      ) : (
                        <img src={f.previewUrl} alt={f.file.name} />
                      )}
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
                // The chip is selected when the active moodboard belongs to
                // THIS team for THIS category. We never light up a chip just
                // because some other team has a public board for the cat.
                const myId = myTeamMoodboardByCategory[cat];
                const isSelected = !!myId && moodboardId === myId;
                // Chips remain enabled even if my team has no board yet —
                // pickCategory() will create one on click via the RPC.
                const isPending =
                  ensureBoard.isPending && ensureBoard.variables === cat;
                return (
                  <MoodChip
                    key={cat}
                    type="button"
                    selected={isSelected}
                    disabled={!teamId || isPending}
                    onClick={() => pickCategory(cat)}
                    title={
                      !teamId
                        ? '팀에 들어와야 업로드할 수 있어요'
                        : myId
                          ? '내 팀 보드'
                          : '클릭하면 내 팀 보드를 만들어드려요'
                    }
                  >
                    {t(`filter.${cat}`)}
                    {isPending ? ' …' : ''}
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
