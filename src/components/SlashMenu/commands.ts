import type { SlashGroup, SlashItem } from './types';
import type { MoodboardCategory } from '@/types/database';

/** Returns YYYY.MM.DD in user's locale (Korean dotted style). */
function today(): string {
  const d = new Date();
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}.${mm}.${dd}`;
}

function thisWeekRange(): string {
  const d = new Date();
  const day = d.getDay() || 7; // Mon=1..Sun=7
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day - 1));
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  const fmt = (x: Date) => `${x.getMonth() + 1}/${x.getDate()}`;
  return `${fmt(monday)} ~ ${fmt(friday)}`;
}

/** Standard slash commands shared across upload / description fields. */
export const SLASH_GROUPS: SlashGroup[] = [
  {
    id: 'origin',
    label: '제작 출처',
    items: [
      {
        id: 'origin-play-plan',
        label: '놀이계획',
        icon: '📋',
        description: '킨더보드 놀이계획에서',
        insert: '킨더보드 놀이계획에서 만들었어요.',
        keywords: ['play', 'plan'],
      },
      {
        id: 'origin-play-record',
        label: '놀이기록',
        icon: '🎲',
        description: '킨더보드 놀이기록으로',
        insert: '킨더보드 놀이기록으로 만들었어요.',
        keywords: ['play', 'record'],
      },
      {
        id: 'origin-ai-sentence',
        label: 'AI 문장',
        icon: '✍️',
        description: '킨더보드 AI 문장으로',
        insert: '킨더보드 AI 문장으로 만들었어요.',
        keywords: ['ai', 'sentence'],
      },
      {
        id: 'origin-ai-studio',
        label: 'AI비서 스튜디오',
        icon: '🎨',
        description: 'AI비서의 스튜디오에서',
        insert: 'AI비서의 스튜디오에서 만들었어요.',
        keywords: ['ai', 'studio'],
      },
      {
        id: 'origin-ai-stories',
        label: '아이들 이야기',
        icon: '🧒',
        description: 'AI비서에서 아이들의 이야기 모음',
        insert: 'AI비서에서 아이들의 이야기를 모아 만들었어요.',
        keywords: ['ai', 'kids', 'stories'],
      },
      {
        id: 'origin-ai-storybook',
        label: 'AI비서 스토리북',
        icon: '📖',
        description: 'AI비서의 스토리북에서',
        insert: 'AI비서의 스토리북에서 만들었어요.',
        keywords: ['ai', 'storybook'],
      },
      {
        id: 'origin-observe',
        label: '관찰기록',
        icon: '🔎',
        description: '킨더보드 관찰기록으로',
        insert: '킨더보드 관찰기록으로 만들었어요.',
        keywords: ['observe', 'record'],
      },
    ],
  },
  {
    id: 'template',
    label: '템플릿',
    items: [
      {
        id: 'tpl-activity',
        label: '활동 기록',
        description: '주제 · 아이들 반응 · 다음 계획',
        icon: '📝',
        insert: '오늘은 |에 대해 활동했어요.\n· 아이들 반응: \n· 다음 활동 계획: ',
        cursorMarker: true,
        keywords: ['activity', 'record'],
      },
      {
        id: 'tpl-env',
        label: '환경 구성',
        description: '공간 · 재료 · 효과',
        icon: '🪴',
        insert: '[환경] |\n· 사용한 재료: \n· 학습 효과: ',
        cursorMarker: true,
      },
      {
        id: 'tpl-play',
        label: '놀이 기록',
        description: '주제 · 참여 · 관찰',
        icon: '🧸',
        insert: '[놀이] |\n· 참여 인원: \n· 관찰한 점: ',
        cursorMarker: true,
      },
      {
        id: 'tpl-parent',
        label: '부모 안내문',
        description: '안내 · 일정 · 준비물',
        icon: '✉️',
        insert: '안녕하세요, 학부모님.\n오늘은 |.\n· 다음 일정: \n· 준비물: ',
        cursorMarker: true,
      },
      {
        id: 'tpl-story',
        label: '스토리북 한 컷',
        description: '장면 · 등장인물 · 한 줄',
        icon: '🎨',
        insert: '장면: |\n등장: \n한 줄: ',
        cursorMarker: true,
      },
    ],
  },
  {
    id: 'tone',
    label: 'AI 스타일',
    items: [
      { id: 'tone-water', label: '따뜻한 수채화', icon: '🎨', insert: '따뜻한 수채화 스타일로 그려줘', keywords: ['watercolor'] },
      { id: 'tone-pastel', label: '파스텔톤', icon: '🌈', insert: '파스텔톤의 부드러운 색감으로 그려줘' },
      { id: 'tone-line', label: '선화/일러스트', icon: '✏️', insert: '깔끔한 선화 일러스트 스타일로 그려줘' },
      { id: 'tone-kids', label: '아이들 그림', icon: '🖍️', insert: '아이들이 직접 그린 듯한 따뜻한 느낌으로' },
      { id: 'tone-photo', label: '사진 스타일', icon: '📷', insert: '실사 사진 스타일, 자연광에서' },
      { id: 'tone-cute', label: '귀여운 캐릭터', icon: '🐻', insert: '귀여운 캐릭터 일러스트로' },
    ],
  },
  {
    id: 'date',
    label: '날짜 · 시간',
    items: [
      { id: 'date-today', label: '오늘 날짜', icon: '📅', insert: today, description: today() },
      { id: 'date-week', label: '이번 주 (월~금)', icon: '🗓️', insert: thisWeekRange, description: thisWeekRange() },
    ],
  },
  {
    id: 'emoji',
    label: '자주 쓰는 이모지',
    items: [
      { id: 'em-seed', label: '새싹', icon: '🌱', insert: '🌱 ' },
      { id: 'em-sun', label: '햇살', icon: '☀️', insert: '☀️ ' },
      { id: 'em-art', label: '그림', icon: '🎨', insert: '🎨 ' },
      { id: 'em-book', label: '책', icon: '📚', insert: '📚 ' },
      { id: 'em-leaf', label: '나뭇잎', icon: '🍃', insert: '🍃 ' },
      { id: 'em-star', label: '별', icon: '⭐', insert: '⭐ ' },
      { id: 'em-heart', label: '하트', icon: '💛', insert: '💛 ' },
      { id: 'em-flag', label: '깃발', icon: '🚩', insert: '🚩 ' },
      { id: 'em-rainbow', label: '무지개', icon: '🌈', insert: '🌈 ' },
      { id: 'em-bear', label: '곰', icon: '🐻', insert: '🐻 ' },
    ],
  },
];

/**
 * Per-moodboard example phrases. Each category gets 3 ready-to-insert
 * sentences shaped like "[tag] + Kinderboard feature used + activity result".
 * Selecting one auto-inserts the full text — the user can edit afterwards.
 */
export const MOODBOARD_EXAMPLES: Record<MoodboardCategory, SlashItem[]> = {
  activities: [
    {
      id: 'mb-activities-1',
      label: '[표현] 우리반 캐릭터 만들기',
      icon: '🎨',
      description: 'AI비서 스튜디오 활용',
      insert:
        '[표현] AI비서 스튜디오로 우리반 캐릭터를 만들었어요. 아이들이 좋아하는 동물과 색깔을 함께 골라 입력했더니 몰입도가 훨씬 높아졌어요.',
    },
    {
      id: 'mb-activities-2',
      label: '[참여] 식물 이름 배우기',
      icon: '🌱',
      description: '놀이계획으로 빠르게 정리',
      insert:
        "[참여] '식물 이름 배우기' 수업자료를 놀이계획으로 정리했어요. 5분 만에 활동지까지 출력해서 바로 수업에 활용했습니다.",
    },
    {
      id: 'mb-activities-3',
      label: '[놀이중심] 아이들이 정한 주제',
      icon: '🧒',
      description: 'AI비서 아이디어 제안',
      insert:
        '[놀이중심] 아이들이 직접 정한 주제로 놀이계획을 세웠어요. AI비서가 아이디어와 활동 흐름을 제안해 줘서 우리반에 딱 맞는 계획을 준비할 수 있었어요.',
    },
  ],
  environment: [
    {
      id: 'mb-env-1',
      label: '[환경] 우유갑 모으기 포스터',
      icon: '🪴',
      description: '재활용 활동 포스터',
      insert:
        "[환경] 우유갑 모으기 활동 포스터를 만들었어요. AI비서가 '재활용·아이들이 좋아하는 색감'으로 한 번에 완성해줬습니다.",
    },
    {
      id: 'mb-env-2',
      label: '[우리반] 파스텔 아침 콘셉트',
      icon: '🌸',
      description: '교실 환경 새단장',
      insert:
        "[우리반] 교실 환경을 '파스텔 아침' 콘셉트로 새로 꾸몄어요. 아이들이 등원할 때마다 \"예뻐요!\"라고 말해줘서 보람이 있어요.",
    },
    {
      id: 'mb-env-3',
      label: '[게시판] 이달의 주제 게시판',
      icon: '📌',
      description: 'AI 이미지 출력 활용',
      insert:
        '[게시판] 이달의 주제에 맞춰 게시판을 새로 구성했어요. AI비서가 만들어준 이미지를 출력해 한 번에 완성했습니다.',
    },
  ],
  play: [
    {
      id: 'mb-play-1',
      label: '[관찰] 텃밭 상추 관찰일지',
      icon: '🔎',
      description: '사진 + AI 문장 정리',
      insert:
        '[관찰] 텃밭에서 아이들이 직접 심은 상추를 관찰했어요. 잎이 자라는 모습을 사진으로 기록하고 AI 문장으로 정리했답니다.',
    },
    {
      id: 'mb-play-2',
      label: '[요리] 화전 만들기',
      icon: '🌼',
      description: '활동 과정 가정 공유',
      insert:
        '[요리] 화전 만들기 활동을 기록했어요. 아이들이 직접 꽃을 올려 굽는 과정을 사진과 함께 가정에 공유했습니다.',
    },
    {
      id: 'mb-play-3',
      label: '[자유놀이] 블록 영역 협력',
      icon: '🧱',
      description: '양보·나눔 순간 기록',
      insert:
        '[자유놀이] 오늘 블록 영역에서 아이들이 협력하는 모습이 인상 깊어 놀이기록으로 남겼어요. 자연스럽게 양보와 나눔이 일어나는 순간이었습니다.',
    },
  ],
  inquiry: [
    {
      id: 'mb-inquiry-1',
      label: '[유초이음] 우리 동네 프로젝트',
      icon: '🏘️',
      description: '초1 형님반 협력',
      insert:
        "[유초이음] 초등 1학년 형님반과 함께 '우리 동네' 프로젝트를 진행했어요. 아이들이 서로 그림책을 읽어주는 시간이 가장 인상 깊었답니다.",
    },
    {
      id: 'mb-inquiry-2',
      label: '[숲] 숲속 관찰 일지',
      icon: '🌳',
      description: 'AI비서 자연물 분류',
      insert:
        "[숲] '숲속 관찰 일지'를 시작했어요. 아이들이 발견한 곤충·나뭇잎·열매를 사진으로 모으고 AI비서가 이름과 설명을 정리해줬습니다.",
    },
    {
      id: 'mb-inquiry-3',
      label: '[바다] 바다 생물 탐구',
      icon: '🐠',
      description: 'AI 스토리북 동화',
      insert:
        "[바다] 바다 생물 탐구 프로젝트를 진행 중이에요. AI비서 스토리북으로 '바닷속 모험' 동화책을 만들어 함께 읽고 있어요.",
    },
  ],
  parents: [
    {
      id: 'mb-parents-1',
      label: '[상담] 학부모 상담 자료',
      icon: '🗂️',
      description: '관찰기록 + 사진',
      insert:
        '[상담] 학부모 상담 자료를 관찰기록으로 정리했어요. 사진과 AI 문장이 함께 정리되니 구체적인 자료를 준비하기 수월했습니다.',
    },
    {
      id: 'mb-parents-2',
      label: '[공지] 가정통신문',
      icon: '✉️',
      description: 'AI 문장 작성',
      insert:
        '[공지] 가정통신문을 AI 문장으로 작성했어요. 작성 시간이 절반으로 줄어 다른 업무에 집중할 수 있었습니다.',
    },
    {
      id: 'mb-parents-3',
      label: '[가정연계] 오늘의 좋아한 활동',
      icon: '💌',
      description: '사진 + 짧은 문장',
      insert:
        '[가정연계] 오늘 아이가 가장 좋아한 활동을 부모님께 공유했어요. 사진 한 장과 짧은 문장만으로도 소통이 풍성해집니다.',
    },
  ],
  annual: [
    {
      id: 'mb-story-1',
      label: '[환경교육] 지구를 지키는 우리반',
      icon: '🌏',
      description: 'AI 스토리북 동화',
      insert:
        "[환경교육] '지구를 지키는 우리반' 동화책을 만들었어요. 아이들이 직접 주인공이 되어 환경을 보호하는 이야기를 함께 완성했답니다.",
    },
    {
      id: 'mb-story-2',
      label: '[편식교육] 용감한 당근 친구',
      icon: '🥕',
      description: '식습관 개선 동화',
      insert:
        "[편식교육] 채소를 싫어하는 아이들을 위해 '용감한 당근 친구' 동화책을 만들었어요. 다음 날 점심에 당근을 더 잘 먹는 모습을 봤습니다.",
    },
    {
      id: 'mb-story-3',
      label: '[다문화] 다문화 친구 이야기',
      icon: '🌈',
      description: '서로 다른 문화 이해',
      insert:
        '[다문화] 다문화 가정 아이를 주인공으로 한 동화책을 만들었어요. 우리반 친구들 모두 서로 다른 문화를 자연스럽게 이해하게 됐습니다.',
    },
  ],
};

const MOODBOARD_LABELS: Record<MoodboardCategory, string> = {
  activities: '수업활동',
  environment: '환경구성',
  play: '놀이기록',
  inquiry: '주제탐구',
  parents: '부모소통',
  annual: '스토리북',
};

/**
 * Build slash groups with the chosen category's examples surfaced first.
 * Falls back to the unmodified default groups when no category is given.
 */
export function buildGroupsForCategory(
  category: MoodboardCategory | undefined,
): SlashGroup[] {
  if (!category) return SLASH_GROUPS;
  const examples = MOODBOARD_EXAMPLES[category];
  if (!examples) return SLASH_GROUPS;
  return [
    {
      id: `mb-examples-${category}`,
      label: `${MOODBOARD_LABELS[category]} 예시 문구`,
      items: examples,
    },
    ...SLASH_GROUPS,
  ];
}

/** Filter groups by a query string. Items match if label or keywords include the query. */
export function filterGroups(groups: SlashGroup[], query: string): SlashGroup[] {
  const q = query.trim().toLowerCase();
  if (!q) return groups;
  const out: SlashGroup[] = [];
  for (const g of groups) {
    const items = g.items.filter((it) => {
      const hay = [it.label, it.description ?? '', ...(it.keywords ?? [])]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
    if (items.length > 0) out.push({ ...g, items });
  }
  return out;
}

/** Flatten groups to a single ordered array (for keyboard navigation). */
export function flatten(groups: SlashGroup[]) {
  return groups.flatMap((g) => g.items);
}
