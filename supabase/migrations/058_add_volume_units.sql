-- ingredients: ml, l 단위 추가
ALTER TABLE public.ingredients
  DROP CONSTRAINT IF EXISTS ingredients_unit_check;

ALTER TABLE public.ingredients
  ADD CONSTRAINT ingredients_unit_check
    CHECK (unit = ANY (ARRAY['count'::text, 'g'::text, 'kg'::text, 'ml'::text, 'l'::text]));

-- fridge_items: ml, l 단위 추가
ALTER TABLE public.fridge_items
  DROP CONSTRAINT IF EXISTS fridge_items_unit_check;

ALTER TABLE public.fridge_items
  ADD CONSTRAINT fridge_items_unit_check
    CHECK (unit = ANY (ARRAY['count'::text, 'g'::text, 'kg'::text, 'ml'::text, 'l'::text]));
