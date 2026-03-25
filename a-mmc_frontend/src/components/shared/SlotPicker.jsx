// ── Mock taken indices — swap for real availability data during backend integration ──
const TAKEN_INDICES = new Set([1, 3])

const WEEKDAYS  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const DAY_ORDER = ['Mon','Tue','Wed','Thu','Fri','Sat']

function getDayOfWeek(dateStr) {
  const [y, mo, d] = dateStr.split('-').map(Number)
  return WEEKDAYS[new Date(y, mo - 1, d).getDay()]
}

function toDateStr(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function generateSlots(dayEntry) {
  const raw = []
  if (dayEntry.am_start && dayEntry.am_end) {
    const sh = parseInt(dayEntry.am_start, 10)
    const eh = parseInt(dayEntry.am_end,   10)
    for (let h = sh; h < eh; h++) {
      const t = `${String(h).padStart(2, '0')}:00`
      raw.push({ id: t, label: t, period: 'AM' })
    }
  }
  if (dayEntry.pm_start && dayEntry.pm_end) {
    const sh = parseInt(dayEntry.pm_start, 10)
    const eh = parseInt(dayEntry.pm_end,   10)
    for (let h = sh; h < eh; h++) {
      const t = `${String(h).padStart(2, '0')}:00`
      raw.push({ id: t, label: t, period: 'PM' })
    }
  }
  return raw.map((slot, i) => ({ ...slot, globalIdx: i }))
}

// ── SlotButton ─────────────────────────────────────────────────────────────────

function SlotButton({ slot, isSelected, isTaken, onSelect }) {
  return (
    <button
      type="button"
      disabled={isTaken}
      onClick={() => onSelect(slot)}
      className={[
        'flex flex-col items-center justify-center rounded-lg border min-h-[52px] px-2 py-2.5 transition-colors',
        isTaken
          ? 'bg-slate-50 border-slate-200 cursor-not-allowed'
          : isSelected
          ? 'bg-[var(--color-primary)] border-[var(--color-primary)]'
          : 'bg-white border-slate-200 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]',
      ].join(' ')}
    >
      <span className={[
        'text-xs font-medium leading-tight',
        isTaken ? 'text-slate-300' : isSelected ? 'text-white' : 'text-[var(--color-dark)]',
      ].join(' ')}>
        {slot.label}
      </span>
      {isTaken && (
        <span className="text-xs text-slate-400 mt-0.5">Taken</span>
      )}
    </button>
  )
}

// ── SlotPicker ─────────────────────────────────────────────────────────────────
//
// Fully controlled — all state lives in the parent.
//
// Props:
//   schedule       — clinician schedule array ({ day_of_week, am_start, am_end, pm_start, pm_end })
//   clinicianName  — string used in the unavailability warning message
//   selectedDate   — string YYYY-MM-DD (controlled)
//   onDateChange   — (dateStr) => void  ← parent should also reset selectedSlot to null
//   selectedSlot   — slot object | null (controlled)
//   onSlotSelect   — (slot) => void
//   minDate        — string YYYY-MM-DD (optional, defaults to today)
//   maxDate        — string YYYY-MM-DD (optional, defaults to today + 60 days)
//   dateInputId    — string (optional, for label htmlFor association)

export default function SlotPicker({
  schedule,
  clinicianName,
  selectedDate,
  onDateChange,
  selectedSlot,
  onSlotSelect,
  minDate,
  maxDate,
  dateInputId = 'slot-picker-date',
}) {
  const today = toDateStr(new Date())
  const min   = minDate ?? today
  const max   = maxDate ?? toDateStr(new Date(Date.now() + 60 * 24 * 60 * 60 * 1000))

  // Which abbreviated day names have at least one time block
  const availableDaySet = new Set(
    schedule
      .filter(s => s.am_start || s.pm_start)
      .map(s => s.day_of_week.slice(0, 3))
  )

  // Derive everything from selectedDate + schedule — no internal state needed
  const dow        = selectedDate ? getDayOfWeek(selectedDate) : null
  const dayEntry   = dow ? schedule.find(s => s.day_of_week === dow) : null
  const unavailable = selectedDate && (!dayEntry || (!dayEntry.am_start && !dayEntry.pm_start))
  const slots      = (dayEntry && !unavailable) ? generateSlots(dayEntry) : []
  const amSlots    = slots.filter(s => s.period === 'AM')
  const pmSlots    = slots.filter(s => s.period === 'PM')

  return (
    <div className="space-y-5">

      {/* Available day pills */}
      <div>
        <p className="text-xs text-slate-400 mb-2">Available days</p>
        <div className="flex flex-wrap gap-2">
          {DAY_ORDER.map(d => (
            <span
              key={d}
              className={[
                'px-3 py-1 rounded-full text-xs font-medium',
                availableDaySet.has(d)
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-gray-100 text-gray-400',
              ].join(' ')}
            >
              {d}
            </span>
          ))}
        </div>
      </div>

      {/* Date input */}
      <div>
        <label
          htmlFor={dateInputId}
          className="block text-sm font-medium text-[var(--color-dark)] mb-1.5"
        >
          Appointment Date
          <span className="text-[var(--color-accent)] ml-0.5">*</span>
        </label>
        <input
          id={dateInputId}
          type="date"
          min={min}
          max={max}
          value={selectedDate}
          onChange={e => onDateChange(e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm text-[var(--color-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
        />
      </div>

      {/* Unavailability warning */}
      {unavailable && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
          <p className="text-sm text-amber-800">
            {clinicianName} is not available on {dow}. Please select another date.
          </p>
        </div>
      )}

      {/* Slot grid */}
      {slots.length > 0 && (
        <div className="space-y-5">
          <p className="text-sm font-medium text-[var(--color-dark)]">
            Select a Time Slot
            <span className="text-[var(--color-accent)] ml-0.5">*</span>
          </p>

          {amSlots.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Morning
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {amSlots.map(slot => (
                  <SlotButton
                    key={slot.id}
                    slot={slot}
                    isSelected={selectedSlot?.id === slot.id}
                    isTaken={TAKEN_INDICES.has(slot.globalIdx)}
                    onSelect={onSlotSelect}
                  />
                ))}
              </div>
            </div>
          )}

          {pmSlots.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Afternoon
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {pmSlots.map(slot => (
                  <SlotButton
                    key={slot.id}
                    slot={slot}
                    isSelected={selectedSlot?.id === slot.id}
                    isTaken={TAKEN_INDICES.has(slot.globalIdx)}
                    onSelect={onSlotSelect}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  )
}
