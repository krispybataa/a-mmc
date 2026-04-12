import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { CheckCircle, X, CalendarPlus, Calendar, User } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import AppointmentReminderBanner from '../../components/AppointmentReminderBanner'

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

const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ')

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
    api.get('/appointments/', { params: { patient_id: user.id } })
      .then(({ data }) => setAppointments(data))
      .catch(() => setApptError('Unable to load appointments.'))
      .finally(() => setApptLoading(false))
  }, [user?.id])

  if (!user) return null

  const fullName     = `${user.first_name} ${user.last_name}`
  const pendingAppts = appointments.filter(a => NON_TERMINAL.has(a.status))

  const today = new Date()
  const dateLabel = today.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const recentAppts = [...appointments].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 3)

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="max-w-5xl mx-auto px-6 py-10">

        <AppointmentReminderBanner appointments={appointments} />

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
              className="text-green-600 hover:text-green-800 p-1 -mt-0.5 -mr-1"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* ── Page header ── */}
        <div className="mb-8">
          <p className="text-sm text-[var(--color-muted)]">{dateLabel}</p>
          <h1 className="text-2xl font-bold text-[var(--color-text)] mt-1">Welcome back, {user.first_name}!</h1>
          <p className="text-[var(--color-muted)] mt-1">Here's an overview of your health appointments.</p>
        </div>

        {/* ── Quick action cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <Link
            to="/doctors"
            className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-[var(--color-accent)] text-white p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 min-h-[120px]"
          >
            <CalendarPlus size={28} />
            <span className="font-semibold text-base">Book Appointment</span>
          </Link>
          <Link
            to="/dashboard/appointments"
            className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-white border-2 border-[var(--color-primary)] text-[var(--color-primary)] p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 min-h-[120px]"
          >
            <Calendar size={28} />
            <span className="font-semibold text-base">My Appointments</span>
          </Link>
          <Link
            to="/dashboard/profile"
            className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-white border-2 border-[var(--color-primary)] text-[var(--color-primary)] p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 min-h-[120px]"
          >
            <User size={28} />
            <span className="font-semibold text-base">Edit Profile</span>
          </Link>
        </div>

        {/* ── Recent Appointments ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-heading text-xl">
              Recent Appointments
            </h2>
            <Link to="/dashboard/appointments" className="text-sm text-[var(--color-primary)] font-medium hover:underline">
              View all →
            </Link>
          </div>

          {apptLoading ? (
            <p className="text-center text-[var(--color-muted)] py-12 text-sm">Loading…</p>
          ) : apptError ? (
            <p className="text-center text-[var(--color-accent)] py-12 text-sm font-medium">{apptError}</p>
          ) : recentAppts.length === 0 ? (
            <p className="text-center text-[var(--color-muted)] py-12">No appointments yet.</p>
          ) : (
            <div className="space-y-3">
              {recentAppts.map(appt => (
                <div
                  key={appt.appointment_id}
                  className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-5 flex flex-col sm:flex-row sm:items-center gap-3"
                >
                  <div className="flex-1 space-y-1">
                    <p className="font-semibold text-[var(--color-text)]">
                      {appt.clinician.last_name}, {appt.clinician.first_name} · {appt.clinician.specialty}
                    </p>
                    <p className="text-sm text-[var(--color-muted)]">
                      {formatDate(appt.slot.slot_date)} · {formatTime(appt.slot.start_time)}
                    </p>
                    <p className="text-sm text-[var(--color-muted)]">{appt.chief_complaint}</p>
                  </div>
                  <span className={[
                    'text-xs font-semibold px-3 py-1.5 rounded-full self-start sm:self-center',
                    appt.status === 'accepted'             ? 'bg-green-100 text-green-700' :
                    appt.status === 'pending'              ? 'bg-amber-100 text-amber-700' :
                    appt.status === 'reschedule_requested' ? 'bg-blue-100 text-blue-700'  :
                    appt.status === 'rejected'             ? 'bg-red-100 text-red-700'    :
                    'bg-gray-100 text-gray-600',
                  ].join(' ')}>
                    {capitalize(appt.status)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
