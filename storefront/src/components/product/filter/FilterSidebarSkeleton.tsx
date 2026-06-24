export default function FilterSidebarSkeleton() {
  return (
    <div className="rounded-panel border border-line bg-cream-3 px-5 py-[22px]">
      <div className="mb-4 h-6 w-24 animate-pulse rounded bg-line" />
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="border-t border-line py-4 first:border-t-0">
          <div className="h-4 w-20 animate-pulse rounded bg-line" />
          <div className="mt-3 space-y-2">
            {[1, 2, 3].map((j) => (
              <div key={j} className="h-4 w-full animate-pulse rounded bg-line" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
