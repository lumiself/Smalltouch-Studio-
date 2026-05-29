import { useState, startTransition } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

function yieldToMain() {
  return new Promise(r => setTimeout(r, 0))
}

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [done, setDone] = useState(false)
  const { signUp, signInWithGoogle } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    startTransition(() => setError(''))
    setLoading(true)
    await yieldToMain()
    try {
      await signUp(email, password)
      setDone(true)
    } catch (err) {
      startTransition(() => setError(err.message || 'Signup failed'))
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    startTransition(() => setError(''))
    setGoogleLoading(true)
    await yieldToMain()
    try {
      await signInWithGoogle()
    } catch (err) {
      startTransition(() => setError(err.message || 'Google sign-in failed'))
      setGoogleLoading(false)
    }
  }

  if (done) return (
    <div className="min-h-screen bg-[#0a0908] flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center space-y-4">
        <Sparkles size={32} className="text-[#c5a572] mx-auto" />
        <h2 className="font-serif font-semibold text-[#f2ede2] text-lg">Check your email</h2>
        <p className="text-[#9a9387] text-sm">We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.</p>
        <Link to="/login" className="block text-[#c5a572] text-sm hover:underline">Back to login</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0a0908] flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Sparkles size={24} className="text-[#c5a572]" />
            <span className="font-serif font-semibold text-[#f2ede2] text-xl">Smalltouch Studio</span>
          </div>
          <p className="text-[#9a9387] text-sm">Create your account</p>
        </div>

        <button
          onClick={handleGoogle}
          disabled={googleLoading || loading}
          className="w-full flex items-center justify-center gap-3 py-2.5 rounded-lg bg-[#121110] hover:bg-[#16140f] border border-[#2b271f] hover:border-[#3a352b] text-[#f2ede2] font-medium text-sm transition-colors disabled:opacity-50"
        >
          <GoogleIcon />
          {googleLoading ? 'Redirecting...' : 'Continue with Google'}
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-[#2b271f]" />
          <span className="text-[#6b665c] text-xs">or</span>
          <div className="flex-1 h-px bg-[#2b271f]" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-lg p-3 text-[#ef4444] text-sm">
              {error}
            </div>
          )}
          <div className="space-y-1">
            <label className="text-[#9a9387] text-xs font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2.5 bg-[#121110] border border-[#2b271f] rounded-lg text-[#f2ede2] text-sm placeholder:text-[#9a9387] focus:outline-none focus:border-[#c5a572] transition-colors"
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[#9a9387] text-xs font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2.5 bg-[#121110] border border-[#2b271f] rounded-lg text-[#f2ede2] text-sm placeholder:text-[#9a9387] focus:outline-none focus:border-[#c5a572] transition-colors"
              placeholder="6+ characters"
            />
          </div>
          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full py-2.5 rounded-lg bg-[#c5a572] hover:bg-[#9b7d4c] disabled:opacity-50 text-[#0a0908] font-medium text-sm transition-colors"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-[#9a9387] text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-[#c5a572] hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}
