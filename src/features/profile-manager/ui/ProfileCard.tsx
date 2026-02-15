import { Card } from '@/commons/ui';

import { type Profile } from '@/entities/profile';

interface ProfileCardProps {
  profile: Profile;
}

export function ProfileCard({ profile }: ProfileCardProps) {
  return (
    <Card>
      <Card.Header className="flex flex-row items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">내 정보</h2>
      </Card.Header>
      <Card.Content className="flex flex-col gap-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-500">닉네임</span>
          <span className="font-medium">{profile.nickname}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500">이메일</span>
          <span className="max-w-[220px] truncate font-medium">{profile.email}</span>
        </div>
      </Card.Content>
    </Card>
  );
}
