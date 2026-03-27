import { useRef, useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
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

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-100 h-16 flex items-center">
      <div className="max-w-5xl mx-auto px-6 w-full flex items-center justify-between">

        {/* Wordmark */}
        <Link
          to="/"
          className="text-[var(--color-primary)] font-bold text-lg tracking-tight hover:opacity-80 transition-opacity"
        >
          Alagang MMC
        </Link>

        {/* Right side */}
        {user ? (
          /* Authenticated */
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
              aria-label="Account menu"
            >
              <span className="text-sm font-medium text-[var(--color-dark)] hidden sm:block">
                {user.first_name}
              </span>
              <div className="w-9 h-9 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white text-xs font-bold select-none">
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
              className="text-sm font-medium text-[var(--color-dark)] hover:text-[var(--color-primary)] transition-colors px-1 py-2"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="text-sm font-semibold text-white bg-[var(--color-primary)] px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              Register
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
