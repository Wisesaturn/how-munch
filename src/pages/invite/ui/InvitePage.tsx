import Link from 'next/link';

import { Button, Card } from '@/commons/ui';

import { InviteJoinButton } from './InviteJoinButton';

interface InvitePageProps {
  code: string;
  householdName: string | null;
  isValid: boolean;
}

export function InvitePage({ code, householdName, isValid }: InvitePageProps) {
  if (!isValid) {
    return (
      <div className="flex min-h-[70vh] items-center px-4">
        <Card className="w-full">
          <Card.Header>
            <h1 className="text-base font-semibold">초대 코드가 유효하지 않습니다</h1>
          </Card.Header>
          <Card.Content className="flex flex-col gap-3 text-sm text-gray-500">
            <p>코드가 만료되었거나 사용 가능한 횟수를 초과했습니다.</p>
            <Link href="/profile">
              <Button variant="outline" className="w-full">
                프로필로 이동
              </Button>
            </Link>
          </Card.Content>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] items-center px-4">
      <Card className="w-full">
        <Card.Header>
          <h1 className="text-base font-semibold">가구 초대</h1>
        </Card.Header>
        <Card.Content className="flex flex-col gap-3">
          <p className="text-sm text-gray-600">
            <span className="font-semibold">{householdName ?? '초대된 가구'}</span>에
            초대되었습니다.
          </p>
          <p className="text-xs text-gray-500">코드: {code}</p>
          <InviteJoinButton code={code} />
        </Card.Content>
      </Card>
    </div>
  );
}
