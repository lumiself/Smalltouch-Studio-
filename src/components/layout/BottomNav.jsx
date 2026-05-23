import { Link, useLocation } from 'react-router-dom'
import { Home, Sparkles, Image, History, Coins } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const NAV_ITEMS = [
  { path: '/dashboard',   icon: Home,     label: 'Home'     },
  { path: '/retouch',     icon: Sparkles,  label: 'Retouch'  },
  { path: '/background',  icon: Image,     label: 'BG'       },
  { path: '/history',     icon: History,   label: 'History'  },
  { path: '/tokens',      icon: Coins,     label: 'Tokens'   },
]

export default function BottomNav() {
  const { profile } = useAuth()
  const location = useLocation()
  const balance = profile?.token_balance ?? 0
  const isEmpty = balance === 0
  const isLow = balance < 5 && balance > 0

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#1a1a1a] border-t border-[#2a2a2a] flex items-stretch z-50 pb-[env(safe-area-inset-bottom)]">
      {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
        const active = location.pathname === path
        const isTokens = path === '/tokens'
        const tokenColor = isTokens
          ? isEmpty ? 'text-[#ef4444]' : isLow ? 'text-[#f59e0b]' : 'text-[#a855f7]'
          : null

        return (
          <Link
            key={path}
            to={path}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
              active ? 'text-[#a855f7]' : tokenColor ?? 'text-[#555] hover:text-[#a3a3a3]'
            }`}
          >
            <Icon size={19} />
            <span className="text-[10px] font-medium leading-none">
              {isTokens ? balance : label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
