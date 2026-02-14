export default function MainLoading() {
  return (
    <div className="flex flex-col gap-4 px-4 py-5">
      <div className="h-6 w-24 animate-pulse rounded-md bg-gray-200" />
      <div className="h-10 w-full animate-pulse rounded-md bg-gray-100" />
      <div className="h-24 w-full animate-pulse rounded-xl bg-gray-100" />
      <div className="h-24 w-full animate-pulse rounded-xl bg-gray-100" />
      <div className="h-24 w-full animate-pulse rounded-xl bg-gray-100" />
    </div>
  );
}
