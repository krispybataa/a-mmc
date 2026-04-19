import { useRef, useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Close dropdown on any click outside it
  useEffect(() => {
    if (!open) return
    function handler(e) {
      if (!dropdownRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function handleSignOut() {
    setOpen(false)
    logout()
    navigate('/')
  }

  const initials = user
    ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    : ''

  const showBackLink = user?.role === 'patient' && (
    pathname === '/dashboard/appointments' ||
    pathname === '/dashboard/profile' ||
    pathname.startsWith('/book/')
  )

  return (
    <header className="sticky top-0 z-50 navbar-gradient h-16 flex items-center">
      <div className="max-w-5xl mx-auto px-6 w-full flex items-center justify-between">

        {/* Left: wordmark + contextual back link for patient subpages */}
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="text-white font-bold text-lg tracking-tight hover:opacity-80 transition-opacity"
          >
            Unicorn
          </Link>
          {showBackLink && (
            <Link
              to="/dashboard"
              className="flex items-center gap-1 text-sm text-white/60 hover:text-white/90 transition-colors min-h-[44px]"
            >
              <ChevronLeft size={15} />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
          )}
        </div>

        {/* Right side */}
        {user ? (
          /* Authenticated */
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
              aria-label="Account menu"
            >
              <span className="text-sm font-medium text-white hidden sm:block">
                {user.first_name}
              </span>
              <div className="w-9 h-9 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-white text-xs font-bold select-none">
                {initials}
              </div>
            </button>

            {open && (
              <div className="absolute right-0 top-12 w-52 bg-white rounded-xl border border-slate-100 shadow-lg py-1.5 z-50">
                <Link
                  to="/dashboard"
                  onClick={() => setOpen(false)}
                  className="block px-4 py-2.5 text-sm text-[var(--color-dark)] hover:bg-slate-50 transition-colors"
                >
                  My Appointments
                </Link>
                <Link
                  to="/dashboard/profile"
                  onClick={() => setOpen(false)}
                  className="block px-4 py-2.5 text-sm text-[var(--color-dark)] hover:bg-slate-50 transition-colors"
                >
                  Edit Profile
                </Link>
                <div className="border-t border-slate-100 my-1" />
                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-4 py-2.5 text-sm text-[var(--color-accent)] hover:bg-slate-50 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Unauthenticated */
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-medium text-white/90 hover:text-white transition-colors px-1 py-2"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="text-sm font-semibold text-[var(--color-primary)] bg-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              Register
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
