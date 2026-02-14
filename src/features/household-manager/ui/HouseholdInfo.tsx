import { Card } from '@/commons/ui';

import { type Household } from '@/entities/household';

interface HouseholdInfoProps {
  household: Household;
  memberCount: number;
}

export function HouseholdInfo({ household, memberCount }: HouseholdInfoProps) {
  return (
    <Card>
      <Card.Header>
        <h2 className="text-sm font-semibold">가구 정보</h2>
      </Card.Header>
      <Card.Content className="flex flex-col gap-1 text-sm">
        <p className="font-medium">{household.name}</p>
        <p className="text-gray-500">멤버 {memberCount}명</p>
      </Card.Content>
    </Card>
  );
}
