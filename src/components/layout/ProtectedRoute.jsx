import { Navigate } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

export default function ProtectedRoute({ children }) {
  const { user, loading, signOut } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0908] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#c5a572] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (!user.email_confirmed_at) {
    return (
      <div className="min-h-screen bg-[#0a0908] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#121110] border border-[#2b271f] rounded-xl p-8 text-center">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#c5a572]/15 mx-auto mb-4">
            <Mail size={24} className="text-[#c5a572]" />
          </div>
          <h2 className="text-white text-xl font-semibold mb-2">Confirm your email</h2>
          <p className="text-[#9a9387] text-sm mb-1">
            We sent a confirmation link to
          </p>
          <p className="text-white text-sm font-medium mb-6">{user.email}</p>
          <p className="text-[#6b665c] text-xs mb-6">
            Check your inbox (and spam folder) and click the link to activate your account.
          </p>
          <button
            onClick={signOut}
            className="text-[#6b665c] text-sm hover:text-[#9a9387] transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    )
  }

  return children
}
