import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const { signUp } = useAuth()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signUp(email, password)
      setDone(true)
    } catch (err) {
      setError(err.message || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  if (done) return (
    <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center space-y-4">
        <Sparkles size={32} className="text-[#a855f7] mx-auto" />
        <h2 className="font-display font-semibold text-[#f5f5f5] text-lg">Check your email</h2>
        <p className="text-[#a3a3a3] text-sm">We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.</p>
        <Link to="/login" className="block text-[#a855f7] text-sm hover:underline">Back to login</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Sparkles size={24} className="text-[#a855f7]" />
            <span className="font-display font-semibold text-[#f5f5f5] text-xl">Smalltouch Studio</span>
          </div>
          <p className="text-[#a3a3a3] text-sm">Create your account</p>
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
              minLength={6}
              className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-[#f5f5f5] text-sm placeholder:text-[#a3a3a3] focus:outline-none focus:border-[#a855f7] transition-colors"
              placeholder="6+ characters"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-[#a855f7] hover:bg-[#7c3aed] disabled:opacity-50 text-white font-medium text-sm transition-colors"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-[#a3a3a3] text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-[#a855f7] hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
