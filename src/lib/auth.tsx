import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { Profile } from '../types/database'

type AuthContextValue = {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(userId: string) {
    if (!supabase) return null
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    if (error) throw error
    setProfile(data as Profile | null)
    return data as Profile | null
  }

  async function refreshProfile() {
    if (!session?.user.id) return
    await loadProfile(session.user.id)
  }

  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    let alive = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return
      setSession(data.session)
      if (data.session?.user.id) {
        try { await loadProfile(data.session.user.id) } catch { setProfile(null) }
      }
      if (alive) setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (!nextSession) { setProfile(null); setLoading(false); return }
      setLoading(true)
      // Defer the profile query to avoid calling Supabase while its auth lock is held.
      window.setTimeout(() => { void loadProfile(nextSession.user.id).catch(() => setProfile(null)).finally(() => setLoading(false)) }, 0)
    })
    return () => { alive = false; listener.subscription.unsubscribe() }
  }, [])

  async function signIn(email: string, password: string) {
    if (!supabase) throw new Error('Supabase is not configured. Add the environment variables first.')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signOut() {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const value = useMemo(() => ({ session, user: session?.user ?? null, profile, loading, signIn, signOut, refreshProfile }), [session, profile, loading])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
