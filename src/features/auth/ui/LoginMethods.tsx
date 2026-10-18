'use client';

import { useRouter } from 'next/navigation';

import { Mail } from 'lucide-react';

import { IS_AIT_BUILD } from '@/commons/config';
import { Button, Separator } from '@/commons/ui';

import { KakaoLoginButton } from './KakaoLoginButton';

export function LoginMethods() {
  const router = useRouter();
  const openEmailLogin = () => router.push('/login/email');

  return (
    <div className="w-full max-w-[280px] space-y-4">
      {/* 앱인토스(.ait)는 토스 로그인 외 소셜 로그인을 쓸 수 없고 OAuth 콜백(Route Handler)도 없어 뺀다 */}
      {!IS_AIT_BUILD && (
        <>
          <KakaoLoginButton />

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <Separator />
            <span className="text-xs font-medium text-gray-400">또는</span>
            <Separator />
          </div>
        </>
      )}

      <Button type="button" variant="outline" className="w-full" onClick={openEmailLogin}>
        <Mail className="size-4" />
        이메일로 로그인
      </Button>
    </div>
  );
}
