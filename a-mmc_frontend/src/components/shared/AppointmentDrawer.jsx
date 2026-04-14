import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { generatePatientAppointmentPDF } from '../../services/pdfService'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

// ── Utilities ──────────────────────────────────────────────────────────────────

const MONTHS   = ['January','February','March','April','May','June','July','August','September','October','November','December']
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const WEEKDAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

function formatDateFull(dateStr) {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const weekday = WEEKDAYS[new Date(y, mo - 1, d).getDay()]
  return `${weekday}, ${String(d).padStart(2, '0')} ${MONTHS[mo - 1]} ${y}`
}

function formatDateMed(dateStr) {
  const [y, mo, d] = dateStr.split('-').map(Number)
  return `${SHORT_MONTHS[mo - 1]} ${String(d).padStart(2, '0')}, ${y}`
}

function formatTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hour   = parseInt(h, 10)
  const period = hour >= 12 ? 'PM' : 'AM'
  const h12    = hour % 12 || 12
  return `${h12}:${m} ${period}`
}

function formatTimeRange(start, end) {
  if (!end) return formatTime(start)
  return `${formatTime(start)} – ${formatTime(end)}`
}

function mapApiError(err) {
  const status = err?.response?.status
  const apiMsg = err?.response?.data?.error
  if (status === 400) return apiMsg || 'Something went wrong. Please try again.'
  if (status === 403) return apiMsg || 'You are not authorised to perform this action.'
  if (status === 409) return apiMsg || 'This action conflicts with existing data.'
  if (status === 422) return 'Please check your details and try again.'
  if (status === 500) return 'A server error occurred. Please try again later.'
  return apiMsg || 'Failed to submit. Please try again.'
}

// ── C/S helpers ────────────────────────────────────────────────────────────────

function isStatusEnabled(target, currentStatus) {
  if (target === 'pending')   return currentStatus === 'pending'
  if (target === 'accepted')  return ['pending', 'accepted', 'reschedule_requested'].includes(currentStatus)
  if (target === 'cancelled') return ['pending', 'accepted', 'reschedule_requested'].includes(currentStatus)
  if (target === 'done')      return currentStatus === 'accepted'
  return false
}

function buildSmsMessage(slot, clinician, status) {
  const date = formatDateMed(slot.slot_date)
  const time = formatTime(slot.start_time)
  const doc  = clinician.last_name
  if (status === 'accepted')  return `Your appointment on ${date} at ${time} with Dr. ${doc} has been confirmed.`
  if (status === 'cancelled') return `Your appointment on ${date} at ${time} with Dr. ${doc} has been cancelled.`
  if (status === 'done')      return `Your appointment on ${date} at ${time} with Dr. ${doc} has been completed. Thank you.`
  return ''
}

// ── Status badge config ────────────────────────────────────────────────────────

const STATUS_BADGE = {
  pending:              { label: 'Pending',              cls: 'bg-yellow-100 text-yellow-700' },
  accepted:             { label: 'Confirmed',             cls: 'bg-green-100  text-green-700'  },
  reschedule_requested: { label: 'Reschedule Requested', cls: 'bg-orange-100 text-orange-700' },
  done:                 { label: 'Done',                  cls: 'bg-teal-100   text-teal-700'   },
  cancelled:            { label: 'Cancelled',             cls: 'bg-slate-100  text-slate-500'  },
  rejected:             { label: 'Rejected',              cls: 'bg-red-100    text-red-700'    },
  declined:             { label: 'Declined',              cls: 'bg-slate-100  text-slate-500'  },
}

// ── Shared sub-components ──────────────────────────────────────────────────────

function DetailRow({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className="text-base font-medium text-[var(--color-dark)] leading-snug">{value || '—'}</p>
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
      {children}
    </p>
  )
}

// ── C/S Drawer Content ─────────────────────────────────────────────────────────

function CSDrawerContent({ appointment: appt, close, user, onSave }) {
  const { clinician, slot, patient } = appt

  // Patient detail (extended — fetched from API)
  const [patientDetail, setPatientDetail] = useState(null)

  // Editable fields
  const [statusChoice,   setStatusChoice]   = useState(appt.status)
  const [consultType,    setConsultType]    = useState(appt.consultation_type || 'f2f')
  const [paymentStatus,  setPaymentStatus]  = useState(appt.payment_status || 'unpaid')
  const [cancelReason,   setCancelReason]   = useState('')
  const [smsText,        setSmsText]        = useState(buildSmsMessage(slot, clinician, appt.status))

  // UI state
  const [saving,  setSaving]  = useState(false)
  const [saveErr, setSaveErr] = useState('')

  // Fetch full patient details
  useEffect(() => {
    api.get(`/patients/${appt.patient_id}`)
      .then(({ data }) => setPatientDetail(data))
      .catch(() => {})
  }, [appt.patient_id])

  // Rebuild SMS template when status choice changes
  useEffect(() => {
    const msg = buildSmsMessage(slot, clinician, statusChoice)
    if (msg) setSmsText(msg)
  }, [statusChoice])

  async function handleSave() {
    if (statusChoice === 'cancelled' && !cancelReason.trim()) {
      setSaveErr('Please provide a cancellation reason.')
      return
    }
    setSaving(true)
    setSaveErr('')
    try {
      const payload = { role: user.role }

      if (statusChoice !== appt.status) {
        payload.status = statusChoice
        if (statusChoice === 'cancelled') payload.cancellation_reason = cancelReason.trim()
        if (statusChoice === 'declined')  payload.decline_reason = cancelReason.trim()
      }

      const currentPayment = appt.payment_status || 'unpaid'
      if (paymentStatus !== currentPayment) {
        payload.payment_status = paymentStatus
      }

      await api.patch(`/appointments/${appt.appointment_id}`, payload)
      onSave?.()
      close()
    } catch (err) {
      setSaveErr(mapApiError(err))
    } finally {
      setSaving(false)
    }
  }

  const patientName = `${patient.last_name}, ${patient.first_name}`
  const docFull     = `${clinician.title ? clinician.title + ' ' : ''}${clinician.first_name} ${clinician.last_name}`

  const STATUS_RADIO_OPTIONS = [
    { value: 'pending',   label: 'Pending'   },
    { value: 'accepted',  label: 'Accepted'  },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'done',      label: 'Done'      },
  ]

  const CONSULT_OPTIONS = [
    { value: 'f2f',         label: 'F2F'         },
    { value: 'teleconsult', label: 'Teleconsult' },
  ]

  const PAYMENT_OPTIONS = [
    { value: 'unpaid', label: 'Unpaid' },
    { value: 'paid',   label: 'Paid'   },
  ]

  return (
    <>
      {/* ── Header ── */}
      <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
        <div className="flex-1 min-w-0 pr-4">
          <p className="font-semibold text-base text-[var(--color-dark)] leading-snug truncate">
            {patientName}
          </p>
          <p className="text-sm text-[var(--color-primary)] font-medium mt-0.5">
            Appointment #{appt.appointment_id}
          </p>
        </div>
        <button
          onClick={close}
          aria-label="Close"
          className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors p-1 -mt-0.5 -mr-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <X size={20} />
        </button>
      </div>

      {/* ── Body (scrollable, two columns) ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-slate-100">

          {/* ── Left column: patient + appointment info ── */}
          <div className="px-6 py-6 space-y-5">

            {/* Patient info */}
            <div>
              <SectionLabel>Patient</SectionLabel>
              <div className="space-y-3">
                <DetailRow label="Name"   value={patientName} />
                <DetailRow label="Email"  value={patientDetail?.login_email} />
                <DetailRow label="Mobile" value={patientDetail?.mobile_number} />
              </div>
            </div>

            <div className="border-t border-slate-100" />

            {/* Appointment details */}
            <div>
              <SectionLabel>Appointment</SectionLabel>
              <div className="space-y-3">
                <DetailRow label="Clinician"       value={docFull} />
                <DetailRow label="Specialty"       value={clinician.specialty} />
                <DetailRow label="Room"            value={clinician.room_number} />
                <DetailRow label="Chief Complaint" value={appt.chief_complaint} />
                {appt.chief_complaint_description && (
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Description</p>
                    <p className="text-sm text-[var(--color-dark)] leading-relaxed">
                      {appt.chief_complaint_description}
                    </p>
                  </div>
                )}
                <DetailRow label="HMO / Payment"  value={appt.payment_type} />
                {appt.discount_type && (
                  <DetailRow label="Discount" value={`${appt.discount_type} Discount`} />
                )}
                <DetailRow label="Professional Fee"    value="—" />
                <DetailRow label="Additional Request"  value="—" />
                <DetailRow label="Other Requests"      value="—" />
              </div>
            </div>

          </div>

          {/* ── Right column: date/time + controls ── */}
          <div className="px-6 py-6 space-y-6">

            {/* Date/time block */}
            <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Scheduled
              </p>
              <p className="text-base font-semibold text-[var(--color-dark)]">
                {formatDateFull(slot.slot_date)}
              </p>
              <p className="text-sm text-slate-500 mt-0.5">
                {formatTimeRange(slot.start_time, slot.end_time)}
              </p>
              <p className="text-xs text-slate-400 mt-2 capitalize">
                {appt.consultation_type === 'teleconsult' ? 'Teleconsult' : 'Face-to-Face'}
              </p>
            </div>

            {/* Change Status */}
            <div>
              <SectionLabel>Change Status</SectionLabel>
              <div className="flex flex-col gap-2">
                {STATUS_RADIO_OPTIONS.map(opt => {
                  const enabled = isStatusEnabled(opt.value, appt.status)
                  return (
                    <label
                      key={opt.value}
                      className={[
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors',
                        !enabled ? 'opacity-40 cursor-not-allowed' : '',
                        statusChoice === opt.value
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                          : 'border-slate-200 hover:bg-slate-50',
                      ].join(' ')}
                    >
                      <input
                        type="radio"
                        name="status"
                        value={opt.value}
                        checked={statusChoice === opt.value}
                        disabled={!enabled}
                        onChange={() => setStatusChoice(opt.value)}
                        className="accent-[var(--color-primary)]"
                      />
                      <span className="text-sm font-medium text-[var(--color-dark)]">
                        {opt.label}
                      </span>
                    </label>
                  )
                })}
              </div>

              {/* Cancel reason field */}
              {statusChoice === 'cancelled' && (
                <div className="mt-3">
                  <label className="block text-xs text-slate-400 mb-1">Cancellation Reason</label>
                  <textarea
                    value={cancelReason}
                    onChange={e => setCancelReason(e.target.value)}
                    rows={2}
                    placeholder="Required…"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none"
                  />
                </div>
              )}
            </div>

            {/* Change Payment Status */}
            <div>
              <SectionLabel>Payment Status</SectionLabel>
              <div className="flex gap-3">
                {PAYMENT_OPTIONS.map(opt => (
                  <label
                    key={opt.value}
                    className={[
                      'flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors text-sm font-medium',
                      paymentStatus === opt.value
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)]'
                        : 'border-slate-200 text-[var(--color-dark)] hover:bg-slate-50',
                    ].join(' ')}
                  >
                    <input
                      type="radio"
                      name="payment_status"
                      value={opt.value}
                      checked={paymentStatus === opt.value}
                      onChange={() => setPaymentStatus(opt.value)}
                      className="accent-[var(--color-primary)]"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            {/* SMS Message */}
            <div>
              <SectionLabel>SMS Message</SectionLabel>
              <textarea
                value={smsText}
                onChange={e => setSmsText(e.target.value)}
                rows={3}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none text-[var(--color-dark)]"
              />
              <p className="text-xs text-slate-400 mt-1">
                Template only — copy and send manually.
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="shrink-0 px-6 py-4 border-t border-slate-100 flex gap-3">
        {saveErr && (
          <p className="flex-1 self-center text-sm text-[var(--color-accent)] font-medium">
            {saveErr}
          </p>
        )}
        <div className="ml-auto flex gap-3">
          <button
            type="button"
            onClick={close}
            disabled={saving}
            className="px-5 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors min-h-[44px] disabled:opacity-50"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-lg bg-[var(--color-primary)] text-white text-sm font-semibold hover:opacity-90 transition-opacity min-h-[44px] disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </>
  )
}

// ── AppointmentDrawer ──────────────────────────────────────────────────────────
//
// Props:
//   appointment   — full appointment object | null (null = closed)
//   onClose       — () => void
//   onCancel      — (appointmentId) => void   [patient only]
//   onReschedule  — (appointmentId) => void   [patient only]
//   onSave        — () => void                [C/S only]

export default function AppointmentDrawer({ appointment, onClose, onCancel, onReschedule, onSave }) {
  const { user } = useAuth()
  const [open,    setOpen]    = useState(false)
  const closingRef            = useRef(false)
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth >= 768
  )

  // Track viewport width for modal vs drawer layout decision
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const handler = e => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Animate in when component mounts (appointment just became non-null)
  useEffect(() => {
    if (!appointment) return
    closingRef.current = false
    const id = requestAnimationFrame(() => setOpen(true))
    return () => cancelAnimationFrame(id)
  }, [appointment])

  // Animated close — slide out first, then notify parent
  function close() {
    if (closingRef.current) return
    closingRef.current = true
    setOpen(false)
    setTimeout(onClose, 200)
  }

  if (!appointment) return null

  const appt = appointment
  const { clinician, slot } = appt

  const isCS = user?.role === 'clinician' || user?.role === 'secretary'

  // ── Patient-only derived values ───────────────────────────────────────────
  const docFull = `${clinician.last_name}, ${clinician.first_name}`
  const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ')
  const badge      = STATUS_BADGE[appt.status] ?? { label: capitalize(appt.status), cls: 'bg-slate-100 text-slate-500' }

  const canCancel     = ['pending', 'accepted', 'reschedule_requested'].includes(appt.status)
  const canReschedule = appt.status === 'accepted'
  const hasActions    = canCancel || canReschedule || appt.status === 'pending'

  return (
    <>
      {/* Overlay */}
      <div
        aria-hidden="true"
        className={[
          'fixed inset-0 bg-black/40 z-40',
          'transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
        onClick={close}
      />

      {isCS && isDesktop ? (
        /* ── C/S desktop: centered modal ── */
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Appointment details"
          className={[
            'fixed inset-0 z-50 flex items-center justify-center p-6',
            'transition-opacity duration-200',
            open ? 'opacity-100' : 'opacity-0 pointer-events-none',
          ].join(' ')}
          onClick={close}
        >
          <div
            className="w-full max-w-4xl max-h-[90vh] flex flex-col bg-white rounded-xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <CSDrawerContent
              appointment={appt}
              close={close}
              user={user}
              onSave={onSave}
            />
          </div>
        </div>
      ) : (
        /* ── Drawer panel: C/S mobile OR patient (all sizes) ── */
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Appointment details"
          className={[
            'fixed z-50 bg-white shadow-xl flex flex-col',
            'transition-transform duration-200',
            // Mobile (all roles): slides up from bottom
            'bottom-0 left-0 right-0 max-h-[90vh] rounded-t-2xl',
            // Patient only on desktop: right-side panel, full height
            !isCS && 'md:bottom-auto md:left-auto md:right-0 md:top-0 md:h-full md:w-full md:max-w-md md:rounded-none',
            open
              ? (!isCS ? 'translate-y-0 md:translate-x-0' : 'translate-y-0')
              : (!isCS ? 'translate-y-full md:translate-y-0 md:translate-x-full' : 'translate-y-full'),
          ].filter(Boolean).join(' ')}
        >

          {isCS ? (
            <CSDrawerContent
              appointment={appt}
              close={close}
              user={user}
              onSave={onSave}
            />
          ) : (
          <>
            {/* ── Patient: Header ── */}
            <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
              <div className="flex-1 min-w-0 pr-4">
                <p className="font-semibold text-base text-[var(--color-dark)] leading-snug truncate">
                  {docFull}
                </p>
                <p className="text-sm text-[var(--color-primary)] font-medium mt-0.5">
                  {clinician.specialty}
                </p>
              </div>
              <button
                onClick={close}
                aria-label="Close"
                className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors p-1 -mt-0.5 -mr-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X size={20} />
              </button>
            </div>

            {/* ── Patient: Body (scrollable) ── */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">

              {/* Clinician section */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Clinician
                </p>
                <div className="space-y-4">
                  <DetailRow label="Name"    value={docFull} />
                  <DetailRow label="Specialty" value={clinician.specialty} />
                  <DetailRow label="Room"    value={clinician.room_number} />
                </div>
              </div>

              <div className="border-t border-slate-100" />

              {/* Appointment section */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Appointment
                </p>
                <div className="space-y-4">
                  <DetailRow label="Date"           value={formatDateFull(slot.slot_date)} />
                  <DetailRow label="Time"           value={formatTimeRange(slot.start_time, slot.end_time)} />
                  <DetailRow label="Chief Complaint" value={appt.chief_complaint} />
                  <DetailRow label="Booking Type"   value={appt.booking_type} />
                  <DetailRow label="Payment"        value={appt.payment_type || '—'} />
                  {appt.discount_type && (
                    <DetailRow label="Discount" value={`${appt.discount_type} Discount`} />
                  )}

                  {/* Status badge */}
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Status</p>
                    <span className={`inline-block text-sm font-medium px-3 py-1 rounded-full ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </div>

                  {/* Reschedule reason — only when present */}
                  {appt.reschedule_reason && (
                    <div className="rounded-lg bg-orange-50 border border-orange-100 px-4 py-3">
                      <p className="text-xs text-slate-400 mb-1">Reschedule Reason</p>
                      <p className="text-sm text-orange-800 leading-relaxed">{appt.reschedule_reason}</p>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* ── Patient: Footer (sticky) ── */}
            <div className="shrink-0 px-6 py-5 border-t border-slate-100 space-y-3">
              <button
                onClick={() => generatePatientAppointmentPDF(appt)}
                className="w-full min-h-[48px] rounded-lg border border-slate-200 text-[var(--color-dark)] font-semibold text-sm hover:bg-slate-50 transition-colors"
              >
                Download PDF
              </button>
              {hasActions ? (
                <>
                  {appt.status === 'pending' && (
                    <p className="text-sm text-slate-500 text-center py-1 leading-relaxed">
                      Your request is still pending. To change your appointment, cancel this request and book again. Cancelling will not remove the slot — you may rebook it immediately.
                    </p>
                  )}
                  {canCancel && (
                    <button
                      onClick={() => onCancel(appt.appointment_id)}
                      className="w-full min-h-[48px] rounded-lg border border-[var(--color-accent)] text-[var(--color-accent)] font-semibold text-sm hover:bg-red-50 transition-colors"
                    >
                      Cancel Appointment
                    </button>
                  )}
                  {canReschedule && (
                    <button
                      onClick={() => onReschedule(appt.appointment_id)}
                      className="w-full min-h-[48px] rounded-lg bg-[var(--color-accent)] text-white font-semibold text-sm hover:opacity-90 transition-opacity"
                    >
                      Request Reschedule
                    </button>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-400 text-center py-1">No actions available.</p>
              )}
            </div>
          </>
        )}

      </div>
    </>
  )
}
