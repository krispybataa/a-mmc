import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  withCredentials: true, // required for httpOnly refresh cookie
})

// ---------------------------------------------------------------------------
// Auth state bridge
// api.js is a plain module — it cannot use React hooks. AuthContext calls
// configureApiAuth() whenever token or logout changes, keeping these refs
// in sync with React state without coupling the module to the component tree.
// ---------------------------------------------------------------------------

let _token = null
let _setToken = null
let _logout = null
let _isRefreshing = false

export function configureApiAuth(token, setToken, logout) {
  _token = token
  _setToken = setToken
  _logout = logout
}

// ---------------------------------------------------------------------------
// Request interceptor — attach Bearer token if present
// ---------------------------------------------------------------------------

api.interceptors.request.use((config) => {
  if (_token) {
    config.headers.Authorization = `Bearer ${_token}`
  }
  return config
})

// ---------------------------------------------------------------------------
// Response interceptor — silent refresh on 401
//
// On a 401 from any endpoint except /auth/refresh itself:
//   1. Attempt POST /api/auth/refresh (uses httpOnly cookie)
//   2. On success: update token in api module + React state, retry original request
//   3. On failure: call logout() to clear session
//
// _isRefreshing prevents concurrent refresh attempts from stacking up.
// ---------------------------------------------------------------------------

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    const is401 = error.response?.status === 401
    const isRefreshEndpoint = original.url?.includes('/auth/refresh')
    const alreadyRetried = original._retry === true

    if (is401 && !isRefreshEndpoint && !alreadyRetried) {
      if (_isRefreshing) {
        // Another refresh is in flight — don't stack; surface the error
        return Promise.reject(error)
      }

      original._retry = true
      _isRefreshing = true

      try {
        const { data } = await api.post('/auth/refresh')
        const newToken = data.access_token

        // Update module-level ref immediately so the retried request uses it
        _token = newToken
        // Propagate to React state so components and future requests stay in sync
        _setToken?.(newToken)

        original.headers.Authorization = `Bearer ${newToken}`
        _isRefreshing = false
        return api(original)
      } catch {
        _isRefreshing = false
        _logout?.()
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  }
)

export default api
