# Supabase Database Workflow

이 프로젝트는 Supabase DB 스키마 변경 이력을 `supabase/migrations`로 관리합니다.

## Scope

- 대상: `supabase/sql/functions/**`, `supabase/migrations/**`
- 함께 보는 문서
  - 저장소 루트 `AGENTS.md`
  - `supabase/sql/functions/AGENTS.md`

## SQL 함수 관리 원칙

`public` 스키마 함수는 함수 단위 파일로 분리하고 도메인별로 카테고라이징해 참조합니다.

- 함수 소스 경로: `supabase/sql/functions/public/<category>/*.sql`
- 원칙: 1 함수 = 1 파일
- 함수 파일은 각 파일 상단에 아래 주석을 포함합니다.
  - `역할`: 함수의 책임
  - `동작`: 핵심 실행 흐름
- 카테고리: `auth`, `core`, `household`, `ingredient`, `fridge`, `meal`, `notification`, `category`, `search`, `food-expense`, `budget`

## 업데이트 순서

1. 함수 변경은 먼저 `supabase/sql/functions/public/<category>/<function>.sql`에 반영합니다.
2. 같은 변경을 새 migration(`supabase/migrations/*.sql`)으로 반영합니다.
3. `select pg_notify('pgrst', 'reload schema');` 포함 여부를 확인합니다.

## RPC 설계 규칙

- RPC 이름은 `snake_case`에 의도 동사를 앞세웁니다.
  - `create_`, `update_`, `delete_`, `upsert_`, `mark_`, `deactivate_`, `generate_`, `get_`
- 다중 엔티티 트랜잭션은 `with_<domain>` 접미를 붙입니다. 예: `upsert_meal_with_usage`
- 검증 기반 read-modify-write 갱신은 `_guarded` 접미를 씁니다. 예: `update_fridge_batch_guarded`
- RPC 인자는 `p_` prefix를 씁니다. 예: `p_household_id`, `p_updates`
- 한 RPC는 한 트랜잭션 경계와 한 반환 계약만 책임집니다.

## 예외 규칙 (필수)

RPC 커스텀 예외는 반드시 `errcode`와 `hint`를 함께 설정합니다.

```sql
raise exception '...'
  using errcode = 'X0001',
  hint = 'SOME_DOMAIN_REASON';
```

- `Unauthorized`, `permission denied` 같은 권한 예외에도 같은 규칙을 적용합니다.
- 신규/변경 `hint` 또는 `errcode`가 생기면 `src/commons/lib/error/domainError.ts`를 같은 변경에 함께 업데이트합니다.
- 표준 PostgreSQL 제약 위반(`23505` 중복, `23514` check)도 도메인 코드가 매핑되어 있습니다. 새 제약을 추가할 때 사용자에게 보일 메시지가 필요하면 같은 파일에 추가합니다.

## 프런트엔드 에러 처리 계약

- 프런트엔드 `queries`/`mutations`에서는 Supabase raw 에러를 직접 throw 하지 않습니다.
- 반드시 도메인 resolver로 감싸서 throw 합니다. 예: `throw resolveFridgeError(error)`
- Route Handler에서는 `respondWithDbError`(`src/apps/route/routeError.ts`)로 응답합니다. 매핑되지 않은 에러를 서버 로그에 남겨 원인 없는 500이 나가지 않게 합니다.

## 주의사항

- `supabase/sql/functions/*`는 유지보수와 리뷰용 참조 소스입니다.
- 실제 DB 반영 순서와 재현성은 `supabase/migrations/*`를 기준으로 합니다.
