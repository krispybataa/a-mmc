import { useState } from 'react'
import { Navigate, Outlet, NavLink } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

// ── Constants ──────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { to: '/admin',                  label: 'Dashboard',      end: true  },
  { to: '/admin/analytics',        label: 'Analytics',      end: false },
  { to: '/admin/clinicians',       label: 'Clinicians',     end: false },
  { to: '/admin/secretaries',      label: 'Secretaries',    end: false },
  { to: '/admin/patients',         label: 'Patients',       end: false },
  { to: '/admin/email-previews',   label: 'Email Previews', end: false },
]

// ── Sidebar content (shared between desktop and mobile drawer) ─────────────────

function SidebarNav({ email, onLogout, onNavClick }) {
  return (
    <div className="flex flex-col h-full bg-[var(--color-primary)]">

      {/* Wordmark + badge */}
      <div className="px-6 py-5 border-b border-white/10 shrink-0">
        <p className="text-white font-bold text-lg tracking-tight select-none">
          Asclepius
        </p>
        <span className="mt-1.5 inline-block bg-white/20 text-white text-xs font-semibold px-2 py-0.5 rounded-full select-none">
          Admin
        </span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_LINKS.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavClick}
            className={({ isActive }) => [
              'flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors min-h-[44px]',
              isActive
                ? 'bg-white/20 text-white'
                : 'text-white/70 hover:text-white hover:bg-white/10',
            ].join(' ')}
          >
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer: email + logout */}
      <div className="px-4 py-4 border-t border-white/10 shrink-0 space-y-2">
        <p
          className="text-white/60 text-xs truncate px-1 select-none"
          title={email}
        >
          {email}
        </p>
        <button
          type="button"
          onClick={onLogout}
          className="w-full text-sm font-medium text-white bg-white/20 hover:bg-white/30 transition-colors px-4 py-2.5 rounded-lg min-h-[44px]"
        >
          Logout
        </button>
      </div>

    </div>
  )
}

// ── AdminLayout ────────────────────────────────────────────────────────────────

export default function AdminLayout() {
  const { user, authLoading } = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)

  // All hooks above early returns
  if (authLoading) return null
  if (!user || user.role !== 'admin') return <Navigate to="/staff/login" replace />

  const adminEmail = user.login_email ?? user.email ?? ''

  async function handleLogout() {
    try { await api.post('/auth/logout') } catch { /* ignore */ }
    window.location.href = '/staff/login'
  }

  return (
    <div className="min-h-screen flex bg-slate-50">

      {/* ── Desktop sidebar (md+) ── */}
      <aside className="hidden md:flex md:flex-col md:w-56 md:fixed md:inset-y-0 z-30 shrink-0">
        <SidebarNav
          email={adminEmail}
          onLogout={handleLogout}
          onNavClick={() => {}}
        />
      </aside>

      {/* ── Mobile: sticky top bar ── */}
      <header className="md:hidden fixed top-0 inset-x-0 z-40 bg-[var(--color-primary)] h-16 flex items-center px-4 gap-3">
        <button
          type="button"
          aria-label="Open navigation"
          onClick={() => setDrawerOpen(true)}
          className="text-white p-2 rounded-lg hover:bg-white/10 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
        >
          <Menu size={22} />
        </button>
        <span className="text-white font-bold text-base tracking-tight select-none">
          Asclepius
        </span>
        <span className="bg-white/20 text-white text-xs font-semibold px-2 py-0.5 rounded-full select-none">
          Admin
        </span>
      </header>

      {/* ── Mobile drawer ── */}
      {drawerOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/50"
          onClick={() => setDrawerOpen(false)}
        >
          {/* Drawer panel */}
          <div
            className="absolute left-0 top-0 bottom-0 w-64 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button inside drawer */}
            <div className="absolute top-3 right-3 z-10">
              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setDrawerOpen(false)}
                className="text-white p-2 rounded-lg hover:bg-white/10 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X size={20} />
              </button>
            </div>
            <SidebarNav
              email={adminEmail}
              onLogout={handleLogout}
              onNavClick={() => setDrawerOpen(false)}
            />
          </div>
        </div>
      )}

      {/* ── Main content area ── */}
      <div className="flex-1 md:ml-56 flex flex-col min-h-screen">
        <main className="flex-1 pt-16 md:pt-0">
          <Outlet />
        </main>
      </div>

    </div>
  )
}
