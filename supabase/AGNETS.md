# Supabase SQL Rules

이 문서는 `supabase` 폴더 작업 시 따라야 하는 SQL/RPC 규칙을 모아둔 전용 가이드입니다.

## Scope

- 대상: `supabase/sql/functions/**`, `supabase/migrations/**`
- 기준 문서:
  - 저장소 루트 `AGENTS.md`
  - `supabase/AGENTS.md`
  - `supabase/sql/functions/AGENTS.md`

## Function Source Of Truth

- 함수 소스는 `supabase/sql/functions/public/<category>/*.sql`에 함수 단위로 관리합니다.
- 원칙: 1 함수 = 1 파일
- 함수 파일 상단에 반드시 포함:
  - `역할`
  - `동작`
- 카테고리: `auth`, `core`, `household`, `ingredient`, `fridge`, `meal`, `notification`, `category`

## Change Flow

1. 함수 변경은 먼저 `supabase/sql/functions/public/<category>/<function>.sql`에 반영
2. 같은 변경을 새 migration(`supabase/migrations/*.sql`)으로 반영
3. `select pg_notify('pgrst', 'reload schema');` 포함 여부 확인

## RPC Design Rules

- RPC 이름은 `snake_case` + intent-first verb 사용:
  - `create_`, `update_`, `delete_`, `upsert_`, `mark_`, `deactivate_`, `generate_`, `get_`
- 다중 엔티티 트랜잭션은 `with_<domain>` suffix 권장
- 가드 업데이트는 `_guarded` suffix 사용
- RPC 인자는 `p_` prefix 사용 (예: `p_household_id`, `p_updates`)
- 한 RPC는 한 트랜잭션 경계/한 반환 계약 책임 유지

## Exception Rules (Mandatory)

- RPC 커스텀 예외는 반드시 `errcode` + `hint`를 함께 설정합니다.
- 형식:

```sql
raise exception '...'
  using errcode = 'X0001',
  hint = 'SOME_DOMAIN_REASON';
```

- `Unauthorized`, `permission denied` 같은 권한 예외도 동일 규칙 적용
- 신규/변경 `hint` 또는 `errcode`가 생기면 `src/commons/lib/domainError.ts`를 같은 변경에 함께 업데이트

## Frontend Error Handling Contract

- 프런트엔드 `queries`/`mutations`에서는 Supabase raw 에러를 직접 throw 하지 않습니다.
- 반드시 도메인 resolver로 감싸서 throw 합니다.
  - 예: `throw resolveFridgeError(error)`

## Notes

- `supabase/sql/functions/*`는 유지보수/리뷰용 참조 소스
- 실제 반영 이력/재현성 기준은 `supabase/migrations/*`
