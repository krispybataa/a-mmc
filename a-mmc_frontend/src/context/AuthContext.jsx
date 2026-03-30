import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import api, { configureApiAuth } from '../services/api'

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
        const { data } = await api.post('/auth/refresh')
        setToken(data.access_token)
        setUser(data.user)
      } catch {
        // No valid session — start unauthenticated
      } finally {
        setAuthLoading(false)
      }
    }
    tryRestore()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthContext.Provider value={{ user, token, setUser, setToken, logout, authLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
