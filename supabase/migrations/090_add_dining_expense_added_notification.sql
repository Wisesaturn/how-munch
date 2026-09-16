-- Migration: 090_add_dining_expense_added_notification
-- 역할: notification_preferences 테이블에 외식/배달 등록 알림 토글 컬럼을 추가합니다.
-- 동작:
-- 1. dining_expense_added_enabled: 가구원이 외식/배달 지출을 등록했을 때 알림 ON/OFF
-- 2. 냉장고 재료 추가·식단 등록 알림과 같은 활동 알림이므로 기본 false(옵트인)로 맞춥니다.

alter table public.notification_preferences
  add column if not exists dining_expense_added_enabled boolean not null default false;
