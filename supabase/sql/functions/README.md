# Supabase SQL Functions

이 디렉토리는 현재 마이그레이션 기준 최신 `public` 함수 정의를 함수 단위 파일로 분리한 참조 소스입니다.

## 파일 목록

| Function | File | Latest Source Migration |
| --- | --- | --- |
| `public.add_ingredient_with_fridge` | `supabase/sql/functions/public/add_ingredient_with_fridge.sql` | `supabase/migrations/038_drop_legacy_category_columns_and_use_category_id.sql` |
| `public.backfill_consume_meal_batch_usage` | `supabase/sql/functions/public/backfill_consume_meal_batch_usage.sql` | `supabase/migrations/015_backfill_meal_batch_usages_from_existing_meals.sql` |
| `public.create_fridge_item_with_batch` | `supabase/sql/functions/public/create_fridge_item_with_batch.sql` | `supabase/migrations/038_drop_legacy_category_columns_and_use_category_id.sql` |
| `public.create_household_with_owner` | `supabase/sql/functions/public/create_household_with_owner.sql` | `supabase/migrations/032_add_transactional_app_rpcs.sql` |
| `public.deactivate_push_subscription_by_endpoint` | `supabase/sql/functions/public/deactivate_push_subscription_by_endpoint.sql` | `supabase/migrations/021_add_push_dispatch_rpcs.sql` |
| `public.delete_ingredient_with_cleanup` | `supabase/sql/functions/public/delete_ingredient_with_cleanup.sql` | `supabase/migrations/033_harden_remaining_consistency_paths.sql` |
| `public.delete_meal_with_usage_restore` | `supabase/sql/functions/public/delete_meal_with_usage_restore.sql` | `supabase/migrations/032_add_transactional_app_rpcs.sql` |
| `public.delete_my_account` | `supabase/sql/functions/public/delete_my_account.sql` | `supabase/migrations/011_delete_my_account_rpc.sql` |
| `public.ensure_current_user_household_member` | `supabase/sql/functions/public/ensure_current_user_household_member.sql` | `supabase/migrations/006_invite_info_and_membership_recovery.sql` |
| `public.generate_expiry_soon_notifications` | `supabase/sql/functions/public/generate_expiry_soon_notifications.sql` | `supabase/migrations/023_support_kg_unit.sql` |
| `public.get_invite_household` | `supabase/sql/functions/public/get_invite_household.sql` | `supabase/migrations/006_invite_info_and_membership_recovery.sql` |
| `public.get_pending_push_notifications` | `supabase/sql/functions/public/get_pending_push_notifications.sql` | `supabase/migrations/021_add_push_dispatch_rpcs.sql` |
| `public.handle_create_notification_preferences` | `supabase/sql/functions/public/handle_create_notification_preferences.sql` | `supabase/migrations/017_add_expiry_notification_rpc.sql` |
| `public.handle_new_user` | `supabase/sql/functions/public/handle_new_user.sql` | `supabase/migrations/003_auto_create_profile_trigger.sql` |
| `public.handle_updated_at` | `supabase/sql/functions/public/handle_updated_at.sql` | `supabase/migrations/004_initial_service_schema.sql` |
| `public.is_household_member` | `supabase/sql/functions/public/is_household_member.sql` | `supabase/migrations/004_initial_service_schema.sql` |
| `public.join_household` | `supabase/sql/functions/public/join_household.sql` | `supabase/migrations/005_household_invites_and_join_household.sql` |
| `public.leave_household` | `supabase/sql/functions/public/leave_household.sql` | `supabase/migrations/032_add_transactional_app_rpcs.sql` |
| `public.mark_notifications_push_sent` | `supabase/sql/functions/public/mark_notifications_push_sent.sql` | `supabase/migrations/021_add_push_dispatch_rpcs.sql` |
| `public.normalize_ingredient_category_id` | `supabase/sql/functions/public/normalize_ingredient_category_id.sql` | `supabase/migrations/038_drop_legacy_category_columns_and_use_category_id.sql` |
| `public.reassign_items_to_other_category_before_delete` | `supabase/sql/functions/public/reassign_items_to_other_category_before_delete.sql` | `supabase/migrations/036_finalize_category_fk_with_sync.sql` |
| `public.refresh_fridge_item_total_count` | `supabase/sql/functions/public/refresh_fridge_item_total_count.sql` | `supabase/migrations/025_add_soft_delete_to_fridge_item_batches.sql` |
| `public.resolve_ingredient_category_id` | `supabase/sql/functions/public/resolve_ingredient_category_id.sql` | `supabase/migrations/036_finalize_category_fk_with_sync.sql` |
| `public.soft_delete_fridge_batch` | `supabase/sql/functions/public/soft_delete_fridge_batch.sql` | `supabase/migrations/031_guard_fridge_soft_delete_when_used_in_meal.sql` |
| `public.soft_delete_fridge_item` | `supabase/sql/functions/public/soft_delete_fridge_item.sql` | `supabase/migrations/031_guard_fridge_soft_delete_when_used_in_meal.sql` |
| `public.soft_delete_ingredient` | `supabase/sql/functions/public/soft_delete_ingredient.sql` | `supabase/migrations/031_guard_fridge_soft_delete_when_used_in_meal.sql` |
| `public.sync_category_reference_columns` | `supabase/sql/functions/public/sync_category_reference_columns.sql` | `supabase/migrations/038_drop_legacy_category_columns_and_use_category_id.sql` |
| `public.sync_fridge_item_total_count_from_batches` | `supabase/sql/functions/public/sync_fridge_item_total_count_from_batches.sql` | `supabase/migrations/012_sync_fridge_item_total_count_from_batches.sql` |
| `public.sync_items_category_code_after_category_update` | `supabase/sql/functions/public/sync_items_category_code_after_category_update.sql` | `supabase/migrations/037_complete_category_id_transition.sql` |
| `public.update_fridge_batch_guarded` | `supabase/sql/functions/public/update_fridge_batch_guarded.sql` | `supabase/migrations/034_add_domain_error_codes_for_update_ingredient_rpc.sql` |
| `public.update_ingredient_with_fridge` | `supabase/sql/functions/public/update_ingredient_with_fridge.sql` | `supabase/migrations/038_drop_legacy_category_columns_and_use_category_id.sql` |
| `public.upsert_meal_with_usage` | `supabase/sql/functions/public/upsert_meal_with_usage.sql` | `supabase/migrations/034_add_domain_error_codes_for_update_ingredient_rpc.sql` |
