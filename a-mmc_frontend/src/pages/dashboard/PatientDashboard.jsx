import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { CheckCircle, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

// ── Utilities ─────────────────────────────────────────────────────────────────

const MONTHS   = ['January','February','March','April','May','June','July','August','September','October','November','December']
const WEEKDAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

function formatDate(dateStr) {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const weekday = WEEKDAYS[new Date(y, mo - 1, d).getDay()]
  return `${weekday}, ${String(d).padStart(2, '0')} ${MONTHS[mo - 1]} ${y}`
}

function formatTime(t) {
  return t.slice(0, 5)
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function CardRow({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-[var(--color-dark)]">{value}</p>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

const NON_TERMINAL = new Set(['pending', 'accepted', 'reschedule_requested'])

export default function PatientDashboard() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()

  const [showBanner, setShowBanner] = useState(
    location.state?.bookingSuccess === true
  )

  const [appointments, setAppointments] = useState([])
  const [apptLoading,  setApptLoading]  = useState(false)
  const [apptError,    setApptError]    = useState('')

  // Auth guard
  useEffect(() => {
    if (!user) navigate('/login?redirect=/dashboard')
  }, [user, navigate])

  // Auto-dismiss success banner after 5 seconds
  useEffect(() => {
    if (!showBanner) return
    const t = setTimeout(() => setShowBanner(false), 5000)
    return () => clearTimeout(t)
  }, [showBanner])

  // Fetch appointments when user is available
  useEffect(() => {
    if (!user?.id) return
    setApptLoading(true)
    setApptError('')
    api.get('/api/appointments/', { params: { patient_id: user.id } })
      .then(({ data }) => setAppointments(data))
      .catch(() => setApptError('Unable to load appointments.'))
      .finally(() => setApptLoading(false))
  }, [user?.id])

  if (!user) return null

  const fullName     = `${user.first_name} ${user.last_name}`
  const pendingAppts = appointments.filter(a => NON_TERMINAL.has(a.status))

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* ── Booking success banner ── */}
        {showBanner && (
          <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl px-5 py-4 mb-8">
            <CheckCircle size={18} className="text-green-600 mt-0.5 shrink-0" />
            <div className="flex-1 text-sm text-green-800">
              <p className="font-semibold">Appointment request submitted!</p>
              <p className="mt-0.5 text-green-700">You will be notified once it is confirmed.</p>
            </div>
            <button
              onClick={() => setShowBanner(false)}
              aria-label="Dismiss"
              className="text-green-600 hover:text-green-800 transition-colors p-1 -mt-0.5 -mr-1"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* ── Page header ── */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--color-dark)]">DASHBOARD</h1>
          <p className="text-lg italic text-slate-500 mt-1">Welcome, {fullName}!</p>
        </div>

        {/* ── CTA buttons ── */}
        <div className="flex flex-col min-[380px]:flex-row gap-4 mb-10">
          <button
            onClick={() => navigate('/dashboard/appointments')}
            className="flex-1 min-h-[52px] rounded-lg bg-[var(--color-primary)] text-white font-semibold text-base px-6 hover:opacity-90 transition-opacity"
          >
            Manage Appointments
          </button>
          <button
            onClick={() => navigate('/find')}
            className="flex-1 min-h-[52px] rounded-lg border-2 border-[var(--color-primary)] text-[var(--color-primary)] font-semibold text-base px-6 hover:bg-blue-50 transition-colors"
          >
            Find a Doctor
          </button>
        </div>

        {/* ── Pending Appointments ── */}
        <div>
          <h2 className="text-xl font-semibold text-[var(--color-dark)] mb-4">
            Pending Appointments
          </h2>

          {apptLoading ? (
            <p className="text-center text-slate-400 py-12 text-sm">Loading…</p>
          ) : apptError ? (
            <p className="text-center text-[var(--color-accent)] py-12 text-sm font-medium">{apptError}</p>
          ) : pendingAppts.length === 0 ? (
            <p className="text-center text-slate-400 py-12">No pending appointments.</p>
          ) : (
            <>
              {/* Desktop table (sm+) */}
              <div className="hidden sm:block overflow-x-auto rounded-xl border border-slate-100 shadow-sm bg-white">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      {['Date', 'Time', 'Doctor', 'Chief Complaint', 'Notes'].map(col => (
                        <th key={col} className="px-5 py-3.5 font-semibold text-slate-600 whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pendingAppts.map(appt => (
                      <tr
                        key={appt.appointment_id}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-5 py-4 text-[var(--color-dark)] whitespace-nowrap">
                          {formatDate(appt.slot.slot_date)}
                        </td>
                        <td className="px-5 py-4 text-[var(--color-dark)]">
                          {formatTime(appt.slot.start_time)}
                        </td>
                        <td className="px-5 py-4 text-[var(--color-dark)] font-medium whitespace-nowrap">
                          {appt.clinician.title} {appt.clinician.last_name}
                        </td>
                        <td className="px-5 py-4 text-[var(--color-dark)]">
                          {appt.chief_complaint}
                        </td>
                        <td className="px-5 py-4 text-slate-500">
                          {appt.status === 'accepted' ? 'Come 30 minutes before schedule.' : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards (below sm) */}
              <div className="sm:hidden space-y-4">
                {pendingAppts.map(appt => (
                  <div
                    key={appt.appointment_id}
                    className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-3"
                  >
                    <CardRow label="Date"            value={formatDate(appt.slot.slot_date)} />
                    <CardRow label="Time"            value={formatTime(appt.slot.start_time)} />
                    <CardRow label="Doctor"          value={`${appt.clinician.title} ${appt.clinician.last_name}`} />
                    <CardRow label="Chief Complaint" value={appt.chief_complaint} />
                    {appt.status === 'accepted' && (
                      <CardRow label="Notes" value="Come 30 minutes before schedule." />
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  )
}
