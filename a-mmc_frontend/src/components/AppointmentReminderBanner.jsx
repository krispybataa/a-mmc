import { Clock } from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Convert a 24hr time string to 12hr display.
 * "09:00:00" → "9:00 AM"   "13:30:00" → "1:30 PM"
 */
function formatTime12(timeStr) {
  const [hourStr, min] = timeStr.split(':')
  const hour   = parseInt(hourStr, 10)
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const h12    = hour % 12 || 12
  return `${h12}:${min} ${suffix}`
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Shows a non-dismissible amber reminder banner for every accepted appointment
 * whose slot_date is tomorrow. Renders nothing when no such appointments exist.
 *
 * Props
 * -----
 * appointments  Array of appointment objects (defaults to [] — never crashes on
 *               null or undefined input).
 */
export default function AppointmentReminderBanner({ appointments = [] }) {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]   // "YYYY-MM-DD"

  const tomorrowAppts = appointments.filter(
    a => a.slot?.slot_date === tomorrowStr && a.status === 'accepted'
  )

  if (tomorrowAppts.length === 0) return null

  return (
    <div className="space-y-3 mb-6">
      {tomorrowAppts.map(appt => {
        const isTeleconsult = appt.consultation_type === 'teleconsult'
        const lastName = appt.clinician?.last_name ?? ''
        const time     = appt.slot?.start_time
          ? formatTime12(appt.slot.start_time)
          : ''

        const note = isTeleconsult
          ? 'Please ensure you have a stable internet connection and join the call on time.'
          : 'Please arrive 30 minutes early and bring any relevant medical records.'

        return (
          <div
            key={appt.appointment_id}
            role="alert"
            className="flex items-start gap-3 bg-[var(--color-primary)]/5 border-l-4 border-[var(--color-accent)] rounded-r-xl px-5 py-4"
          >
            <Clock size={20} className="text-[var(--color-accent)] mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold text-[var(--color-dark)] text-base">
                Appointment Reminder
              </p>
              <p className="text-[var(--color-text)] mt-1 text-base">
                You have an appointment tomorrow with {lastName}
                {time ? ` at ${time}` : ''}.{' '}
                {note}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
