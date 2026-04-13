import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import { generateStaffAppointmentPDF } from '../../services/pdfService'
import AppointmentDrawer from '../../components/shared/AppointmentDrawer'

// ── Constants ──────────────────────────────────────────────────────────────────

const STATUS_LABELS = {
  pending:               'Pending',
  accepted:              'Accepted',
  reschedule_requested:  'Reschedule Requested',
  rejected:              'Rejected',
  declined:              'Declined',
  cancelled:             'Cancelled',
  done:                  'Done',
}

const STATUS_COLORS = {
  pending:               'bg-[var(--color-primary)]/10 text-[var(--color-primary)]',
  accepted:              'bg-green-100 text-green-700',
  reschedule_requested:  'bg-[var(--color-accent)]/10 text-[var(--color-accent)]',
  done:                  'bg-teal-100 text-teal-700',
  rejected:              'bg-slate-100 text-slate-500',
  declined:              'bg-slate-100 text-slate-500',
  cancelled:             'bg-slate-100 text-slate-500',
}

// ── Utilities ──────────────────────────────────────────────────────────────────

/** Returns today's date as YYYY-MM-DD in local time. */
function todayDateString() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Formats today as "Monday, April 13, 2026" */
function formatTodayLong() {
  const d = new Date()
  const dayNames = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
  ]
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]
  const dayName = dayNames[d.getDay()]
  const monthName = monthNames[d.getMonth()]
  const date = d.getDate()
  const year = d.getFullYear()
  return `${dayName}, ${monthName} ${date}, ${year}`
}

/** Converts "HH:MM" or "HH:MM:SS" to "9:00 AM" */
function formatTime12(t) {
  const [hStr, mStr] = t.split(':')
  let h = parseInt(hStr, 10)
  const m = mStr
  const ampm = h >= 12 ? 'PM' : 'AM'
  if (h === 0) h = 12
  else if (h > 12) h -= 12
  return `${h}:${m} ${ampm}`
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const cls = STATUS_COLORS[status] ?? 'bg-slate-100 text-slate-600'
  const label = STATUS_LABELS[status] ?? status
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${cls}`}>
      {label}
    </span>
  )
}

// Inline SVG icons — no external dependency beyond lucide-react already in bundle

function IconCalendar() {
  return (
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

function IconX() {
  return (
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  )
}

// ── Stat card ──────────────────────────────────────────────────────────────────

function StatCard({ icon, count, label, borderColor, isActive, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ borderLeftColor: borderColor }}
      className={[
        'flex-1 min-w-0 text-left bg-white rounded-xl border border-slate-100 shadow-sm',
        'border-l-4 p-5 flex items-center gap-4 transition-all duration-150',
        'hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-1',
        isActive
          ? 'ring-2 ring-offset-1 shadow-md'
          : 'ring-transparent',
      ].join(' ')}
      aria-pressed={isActive}
    >
      <div
        className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center"
        style={{ backgroundColor: `${borderColor}18`, color: borderColor }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-3xl font-bold text-[var(--color-dark)] leading-none">{count}</p>
        <p className="text-sm text-slate-500 mt-1">{label}</p>
      </div>
    </button>
  )
}

// ── ClinicianTodayView ─────────────────────────────────────────────────────────

export default function ClinicianTodayView() {
  const { user, authLoading } = useAuth()
  const navigate = useNavigate()

  const [clinicianId, setClinicianId]   = useState(null)
  const [appointments, setAppointments] = useState([])
  const [fetchLoading, setFetchLoading] = useState(false)
  const [fetchError, setFetchError]     = useState('')

  // 'queue' | 'done' | 'cancelled' | null (null = show all)
  const [activeFilter, setActiveFilter] = useState(null)

  const [drawerAppt, setDrawerAppt] = useState(null)

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/staff/login?redirect=/clinician-dashboard/today')
    }
  }, [authLoading, user, navigate])

  // ── Resolve clinician_id ───────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    if (user.role === 'clinician') {
      setClinicianId(user.id)
    } else if (user.role === 'secretary') {
      api.get(`/secretaries/${user.id}`)
        .then(({ data }) => setClinicianId(data.clinician_ids?.[0] ?? null))
        .catch(() => setFetchError('Unable to resolve your linked clinician.'))
    }
  }, [user])

  // ── Fetch appointments ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!clinicianId) return
    loadAppointments()
  }, [clinicianId])

  // All hooks above early returns
  if (authLoading || !user) return null

  // ── Handlers ───────────────────────────────────────────────────────────────

  function loadAppointments() {
    setFetchLoading(true)
    setFetchError('')
    api.get('/appointments/', { params: { clinician_id: clinicianId } })
      .then(({ data }) => setAppointments(data))
      .catch(() => setFetchError('Unable to load appointments.'))
      .finally(() => setFetchLoading(false))
  }

  function handleRefreshAfterSave() {
    loadAppointments()
    setDrawerAppt(null)
  }

  function handleCardClick(filter) {
    setActiveFilter(prev => prev === filter ? null : filter)
  }

  // ── Derived state ──────────────────────────────────────────────────────────

  const today = todayDateString()

  const todayAppointments = appointments
    .filter(a => a.slot?.slot_date === today)
    .sort((a, b) => {
      const ta = a.slot?.start_time ?? ''
      const tb = b.slot?.start_time ?? ''
      return ta.localeCompare(tb)
    })

  const queueCount     = todayAppointments.filter(a => a.status === 'pending' || a.status === 'accepted').length
  const doneCount      = todayAppointments.filter(a => a.status === 'done').length
  const cancelledCount = todayAppointments.filter(a => a.status === 'cancelled' || a.status === 'rejected').length

  const filtered = activeFilter === null
    ? todayAppointments
    : activeFilter === 'queue'
      ? todayAppointments.filter(a => a.status === 'pending' || a.status === 'accepted')
      : activeFilter === 'done'
        ? todayAppointments.filter(a => a.status === 'done')
        : todayAppointments.filter(a => a.status === 'cancelled' || a.status === 'rejected')

  // ── Shared styles ──────────────────────────────────────────────────────────

  const actionBtnBase = 'min-h-[44px] px-3 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap'

  return (
    <>
      {drawerAppt && (
        <AppointmentDrawer
          appointment={drawerAppt}
          onClose={() => setDrawerAppt(null)}
          onSave={handleRefreshAfterSave}
        />
      )}

      <div className="min-h-screen bg-slate-50">
        <div className="max-w-5xl mx-auto px-6 py-10">

          {/* ── Page header ── */}
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-[var(--color-dark)]">Today's Appointments</h1>
              <p className="text-base text-slate-500 mt-1">{formatTodayLong()}</p>
            </div>
            <div className="flex gap-2 flex-wrap sm:shrink-0">
              <Link
                to="/clinician-dashboard/schedule"
                className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-[var(--color-dark)] hover:bg-slate-100 transition-colors min-h-[44px] flex items-center"
              >
                Manage Schedule
              </Link>
              <Link
                to="/clinician-dashboard/profile"
                className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-[var(--color-dark)] hover:bg-slate-100 transition-colors min-h-[44px] flex items-center"
              >
                Manage Profile
              </Link>
            </div>
          </div>

          {/* ── Stat cards ── */}
          <div className="flex flex-col sm:flex-row gap-4 mb-3">
            <StatCard
              icon={<IconCalendar />}
              count={queueCount}
              label="In Queue"
              borderColor="var(--color-primary)"
              isActive={activeFilter === 'queue'}
              onClick={() => handleCardClick('queue')}
            />
            <StatCard
              icon={<IconCheck />}
              count={doneCount}
              label="Done Today"
              borderColor="#16a34a"
              isActive={activeFilter === 'done'}
              onClick={() => handleCardClick('done')}
            />
            <StatCard
              icon={<IconX />}
              count={cancelledCount}
              label="Cancelled"
              borderColor="var(--color-accent)"
              isActive={activeFilter === 'cancelled'}
              onClick={() => handleCardClick('cancelled')}
            />
          </div>

          {/* ── Show All / active filter hint ── */}
          <div className="mb-6 h-6 flex items-center">
            {activeFilter !== null && (
              <button
                type="button"
                onClick={() => setActiveFilter(null)}
                className="text-sm text-[var(--color-primary)] hover:underline font-medium"
              >
                ← Show All
              </button>
            )}
          </div>

          {/* ── Appointment list ── */}
          {fetchLoading ? (
            <p className="text-center text-slate-400 py-16 text-sm">Loading…</p>
          ) : fetchError ? (
            <p className="text-center text-[var(--color-accent)] py-16 text-sm font-medium">{fetchError}</p>
          ) : todayAppointments.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-slate-400 text-base">You have no appointments scheduled for today.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-slate-400 text-base">No appointments for today.</p>
            </div>
          ) : (
            <>
              {/* Desktop table (md+) */}
              <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-100 shadow-sm bg-white">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      {['Time', 'Patient', 'Chief Complaint', 'Status', 'Actions'].map(col => (
                        <th key={col} className="px-5 py-3.5 font-semibold text-slate-600 whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(appt => (
                      <tr
                        key={appt.appointment_id}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-5 py-4 text-[var(--color-dark)] whitespace-nowrap font-medium">
                          {formatTime12(appt.slot.start_time)}
                        </td>
                        <td className="px-5 py-4 font-medium text-[var(--color-dark)] whitespace-nowrap">
                          {appt.patient.last_name}, {appt.patient.first_name}
                        </td>
                        <td className="px-5 py-4 text-[var(--color-dark)] max-w-[200px]">
                          <span className="line-clamp-2">{appt.chief_complaint}</span>
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={appt.status} />
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setDrawerAppt(appt)}
                              className={`${actionBtnBase} bg-[var(--color-primary)] text-white hover:opacity-90`}
                            >
                              View Details
                            </button>
                            <button
                              type="button"
                              onClick={() => generateStaffAppointmentPDF(appt)}
                              className={`${actionBtnBase} border border-slate-200 text-slate-600 hover:bg-slate-100`}
                            >
                              Download PDF
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards (below md) */}
              <div className="md:hidden space-y-4">
                {filtered.map(appt => (
                  <div
                    key={appt.appointment_id}
                    className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[var(--color-dark)]">
                          {appt.patient.last_name}, {appt.patient.first_name}
                        </p>
                        <p className="text-sm text-slate-500 mt-0.5">{appt.chief_complaint}</p>
                      </div>
                      <StatusBadge status={appt.status} />
                    </div>

                    <div className="text-sm">
                      <p className="text-xs text-slate-400 mb-0.5">Time</p>
                      <p className="text-[var(--color-dark)] font-medium">{formatTime12(appt.slot.start_time)}</p>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setDrawerAppt(appt)}
                        className={`${actionBtnBase} flex-1 bg-[var(--color-primary)] text-white hover:opacity-90`}
                      >
                        View Details
                      </button>
                      <button
                        type="button"
                        onClick={() => generateStaffAppointmentPDF(appt)}
                        className={`${actionBtnBase} border border-slate-200 text-slate-600 hover:bg-slate-100`}
                      >
                        Download PDF
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

        </div>
      </div>
    </>
  )
}
