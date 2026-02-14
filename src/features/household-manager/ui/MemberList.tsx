import { Badge, Card } from '@/commons/ui';

import { type HouseholdMemberWithProfile } from '@/entities/household';

interface MemberListProps {
  members: HouseholdMemberWithProfile[];
}

export function MemberList({ members }: MemberListProps) {
  return (
    <Card>
      <Card.Header>
        <h2 className="text-sm font-semibold">멤버 목록</h2>
      </Card.Header>
      <Card.Content className="flex flex-col gap-2">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between gap-2 rounded-lg border p-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{member.nickname}</p>
              <p className="truncate text-xs text-gray-500">{member.email}</p>
            </div>
            <Badge variant={member.role === 'owner' ? 'default' : 'secondary'}>
              {member.role === 'owner' ? 'owner' : 'member'}
            </Badge>
          </div>
        ))}
      </Card.Content>
    </Card>
  );
}
