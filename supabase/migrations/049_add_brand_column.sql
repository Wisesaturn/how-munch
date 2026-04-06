-- Add brand column to ingredients and fridge_items tables.
-- brand is nullable (optional) — allows ingredients without a brand (e.g., home-grown vegetables).
-- Enables independent search/filtering by brand name and price comparison across brands.

ALTER TABLE public.ingredients
  ADD COLUMN IF NOT EXISTS brand text;

ALTER TABLE public.fridge_items
  ADD COLUMN IF NOT EXISTS brand text;
