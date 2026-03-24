export default function Loading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6">
      <div className="mx-auto w-full max-w-3xl">
        {/* Header skeleton */}
        <div className="mb-8 flex items-center justify-between">
          <div className="h-6 w-28 rounded-lg animate-shimmer" />
          <div className="flex gap-4">
            <div className="h-4 w-20 rounded-lg animate-shimmer" />
            <div className="h-4 w-16 rounded-lg animate-shimmer" />
          </div>
        </div>

        {/* Title skeleton */}
        <div className="space-y-4 text-center">
          <div className="mx-auto h-8 w-64 rounded-lg animate-shimmer" />
          <div className="mx-auto h-4 w-48 rounded-lg animate-shimmer" />
        </div>

        {/* Content skeleton */}
        <div className="mt-12 space-y-6">
          <div className="h-4 w-full rounded-lg animate-shimmer" />
          <div className="h-4 w-5/6 rounded-lg animate-shimmer" />
          <div className="h-4 w-4/6 rounded-lg animate-shimmer" />
          <div className="h-4 w-full rounded-lg animate-shimmer" />
          <div className="h-4 w-3/4 rounded-lg animate-shimmer" />
        </div>
      </div>
    </div>
  );
}
