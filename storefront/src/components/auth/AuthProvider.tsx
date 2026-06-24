'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

export interface CustomerProfile {
  email: string
  firstName: string | null
  lastName: string | null
  roles?: string[]
}

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface AuthContextValue {
  status: AuthStatus
  profile: CustomerProfile | null
  /** Giris/cikis sonrasi oturum durumunu yeniden cek. */
  refresh: () => Promise<void>
  /** Cikista yerel durumu hemen sifirla (sunucuya gitmeden). */
  reset: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// Oturum durumu (/api/account/me) tek bir yerde tutulur; tum tuketiciler bunu paylasir.
// Boylece her navigasyonda/bilesende ayri ayri /me cagrilmaz; durum yalnizca uygulama
// acilisinda ve giris/cikis gibi olaylarda yenilenir.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [profile, setProfile] = useState<CustomerProfile | null>(null)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/account/me', {
        cache: 'no-store',
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      })
      if (res.ok) {
        setProfile((await res.json()) as CustomerProfile)
        setStatus('authenticated')
      } else {
        setProfile(null)
        setStatus('unauthenticated')
      }
    } catch {
      setProfile(null)
      setStatus('unauthenticated')
    }
  }, [])

  const reset = useCallback(() => {
    setProfile(null)
    setStatus('unauthenticated')
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return (
    <AuthContext.Provider value={{ status, profile, refresh, reset }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
