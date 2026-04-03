import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import api, { configureApiAuth } from '../../services/api'

const HERO_IMAGE = 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1200&q=80'

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

export default function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setUser, setToken, logout } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate(email, password)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})
    setLoading(true)
    try {
      const { data } = await api.post('/auth/patient/login', { email, password })
      configureApiAuth(data.access_token, setToken, logout)
      setToken(data.access_token)
      setUser(data.user)
      navigate(searchParams.get('redirect') || '/dashboard')
    } catch (err) {
      const status = err.response?.status
      setErrors({
        submit: status === 401
          ? 'Invalid email or password.'
          : 'Something went wrong. Please try again.',
      })
      setLoading(false)
    }
  }

  const inputCls = (hasError) =>
    [
      'w-full px-4 py-3 rounded-xl border text-base min-h-[48px]',
      'text-[var(--color-text)] placeholder:text-gray-400 bg-white',
      'focus:outline-none focus:ring-2 focus:border-[var(--color-primary)]',
      hasError
        ? 'border-[var(--color-accent)] focus:ring-[var(--color-accent)]/30'
        : 'border-[var(--color-border)] focus:ring-[var(--color-primary)]/30',
    ].join(' ')

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center px-4 py-14">
      <div className="w-full max-w-4xl flex rounded-2xl overflow-hidden shadow-lg">

        {/* ── Left panel (desktop only) ── */}
        <div
          className="hidden md:flex flex-col justify-center px-10 py-12 w-5/12 relative"
          style={{
            backgroundImage: `url(${HERO_IMAGE})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to bottom, rgba(29,64,156,0.85), rgba(29,64,156,0.65))' }}
          />
          <div className="relative z-10">
            <p className="text-white font-bold text-2xl mb-4">Unicorn</p>
            <h2 className="text-white font-bold text-3xl leading-tight mb-3">
              Welcome back
            </h2>
            <p className="text-white/80 text-base leading-relaxed">
              Sign in to manage your appointments and connect with your care team.
            </p>
          </div>
        </div>

        {/* ── Right panel — form ── */}
        <div className="flex-1 bg-white px-8 py-10">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-primary-light)] mb-2">
              Unicorn
            </p>
            <h1 className="text-2xl font-bold text-[var(--color-text)]">Sign in</h1>
            <p className="text-sm text-[var(--color-muted)] mt-1">Sign in to your patient account to continue.</p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
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

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-[var(--color-accent)]">{errors.password}</p>
              )}
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-6 rounded-xl text-base font-semibold text-white bg-[var(--color-primary)] hover:brightness-110 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed min-h-[48px]"
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
              {errors.submit && (
                <p className="mt-3 text-xs text-[var(--color-accent)] text-center">{errors.submit}</p>
              )}
            </div>
          </form>

          <p className="text-sm text-[var(--color-muted)] text-center mt-7">
            Don't have an account?{' '}
            <Link
              to={searchParams.get('redirect')
                ? `/register?redirect=${searchParams.get('redirect')}`
                : '/register'}
              className="text-[var(--color-primary)] font-medium hover:underline"
            >
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
