import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'  // Or use any icon

export default function UnauthorizedPage({ reason = 'Access denied' }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center border-4 border-[var(--color-accent)]/20">
        <ShieldAlert className="w-20 h-20 text-[var(--color-accent)] mx-auto mb-6 opacity-75" />
        <h1 className="text-3xl font-bold text-[var(--color-dark)] mb-4">Access Denied</h1>
        <p className="text-lg text-slate-600 mb-8 max-w-sm mx-auto leading-relaxed">{reason}</p>
        <div className="space-y-3">
          <Link
            to="/"
            className="block w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white font-medium py-3 px-6 rounded-xl transition-all text-center"
          >
            Go Home
          </Link>
          <div className="text-sm text-slate-500">
            Need to login?{' '}
            <Link to="/staff/login" className="font-medium hover:underline">Staff</Link> |{' '}
            <Link to="/login" className="font-medium hover:underline">Patient</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
