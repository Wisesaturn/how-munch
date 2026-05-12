-- Migration: 061_add_notification_preference_toggles
-- 역할: notification_preferences 테이블에 가구원 활동 알림 토글 컬럼을 추가합니다.
-- 동작:
-- 1. fridge_item_added_enabled: 냉장고 재료 추가 알림 ON/OFF (기본 false, 옵트인)
-- 2. meal_added_enabled: 식단 등록 알림 ON/OFF (기본 false, 옵트인)

alter table public.notification_preferences
  add column fridge_item_added_enabled boolean not null default false,
  add column meal_added_enabled boolean not null default false;
