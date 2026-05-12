"use client"

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User, Session } from '@supabase/supabase-js'
import type { Profile, TestResult, UserBadge, RIASECType } from '@/lib/types'

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  testResults: TestResult[]
  badges: UserBadge[]
  loading: boolean
  signUp: (email: string, password: string, metadata: SignUpMetadata) => Promise<{ error: Error | null }>
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>
  saveTestResult: (scores: Record<RIASECType, number>, answers: number[]) => Promise<{ error: Error | null }>
  awardBadge: (badgeCode: string) => Promise<void>
}

interface SignUpMetadata {
  display_name: string
  user_type: 'estudante' | 'profissional' | 'ambos'
  birth_date?: string
  lgpd_consent: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [badges, setBadges] = useState<UserBadge[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching profile:', error)
      return null
    }
    return data as Profile
  }, [supabase])

  const fetchTestResults = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('test_results')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching test results:', error)
      return []
    }
    return (data as TestResult[]) || []
  }, [supabase])

  const fetchBadges = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('user_badges')
      .select('*, badges(*)')
      .eq('user_id', userId)
      .order('earned_at', { ascending: false })

    if (error) {
      console.error('Error fetching badges:', error)
      return []
    }
    return (data as UserBadge[]) || []
  }, [supabase])

  const loadUserData = useCallback(async (userId: string) => {
    const [profileData, testData, badgeData] = await Promise.all([
      fetchProfile(userId),
      fetchTestResults(userId),
      fetchBadges(userId)
    ])
    if (profileData) setProfile(profileData)
    setTestResults(testData)
    setBadges(badgeData)
  }, [fetchProfile, fetchTestResults, fetchBadges])

  const refreshProfile = useCallback(async () => {
    if (!user) return
    await loadUserData(user.id)
  }, [user, loadUserData])

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        setSession(session)
        setUser(session.user)
        await loadUserData(session.user.id)
      }

      setLoading(false)
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          await loadUserData(session.user.id)
        } else {
          setProfile(null)
          setTestResults([])
          setBadges([])
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase, loadUserData])

  const signUp = async (email: string, password: string, metadata: SignUpMetadata) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ??
          `${window.location.origin}/auth/callback`,
        data: metadata
      }
    })
    return { error: error ? new Error(error.message) : null }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error ? new Error(error.message) : null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
    setTestResults([])
    setBadges([])
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('Not authenticated') }

    const { error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id)

    if (!error) await refreshProfile()
    return { error: error ? new Error(error.message) : null }
  }

  const saveTestResult = async (scores: Record<RIASECType, number>, answers: number[]) => {
    if (!user) return { error: new Error('Not authenticated') }

    const sortedTypes = (Object.entries(scores) as [RIASECType, number][])
      .sort((a, b) => b[1] - a[1])
      .map(([type]) => type)

    const { error } = await supabase
      .from('test_results')
      .insert({
        user_id: user.id,
        scores,
        primary_type: sortedTypes[0],
        secondary_type: sortedTypes[1] || null,
        tertiary_type: sortedTypes[2] || null,
        answers
      })

    if (!error) {
      await refreshProfile()
      // Award badge for first test
      if (testResults.length === 0) {
        await awardBadge('first_test')
      }
      if (testResults.length === 2) {
        await awardBadge('test_master')
      }
    }

    return { error: error ? new Error(error.message) : null }
  }

  const awardBadge = async (badgeCode: string) => {
    if (!user) return

    const { data: badge } = await supabase
      .from('badges')
      .select('id')
      .eq('code', badgeCode)
      .single()

    if (badge) {
      const { error } = await supabase
        .from('user_badges')
        .insert({ user_id: user.id, badge_id: badge.id })

      if (!error) {
        const updatedBadges = await fetchBadges(user.id)
        setBadges(updatedBadges)
      }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        testResults,
        badges,
        loading,
        signUp,
        signIn,
        signOut,
        refreshProfile,
        updateProfile,
        saveTestResult,
        awardBadge
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}