-- Migration: 090_add_dining_expense_added_notification_toggle
-- 역할: notification_preferences 테이블에 외식비 등록 알림 토글 컬럼을 추가합니다.
-- 동작:
-- 1. dining_expense_added_enabled: 외식비 등록 알림 ON/OFF (기본 false, 옵트인)

alter table public.notification_preferences
  add column if not exists dining_expense_added_enabled boolean not null default false;
