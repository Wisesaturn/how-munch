-- ============================================================
-- Allow anonymous invite preview
-- ============================================================

-- 초대 링크 미리보기(가구명/유효성)는 로그인 전에도 조회 가능해야 한다.
grant execute on function public.get_invite_household(text) to anon;
