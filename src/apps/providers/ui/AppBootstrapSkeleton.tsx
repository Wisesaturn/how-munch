'use client';

/** 앱 부트스트랩 구간의 전역 스켈레톤 */
export function AppBootstrapSkeleton() {
  return (
    <div className="flex h-dvh flex-col bg-white">
      <div className="px-4 pt-4 pb-3">
        <div className="h-8 w-28 animate-pulse rounded-md bg-gray-200" />
      </div>

      <div className="flex-1 space-y-4 px-4 pt-1">
        <div className="h-20 animate-pulse rounded-2xl bg-gray-100" />
        <div className="h-12 animate-pulse rounded-xl bg-gray-100" />
        <div className="h-24 animate-pulse rounded-2xl bg-gray-100" />
        <div className="h-24 animate-pulse rounded-2xl bg-gray-100" />
      </div>

      <div className="flex items-center justify-around border-t border-gray-100 px-4 py-3">
        <div className="h-8 w-14 animate-pulse rounded-md bg-gray-100" />
        <div className="h-8 w-14 animate-pulse rounded-md bg-gray-100" />
        <div className="h-8 w-14 animate-pulse rounded-md bg-gray-100" />
        <div className="h-8 w-14 animate-pulse rounded-md bg-gray-100" />
      </div>
    </div>
  );
}
