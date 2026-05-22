import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Sparkles size={24} className="text-[#a855f7]" />
            <span className="font-display font-semibold text-[#f5f5f5] text-xl">Smalltouch Studio</span>
          </div>
          <p className="text-[#a3a3a3] text-sm">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-lg p-3 text-[#ef4444] text-sm">
              {error}
            </div>
          )}
          <div className="space-y-1">
            <label className="text-[#a3a3a3] text-xs font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-[#f5f5f5] text-sm placeholder:text-[#a3a3a3] focus:outline-none focus:border-[#a855f7] transition-colors"
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[#a3a3a3] text-xs font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-[#f5f5f5] text-sm placeholder:text-[#a3a3a3] focus:outline-none focus:border-[#a855f7] transition-colors"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-[#a855f7] hover:bg-[#7c3aed] disabled:opacity-50 text-white font-medium text-sm transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-[#a3a3a3] text-sm">
          No account?{' '}
          <Link to="/signup" className="text-[#a855f7] hover:underline">Create one</Link>
        </p>
      </div>
    </div>
  )
}
