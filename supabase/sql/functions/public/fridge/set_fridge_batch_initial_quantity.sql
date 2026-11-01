-- Function: public.set_fridge_batch_initial_quantity
-- Source: supabase/migrations/093_add_fridge_batch_initial_quantity.sql
-- 역할: 배치 생성 시 등록 수량(initial_quantity)을 채우는 BEFORE INSERT 트리거 함수입니다.
-- 동작:
-- 1. 생성 시점의 quantity를 initial_quantity로 복사합니다.
create or replace function public.set_fridge_batch_initial_quantity()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.initial_quantity := new.quantity;
  return new;
end;
$$;
