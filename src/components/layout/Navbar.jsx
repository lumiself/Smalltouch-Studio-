import { Link, useLocation } from 'react-router-dom'
import { Sparkles, LogOut, Coins, HelpCircle, History } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

export default function Navbar() {
  const { profile, signOut } = useAuth()
  const location = useLocation()
  const balance = profile?.token_balance ?? 0
  const isLow = balance < 5 && balance > 0
  const isEmpty = balance === 0

  return (
    <nav className="h-14 bg-[#1a1a1a] border-b border-[#2a2a2a] flex items-center justify-between px-4 shrink-0">
      <Link to="/dashboard" className="flex items-center gap-2">
        <Sparkles size={18} className="text-[#a855f7]" />
        <span className="font-display font-semibold text-[#f5f5f5] text-sm tracking-wide">Smalltouch Studio</span>
      </Link>

      <div className="flex items-center gap-4">
        <Link to="/help" className={`text-xs flex items-center gap-1 transition-colors ${location.pathname === '/help' ? 'text-[#a855f7]' : 'text-[#a3a3a3] hover:text-[#f5f5f5]'}`}>
          <HelpCircle size={14} />
          <span>Help</span>
        </Link>
        <Link to="/history" className={`text-xs flex items-center gap-1 transition-colors ${location.pathname === '/history' ? 'text-[#a855f7]' : 'text-[#a3a3a3] hover:text-[#f5f5f5]'}`}>
          <History size={14} />
          <span>History</span>
        </Link>

        <Link to="/tokens" className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
          isEmpty ? 'bg-[#ef4444]/20 text-[#ef4444]' :
          isLow  ? 'bg-[#f59e0b]/20 text-[#f59e0b]' :
                   'bg-[#a855f7]/20 text-[#a855f7]'
        }`}>
          <Coins size={12} />
          <span>{balance} tokens</span>
        </Link>

        <button onClick={signOut} className="text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors">
          <LogOut size={16} />
        </button>
      </div>
    </nav>
  )
}
