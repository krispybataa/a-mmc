import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { mockAppointments } from '../../data/mockAppointments'
import { mockClinicians } from '../../data/mockClinicians'
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

  const [appointments,  setAppointments]  = useState(mockAppointments)
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

  // Detail drawer
  const [drawerAppointment, setDrawerAppointment] = useState(null)

  // Inline success message
  const [successApptId, setSuccessApptId] = useState(null)

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

  function handleCancel(id) {
    if (window.confirm('Are you sure you want to cancel this appointment?')) {
      setAppointments(prev =>
        prev.map(a => a.appointment_id === id ? { ...a, status: 'cancelled' } : a)
      )
    }
  }

  function openModal(apptId) {
    const appt          = appointments.find(a => a.appointment_id === apptId)
    const fullClinician = appt
      ? mockClinicians.find(c => c.clinician_id === appt.clinician.clinician_id)
      : null

    setModalApptId(apptId)
    setModalClinician(fullClinician ?? null)
    setReschedDate('')
    setReschedSlot(null)
    setReschedMessage('')
    setReschedErrors({})
    setModalOpen(true)
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

  function handleReschedSubmit() {
    const errs = {}
    if (!reschedDate)            errs.date    = 'Consultation date is required.'
    if (!reschedSlot)            errs.slot    = 'Please select a time slot.'
    if (!reschedMessage.trim())  errs.message = 'Message is required.'

    if (Object.keys(errs).length > 0) {
      setReschedErrors(errs)
      return
    }

    setAppointments(prev => prev.map(a =>
      a.appointment_id === modalApptId
        ? { ...a, status: 'reschedule_requested', reschedule_reason: reschedMessage.trim() }
        : a
    ))

    setSuccessApptId(modalApptId)
    closeModal()
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
        {paged.length === 0 ? (
          <p className="text-center text-slate-400 py-16 text-base">No appointments found.</p>
        ) : (
          <div className="space-y-3">
            {paged.map(appt => {
              const docName  = `${appt.clinician.title} ${appt.clinician.last_name}`
              const eligible = ELIGIBLE.has(appt.status)

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
                    schedule={modalClinician.schedule}
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
            <div className="px-6 pb-6 pt-4 border-t border-slate-100 shrink-0">
              <button
                onClick={handleReschedSubmit}
                className="w-full min-h-[48px] rounded-lg bg-[var(--color-primary)] text-white font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                Request
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
