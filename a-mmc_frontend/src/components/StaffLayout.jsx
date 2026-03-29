import { Navigate, Outlet, NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function staffDisplayName(user) {
  if (user.role === 'clinician') return `Dr. ${user.last_name}`
  if (user.role === 'secretary') return `Secretary ${user.last_name}`
  return `${user.first_name} ${user.last_name}`
}

const NAV_LINKS = [
  { to: '/clinician-dashboard',          label: 'Inbox',    end: true  },
  { to: '/clinician-dashboard/profile',  label: 'Profile',  end: false },
  { to: '/clinician-dashboard/schedule', label: 'Schedule', end: false },
]

export default function StaffLayout() {
  const { user, authLoading, logout } = useAuth()

  if (authLoading) return null
  if (!user) return <Navigate to="/staff/login" replace />
  if (user.role === 'patient') return <Navigate to="/login" replace />

  return (
    <>
      <header className="sticky top-0 z-50 bg-[var(--color-primary)] h-16 flex items-center">
        <div className="w-full px-6 flex items-center justify-between gap-4">

          {/* Left: wordmark + staff badge */}
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="text-white font-bold text-lg tracking-tight select-none">
              Alagang MMC
            </span>
            <span className="bg-white/20 text-white text-xs font-semibold px-2 py-0.5 rounded-full select-none">
              Staff
            </span>
          </div>

          {/* Center: nav links */}
          <nav className="flex items-center gap-1">
            {NAV_LINKS.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => [
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center min-h-[44px]',
                  isActive
                    ? 'text-white underline underline-offset-4 decoration-white/60'
                    : 'text-white/70 hover:text-white hover:bg-white/10',
                ].join(' ')}
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Right: display name + logout */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-white/80 text-sm hidden sm:block select-none">
              {staffDisplayName(user)}
            </span>
            <button
              type="button"
              onClick={logout}
              className="text-sm font-medium text-white bg-white/20 hover:bg-white/30 transition-colors px-4 py-2 rounded-lg min-h-[44px]"
            >
              Logout
            </button>
          </div>

        </div>
      </header>

      <main>
        <Outlet />
      </main>
    </>
  )
}
