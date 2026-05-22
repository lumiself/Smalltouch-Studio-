import { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = crypto.randomUUID()
    setToasts(prev => [...prev.slice(-4), { id, message, type }])
    setTimeout(() => dismiss(id), duration)
  }, [dismiss])

  const toast = {
    success: (msg) => addToast(msg, 'success'),
    error: (msg, dur) => addToast(msg, 'error', dur ?? 5000),
    info: (msg) => addToast(msg, 'info'),
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-20 md:bottom-4 right-4 z-50 space-y-2 pointer-events-none w-72">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onDismiss }) {
  const config = {
    success: { icon: CheckCircle, color: 'text-[#22c55e]', bg: 'bg-[#1a1a1a] border-[#22c55e]/30' },
    error:   { icon: XCircle,    color: 'text-[#ef4444]', bg: 'bg-[#1a1a1a] border-[#ef4444]/30' },
    info:    { icon: Info,       color: 'text-[#a855f7]', bg: 'bg-[#1a1a1a] border-[#a855f7]/30' },
  }
  const { icon: Icon, color, bg } = config[toast.type] ?? config.info

  return (
    <div
      className={`pointer-events-auto flex items-start gap-2.5 px-3 py-2.5 rounded-xl border shadow-lg ${bg} animate-in slide-in-from-right-4 duration-200`}
    >
      <Icon size={15} className={`${color} shrink-0 mt-0.5`} />
      <p className="text-[#f5f5f5] text-xs flex-1 leading-relaxed">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-[#555] hover:text-[#a3a3a3] transition-colors shrink-0"
      >
        <X size={13} />
      </button>
    </div>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
