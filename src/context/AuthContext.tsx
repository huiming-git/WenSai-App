import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { getMe } from '../api/auth'
import { User } from '../types'

interface AuthContextValue {
  user: User | null
  loading: boolean
  loginSuccess: (token: string, userData: User) => void
  refreshUser: () => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState<boolean>(() => Boolean(localStorage.getItem('token')))

  useEffect(() => {
    if (!loading) return

    let active = true

    getMe()
      .then((res) => {
        if (active) setUser(res.data)
      })
      .catch(() => localStorage.removeItem('token'))
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [loading])

  const refreshUser = async () => {
    const res = await getMe()
    setUser(res.data)
  }

  const loginSuccess = (token: string, userData: User) => {
    localStorage.setItem('token', token)
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, loginSuccess, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
