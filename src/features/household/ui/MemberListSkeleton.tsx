import { Card } from '@/commons/ui';

function MemberListSkeleton() {
  return (
    <Card>
      <Card.Header className="flex flex-row items-center justify-between gap-2">
        <div className="h-5 w-20 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-12 animate-pulse rounded bg-gray-100" />
      </Card.Header>
      <Card.Content className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={`member-skeleton-${index}`}
            className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2"
          >
            <div className="flex min-w-0 items-center gap-2">
              <div className="size-8 animate-pulse rounded-full bg-gray-200" />
              <div className="min-w-0 space-y-1">
                <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
                <div className="h-3 w-28 animate-pulse rounded bg-gray-100" />
              </div>
            </div>
            <div className="h-5 w-12 animate-pulse rounded-full bg-gray-100" />
          </div>
        ))}
      </Card.Content>
    </Card>
  );
}

export { MemberListSkeleton };
