import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import { generateStaffAppointmentPDF } from '../../services/pdfService'
import AppointmentDrawer from '../../components/shared/AppointmentDrawer'

// -- Constants ------------------------------------------------------------------

const PAGE_SIZE = 5

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

const STATUS_FILTER_OPTIONS = [
  { value: 'all',                  label: 'All Statuses' },
  { value: 'pending',              label: 'Pending' },
  { value: 'accepted',             label: 'Accepted' },
  { value: 'reschedule_requested', label: 'Reschedule Requested' },
  { value: 'done',                 label: 'Done' },
  { value: 'declined',             label: 'Declined' },
  { value: 'rejected',             label: 'Rejected' },
  { value: 'cancelled',            label: 'Cancelled' },
]

// -- Utilities ------------------------------------------------------------------

function formatDateShort(dateStr) {
  const [y, mo, d] = dateStr.split('-')
  return `${d}/${mo}/${y}`
}

function formatTime(t) {
  return t.slice(0, 5)
}

// -- StatusBadge ----------------------------------------------------------------

function StatusBadge({ status }) {
  const cls = STATUS_COLORS[status] ?? 'bg-slate-100 text-slate-600'
  const label = STATUS_LABELS[status] ?? status
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${cls}`}>
      {label}
    </span>
  )
}

// -- ClinicianDashboard ---------------------------------------------------------

export default function ClinicianDashboard() {
  const { user, authLoading } = useAuth()
  const navigate = useNavigate()

  const [clinicianId, setClinicianId]   = useState(null)
  const [appointments, setAppointments] = useState([])
  const [fetchLoading, setFetchLoading] = useState(false)
  const [fetchError, setFetchError]     = useState('')

  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter]     = useState('')
  const [page, setPage]                 = useState(1)

  const [drawerAppt, setDrawerAppt] = useState(null)

  // Auth guard - wait for silent refresh before deciding
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/staff/login?redirect=/clinician-dashboard')
    }
  }, [authLoading, user, navigate])

  // Resolve clinician_id based on role
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

  // Fetch appointments when clinicianId is available
  useEffect(() => {
    if (!clinicianId) return
    loadAppointments()
  }, [clinicianId])

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setPage(1)
  }, [statusFilter, dateFilter])

  // -- All hooks above this line ----------------------------------------------

  if (authLoading || !user) return null

  // -- Handlers ---------------------------------------------------------------

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

  // -- Derived state ----------------------------------------------------------

  const filtered = appointments
    .filter(a => statusFilter === 'all' || a.status === statusFilter)
    .filter(a => !dateFilter || a.slot.slot_date === dateFilter)

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // -- Shared styles ----------------------------------------------------------

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

          {/* -- Page header -- */}
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-[var(--color-dark)]">Appointment Inbox</h1>
              <p className="text-lg italic text-slate-500 mt-1">
                Welcome, {user.first_name} {user.last_name}!
              </p>
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

          {/* -- Filter bar -- */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="sm:w-56 px-4 py-2.5 rounded-lg border border-slate-200 text-sm text-[var(--color-dark)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent min-h-[44px]"
            >
              {STATUS_FILTER_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <div className="flex gap-2">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm text-[var(--color-dark)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent min-h-[44px]"
              />
              {dateFilter && (
                <button
                  type="button"
                  onClick={() => setDateFilter('')}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-500 hover:bg-slate-100 transition-colors min-h-[44px]"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* -- Appointment list -- */}
          {fetchLoading ? (
            <p className="text-center text-slate-400 py-16 text-sm">Loading...</p>
          ) : fetchError ? (
            <p className="text-center text-[var(--color-accent)] py-16 text-sm font-medium">{fetchError}</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-slate-400 py-16">No appointments match the current filters.</p>
          ) : (
            <>
              {/* Desktop table (md+) */}
              <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-100 shadow-sm bg-white">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      {['Patient', 'Chief Complaint', 'Date', 'Time', 'Status', 'Actions'].map(col => (
                        <th key={col} className="px-5 py-3.5 font-semibold text-slate-600 whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageData.map(appt => (
                      <tr
                        key={appt.appointment_id}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-5 py-4 font-medium text-[var(--color-dark)] whitespace-nowrap">
                          {appt.patient.last_name}, {appt.patient.first_name}
                        </td>
                        <td className="px-5 py-4 text-[var(--color-dark)] max-w-[200px]">
                          <span className="line-clamp-2">{appt.chief_complaint}</span>
                        </td>
                        <td className="px-5 py-4 text-[var(--color-dark)] whitespace-nowrap">
                          {formatDateShort(appt.slot.slot_date)}
                        </td>
                        <td className="px-5 py-4 text-[var(--color-dark)] whitespace-nowrap">
                          {formatTime(appt.slot.start_time)}
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
                {pageData.map(appt => (
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

                    <div className="flex gap-6 text-sm">
                      <div>
                        <p className="text-xs text-slate-400 mb-0.5">Date</p>
                        <p className="text-[var(--color-dark)]">{formatDateShort(appt.slot.slot_date)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-0.5">Time</p>
                        <p className="text-[var(--color-dark)]">{formatTime(appt.slot.start_time)}</p>
                      </div>
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

              {/* -- Pagination -- */}
              <div className="flex items-center justify-between mt-6">
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
                >
                  <- Prev
                </button>
                <span className="text-sm text-slate-500">
                  Page {page} of {totalPages}
                  <span className="ml-2 text-slate-400">({filtered.length} appointment{filtered.length !== 1 ? 's' : ''})</span>
                </span>
                <button
                  type="button"
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
                >
                  Next ->
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </>
  )
}
