# PLC 갤러리 — 킨더보드 AI

전국 유아교육 선생님들이 모여 활동 자료와 수업 기록을 공유하는 팀 보드 갤러리.

## 🏗 스택

| 영역 | 기술 |
|---|---|
| Build | Vite 6 + React 18 + TypeScript 5 |
| Styling | Emotion + ThemeProvider (light/dark) |
| State | Zustand + TanStack Query v5 |
| Routing | React Router v6 |
| i18n | react-i18next (ko/en) |
| Backend | Supabase (Postgres + Auth + Storage + RLS) |
| Forms | React Hook Form + Zod |
| Deploy | Docker + Nginx → AWS ECS (Fargate) |

## 🚀 개발 환경 셋업

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수

`.env.local`이 이미 Supabase 키로 준비되어 있습니다.
새 프로젝트로 바꾸려면 `.env.example`을 참고.

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY`는 `.env.server.local` 파일에만 있으며 `.gitignore`에 포함되어 있습니다. 프론트엔드 코드에서 절대 import 하지 마세요.

### 3. Supabase 스키마 적용

[supabase/README.md](supabase/README.md) 참고. 요약:

1. https://supabase.com/dashboard/project/jvbnjziiqlxjsqouohcm/sql/new 열기
2. `supabase/migrations/20260417000000_initial_schema.sql` 내용 전체 붙여넣기
3. **Run** 클릭
4. Dashboard → Authentication → Providers → Email: enable (Confirm email OFF for dev)

### 4. 개발 서버 실행

```bash
npm run dev
# → http://localhost:5173
```

## 📁 디렉토리 구조

```
plcgallery/
├── src/
│   ├── main.tsx              # Entry
│   ├── App.tsx               # Router + providers
│   ├── lib/                  # supabase client, query client
│   ├── types/                # TS types for DB
│   ├── theme/                # Emotion theme + tokens
│   ├── i18n/                 # ko/en translations
│   ├── store/                # Zustand stores
│   ├── hooks/                # data hooks (useAuth, useMoodboards, ...)
│   ├── components/           # Shared UI + layout
│   └── pages/                # Route pages
├── supabase/migrations/      # SQL schema + RLS
├── deploy/                   # ECS task def + deploy guide
├── legacy/index.html         # Original HTML prototype (for reference)
├── Dockerfile                # Multi-stage: Node build → Nginx
├── nginx.conf                # SPA routing + gzip + cache
└── .dockerignore
```

## 📜 Scripts

| Command | Description |
|---|---|
| `npm run dev` | Vite dev server (port 5173) |
| `npm run build` | Type-check + production build → `dist/` |
| `npm run preview` | Preview built bundle locally |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm run test` | Vitest |
| `npm run docker:build` | Build local Docker image |
| `npm run docker:run` | Run locally on :8080 |

## 🐳 Docker 로컬 실행

```bash
docker build \
  --build-arg VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
  --build-arg VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
  -t plcgallery:local .

docker run --rm -p 8080:80 plcgallery:local
# → http://localhost:8080
```

## ☁️ ECS 배포

[deploy/README.md](deploy/README.md) 참고.

## 🔐 보안 체크리스트

- [x] `.env.local`, `.env.server.local` — `.gitignore` 포함
- [x] RLS 활성화 + 정책 (`is_team_member`, `is_team_leader` helper 기반)
- [x] Storage 업로드 — 본인 팀 경로만 (`post-images/<team_id>/...`)
- [x] Nginx 보안 헤더 (X-Frame, X-Content-Type, Referrer-Policy)
- [ ] **service_role key 회전** (초기 개발 끝난 후 필수): Dashboard → Settings → API → Reset
- [ ] Auth rate limiting (Supabase Dashboard → Auth → Rate Limits)

## 🗺 주요 라우트

| Path | View | Auth |
|---|---|---|
| `/welcome` | Onboarding (create/join team) | Guest |
| `/` | Home (Discover) | Protected |
| `/teamboard` | Team Board | Protected |
| `/myboard` | My Board (Coming Soon) | Protected |
| `/moodboards/:id` | Moodboard detail + Viewer | Protected |
| `/upload` / `/upload/:moodboardId` | Upload post | Protected |

## 📝 Legacy

원본 HTML 프로토타입은 `legacy/index.html`에 보존되어 있습니다 (1MB, 4,643 라인).
디자인 참고용이며, 프로덕션 빌드에는 포함되지 않습니다.
