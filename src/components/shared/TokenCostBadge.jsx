import { Coins } from 'lucide-react'

export default function TokenCostBadge({ cost, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#c5a572]/20 text-[#c5a572] ${className}`}>
      <Coins size={10} />
      {cost}
    </span>
  )
}
