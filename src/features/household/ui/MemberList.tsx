import { Card } from '@/commons/ui';

import { type HouseholdMemberWithProfile } from '@/entities/household';

interface MemberListProps {
  members: HouseholdMemberWithProfile[];
}

export function MemberList({ members }: MemberListProps) {
  const sortedMembers = [...members].sort((a, b) => {
    if (a.role === b.role) return 0;
    return a.role === 'owner' ? -1 : 1;
  });

  return (
    <Card>
      <Card.Header className="flex flex-row items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">멤버 목록</h2>
        <p className="text-xs text-gray-500">총 {members.length}명</p>
      </Card.Header>
      <Card.Content className="flex flex-col gap-2">
        {sortedMembers.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-700">
                {member.nickname.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{member.nickname}</p>
                <p className="truncate text-xs text-gray-500">{member.email}</p>
              </div>
            </div>
            <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-600">
              {member.role === 'owner' ? '소유자' : '멤버'}
            </span>
          </div>
        ))}
      </Card.Content>
    </Card>
  );
}
