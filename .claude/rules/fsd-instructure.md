# FSD 구조 규칙 (Feature-Sliced Design)

how-munch 프로젝트의 FSD 아키텍처 규칙을 정의한다.
공식 FSD 문서(https://feature-sliced.design)를 기반으로 Next.js App Router 환경에 맞게 조정했다.

---

## 1. 레이어 구조

```
project-root/
├── app/                # Next.js App Router (라우팅 전용)
│   ├── layout.tsx      # RootLayout + 전역 Providers
│   ├── globals.css     # Tailwind CSS + shadcn 테마
│   ├── providers.tsx   # 클라이언트 프로바이더 (QueryClientProvider 등)
│   └── (main)/         # 라우트 그룹 → src/pages/에서 import
│
├── src/
│   ├── apps/           # 앱 레벨 싱글톤 (Toast Provider, Service Worker 등)
│   ├── pages/          # 페이지 조합 레이어 (app/(main)/page.tsx의 실 구현체)
│   ├── modules/        # 전역 레이아웃 컴포넌트 (Header, Sidebar, Nav 등)
│   ├── features/       # 사용자 행동 단위 (로그인, 검색, 폼 제출 등)
│   ├── entities/       # 비즈니스 엔티티 (Fridge, Meal, Ingredient 등)
│   └── commons/        # 공유 코드 (의존성 없음)
│       ├── api/        # Supabase 클라이언트 (browser/server/middleware)
│       ├── config/     # 환경변수, 앱 상수
│       ├── lib/        # 유틸 함수 (도메인별 파일 구성)
│       ├── types/      # 공통 TypeScript 타입
│       └── ui/         # 재사용 기본 UI 컴포넌트
```

### 레이어 의존 방향 (단방향)

```
app → apps → pages → modules → features → entities → commons
```

- 같은 레이어 내 슬라이스 간 직접 import 금지
- 상위 레이어는 하위 레이어만 import 가능
- `app/(main)/page.tsx`는 `src/pages/`에서 import하는 브릿지 역할만 수행

---

## 2. commons 세그먼트 규칙

### `commons/api/`

Supabase 클라이언트 팩토리 함수만 위치한다.

```
commons/api/
├── supabase/
│   ├── browser.ts      # createBrowserClient() — 클라이언트 컴포넌트용
│   ├── server.ts       # createClient() — Server Component/Route Handler용
│   └── middleware.ts   # createServerClient() — Next.js middleware용
└── index.ts
```

사용 패턴:
```typescript
import { createBrowserClient } from '@/commons/api/supabase';       // client
import { createClient } from '@/commons/api/supabase/server';        // server
```

### `commons/lib/`

도메인(주제) 단위 파일로 구성한다. 관련 유틸이 많아지면 도메인 폴더로 묶는다.

```
commons/lib/
├── error/
│   ├── domainError.ts              # 도메인 에러 코드/메시지/resolveDomainError
│   ├── errorMessage.ts             # ERROR_MSG 템플릿 (Zod 스키마 메시지용)
│   └── extractFieldErrorMessage.ts # 폼 에러 객체에서 첫 번째 메시지 추출
├── http/
│   ├── apiTypes.ts                 # ApiResponse<T> 공통 타입 (클라이언트 안전)
│   ├── apiResponse.ts              # Route Handler 응답 빌더 (server-only)
│   └── apiClient.ts                # fetch 기반 HTTP 클라이언트 (클라이언트용)
├── cn.ts                           # clsx + tailwind-merge 조합 유틸
├── context.ts                      # createSafeContext (Context API 안전 래퍼)
├── notification.ts                 # Web Push / Service Worker 유틸
├── numericInput.ts                 # 숫자 입력 파싱 유틸
├── time.ts                         # 날짜/시간 유틸 (date-fns 래퍼)
├── uuid.ts                         # UUID 생성 유틸
└── index.ts                        # barrel export (server-only 모듈 제외)
```

#### 도메인 폴더 생성 기준

단일 파일이 200줄을 넘거나, 동일 도메인 파일이 3개 이상이면 폴더로 분리한다.

#### server-only 모듈 주의

`http/apiResponse.ts`는 `next/server`를 import하므로 클라이언트 번들에 포함되면 안 된다.
- `index.ts`에서 re-export하지 않는다.
- Route Handler에서 직접 import한다: `import { apiResponse } from '@/commons/lib/http/apiResponse'`

### `commons/ui/`

순수 재사용 UI 컴포넌트. 비즈니스 로직 없음.

```
commons/ui/
├── Form.tsx        # compound API: Form.Field, Form.Label, Form.Control, Form.Error
├── Button.tsx
├── Input.tsx
├── ...
└── index.ts
```

### `commons/config/`

환경변수 접근, 앱 전역 상수.

### `commons/model/`

앱 전역 상태/행동 로직과 공유 TypeScript 타입.

```
commons/model/
├── react/
│   ├── useIsMounted.ts   # 마운트 여부 추적
│   ├── useLoading.ts     # Promise 로딩 상태 관리
│   └── index.ts
├── types/
│   ├── database.ts       # Supabase 자동생성 Database 타입
│   └── index.ts
└── index.ts
```

- `types/database.ts`는 Supabase CLI로 자동생성되는 파일
- import: `import { type Database } from '@/commons/model/types'`
- import: `import { useLoading } from '@/commons/model'`

---

## 3. 슬라이스 세그먼트 규칙

각 슬라이스(`features/fridge`, `entities/meal` 등)는 다음 세그먼트 중 필요한 것만 포함한다.

### `api/` — React Query 훅

반드시 3파일로 분리한다.

```
api/
├── queryKey.ts     # query key factory
├── queries.ts      # use{Entity}Query (조회)
└── mutations.ts    # use{Action}Mutation (변경)
```

```typescript
// queryKey.ts
export const fridgeKeys = {
  all: ['fridge'] as const,
  list: (householdId: string) => [...fridgeKeys.all, householdId] as const,
};

// queries.ts
export function useFridgeItemsQuery(householdId: string) {
  return useQuery({
    queryKey: fridgeKeys.list(householdId),
    queryFn: () => apiClient.get<FridgeItem[]>(`/api/fridge?householdId=${householdId}`),
  });
}

// mutations.ts
export function useAddFridgeItemMutation() {
  return useMutation({ mutationFn: (body) => apiClient.post('/api/fridge', body) });
}
```

### `model/` — 상태·행동 로직

- zustand store, Zod 스키마, 비즈니스 로직 훅, 부수효과 훅
- 순수 함수 중심 유틸은 `lib/`에 위치

### `lib/` — 유틸 함수

- 순수 함수 또는 React 외부 유틸
- 브라우저/전역 이벤트 등록 훅은 `model/`에 위치

### `ui/` — 컴포넌트

- 해당 슬라이스 전용 컴포넌트
- 외부에 노출할 컴포넌트만 `index.ts`에 re-export

---

## 4. apps/ 레이어 규칙

앱 레벨 싱글톤. 전역 Provider, 서비스 초기화 등.

```
src/apps/
├── route/              # Route Handler 전용 미들웨어
│   ├── routeGuard.ts   # withAuth HOF
│   └── index.ts        # barrel: withAuth, AuthContext
└── toast/              # Toast Provider, 전역 토스트 트리거
```

### Route Handler 패턴

```typescript
// app/api/fridge/route.ts
import { withAuth } from '@/apps/route';
import { apiResponse } from '@/commons/lib/http/apiResponse';
import { resolveDomainError } from '@/commons/lib';

export const GET = withAuth(async (req, { userId, supabase }) => {
  const { data, error } = await supabase.from('fridge_items').select('*').eq('user_id', userId);
  if (error) {
    const domainError = resolveDomainError(error);
    if (domainError) return apiResponse.BAD_REQUEST(domainError.code, domainError.message);
    return apiResponse.INTERNAL_ERROR();
  }
  return apiResponse.OK(data);
});
```

`withAuth`는 Supabase 쿠키 기반 세션 검증 후 `userId`와 `supabase` 클라이언트를 핸들러에 주입한다.

---

## 5. 도메인 에러 처리 규칙

### RPC 커스텀 예외 등록

PostgreSQL RPC에서 커스텀 예외를 throw할 때:
```sql
RAISE EXCEPTION 'message'
  USING errcode = 'F0001', hint = 'FRIDGE_IN_USE_IN_MEAL';
```

`errcode`와 `hint`를 반드시 함께 명시한다.

### 클라이언트 측 매핑

RPC 예외를 추가/변경하면 `src/commons/lib/error/domainError.ts`에 code/hint 대응을 같은 변경에 포함한다.

```typescript
// DOMAIN_ERROR_CODE: hint → 도메인 코드
FRIDGE_IN_USE_IN_MEAL: 'FRG_001'

// DOMAIN_ERROR_MESSAGE: 도메인 코드 → 사용자 메시지
FRG_001: '식단에 등록되어 있는 재료는 삭제할 수 없습니다.'

// POSTGRES_ERRCODE_TO_KEY: legacy errcode 폴백
F0001: 'FRIDGE_IN_USE_IN_MEAL'
```

---

## 6. 네이밍 컨벤션

| 대상 | 규칙 | 예시 |
|------|------|------|
| 컴포넌트 파일 | PascalCase | `FridgeCard.tsx` |
| 함수/유틸 파일 | camelCase | `useAuth.ts`, `cn.ts` |
| 폴더 | kebab-case | `fridge-card/`, `meal-form/` |
| 컴포넌트 | PascalCase | `FridgeCard`, `MealForm` |
| 함수/변수 | camelCase | `loginWithKakao`, `fridgeItems` |
| 상수 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| 타입/인터페이스 | PascalCase | `FridgeItem`, `MealType` |
| Next.js 규약 파일 | 예외 | `page.tsx`, `route.ts`, `layout.tsx` |

### RPC 네이밍

```
create_  / update_  / delete_  / upsert_  / mark_  / deactivate_  / generate_  / get_
다중 엔티티 트랜잭션 → with_<domain> 접미: upsert_meal_with_usage
검증 기반 갱신 → _guarded 접미: update_fridge_batch_guarded
파라미터 → p_ prefix: p_household_id, p_updates
```

---

## 7. Import 규칙

- 경로 alias: `@/*` → `src/*`
- 슬라이스 public API는 반드시 `index.ts`를 통해 import (pages/features/entities/modules)
- 같은 레이어 내 슬라이스 간 직접 import 금지
- server-only 모듈은 직접 경로로 import (barrel export 경유 금지)

```typescript
// ✅ 올바른 import
import { cn, cva, type VariantProps } from '@/commons/lib';
import { withAuth } from '@/apps/route';
import { apiResponse } from '@/commons/lib/http/apiResponse';   // server-only 직접
import { type ApiResponse } from '@/commons/lib/http/apiTypes'; // 타입만 필요할 때

// ❌ 금지
import { FridgeCard } from '@/features/fridge/ui/FridgeCard';  // index.ts 우회
import { useFridgeStore } from '@/entities/fridge';             // 같은 레이어 크로스
```

---

## 8. 트랜잭션 경계 규칙

- 단일 테이블 단순 CRUD → mutation에서 직접 처리
- 복수 테이블 변경, read-modify-write 일관성 필요 → DB RPC 우선
- 재고 차감/복구, meal+usage 동시 변경, count/slot 갱신 → RPC 필수

```typescript
// ✅ 단순 CRUD
await supabase.from('profiles').update({ nickname }).eq('user_id', userId);

// ✅ 트랜잭션이 필요한 경우 → RPC
await supabase.rpc('upsert_meal_with_usage', { p_meal_id, p_ingredients });
```
