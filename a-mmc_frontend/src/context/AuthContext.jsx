import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import api, { configureApiAuth, setMountingState, getCsrfCookie } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  // authLoading is true until the silent refresh attempt on mount completes.
  // Components that need auth state should gate rendering on !authLoading.
  const [authLoading, setAuthLoading] = useState(true)

  // ---------------------------------------------------------------------------
  // logout — POST to clear the httpOnly cookie, then wipe local state.
  // Redirect destination is role-based: staff roles go to /staff/login,
  // patients go to /login.
  // window.location.href is used instead of useNavigate because AuthProvider
  // lives outside BrowserRouter (see main.jsx). A hard navigation also
  // ensures all in-memory state is fully cleared.
  // ---------------------------------------------------------------------------
  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // Ignore — we always clear local state regardless of server response
    }
    setUser(null)
    setToken(null)
    const isStaff = user?.role === 'clinician' || user?.role === 'secretary'
    window.location.href = isStaff ? '/staff/login' : '/login'
  }, [user])

  // ---------------------------------------------------------------------------
  // Keep api.js auth refs in sync with React state.
  // Runs whenever token or logout changes.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    configureApiAuth(token, setToken, logout)
  }, [token, logout])

  // ---------------------------------------------------------------------------
  // Silent refresh on mount — attempt to restore session from the httpOnly
  // refresh cookie left by a previous login. If the cookie is present and
  // valid, the backend returns a fresh access token and user object.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    async function tryRestore() {
      try {
        const { data } = await api.post('/auth/refresh', null, {
          headers: { 'X-CSRF-Token': getCsrfCookie() ?? '' },
        })
        setToken(data.access_token)
        setUser(data.user)
      } catch {
        // No valid session — treat as unauthenticated visitor. Do NOT call
        // logout() here: that would redirect the user before they've done
        // anything. ProtectedRoute handles redirects when auth is required.
        setToken(null)
        setUser(null)
      } finally {
        setMountingState(false)
        setAuthLoading(false)
      }
    }
    tryRestore()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh the user's first/last name from the API after a profile update.
  // Only applicable to patients. Non-critical — errors are silently ignored.
  const refreshUser = useCallback(async () => {
    if (!user?.id || user?.role !== 'patient') return
    try {
      const { data } = await api.get(`/patients/${user.id}`)
      setUser(prev => ({ ...prev, first_name: data.first_name, last_name: data.last_name }))
    } catch {
      // non-critical
    }
  }, [user?.id, user?.role])

  return (
    <AuthContext.Provider value={{ user, token, setUser, setToken, logout, authLoading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
