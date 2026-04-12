import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { generatePatientAppointmentPDF } from '../../services/pdfService'

// ── Utilities ──────────────────────────────────────────────────────────────────

const MONTHS   = ['January','February','March','April','May','June','July','August','September','October','November','December']
const WEEKDAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

function formatDateFull(dateStr) {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const weekday = WEEKDAYS[new Date(y, mo - 1, d).getDay()]
  return `${weekday}, ${String(d).padStart(2, '0')} ${MONTHS[mo - 1]} ${y}`
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

// ── Status badge config ────────────────────────────────────────────────────────

const STATUS_BADGE = {
  pending:              { label: 'Pending',              cls: 'bg-yellow-100 text-yellow-700' },
  accepted:             { label: 'Confirmed',             cls: 'bg-green-100  text-green-700'  },
  reschedule_requested: { label: 'Reschedule Requested', cls: 'bg-orange-100 text-orange-700' },
  cancelled:            { label: 'Cancelled',             cls: 'bg-slate-100  text-slate-500'  },
  rejected:             { label: 'Rejected',              cls: 'bg-red-100    text-red-700'    },
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function DetailRow({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className="text-base font-medium text-[var(--color-dark)] leading-snug">{value}</p>
    </div>
  )
}

// ── AppointmentDrawer ──────────────────────────────────────────────────────────
//
// Props:
//   appointment   — full appointment object | null (null = closed)
//   onClose       — () => void
//   onCancel      — (appointmentId) => void
//   onReschedule  — (appointmentId) => void

export default function AppointmentDrawer({ appointment, onClose, onCancel, onReschedule }) {
  const [open,    setOpen]    = useState(false)
  const closingRef            = useRef(false)

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

      {/* Drawer panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Appointment details"
        className={[
          'fixed z-50 bg-white shadow-xl flex flex-col',
          'transition-transform duration-200',
          // Mobile: slides up from bottom, capped height, rounded top
          'bottom-0 left-0 right-0 max-h-[90vh] rounded-t-2xl',
          // Desktop: right-side panel, full height, no rounded corners
          'md:bottom-auto md:left-auto md:right-0 md:top-0 md:h-full md:w-full md:max-w-md md:rounded-none',
          // Slide-in/out
          open
            ? 'translate-y-0 md:translate-x-0'
            : 'translate-y-full md:translate-y-0 md:translate-x-full',
        ].join(' ')}
      >

        {/* ── Header ── */}
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

        {/* ── Body (scrollable) ── */}
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

        {/* ── Footer (sticky) ── */}
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

      </div>
    </>
  )
}
