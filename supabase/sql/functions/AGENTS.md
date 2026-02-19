# Supabase SQL Functions Guide

`public` 스키마 함수는 도메인 카테고리별로 분리되어 있습니다.

- 경로: `supabase/sql/functions/public/<category>/*.sql`
- 원칙: 1 함수 = 1 파일
- 파일 헤더: `역할`, `동작` 주석 필수

## Categories

- `auth`
- `core`
- `household`
- `ingredient`
- `fridge`
- `meal`
- `notification`
- `category`

## Update Rule

1. 함수 로직 변경 시 해당 함수 파일을 먼저 수정합니다.
2. 동일 변경을 `supabase/migrations/*.sql`에 새 migration으로 반영합니다.
3. RPC 커스텀 예외를 추가/수정하면 `src/commons/lib/domainError.ts`를 같은 변경에 포함합니다.
