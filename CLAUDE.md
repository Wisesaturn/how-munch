# How Munch

## Commands

```bash
pnpm dev          # 개발 서버 (Turbopack)
pnpm build        # 프로덕션 빌드
pnpm start        # 프로덕션 서버
pnpm lint         # ESLint 검사
pnpm lint:fix     # ESLint 자동 수정
pnpm format       # Prettier 포맷팅
pnpm format:check # Prettier 검사
```

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript 5, React 19
- **Package Manager**: pnpm
- **Styling**: Tailwind CSS 4 + clsx + tailwind-merge → `cn()` 유틸, cva (class-variance-authority)
- **State**: zustand (client), @tanstack/react-query (server)
- **Form**: @tanstack/react-form + zod (validation)
- **Table**: @tanstack/react-table
- **Utilities**: es-toolkit, date-fns, es-hangul, usehooks-ts
- **State Utilities**: react-simplikit (core hooks), @react-simplikit/mobile (mobile hooks/components)
- **UI Libraries**: lucide-react (icons), shadcn (component gen), overlay-kit (overlays), vaul (drawer), sonner (toast)
- **Backend**: Supabase (Auth + DB), @supabase/ssr
- **Lint/Format**: ESLint 9 (flat config) + Prettier + lint-staged + husky

## Architecture — FSD (Feature-Sliced Design)

```
project-root/
├── app/                # Next.js App Router (라우팅만)
│   ├── layout.tsx      # RootLayout + Providers
│   ├── globals.css     # Tailwind CSS + shadcn 테마
│   ├── providers.tsx   # QueryClientProvider 등 클라이언트 프로바이더
│   └── (main)/         # 라우트 그룹 (page.tsx → src/pages/ import)
├── pages/              # 빈 디렉토리 (Next.js app/pages 동일 레벨 충돌 방지용)
├── proxy.ts            # Next.js 16 proxy convention (Supabase 세션 리프레시)
├── src/                # FSD 레이어만 포함
│   ├── apps/           # 앱 레벨 프로바이더 (Toast 등)
│   ├── pages/          # FSD 페이지 레이어 (페이지 조합 로직)
│   ├── modules/        # 페이지 단위 조합 컴포넌트 (Header, Sidebar 등)
│   ├── features/       # 사용자 행동 단위 (로그인, 검색, 필터 등)
│   ├── entities/       # 비즈니스 엔티티 (User, Product 등)
│   └── commons/        # 공유 코드 (의존성 없음)
│       ├── api/        # API 클라이언트 (supabase client/server/middleware)
│       ├── config/     # 환경변수, 상수
│       ├── lib/        # 유틸 함수 (cn 등)
│       ├── types/      # 공통 타입
│       └── ui/         # 기본 UI 컴포넌트 (Button, Input 등)
```

### FSD 의존성 규칙

- **단방향**: app → apps → pages → modules → features → entities → commons
- app/(main)/page.tsx는 src/pages/에서 import하는 브릿지 역할
- 루트 pages/는 빈 디렉토리 — Next.js가 app/과 src/pages/를 동일 레벨로 인식하기 위한 워크어라운드
- 같은 레이어 내 모듈 간 직접 import 금지
- 각 슬라이스는 `index.ts`로 public API를 노출

## Naming Conventions

- **컴포넌트**: PascalCase (`KakaoLoginButton`, `MealCard`)
- **함수/변수**: camelCase (`loginWithKakao`, `updateSession`)
- **상수**: UPPER_SNAKE_CASE (`MAX_RETRY_COUNT`)
- **타입/인터페이스**: PascalCase (`Profile`, `MealType`)
- **폴더**: kebab-case (`auth-callback`, `meal-card`)
- **컴포넌트 파일 (.tsx)**: PascalCase (`KakaoLoginButton.tsx`, `MealCard.tsx`)
- **함수/유틸 파일 (.ts)**: camelCase (`useAuth.ts`, `loginWithKakao.ts`, `cn.ts`, `expiry.ts`)
- **유틸 파일명**: `utils.ts` 지양, 도메인명 사용 (예: `expiry.ts`, `cn.ts`)
- **파일 예외**: Next.js 규약 파일은 그대로 (`layout.tsx`, `page.tsx`, `route.ts`, `proxy.ts`)

## Conventions

- `@/*`는 `src/*`로 매핑 (tsconfig paths)
- `cn()`, `cva` 사용: `import { cn, cva, type VariantProps } from '@/commons/lib'`
- Server Component가 기본. `"use client"`는 필요한 곳에만
- zustand store는 해당 feature/entity 내부에 위치
- react-query hooks는 해당 feature의 `api/` 내에 3파일 분리:
  - `queryKey.ts` — query key factory
  - `queries.ts` — `use{작업}Query` hooks (조회)
  - `mutations.ts` — `use{작업}Mutation` hooks (변경)
- TanStack Form 유효성 검사는 `zod` 스키마를 작성하고 `useForm`의 `validators` 옵션에 연결한다.
  - 기본: `validators: { onSubmit: schema, onChange: schema }`
  - `onSubmit`, `onChange`는 항상 함께 설정하고, `onBlur`는 필요한 경우에만 추가한다.
  - Zod 스키마 에러 메시지는 `src/commons/lib/errorMessage.ts`의 `ERROR_MSG`를 우선 사용한다.
  - `ERROR_MSG`에 없는 메시지라도 공통화 가능한 패턴이면 `ERROR_MSG`에 먼저 추가한 뒤 재사용한다.
  - `useForm` 사용 중 제출 핸들러에서 `safeParse`를 별도로 중복 호출하는 패턴은 지양한다.
  - 에러 노출은 토스트보다 필드 인라인(`Form.Control` + `Form.Error`)을 우선한다.
  - 스키마는 기본적으로 컴포넌트 바깥(모듈 스코프)에 선언한다. 런타임 props/state에 따라 스키마 구조가 달라지는 경우에만 컴포넌트 내부 선언을 허용한다.
  - 유틸/헬퍼 함수도 기본적으로 컴포넌트 바깥(모듈 스코프)에 선언해 렌더마다 재생성되지 않도록 한다.
- react-query 조건부 실행: `enabled` 대신 `queryFn`에 `skipToken` 사용
- 날짜/기간 계산은 `date-fns`를 우선 사용한다
- 범용 유틸 함수는 `es-toolkit`을 우선 사용한다
- 한국어 처리: es-hangul 사용
- type import는 `import { type Foo }` 인라인 스타일 사용
- Supabase 클라이언트: `import { createBrowserClient } from '@/commons/api/supabase'` (client), `import { createClient } from '@/commons/api/supabase/server'` (server)
- proxy.ts — 프로젝트 루트에 위치 (Next.js 16 proxy convention, Supabase 세션 리프레시)
- `src/commons/lib`는 도메인(주제) 단위 파일로 구성하고, 필요 시 한 파일에 여러 유틸 함수를 함께 둔다 (예: `uuid.ts`, `string.ts`)
- 공통 UI 내부 상태가 controlled/uncontrolled를 모두 지원해야 하는 경우 `react-simplikit`의 `useControlledState`를 우선 사용한다 (예: `DatePicker`)
- 공통 UI 컴포넌트는 `disabled`, `invalid` 상태를 기본 고려해 설계한다
  - `invalid`는 props/API로 노출하고, 상태 기반 스타일(`data-invalid`, `aria-invalid`)을 제공한다
  - `disabled`는 opacity 축소 대신 명시된 비활성 스타일(예: gray 배경/텍스트/보더)로 표현한다
- 신규 훅/유틸 도입 시 동일 목적의 기능이 `react-simplikit`(core/mobile)에 있으면 먼저 검토 후 채택한다
- 성능/상태 최적화가 필요한 훅은 자체 구현보다 `react-simplikit` 기반 훅을 우선 검토하고 적극적으로 활용한다
- 조건 분기가 필요한 effect는 `useEffect` 내부 `if` 분기 대신 `react-simplikit`의 `useConditionalEffect`를 우선 사용한다
- `useEffect`/`useConditionalEffect` 콜백은 목적이 드러나는 기명 함수로 사용한다. `useConditionalEffect`는 호출부 인자로 인라인 기명 함수(`useConditionalEffect(function sync...(){ ... })`)를 선언하는 스타일을 우선한다
- Context 값으로 raw `Dispatch<SetStateAction<T>>`를 노출하지 않는다. 상태 변경은 목적형 래퍼 함수(`openModal`, `setOtpEmail` 등)로 감싸서 하위 컴포넌트에 전달한다
- 훅에서 외부로 노출하는 함수명은 `handle*` 같은 추상 접두어를 지양하고 목적이 명확한 동사형으로 작성한다 (`handleResend` 대신 `resendCode`)
- 재사용 목적이 아닌 슬라이스 전용 훅은 과도한 props DI를 피하고, 동일 슬라이스 Context에서 가져올 수 있는 값은 훅 내부에서 직접 조회해 사용한다
- `lib` 폴더에 함수를 추가/수정할 때는 함수 상단에 JSDoc 주석을 필수로 작성하고 `@description`으로 목적을 명시한다
- `model`/`lib` 폴더에 함수·훅(특히 export 단위)을 추가/수정할 때는 함수 상단에 JSDoc 주석을 필수로 작성하고 `@description`으로 목적과 동작을 명시한다
- FSD 세그먼트 분류 기준:
  - `model`: 상태/행동 로직(스토어, 스키마, 비즈니스 로직, 부수효과 훅)
  - `lib`: 주제별 유틸/라이브러리 코드(가능하면 순수 함수 중심)
- `useEffect`로 브라우저/전역 이벤트를 등록·해제하는 훅(예: gesture/touch listener)은 `lib`가 아니라 `model`에 둔다

### Common UI Composition

- 공통 컴포넌트는 SRP 원칙으로 역할 단위(`Header`, `Body`, `Footer` 등)로 분리 구현
- 공통 폼 UI는 `src/commons/ui/Form.tsx`의 compound API(`Form.Field`, `Form.Label`, `Form.Control`, `Form.Error`)를 우선 사용한다
- 공통 UI 파일은 섹션 단위 주석 블록(`/* ------------------------------------------------------------------------------------------------- */`)으로 `Root`, `Header`, `Content` 등 역할을 명시한다
- 컴파운드 패턴에서 `Header`, `Content`, `Footer`는 항상 형제 구조로 분리해 사용한다 (`Content` 내부에 `Header/Footer`를 넣지 않는다)
- `Content`는 본문 영역만 담당하며, 타이틀/액션/요약 같은 상단/하단 역할을 침범하지 않는다
- 컴파운드 패턴일 때만 export 단계에서 `Object.assign`으로 묶은 compound API를 제공
- 컴파운드 패턴이 아니면 일반 단일 컴포넌트 export를 유지 (불필요한 `Object.assign` 지양)
- 사용처에서는 `<BottomSheet>`, `<BottomSheet.Header>`, `<BottomSheet.Content>` 형태를 우선 사용
- Context API가 필요한 컴포넌트는 `src/commons/lib/context.ts`의 `createSafeContext`만 사용

### Commit Convention

- 커밋 타입 prefix를 사용: `feat`, `fix`, `chore`, `docs`, `refactor`, `style` 등
- 커밋 메시지 형식:
  - `type: 작업 내용`
  - 빈 줄
  - `- 작업 내용 간단 요약`
- 커밋 본문 작성 시 `\n` 문자열을 직접 입력하지 말고 실제 줄바꿈을 사용한다
- 권장 예시:
  - `git commit -m "fix: 스택 뒤로가기 정리" -m $'- historySync 기본 동작으로 정리`
- 예시:
  - `feat: 프로필 가구 관리 기능 추가`
  - (빈 줄)
  - `- 가구 생성/가입/탈퇴 및 초대 링크 플로우를 구현`

## ESLint Rules

### FSD Architecture (eslint-plugin-fsd-lint)

- **fsd/forbidden-imports**: 상위→하위 단방향 import만 허용 (error)
- **fsd/no-relative-imports**: 크로스 슬라이스 상대경로 import 금지, 같은 슬라이스 내부는 허용 (error)
- **fsd/no-public-api-sidestep**: pages/features/entities/modules는 반드시 index.ts를 통해 import (error)
- **fsd/no-cross-slice-dependency**: 같은 레이어 내 슬라이스 간 직접 import 금지 (error)
- **fsd/no-ui-in-business-logic**: 비즈니스 로직 레이어에서 UI import 금지 (error)
- **fsd/no-global-store-imports**: 전역 store 직접 import 금지, hooks 사용 (error)
- **fsd/ordered-imports**: off (import/order로 대체)

### Naming (eslint-plugin-check-file)

- **check-file/filename-naming-convention**: `*.tsx` → PascalCase, `*.ts` → camelCase 강제 (error), Next.js 규약 파일 예외
- **check-file/folder-naming-convention**: `src/` 하위 폴더는 kebab-case 강제 (error)

### Code Quality

- **import/order**: react/next → external → @/pages → @/modules → @/features → @/entities → @/commons → parent → sibling
- **consistent-type-imports**: 인라인 type import 강제
- **unused-imports**: 미사용 import 자동 감지 (`_` prefix로 무시)
- **no-console**: console.log 금지 (warn/error만 허용)
- **no-nested-ternary**: 중첩 삼항 금지
- **eqeqeq**: === 강제
- **prettier**: 별도 실행 (eslint-config-prettier로 충돌 방지), tailwindcss 클래스 자동 정렬

## Environment

`.env.local` 필요 (`.env.example` 참고):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_DB_PASSWORD=
```

## Git Hooks

- **pre-commit**: lint-staged → `*.{ts,tsx}` 파일에 `prettier --write` → `eslint --fix` 순서 실행
