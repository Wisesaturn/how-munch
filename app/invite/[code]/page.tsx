import { type Metadata } from 'next';

import Link from 'next/link';

import { createClient } from '@/commons/api/supabase/server';
import { Button } from '@/commons/ui';

import { InvitePage } from '@/pages/invite';

interface InviteRouteProps {
  params: Promise<{ code: string }>;
}

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

export async function generateMetadata({ params }: InviteRouteProps): Promise<Metadata> {
  const { code } = await params;
  const normalizedCode = code.trim().toUpperCase();

  return {
    title: '가구 초대 링크 | How Munch',
    description: `가구 초대 코드(${normalizedCode})가 도착했어요. 링크를 열어 함께 식비/냉장고를 관리해 보세요.`,
    openGraph: {
      title: 'How Munch 가구 초대',
      description: '초대 링크를 열고 우리 가구에 합류하세요.',
      url: `${BASE_URL}/invite/${normalizedCode}`,
      images: [
        {
          url: `${BASE_URL}/android-chrome-512x512.png`,
          width: 512,
          height: 512,
          alt: 'How Munch 초대 이미지',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'How Munch 가구 초대',
      description: '초대 링크를 열고 우리 가구에 합류하세요.',
      images: [`${BASE_URL}/android-chrome-512x512.png`],
    },
  };
}

export default async function InviteRoute({ params }: InviteRouteProps) {
  const { code } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const normalizedCode = code.trim().toUpperCase();
  if (user) {
    await supabase.rpc('ensure_current_user_household_member');
  }

  const { data } = await supabase.rpc('get_invite_household', {
    invite_code: normalizedCode,
  });

  const invite = Array.isArray(data) ? data[0] : null;
  const householdName = invite?.household_name ?? null;
  const isValid = invite?.is_valid ?? false;

  if (!user) {
    return (
      <div className="flex min-h-[70vh] items-center px-4">
        <div className="w-full rounded-xl border bg-white p-4">
          <p className="text-sm text-gray-600">
            <span className="font-semibold">{householdName ?? '가구'}</span> 초대 링크입니다.
            가입하려면 먼저 로그인해 주세요.
          </p>
          <Link href="/" className="mt-3 block">
            <Button className="w-full" color="primary">
              로그인하러 가기
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return <InvitePage code={normalizedCode} householdName={householdName} isValid={isValid} />;
}
