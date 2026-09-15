import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { supabase } from './supabaseClient.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [organization, setOrganization] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null)
      setOrganization(null)
      return
    }

    const { data: profileRow } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    setProfile(profileRow ?? null)

    if (profileRow?.organization_id) {
      const { data: orgRow } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profileRow.organization_id)
        .maybeSingle()
      setOrganization(orgRow ?? null)
    } else {
      setOrganization(null)
    }
  }, [])

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      setSession(data.session)
      await loadProfile(data.session?.user?.id)
      if (active) setLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession)
      await loadProfile(newSession?.user?.id)
    })

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [loadProfile])

  const actions = useMemo(
    () => ({
      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      },
      async signUp(email, password) {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
      },
      async signOut() {
        await supabase.auth.signOut()
      },
      async createOrganization(orgName) {
        const { data, error } = await supabase.rpc('create_organization', { org_name: orgName })
        if (error) throw error
        await loadProfile(session?.user?.id)
        return data
      },
      async joinOrganization(inviteCode) {
        const { data, error } = await supabase.rpc('join_organization', { code: inviteCode })
        if (error) throw error
        await loadProfile(session?.user?.id)
        return data
      },
      async refreshProfile() {
        await loadProfile(session?.user?.id)
      },
    }),
    [loadProfile, session],
  )

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      organization,
      loading,
      ...actions,
    }),
    [session, profile, organization, loading, actions],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
