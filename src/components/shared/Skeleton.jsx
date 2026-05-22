export function SkeletonLine({ className = '' }) {
  return (
    <div className={`bg-[#242424] rounded animate-pulse ${className}`} />
  )
}

export function SkeletonCard({ className = '' }) {
  return (
    <div className={`bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 space-y-3 ${className}`}>
      <SkeletonLine className="h-3 w-3/4" />
      <SkeletonLine className="h-2.5 w-1/2" />
    </div>
  )
}

export function SkeletonJobRow() {
  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 flex items-center gap-4">
      <div className="w-4 h-4 rounded-full bg-[#242424] animate-pulse shrink-0" />
      <div className="flex-1 space-y-2">
        <SkeletonLine className="h-3 w-2/5" />
        <SkeletonLine className="h-2.5 w-1/3" />
      </div>
    </div>
  )
}

export function SkeletonAdminRow() {
  return (
    <tr className="border-b border-[#2a2a2a]/50">
      <td className="px-4 py-2.5"><SkeletonLine className="h-3 w-36" /></td>
      <td className="px-4 py-2.5"><SkeletonLine className="h-3 w-10" /></td>
      <td className="px-4 py-2.5"><SkeletonLine className="h-6 w-24 rounded-md" /></td>
      <td className="px-4 py-2.5"><SkeletonLine className="h-3 w-20" /></td>
    </tr>
  )
}
