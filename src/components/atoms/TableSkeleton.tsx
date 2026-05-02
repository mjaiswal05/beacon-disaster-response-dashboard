interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps) {
  return (
    <div
      className="bg-card border border-border rounded-lg overflow-hidden"
      aria-busy="true"
      aria-label="Loading table"
    >
      <div className="border-b border-border px-4 py-3 flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={i}
            className="h-3 bg-secondary rounded animate-pulse flex-1"
          />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="border-b border-border px-4 py-3 flex gap-4">
          {Array.from({ length: columns }).map((_, c) => (
            <div
              key={c}
              className="h-4 bg-secondary rounded animate-pulse flex-1"
            />
          ))}
        </div>
      ))}
    </div>
  );
}
