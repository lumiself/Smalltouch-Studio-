import { Link, useLocation } from 'react-router-dom'
import { Sparkles, LogOut, Coins, HelpCircle, History, ShieldCheck, Home, Image } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const PANEL_LINKS = [
  { path: '/dashboard',  label: 'Home',       icon: Home     },
  { path: '/retouch',    label: 'Retouch',    icon: Sparkles },
  { path: '/background', label: 'Background', icon: Image    },
  { path: '/history',    label: 'History',    icon: History  },
]

export default function Navbar() {
  const { user, profile, signOut } = useAuth()
  const location = useLocation()
  const balance = profile?.token_balance ?? 0
  const isLow = balance < 5 && balance > 0
  const isEmpty = balance === 0
  const isAdmin = user?.email && import.meta.env.VITE_ADMIN_EMAIL && user.email === import.meta.env.VITE_ADMIN_EMAIL

  return (
    <nav className="h-14 bg-ink-soft border-b border-luxe-border flex items-center justify-between px-4 shrink-0">
      {/* Logo */}
      <Link to="/dashboard" className="flex items-center gap-2 shrink-0">
        <Sparkles size={18} className="text-gold" />
        <span className="font-serif font-medium text-[#f2ede2] text-base tracking-wide">Smalltouch Studio</span>
      </Link>

      {/* Desktop panel nav — hidden on mobile (BottomNav handles it) */}
      <div className="hidden md:flex items-center gap-1 ml-6">
        {PANEL_LINKS.map(({ path, label, icon: Icon }) => {
          const active = location.pathname === path || location.pathname.startsWith(path + '/')
          return (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                active
                  ? 'bg-gold/15 text-gold'
                  : 'text-[#6b665c] hover:text-[#c9c2b4] hover:bg-ink-card'
              }`}
            >
              <Icon size={13} />
              {label}
            </Link>
          )
        })}
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-3 ml-auto">
        {isAdmin && (
          <Link
            to="/admin"
            className={`flex items-center gap-1 text-xs transition-colors ${location.pathname.startsWith('/admin') ? 'text-gold' : 'text-[#a3a3a3] hover:text-[#f5f5f5]'}`}
          >
            <ShieldCheck size={14} />
            <span className="hidden sm:inline">Admin</span>
          </Link>
        )}
        <Link
          to="/help"
          className={`flex items-center gap-1 text-xs transition-colors ${location.pathname === '/help' ? 'text-gold' : 'text-[#a3a3a3] hover:text-[#f5f5f5]'}`}
        >
          <HelpCircle size={14} />
          <span className="hidden sm:inline">Help</span>
        </Link>

        <Link
          to="/tokens"
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
            isEmpty ? 'bg-[#ef4444]/20 text-[#ef4444]' :
            isLow   ? 'bg-[#f59e0b]/20 text-[#f59e0b]' :
                      'bg-gold/15 text-gold'
          }`}
        >
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
