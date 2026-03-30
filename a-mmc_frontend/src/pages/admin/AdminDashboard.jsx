import { useState, useEffect } from 'react'
import api from '../../services/api'

// ── Stat card ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, loading }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 flex flex-col gap-2">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={[
        'text-4xl font-bold',
        loading ? 'text-slate-200 animate-pulse' : 'text-[var(--color-primary)]',
      ].join(' ')}>
        {loading ? '—' : (value ?? 0).toLocaleString()}
      </p>
    </div>
  )
}

// ── AdminDashboard ─────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [counts, setCounts]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    api.get('/admin/dashboard')
      .then(({ data }) => setCounts(data))
      .catch(() => setError('Failed to load dashboard data.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold text-[var(--color-dark)] mb-2">Dashboard</h1>
      <p className="text-sm text-slate-500 mb-8">System-wide counts at a glance.</p>

      {error && (
        <p className="text-sm text-[var(--color-accent)] mb-6">{error}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard label="Total Clinicians"    value={counts?.clinicians}    loading={loading} />
        <StatCard label="Total Secretaries"   value={counts?.secretaries}   loading={loading} />
        <StatCard label="Total Patients"      value={counts?.patients}      loading={loading} />
        <StatCard label="Total Appointments"  value={counts?.appointments}  loading={loading} />
      </div>
    </div>
  )
}
