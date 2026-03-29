import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import SlotPicker from '../../components/shared/SlotPicker'
import AppointmentDrawer from '../../components/shared/AppointmentDrawer'

// ── Utilities ─────────────────────────────────────────────────────────────────

const MONTHS   = ['January','February','March','April','May','June','July','August','September','October','November','December']
const WEEKDAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

function formatDateFull(dateStr) {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const weekday = WEEKDAYS[new Date(y, mo - 1, d).getDay()]
  return `${weekday}, ${String(d).padStart(2, '0')} ${MONTHS[mo - 1]} ${y}`
}

function formatDateShort(dateStr) {
  const [y, mo, d] = dateStr.split('-')
  return `${d}/${mo}/${y}`
}

function toDateStr(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 5
const ELIGIBLE  = new Set(['pending', 'accepted', 'reschedule_requested'])

// ── Main component ─────────────────────────────────────────────────────────────

export default function PatientAppointments() {
  const { user }  = useAuth()
  const navigate  = useNavigate()

  const [appointments,  setAppointments]  = useState([])
  const [fetchLoading,  setFetchLoading]  = useState(false)
  const [fetchError,    setFetchError]    = useState('')
  const [filterDate,    setFilterDate]    = useState('')
  const [currentPage,   setCurrentPage]   = useState(1)

  // Reschedule modal
  const [modalOpen,       setModalOpen]       = useState(false)
  const [modalApptId,     setModalApptId]     = useState(null)
  const [modalClinician,  setModalClinician]  = useState(null)
  const [reschedDate,     setReschedDate]     = useState('')
  const [reschedSlot,     setReschedSlot]     = useState(null)
  const [reschedMessage,  setReschedMessage]  = useState('')
  const [reschedErrors,   setReschedErrors]   = useState({})
  const [reschedLoading,  setReschedLoading]  = useState(false)

  // Detail drawer
  const [drawerAppointment, setDrawerAppointment] = useState(null)

  // Inline success message
  const [successApptId, setSuccessApptId] = useState(null)

  // Inline cancel confirm
  const [cancelConfirmId, setCancelConfirmId] = useState(null)
  const [cancelError,     setCancelError]     = useState(null)  // null | { id, msg }

  // Auth guard
  useEffect(() => {
    if (!user) navigate('/login?redirect=/dashboard/appointments')
  }, [user, navigate])

  // Auto-clear success message after 3s
  useEffect(() => {
    if (!successApptId) return
    const t = setTimeout(() => setSuccessApptId(null), 3000)
    return () => clearTimeout(t)
  }, [successApptId])

  // Fetch appointments when user is available
  useEffect(() => {
    if (!user?.id) return
    setFetchLoading(true)
    setFetchError('')
    api.get('/appointments/', { params: { patient_id: user.id } })
      .then(({ data }) => setAppointments(data))
      .catch(() => setFetchError('Unable to load appointments. Please try again.'))
      .finally(() => setFetchLoading(false))
  }, [user?.id])

  if (!user) return null

  // ── Derived data ──────────────────────────────────────────────────────────

  const today   = toDateStr(new Date())
  const maxDate = toDateStr(new Date(Date.now() + 60 * 24 * 60 * 60 * 1000))

  const filtered   = filterDate
    ? appointments.filter(a => a.slot.slot_date === filterDate)
    : appointments

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(currentPage, totalPages)
  const paged      = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleFilterChange(val) {
    setFilterDate(val)
    setCurrentPage(1)
  }

  // Show inline confirm row — actual DELETE fires in confirmCancel
  function handleCancel(id) {
    setCancelConfirmId(id)
    setCancelError(null)
  }

  async function confirmCancel(id) {
    try {
      await api.delete(`/appointments/${id}`, {
        data: { cancellation_reason: 'Cancelled by patient.', role: 'patient' },
      })
      setCancelConfirmId(null)
      setCancelError(null)
      setAppointments(prev =>
        prev.map(a => a.appointment_id === id ? { ...a, status: 'cancelled' } : a)
      )
    } catch (err) {
      const msg = err.response?.data?.error || 'Unable to cancel. Please try again.'
      setCancelError({ id, msg })
    }
  }

  async function openModal(apptId) {
    const appt = appointments.find(a => a.appointment_id === apptId)
    setModalApptId(apptId)
    setModalClinician(null)
    setReschedDate('')
    setReschedSlot(null)
    setReschedMessage('')
    setReschedErrors({})
    setModalOpen(true)

    if (appt) {
      try {
        const { data } = await api.get(`/clinicians/${appt.clinician_id}`)
        setModalClinician(data)
      } catch {
        // Leave modalClinician null — modal shows "Clinician schedule unavailable."
      }
    }
  }

  function closeModal() {
    setModalOpen(false)
    setModalApptId(null)
    setModalClinician(null)
  }

  function handleReschedDateChange(dateStr) {
    setReschedDate(dateStr)
    setReschedSlot(null)
    setReschedErrors(prev => ({ ...prev, date: undefined, slot: undefined }))
  }

  async function handleReschedSubmit() {
    const errs = {}
    if (!reschedDate)            errs.date    = 'Consultation date is required.'
    if (!reschedSlot)            errs.slot    = 'Please select a time slot.'
    if (!reschedMessage.trim())  errs.message = 'Message is required.'

    if (Object.keys(errs).length > 0) {
      setReschedErrors(errs)
      return
    }

    setReschedLoading(true)
    try {
      await api.patch(`/appointments/${modalApptId}`, {
        status: 'reschedule_requested',
        reschedule_reason: reschedMessage.trim(),
        role: 'patient',
      })
      setAppointments(prev => prev.map(a =>
        a.appointment_id === modalApptId
          ? { ...a, status: 'reschedule_requested', reschedule_reason: reschedMessage.trim() }
          : a
      ))
      setSuccessApptId(modalApptId)
      closeModal()
    } catch (err) {
      setReschedErrors({ submit: err.response?.data?.error || 'Failed to request reschedule.' })
    } finally {
      setReschedLoading(false)
    }
  }

  // ── Shared styles ──────────────────────────────────────────────────────────

  const inputCls = 'w-full px-4 py-3 rounded-lg border border-slate-200 text-sm text-[var(--color-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent'
  const errCls   = 'mt-1.5 text-xs text-[var(--color-accent)]'

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* ── Page title row ── */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <h1 className="text-2xl font-bold text-[var(--color-dark)]">My Appointments</h1>

          <div className="flex items-center gap-3 flex-wrap">
            <label htmlFor="filterDate" className="text-sm font-medium text-slate-600 whitespace-nowrap">
              Appointments for:
            </label>
            <div>
              <input
                id="filterDate"
                type="date"
                value={filterDate}
                onChange={e => handleFilterChange(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-[var(--color-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
              {filterDate && (
                <p className="text-xs text-slate-400 mt-1 text-right">{formatDateShort(filterDate)}</p>
              )}
            </div>
            {filterDate && (
              <button
                onClick={() => handleFilterChange('')}
                className="text-xs text-[var(--color-primary)] hover:underline whitespace-nowrap"
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
        ) : paged.length === 0 ? (
          <p className="text-center text-slate-400 py-16 text-base">No appointments found.</p>
        ) : (
          <div className="space-y-3">
            {paged.map(appt => {
              const docName  = `${appt.clinician.title} ${appt.clinician.last_name}`
              const eligible = ELIGIBLE.has(appt.status)
              const showCancelConfirm = cancelConfirmId === appt.appointment_id

              return (
                <div key={appt.appointment_id}>
                  <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

                      {/* Left: appointment info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-base text-[var(--color-dark)]">
                          {docName} — {appt.chief_complaint}
                        </p>
                        <p className="text-sm text-slate-400 mt-1">
                          {formatDateFull(appt.slot.slot_date)} · {appt.slot.start_time}
                        </p>
                      </div>

                      {/* Right: action buttons */}
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          onClick={() => setDrawerAppointment(appt)}
                          className="min-h-[44px] px-5 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity w-full sm:w-auto"
                        >
                          View Details
                        </button>
                        {eligible && (
                          <button
                            onClick={() => openModal(appt.appointment_id)}
                            className="min-h-[44px] px-5 rounded-lg bg-[var(--color-accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity w-full sm:w-auto"
                          >
                            Request Reschedule
                          </button>
                        )}
                      </div>

                    </div>
                  </div>

                  {/* Inline cancel confirm */}
                  {showCancelConfirm && (
                    <div className="mt-2 px-1 flex flex-wrap items-center gap-3">
                      <p className="text-sm text-slate-600">Cancel this appointment?</p>
                      <button
                        onClick={() => confirmCancel(appt.appointment_id)}
                        className="min-h-[40px] px-4 rounded-lg bg-[var(--color-accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => { setCancelConfirmId(null); setCancelError(null) }}
                        className="min-h-[40px] px-4 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        Back
                      </button>
                      {cancelError?.id === appt.appointment_id && (
                        <p className="text-xs text-[var(--color-accent)]">{cancelError.msg}</p>
                      )}
                    </div>
                  )}

                  {successApptId === appt.appointment_id && (
                    <p className="text-sm text-green-600 mt-2 px-1">Reschedule request sent.</p>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="min-h-[44px] px-5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Prev
            </button>
            <span className="text-sm text-slate-500">Page {safePage} of {totalPages}</span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="min-h-[44px] px-5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        )}

      </div>

      {/* ── Appointment Detail Drawer ── */}
      <AppointmentDrawer
        appointment={drawerAppointment}
        onClose={() => setDrawerAppointment(null)}
        onCancel={(id) => { handleCancel(id); setDrawerAppointment(null) }}
        onReschedule={(id) => { setDrawerAppointment(null); openModal(id) }}
      />

      {/* ── Reschedule Modal ── */}
      {modalOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">

            {/* Header — fixed */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
              <h2 className="text-lg font-semibold text-[var(--color-dark)]">Request for Reschedule</h2>
              <button
                onClick={closeModal}
                aria-label="Close"
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 -mr-1"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body — scrollable */}
            <div className="px-6 py-5 space-y-6 overflow-y-auto flex-1">

              {/* Slot picker */}
              {modalClinician ? (
                <div>
                  <SlotPicker
                    schedule={modalClinician.schedules}
                    clinicianName={`${modalClinician.title} ${modalClinician.first_name} ${modalClinician.last_name}`}
                    selectedDate={reschedDate}
                    onDateChange={handleReschedDateChange}
                    selectedSlot={reschedSlot}
                    onSlotSelect={slot => {
                      setReschedSlot(slot)
                      if (reschedErrors.slot) setReschedErrors(prev => ({ ...prev, slot: undefined }))
                    }}
                    minDate={today}
                    maxDate={maxDate}
                    dateInputId="resched-date"
                  />
                  {reschedErrors.date && <p className={errCls}>{reschedErrors.date}</p>}
                  {reschedErrors.slot && <p className={`${errCls} mt-2`}>{reschedErrors.slot}</p>}
                </div>
              ) : (
                <p className="text-sm text-slate-400">Clinician schedule unavailable.</p>
              )}

              {/* Message */}
              <div>
                <label htmlFor="reschedMessage" className="block text-sm font-medium text-[var(--color-dark)] mb-1.5">
                  Message <span className="text-[var(--color-accent)]">*</span>
                </label>
                <textarea
                  id="reschedMessage"
                  rows={3}
                  value={reschedMessage}
                  onChange={e => {
                    setReschedMessage(e.target.value)
                    if (reschedErrors.message) setReschedErrors(prev => ({ ...prev, message: undefined }))
                  }}
                  placeholder="Message to Clinician"
                  className={`${inputCls} resize-none`}
                />
                {reschedErrors.message && <p className={errCls}>{reschedErrors.message}</p>}
              </div>

            </div>

            {/* Footer — fixed */}
            <div className="px-6 pb-6 pt-4 border-t border-slate-100 shrink-0 space-y-3">
              {reschedErrors.submit && (
                <p className="text-xs text-[var(--color-accent)] text-center">{reschedErrors.submit}</p>
              )}
              <button
                onClick={handleReschedSubmit}
                disabled={reschedLoading}
                className="w-full min-h-[48px] rounded-lg bg-[var(--color-primary)] text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {reschedLoading ? 'Sending…' : 'Request'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
