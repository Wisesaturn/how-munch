import Link from 'next/link';

import { Button } from '@/commons/ui';

import { EmailOtpForm, LoginInfoGroup } from '@/features/auth';

export function LoginEmailPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4">
      <LoginInfoGroup
        title="이메일 로그인"
        description="이메일을 입력하고 인증번호를 받아 로그인하세요"
      />
      <EmailOtpForm />
      <Link href="/login" className="w-full max-w-[320px]">
        <Button variant="ghost" className="w-full">
          로그인 방식 선택으로 돌아가기
        </Button>
      </Link>
    </main>
  );
}
