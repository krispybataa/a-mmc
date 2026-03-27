import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import api, { configureApiAuth } from '../../services/api'

// Role options — radio/segmented control, not a dropdown
const ROLES = [
  { value: 'clinician', label: 'Clinician' },
  { value: 'secretary', label: 'Secretary' },
]

function validate(email, password) {
  const errs = {}
  if (!email.trim()) {
    errs.email = 'Email address is required.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errs.email = 'Please enter a valid email address.'
  }
  if (!password) {
    errs.password = 'Password is required.'
  }
  return errs
}

export default function StaffLogin() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setUser, setToken, logout } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [role, setRole] = useState('clinician')
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate(email, password)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setErrors({})
    setServerError('')
    setLoading(true)

    try {
      const { data } = await api.post(`/api/auth/${role}/login`, {
        email: email.trim(),
        password,
      })
      configureApiAuth(data.access_token, setToken, logout)
      setToken(data.access_token)
      setUser(data.user)
      const redirect = searchParams.get('redirect')
      navigate(redirect || '/clinician-dashboard', { replace: true })
    } catch (err) {
      setServerError(
        err.response?.status === 401
          ? 'Invalid email or password.'
          : 'Something went wrong. Please try again.',
      )
    } finally {
      setLoading(false)
    }
  }

  const inputCls = (hasError) =>
    [
      'w-full px-4 py-3 rounded-lg border text-sm',
      'text-[var(--color-dark)] placeholder:text-slate-400',
      'focus:outline-none focus:ring-2 focus:border-transparent',
      hasError
        ? 'border-[var(--color-accent)] focus:ring-[var(--color-accent)]'
        : 'border-slate-200 focus:ring-[var(--color-primary)]',
    ].join(' ')

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-14">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-8 py-10">

          {/* Header */}
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-primary-light)] mb-2">
              Makati Medical Center
            </p>
            <h1 className="text-2xl font-bold text-[var(--color-dark)]">Staff Login</h1>
            <p className="text-sm text-slate-400 mt-1">Sign in to your staff account to continue.</p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">

            {/* Role selector — segmented control */}
            <div>
              <p className="text-sm font-medium text-[var(--color-dark)] mb-2">
                Role
                <span className="text-[var(--color-accent)] ml-0.5">*</span>
              </p>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map(({ value, label }) => (
                  <label
                    key={value}
                    className={[
                      'flex items-center justify-center gap-2 px-4 py-3 rounded-lg border cursor-pointer',
                      'text-sm font-medium transition-colors duration-150 min-h-[44px]',
                      role === value
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                        : 'border-slate-200 text-[var(--color-dark)] hover:border-[var(--color-primary-light)]',
                    ].join(' ')}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={value}
                      checked={role === value}
                      onChange={() => setRole(value)}
                      className="sr-only"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[var(--color-dark)] mb-1.5">
                Email address
                <span className="text-[var(--color-accent)] ml-0.5">*</span>
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }))
                }}
                placeholder="you@example.com"
                className={inputCls(!!errors.email)}
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-[var(--color-accent)]">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[var(--color-dark)] mb-1.5">
                Password
                <span className="text-[var(--color-accent)] ml-0.5">*</span>
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }))
                  }}
                  placeholder="Enter your password"
                  className={inputCls(!!errors.password) + ' pr-12'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-[var(--color-accent)]">{errors.password}</p>
              )}
            </div>

            {/* Server error */}
            {serverError && (
              <p className="text-sm text-[var(--color-accent)]">{serverError}</p>
            )}

            {/* Submit */}
            <div className="pt-1">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-6 rounded-lg text-sm font-semibold text-white bg-[var(--color-primary)] hover:opacity-90 transition-opacity duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </div>
          </form>

          {/* Patient link */}
          <p className="text-sm text-slate-400 text-center mt-7">
            Patient?{' '}
            <Link
              to="/login"
              className="text-[var(--color-primary)] font-medium hover:underline"
            >
              Sign in here
            </Link>
          </p>

        </div>
      </div>
    </div>
  )
}
