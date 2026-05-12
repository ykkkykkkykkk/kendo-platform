export function SkeletonCard({ className = '' }) {
  return (
    <div className={`bg-card rounded-xl animate-pulse ${className}`} />
  );
}

export function SkeletonList({ count = 4 }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} className="h-20" />
      ))}
    </div>
  );
}
