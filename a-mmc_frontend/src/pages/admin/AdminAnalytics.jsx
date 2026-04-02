import { useState, useEffect } from 'react'
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, Tooltip,
  PieChart, Pie, Legend,
  AreaChart, Area,
} from 'recharts'
import api from '../../services/api'

// ── Constants ──────────────────────────────────────────────────────────────────

const PERIOD_OPTIONS = [
  { value: 'week',  label: 'Last 7 Days'  },
  { value: 'month', label: 'Last 30 Days' },
  { value: 'all',   label: 'All Time'     },
]

// Hex colors are required inside recharts props — CSS variables are not
// supported there. These match the brand token values.
const PRIMARY = '#1D409C'
const ACCENT  = '#CE1117'

const STATUS_META = {
  pending:              { label: 'Pending',              color: '#F59E0B' },
  accepted:             { label: 'Accepted',             color: '#22C55E' },
  cancelled:            { label: 'Cancelled',            color: '#EF4444' },
  completed:            { label: 'Completed',            color: '#3B82F6' },
  no_show:              { label: 'No Show',              color: '#9CA3AF' },
  reschedule_requested: { label: 'Reschedule Requested', color: '#F97316' },
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse">
      <div className="h-5 bg-slate-200 rounded w-2/5 mb-5" />
      <div className="h-52 bg-slate-100 rounded" />
    </div>
  )
}

function EmptyState({ message }) {
  return (
    <div className="h-52 flex items-center justify-center text-slate-400 text-base">
      {message}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function AdminAnalytics() {
  const [period, setPeriod]   = useState('month')
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  // All hooks before any conditional returns
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    api.get(`/admin/analytics?period=${period}`)
      .then(res => {
        if (!cancelled) {
          setData(res.data)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Failed to load analytics data. Please try again.')
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [period])

  // ── Derived chart data (computed from data, safe when data is null) ──────────

  const statusChartData = data
    ? Object.entries(data.appointments_by_status)
        .filter(([, count]) => count > 0)
        .map(([status, count]) => ({
          name:  STATUS_META[status]?.label ?? status,
          value: count,
          fill:  STATUS_META[status]?.color ?? '#6B7280',
        }))
    : []

  const rawF2f       = data?.appointments_by_consultation_type?.f2f        ?? 0
  const rawTeleconsult = data?.appointments_by_consultation_type?.teleconsult ?? 0
  const typeTotal    = rawF2f + rawTeleconsult
  const typeChartData = typeTotal > 0
    ? [
        { name: 'Face-to-Face',    value: rawF2f,        fill: PRIMARY },
        { name: 'Teleconsultation', value: rawTeleconsult, fill: ACCENT  },
      ].filter(d => d.value > 0)
    : []

  const bookingData    = data?.appointments_by_day ?? []
  const clinicianData  = data?.top_clinicians      ?? []

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-6xl mx-auto">

      {/* Page heading */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-dark)]">Analytics</h1>
        <p className="text-slate-500 mt-1 text-base">Appointment activity at a glance.</p>
      </div>

      {/* Period selector */}
      <div className="flex flex-wrap gap-2 mb-8">
        {PERIOD_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setPeriod(value)}
            className={[
              'px-5 py-2 rounded-full text-sm font-medium transition-colors min-h-[44px]',
              period === value
                ? 'bg-[var(--color-primary)] text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-6 text-base">
          {error}
        </div>
      )}

      {/* 2×2 chart grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Card 1: Appointments by Status ── */}
        {loading ? <SkeletonCard /> : (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-base font-semibold text-[var(--color-dark)] mb-5">
              Appointments by Status
            </h2>
            {statusChartData.length === 0
              ? <EmptyState message="No appointments yet" />
              : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={statusChartData}
                    layout="vertical"
                    margin={{ top: 0, right: 36, bottom: 0, left: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={148}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip formatter={(v) => [v, 'Appointments']} />
                    <Bar
                      dataKey="value"
                      radius={[0, 4, 4, 0]}
                      label={{ position: 'right', fontSize: 12 }}
                    >
                      {statusChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )
            }
          </div>
        )}

        {/* ── Card 2: Consultation Type Split ── */}
        {loading ? <SkeletonCard /> : (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-base font-semibold text-[var(--color-dark)] mb-5">
              Consultation Type Split
            </h2>
            {typeChartData.length === 0
              ? <EmptyState message="No appointments yet" />
              : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={typeChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="47%"
                      outerRadius={88}
                      label={({ name, value }) =>
                        `${name}: ${typeTotal > 0 ? Math.round((value / typeTotal) * 100) : 0}%`
                      }
                      labelLine
                    >
                      {typeChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [v, 'Appointments']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )
            }
          </div>
        )}

        {/* ── Card 3: Bookings Over Time ── */}
        {loading ? <SkeletonCard /> : (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-base font-semibold text-[var(--color-dark)] mb-5">
              Bookings Over Time
            </h2>
            {bookingData.length === 0
              ? <EmptyState message="No booking data available" />
              : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart
                    data={bookingData}
                    margin={{ top: 4, right: 16, bottom: 4, left: 0 }}
                  >
                    <defs>
                      <linearGradient id="bookingGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={PRIMARY} stopOpacity={0.18} />
                        <stop offset="95%" stopColor={PRIMARY} stopOpacity={0}    />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(d) => d.slice(5)}
                      interval="preserveStartEnd"
                    />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip
                      labelFormatter={(d) => `Date: ${d}`}
                      formatter={(v) => [v, 'Bookings']}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke={PRIMARY}
                      strokeWidth={2}
                      fill="url(#bookingGrad)"
                      dot={false}
                      activeDot={{ r: 5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )
            }
          </div>
        )}

        {/* ── Card 4: Top 5 Clinicians by Bookings ── */}
        {loading ? <SkeletonCard /> : (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-base font-semibold text-[var(--color-dark)] mb-5">
              Top 5 Clinicians by Bookings
            </h2>
            {clinicianData.length === 0
              ? <EmptyState message="No clinician data available" />
              : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={clinicianData}
                    layout="vertical"
                    margin={{ top: 0, right: 36, bottom: 0, left: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={120}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip formatter={(v) => [v, 'Appointments']} />
                    <Bar
                      dataKey="count"
                      fill={PRIMARY}
                      radius={[0, 4, 4, 0]}
                      label={{ position: 'right', fontSize: 12 }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )
            }
          </div>
        )}

      </div>
    </div>
  )
}
