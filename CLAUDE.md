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
- **Lint/Format**: ESLint 9 (flat config) + Prettier + lint-staged + husky

## Architecture — FSD (Feature-Sliced Design)

```
src/
├── app/              # Next.js App Router (라우팅, 레이아웃, 페이지)
│   ├── layout.tsx    # RootLayout + Providers
│   ├── providers.tsx # QueryClientProvider 등 클라이언트 프로바이더
│   └── (routes)/     # 라우트 그룹
├── pages/            # FSD 페이지 레이어 (페이지 조합 로직)
├── modules/          # 페이지 단위 조합 컴포넌트 (Header, Sidebar 등)
├── features/         # 사용자 행동 단위 (로그인, 검색, 필터 등)
├── entities/         # 비즈니스 엔티티 (User, Product 등)
└── commons/          # 공유 코드 (의존성 없음)
    ├── api/          # API 클라이언트, fetch 래퍼
    ├── config/       # 환경변수, 상수
    ├── lib/          # 유틸 함수 (cn 등)
    ├── types/        # 공통 타입
    └── ui/           # 기본 UI 컴포넌트 (Button, Input 등)
```

### FSD 의존성 규칙

- **단방향**: app → pages → modules → features → entities → commons
- 같은 레이어 내 모듈 간 직접 import 금지
- 각 슬라이스는 `index.ts`로 public API를 노출

## Conventions

- `@/*`는 `src/*`로 매핑 (tsconfig paths)
- `cn()`, `cva` 사용: `import { cn, cva, type VariantProps } from '@/commons/lib'`
- Server Component가 기본. `"use client"`는 필요한 곳에만
- zustand store는 해당 feature/entity 내부에 위치
- react-query hooks는 해당 entity/feature의 `api/` 또는 `model/`에 위치
- 한국어 처리: es-hangul 사용
- type import는 `import { type Foo }` 인라인 스타일 사용

## ESLint Rules

### FSD Architecture (eslint-plugin-fsd-lint)

- **fsd/forbidden-imports**: 상위→하위 단방향 import만 허용 (error)
- **fsd/no-relative-imports**: 크로스 슬라이스 상대경로 import 금지, 같은 슬라이스 내부는 허용 (error)
- **fsd/no-public-api-sidestep**: features/entities/modules는 반드시 index.ts를 통해 import (error)
- **fsd/no-cross-slice-dependency**: 같은 레이어 내 슬라이스 간 직접 import 금지 (error)
- **fsd/no-ui-in-business-logic**: 비즈니스 로직 레이어에서 UI import 금지 (error)
- **fsd/no-global-store-imports**: 전역 store 직접 import 금지, hooks 사용 (error)
- **fsd/ordered-imports**: FSD 레이어 순서대로 import 정렬 (warn)

### Code Quality

- **import/order**: react/next → external → @/pages → @/modules → @/features → @/entities → @/commons → parent → sibling
- **consistent-type-imports**: 인라인 type import 강제
- **unused-imports**: 미사용 import 자동 감지 (`_` prefix로 무시)
- **no-console**: console.log 금지 (warn/error만 허용)
- **no-nested-ternary**: 중첩 삼항 금지
- **eqeqeq**: === 강제
- **prettier**: 별도 실행 (eslint-config-prettier로 충돌 방지), tailwindcss 클래스 자동 정렬

## Git Hooks

- **pre-commit**: lint-staged → `*.{ts,tsx}` 파일에 `prettier --write` → `eslint --fix` 순서 실행
