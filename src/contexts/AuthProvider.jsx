import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { supabaseRetry } from '../lib/fetchWithRetry'
import { clearAllUploads } from '../lib/uploadStore'
import { AuthContext } from './AuthContext'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    // Absolute backstop: never trap the user on the loading spinner if an auth
    // call hangs (e.g. the supabase auth-lock can deadlock getSession).
    const watchdog = setTimeout(() => { if (active) setLoading(false) }, 8000)

    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!active) return
        setUser(session?.user ?? null)
        if (session?.user) await fetchProfile(session.user.id)
        else setLoading(false)
      } catch {
        if (active) setLoading(false)
      }
    }
    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      setUser(session?.user ?? null)
      if (session?.user) {
        // Defer the supabase data call out of the auth callback — calling supabase
        // methods synchronously here can deadlock against the auth lock.
        setTimeout(() => { if (active) fetchProfile(session.user.id) }, 0)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => {
      active = false
      clearTimeout(watchdog)
      subscription.unsubscribe()
    }
  }, [])

  async function fetchProfile(userId) {
    try {
      const { data, error } = await supabaseRetry(() =>
        supabase.from('users').select('*').eq('id', userId).single()
      )
      if (error) throw error
      setProfile(data)
    } catch {
      // Leave profile as-is rather than trapping the user on a spinner.
    } finally {
      setLoading(false)
    }
  }

  async function refreshProfile() {
    if (user) await fetchProfile(user.id)
  }

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signUp(email, password) {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })
    if (error) throw error
  }

  async function signOut() {
    await clearAllUploads().catch(() => {})
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signInWithGoogle, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}
