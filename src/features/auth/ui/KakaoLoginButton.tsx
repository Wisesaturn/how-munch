'use client';

import { Button } from '@/commons/ui';

import { loginWithKakao } from '../api/login';

function KakaoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M9 1C4.58 1 1 3.79 1 7.21c0 2.17 1.45 4.08 3.64 5.18-.16.56-.58 2.03-.66 2.34-.1.39.14.38.3.28.12-.08 1.94-1.32 2.73-1.86.64.09 1.3.14 1.99.14 4.42 0 8-2.79 8-6.08C17 3.79 13.42 1 9 1Z"
        fill="#191919"
      />
    </svg>
  );
}

export function KakaoLoginButton() {
  return (
    <Button
      type="button"
      onClick={() => loginWithKakao()}
      size="lg"
      className="w-full bg-[#FEE500] text-[#191919] hover:bg-[#FDD800]"
    >
      <KakaoIcon />
      카카오 로그인
    </Button>
  );
}
