import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import SlotPicker from '../../components/shared/SlotPicker'

// ── Constants ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 5

const STATUS_LABELS = {
  pending:               'Pending',
  accepted:              'Accepted',
  reschedule_requested:  'Reschedule Requested',
  rejected:              'Rejected',
  cancelled:             'Cancelled',
}

const STATUS_COLORS = {
  pending:               'bg-yellow-100 text-yellow-800',
  accepted:              'bg-green-100 text-green-700',
  reschedule_requested:  'bg-amber-100 text-amber-800',
  rejected:              'bg-red-100 text-red-700',
  cancelled:             'bg-slate-100 text-slate-600',
}

const STATUS_FILTER_OPTIONS = [
  { value: 'all',                  label: 'All Statuses' },
  { value: 'pending',              label: 'Pending' },
  { value: 'accepted',             label: 'Accepted' },
  { value: 'reschedule_requested', label: 'Reschedule Requested' },
  { value: 'rejected',             label: 'Rejected' },
  { value: 'cancelled',            label: 'Cancelled' },
]

// ── Utilities ──────────────────────────────────────────────────────────────────

function formatDateShort(dateStr) {
  const [y, mo, d] = dateStr.split('-')
  return `${d}/${mo}/${y}`
}

function formatTime(t) {
  return t.slice(0, 5)
}

// ── StatusBadge ────────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const cls = STATUS_COLORS[status] ?? 'bg-slate-100 text-slate-600'
  const label = STATUS_LABELS[status] ?? status
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${cls}`}>
      {label}
    </span>
  )
}

// ── RescheduleModal ────────────────────────────────────────────────────────────

function RescheduleModal({ target, onSubmit, onClose }) {
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [schedule, setSchedule] = useState([])

  const clinicianName = `${target.clinician.title} ${target.clinician.last_name}`

  // Fetch clinician schedule for SlotPicker
  useEffect(() => {
    api.get(`/api/clinicians/${target.clinician.clinician_id}`)
      .then(({ data }) => setSchedule(data.schedules ?? []))
      .catch(() => setSchedule([]))
  }, [target.clinician.clinician_id])

  // Close on Escape
  useEffect(() => {
    function handler(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  async function handleSubmit() {
    if (!reason.trim()) {
      setError('Reschedule reason is required.')
      return
    }
    if (!selectedSlot) {
      setError('Please select a new time slot.')
      return
    }
    setError('')
    try {
      await onSubmit(target.appointment_id, reason.trim(), selectedSlot)
      setSuccess(true)
    } catch (err) {
      setError(err?.response?.data?.error ?? 'Failed to submit reschedule request.')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--color-dark)]">Request Reschedule</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {success ? (
            <div className="text-center space-y-4 py-4">
              <p className="text-green-700 font-medium">Reschedule request submitted.</p>
              <p className="text-sm text-slate-500">
                The patient has been marked for reschedule and will be notified.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-lg bg-[var(--color-primary)] text-white text-sm font-semibold hover:opacity-90 transition-opacity min-h-[44px]"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              {/* Patient + complaint summary */}
              <div className="bg-slate-50 rounded-lg px-4 py-3 text-sm text-[var(--color-dark)]">
                <p className="font-medium">
                  {target.patient.last_name}, {target.patient.first_name}
                </p>
                <p className="text-slate-500 mt-0.5">{target.chief_complaint}</p>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-dark)] mb-1.5">
                  Reschedule Reason
                  <span className="text-[var(--color-accent)] ml-0.5">*</span>
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value)
                    if (error) setError('')
                  }}
                  placeholder="Explain why the appointment needs to be rescheduled…"
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm text-[var(--color-dark)] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none"
                />
              </div>

              {/* Slot picker */}
              <SlotPicker
                schedule={schedule}
                clinicianName={clinicianName}
                selectedDate={selectedDate}
                onDateChange={(d) => { setSelectedDate(d); setSelectedSlot(null) }}
                selectedSlot={selectedSlot}
                onSlotSelect={setSelectedSlot}
                dateInputId="reschedule-date"
              />

              {/* Validation / API error */}
              {error && (
                <p className="text-sm text-[var(--color-accent)]">{error}</p>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 min-h-[44px] rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="flex-1 min-h-[44px] rounded-lg bg-[var(--color-primary)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  Submit Request
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── ClinicianDashboard ─────────────────────────────────────────────────────────

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

  const [rescheduleTarget, setRescheduleTarget] = useState(null)
  const [acceptConfirmId, setAcceptConfirmId]   = useState(null)
  const [acceptError, setAcceptError]           = useState('')

  // Auth guard — wait for silent refresh before deciding
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
      api.get(`/api/secretaries/${user.id}`)
        .then(({ data }) => setClinicianId(data.clinician_ids?.[0] ?? null))
        .catch(() => setFetchError('Unable to resolve your linked clinician.'))
    }
  }, [user])

  // Fetch appointments when clinicianId is available
  useEffect(() => {
    if (!clinicianId) return
    setFetchLoading(true)
    setFetchError('')
    api.get('/api/appointments/', { params: { clinician_id: clinicianId } })
      .then(({ data }) => setAppointments(data))
      .catch(() => setFetchError('Unable to load appointments.'))
      .finally(() => setFetchLoading(false))
  }, [clinicianId])

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setPage(1)
  }, [statusFilter, dateFilter])

  // ── All hooks above this line ──────────────────────────────────────────────

  if (authLoading || !user) return null

  // ── Derived state ──────────────────────────────────────────────────────────

  const filtered = appointments
    .filter(a => statusFilter === 'all' || a.status === statusFilter)
    .filter(a => !dateFilter || a.slot.slot_date === dateFilter)

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleAccept(appt) {
    setAcceptError('')
    setAcceptConfirmId(appt.appointment_id)
  }

  async function confirmAccept(appt) {
    setAcceptError('')
    try {
      await api.patch(`/api/appointments/${appt.appointment_id}`, { status: 'accepted' })
      setAppointments(prev =>
        prev.map(a => a.appointment_id === appt.appointment_id ? { ...a, status: 'accepted' } : a)
      )
      setAcceptConfirmId(null)
    } catch (err) {
      setAcceptError(err?.response?.data?.error ?? 'Failed to accept appointment.')
    }
  }

  async function handleRescheduleSubmit(appointmentId, reason) {
    await api.patch(`/api/appointments/${appointmentId}`, {
      status: 'reschedule_requested',
      reschedule_reason: reason,
      role: 'cs',
    })
    setAppointments(prev =>
      prev.map(a =>
        a.appointment_id === appointmentId
          ? { ...a, status: 'reschedule_requested', reschedule_reason: reason }
          : a
      )
    )
    setRescheduleTarget(null)
  }

  // ── Shared styles ──────────────────────────────────────────────────────────

  const actionBtnBase = 'min-h-[44px] px-3 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap'

  return (
    <>
      {rescheduleTarget && (
        <RescheduleModal
          target={rescheduleTarget}
          onSubmit={handleRescheduleSubmit}
          onClose={() => setRescheduleTarget(null)}
        />
      )}

      <div className="min-h-screen bg-slate-50">
        <div className="max-w-5xl mx-auto px-6 py-10">

          {/* ── Page header ── */}
          <div className="flex items-start justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-[var(--color-dark)]">Appointment Inbox</h1>
              <p className="text-lg italic text-slate-500 mt-1">
                Welcome, {user.first_name} {user.last_name}!
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
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

          {/* ── Filter bar ── */}
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

          {/* ── Appointment list ── */}
          {fetchLoading ? (
            <p className="text-center text-slate-400 py-16 text-sm">Loading…</p>
          ) : fetchError ? (
            <p className="text-center text-[var(--color-accent)] py-16 text-sm font-medium">{fetchError}</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-slate-400 py-16">No appointments match the current filters.</p>
          ) : (
            <>
              {/* Accept inline error */}
              {acceptError && (
                <p className="text-sm text-[var(--color-accent)] mb-4">{acceptError}</p>
              )}

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
                    {pageData.map(appt => {
                      const canAccept    = appt.status === 'pending'
                      const canReschedule = appt.status === 'pending' || appt.status === 'accepted'
                      const isConfirming  = acceptConfirmId === appt.appointment_id
                      return (
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
                            {isConfirming ? (
                              <div className="space-y-1">
                                <p className="text-xs text-slate-600">Accept this appointment?</p>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => confirmAccept(appt)}
                                    className={`${actionBtnBase} bg-green-600 text-white hover:bg-green-700`}
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => { setAcceptConfirmId(null); setAcceptError('') }}
                                    className={`${actionBtnBase} border border-slate-200 text-slate-600 hover:bg-slate-100`}
                                  >
                                    Back
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                {canAccept && (
                                  <button
                                    type="button"
                                    onClick={() => handleAccept(appt)}
                                    className={`${actionBtnBase} bg-green-600 text-white hover:bg-green-700`}
                                  >
                                    Accept
                                  </button>
                                )}
                                {canReschedule && (
                                  <button
                                    type="button"
                                    onClick={() => setRescheduleTarget(appt)}
                                    className={`${actionBtnBase} border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-blue-50`}
                                  >
                                    Reschedule
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards (below md) */}
              <div className="md:hidden space-y-4">
                {pageData.map(appt => {
                  const canAccept    = appt.status === 'pending'
                  const canReschedule = appt.status === 'pending' || appt.status === 'accepted'
                  const isConfirming  = acceptConfirmId === appt.appointment_id
                  return (
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

                      {isConfirming ? (
                        <div className="space-y-2 pt-1">
                          <p className="text-xs text-slate-600">Accept this appointment?</p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => confirmAccept(appt)}
                              className={`${actionBtnBase} flex-1 bg-green-600 text-white hover:bg-green-700`}
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => { setAcceptConfirmId(null); setAcceptError('') }}
                              className={`${actionBtnBase} flex-1 border border-slate-200 text-slate-600 hover:bg-slate-100`}
                            >
                              Back
                            </button>
                          </div>
                        </div>
                      ) : (canAccept || canReschedule) && (
                        <div className="flex gap-2 pt-1">
                          {canAccept && (
                            <button
                              type="button"
                              onClick={() => handleAccept(appt)}
                              className={`${actionBtnBase} flex-1 bg-green-600 text-white hover:bg-green-700`}
                            >
                              Accept
                            </button>
                          )}
                          {canReschedule && (
                            <button
                              type="button"
                              onClick={() => setRescheduleTarget(appt)}
                              className={`${actionBtnBase} flex-1 border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-blue-50`}
                            >
                              Reschedule
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* ── Pagination ── */}
              <div className="flex items-center justify-between mt-6">
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
                >
                  ← Prev
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
                  Next →
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </>
  )
}
