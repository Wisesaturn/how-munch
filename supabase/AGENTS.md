# Supabase Database Workflow

이 프로젝트는 Supabase DB 스키마 변경 이력을 `supabase/migrations`로 관리합니다.

## SQL 함수 관리 원칙

`public` 스키마 함수는 함수 단위 파일로 분리하고 도메인별로 카테고라이징해 참조합니다.

- 함수 소스 경로: `supabase/sql/functions/public/<category>/*.sql`
- 인덱스 문서: `supabase/sql/functions/AGENTS.md`
- 함수 파일은 각 파일 상단에 아래 주석을 포함합니다.
  - `역할`: 함수의 책임
  - `동작`: 핵심 실행 흐름

## 업데이트 순서

1. 함수 파일(`supabase/sql/functions/public/<category>/<function>.sql`)에서 변경 사항을 먼저 검토/정리합니다.
2. 실행 이력은 새로운 migration 파일(`supabase/migrations/*.sql`)로 반영합니다.

## 주의사항

- `supabase/sql/functions/*`는 유지보수/리뷰용 참조 소스입니다.
- 실제 DB 반영 순서와 재현성은 `supabase/migrations/*`를 기준으로 합니다.
- RPC 예외 코드를 추가/변경하면 `src/commons/lib/domainError.ts`를 같은 변경에 함께 업데이트해야 합니다.
- 프런트엔드에서 Supabase 에러를 처리할 때는 raw 에러를 직접 throw 하지 않고,
  각 도메인 resolve 함수(예: `resolveFridgeError`)로 감싸서 throw 해야 합니다.
