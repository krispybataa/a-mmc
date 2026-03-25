import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const MOCK_USER = {
  patient_id: 1,
  first_name: 'Augustus',
  last_name: 'Rodriguez',
  email: 'aug@mmc.com.ph',
  role: 'patient',
}

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
  const { setUser } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    const errs = validate(email, password)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setErrors({})
    setLoading(true)
    setTimeout(() => {
      setUser(MOCK_USER)
      const redirect = searchParams.get('redirect')
      navigate(redirect || '/dashboard')
    }, 300)
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
            <h1 className="text-2xl font-bold text-[var(--color-dark)]">Welcome back</h1>
            <p className="text-sm text-slate-400 mt-1">Sign in to your patient account to continue.</p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">

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

          <p className="text-sm text-slate-500 text-center mt-7">
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
