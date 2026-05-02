export function CardSkeleton() {
  return (
    <div
      className="bg-secondary rounded-lg p-3"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 bg-gray-700 rounded-lg animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-gray-700 rounded animate-pulse w-2/3" />
          <div className="h-2 bg-gray-700 rounded animate-pulse w-full" />
        </div>
      </div>
    </div>
  );
}
