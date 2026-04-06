-- Extend global ingredient categories with 7 new entries.
-- New categories: egg, tofu_legume, mushroom, sauce, oil, kimchi, health
-- sort_order follows the same 10-unit step pattern as existing categories.
-- Newly added categories are interleaved with existing ones for natural grouping:
--   mushroom(32), egg(35), tofu_legume(38) are placed adjacent to veggie(30)/fruit(40)
--   sauce(115), oil(118) follow seasoning(110)
--   kimchi(125) follows processed(120)
--   health(145) precedes other(150)

insert into public.ingredient_categories (code, name, emoji_unicode, sort_order)
values
  ('mushroom',    '버섯',       '1F344', 32),
  ('egg',         '계란',       '1F95A', 35),
  ('tofu_legume', '두부/콩류',  '1FAD8', 38),
  ('sauce',       '소스/드레싱', '1FAD9', 115),
  ('oil',         '기름/식초',  '1FAD7', 118),
  ('kimchi',      '김치/반찬',  '1F958', 125),
  ('health',      '건강식품',   '1F48A', 145)
on conflict do nothing;
