import { useState, useEffect } from 'react'
import { WifiOff, RefreshCw, CheckCircle } from 'lucide-react'

export default function NetworkBanner() {
  const [state, setState] = useState(null) // null | 'offline' | 'retrying' | 'restored'

  useEffect(() => {
    function onOffline() { setState('offline') }
    function onOnline() { setState(prev => prev !== null ? 'restored' : null) }
    function onRetrying() { setState(prev => prev === 'offline' ? 'offline' : 'retrying') }
    function onRetryDone(e) {
      if (e.detail?.success) {
        setState(prev => prev === 'retrying' ? 'restored' : prev)
      } else {
        setState(prev => prev === 'retrying' ? null : prev)
      }
    }

    window.addEventListener('offline', onOffline)
    window.addEventListener('online', onOnline)
    window.addEventListener('network-retrying', onRetrying)
    window.addEventListener('network-retry-done', onRetryDone)
    return () => {
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('network-retrying', onRetrying)
      window.removeEventListener('network-retry-done', onRetryDone)
    }
  }, [])

  useEffect(() => {
    if (state !== 'restored') return
    const t = setTimeout(() => setState(null), 3000)
    return () => clearTimeout(t)
  }, [state])

  if (!state) return null

  const config = {
    offline:  { icon: WifiOff,     text: 'Connection lost — retrying…', cls: 'bg-[#ef4444]/15 border-[#ef4444]/30 text-[#ef4444]' },
    retrying: { icon: RefreshCw,   text: 'Reconnecting…',               cls: 'bg-[#f97316]/15 border-[#f97316]/30 text-[#f97316]', spin: true },
    restored: { icon: CheckCircle, text: 'Connection restored',          cls: 'bg-[#22c55e]/15 border-[#22c55e]/30 text-[#22c55e]' },
  }
  const { icon: Icon, text, cls, spin } = config[state]

  return (
    <div className={`flex items-center justify-center gap-2 px-3 py-1.5 text-xs border-b ${cls}`}>
      <Icon size={13} className={spin ? 'animate-spin' : ''} />
      {text}
    </div>
  )
}
