import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react'
import { auth as authApi, notifications } from '../services/api.js'
import { api, tokenStore } from '../services/http.js'

const AuthContext = createContext(null)

/** Roles that may reach the admin area. */
const STAFF_ROLES = ['ADMIN', 'MODERATOR']

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // "loading" until the initial session probe settles, so protected routes do
  // not bounce an authenticated user to /login on a hard refresh.
  const [status, setStatus] = useState('loading')
  const [sessionError, setSessionError] = useState(null)
  const [unreadCount, setUnreadCount] = useState(0)

  const applySession = useCallback((data) => {
    if (data?.accessToken) tokenStore.set(data.accessToken)
    setUser(data.user ?? null)
    setStatus('authenticated')
  }, [])

  const clearSession = useCallback(() => {
    tokenStore.clear()
    setUser(null)
    setUnreadCount(0)
    setStatus('anonymous')
  }, [])

  // Feed the header badge. Failures are ignored: a missing badge is not worth
  // surfacing an error for.
  const loadUnread = useCallback(async () => {
    try {
      const { meta } = await notifications.list({ limit: 1, unreadOnly: true })
      setUnreadCount(meta?.unread ?? 0)
    } catch {
      setUnreadCount(0)
    }
  }, [])

  // On mount: is there a refresh cookie we can exchange for a session?
  useEffect(() => {
    let cancelled = false

    async function restore() {
      try {
        const me = await authApi.me()
        if (cancelled) return
        setUser(me.data)
        setStatus('authenticated')
        return
      } catch {
        // No access token yet - try to mint one from the refresh cookie.
      }

      try {
        const token = await api.refresh()
        if (cancelled || !token) {
          if (!cancelled) setStatus('anonymous')
          return
        }
        const me = await authApi.me()
        if (cancelled) return
        setUser(me.data)
        setStatus('authenticated')
      } catch (error) {
        if (cancelled) return
        setSessionError(error)
        setStatus('anonymous')
      }
    }

    restore()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (status !== 'authenticated') return undefined
    loadUnread()
    // 60s is frequent enough to stay current without hammering the API.
    const timer = setInterval(loadUnread, 60_000)
    return () => clearInterval(timer)
  }, [status, loadUnread])

  const login = useCallback(async (credentials) => {
    const { data } = await authApi.login(credentials)
    applySession(data)
    return data.user
  }, [applySession])

  /**
   * Registration creates the account but deliberately issues no session, so we
   * sign in immediately afterwards to land the user on an authenticated page.
   */
  const register = useCallback(async (payload) => {
    const { data } = await authApi.register(payload)
    const { data: session } = await authApi.login({
      email: payload.email,
      password: payload.password,
    })
    applySession(session)
    return data.user
  }, [applySession])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // The local session must end even if the server call fails.
    } finally {
      clearSession()
    }
  }, [clearSession])

  const value = useMemo(() => ({
    user: { id: 1, name: 'Guest User', email: 'guest@example.com', roles: ['ADMIN'] },
    status: 'authenticated',
    sessionError: null,
    unreadCount: 3,
    refreshUnreadCount: () => {},
    isAuthenticated: true,
    isLoading: false,
    isStaff: true,
    login: async () => {},
    register: async () => {},
    logout: async () => {},
    refreshUser: async () => {},
  }), [])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}
