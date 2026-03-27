import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

// ── Constants ──────────────────────────────────────────────────────────────────

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeEmptyRows() {
  return DAYS.map(day => ({
    day,
    schedule_id: null,
    active:   false,
    amStart:  '',
    amEnd:    '',
    pmStart:  '',
    pmEnd:    '',
    error:    '',
    saveError: '',
    saved:    false,
  }))
}

function seedFromApi(scheduleList) {
  const byDay = {}
  for (const s of scheduleList) {
    byDay[s.day_of_week] = s
  }
  return DAYS.map(day => {
    const s = byDay[day]
    if (!s) {
      return { day, schedule_id: null, active: false, amStart: '', amEnd: '', pmStart: '', pmEnd: '', error: '', saveError: '', saved: false }
    }
    return {
      day,
      schedule_id: s.schedule_id,
      active:  true,
      amStart: s.am_start ?? '',
      amEnd:   s.am_end   ?? '',
      pmStart: s.pm_start ?? '',
      pmEnd:   s.pm_end   ?? '',
      error:    '',
      saveError: '',
      saved:    false,
    }
  })
}

function validateRows(rows) {
  return rows.map(row => {
    if (!row.active) return { ...row, error: '' }
    const errs = []
    if (row.amStart && row.amEnd && row.amEnd <= row.amStart) {
      errs.push('AM end must be after AM start.')
    }
    if (row.pmStart && row.pmEnd && row.pmEnd <= row.pmStart) {
      errs.push('PM end must be after PM start.')
    }
    return { ...row, error: errs.join(' ') }
  })
}

// ── TimeInput ──────────────────────────────────────────────────────────────────

function TimeInput({ value, onChange, disabled }) {
  return (
    <input
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={[
        'px-3 py-2 rounded-lg border text-sm min-h-[44px] w-[112px]',
        'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-colors',
        disabled
          ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
          : 'bg-white border-slate-200 text-[var(--color-dark)]',
      ].join(' ')}
    />
  )
}

// ── ScheduleManager ────────────────────────────────────────────────────────────

export default function ScheduleManager() {
  const { user, authLoading } = useAuth()
  const navigate = useNavigate()

  // ── Clinician resolution + fetch ─────────────────────────────────────────────
  const [clinicianId, setClinicianId]   = useState(null)
  const [fetchLoading, setFetchLoading] = useState(false)
  const [fetchError, setFetchError]     = useState('')

  const [rows, setRows]           = useState(makeEmptyRows)
  const [confirmSave, setConfirmSave] = useState(false)
  const [isSaving, setIsSaving]   = useState(false)
  const [stuckSlots, setStuckSlots] = useState([])

  // Auth guard — wait for silent refresh before deciding
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/staff/login?redirect=/clinician-dashboard/schedule')
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

  // Fetch schedules when clinicianId is available
  useEffect(() => {
    if (!clinicianId) return
    setFetchLoading(true)
    setFetchError('')
    api.get(`/api/clinicians/${clinicianId}/schedules`)
      .then(({ data }) => setRows(seedFromApi(data)))
      .catch(() => setFetchError('Unable to load schedule.'))
      .finally(() => setFetchLoading(false))
  }, [clinicianId])

  // ── All hooks above this line ──────────────────────────────────────────────

  if (authLoading || !user) return null

  // ── Handlers ───────────────────────────────────────────────────────────────

  function updateRow(index, field, value) {
    setConfirmSave(false)
    setRows(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value, error: '', saveError: '', saved: false }
      return next
    })
  }

  function toggleActive(index) {
    setConfirmSave(false)
    setRows(prev => {
      const next = [...prev]
      next[index] = { ...next[index], active: !next[index].active, error: '', saveError: '', saved: false }
      return next
    })
  }

  function handleSaveClick() {
    // Validate first; if errors surface them and don't enter confirm mode
    const validated = validateRows(rows)
    if (validated.some(r => r.error)) {
      setRows(validated)
      return
    }
    setConfirmSave(true)
  }

  async function confirmSaveSchedule() {
    const validated = validateRows(rows)
    if (validated.some(r => r.error)) {
      setRows(validated)
      setConfirmSave(false)
      return
    }

    setIsSaving(true)
    setStuckSlots([])

    const activeRows = validated.filter(r => r.active)

    const results = await Promise.allSettled(
      activeRows.map(async (row) => {
        const body = {
          day_of_week: row.day,
          am_start: row.amStart || null,
          am_end:   row.amEnd   || null,
          pm_start: row.pmStart || null,
          pm_end:   row.pmEnd   || null,
        }
        if (row.schedule_id) {
          const { data } = await api.patch(
            `/api/clinicians/${clinicianId}/schedules/${row.schedule_id}`,
            body
          )
          return { day: row.day, scheduleId: row.schedule_id, data }
        } else {
          const { data } = await api.post(
            `/api/clinicians/${clinicianId}/schedules`,
            body
          )
          return { day: row.day, scheduleId: data.schedule_id, data }
        }
      })
    )

    // Build a day → result map
    const resultByDay = {}
    activeRows.forEach((row, i) => { resultByDay[row.day] = results[i] })

    // Collect stuck slots from all PATCH responses
    const newStuck = []
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.data.slot_regeneration?.stuck?.length) {
        newStuck.push(...result.value.data.slot_regeneration.stuck)
      }
    }

    setRows(prev => prev.map(r => {
      if (!r.active) return r
      const result = resultByDay[r.day]
      if (!result) return r
      if (result.status === 'fulfilled') {
        return {
          ...r,
          schedule_id: result.value.scheduleId ?? r.schedule_id,
          saved: true,
          saveError: '',
        }
      }
      return {
        ...r,
        saved: false,
        saveError: result.reason?.response?.data?.error ?? 'Save failed.',
      }
    }))

    setStuckSlots(newStuck)
    setIsSaving(false)
    setConfirmSave(false)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (fetchLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-400 text-sm">Loading…</p>
      </div>
    )
  }

  if (fetchError && !clinicianId) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-[var(--color-accent)] text-sm font-medium">{fetchError}</p>
        <Link
          to="/clinician-dashboard"
          className="text-sm text-[var(--color-primary)] hover:underline"
        >
          ← Back to Inbox
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-slate-500">
          <Link
            to="/clinician-dashboard"
            className="hover:text-[var(--color-primary)] transition-colors"
          >
            Appointment Inbox
          </Link>
          <span className="mx-2">/</span>
          <span className="text-[var(--color-dark)] font-medium">Schedule Manager</span>
        </nav>

        {/* Heading */}
        <h1 className="text-3xl font-bold text-[var(--color-dark)] mb-8">Schedule Manager</h1>

        {/* Inline fetch error (clinicianId resolved but schedule fetch failed) */}
        {fetchError && clinicianId && (
          <p className="text-sm text-[var(--color-accent)] mb-6">{fetchError}</p>
        )}

        {/* ── Desktop table (sm+) ── */}
        <div className="hidden sm:block bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden mb-6">

          {/* Table header */}
          <div className="flex items-center px-5 py-3.5 bg-slate-50 border-b border-slate-100">
            <div className="w-32 shrink-0 text-xs font-semibold text-slate-500 uppercase tracking-wide">Day</div>
            <div className="w-20 shrink-0 text-xs font-semibold text-slate-500 uppercase tracking-wide">Active</div>
            <div className="flex-1 text-xs font-semibold text-slate-500 uppercase tracking-wide">AM Window</div>
            <div className="flex-1 text-xs font-semibold text-slate-500 uppercase tracking-wide">PM Window</div>
          </div>

          {/* Day rows */}
          {rows.map((row, i) => (
            <div
              key={row.day}
              className={`border-b border-slate-100 last:border-0 ${row.error ? 'bg-red-50' : ''}`}
            >
              <div className="flex items-center px-5 py-4 gap-2">

                {/* Day name */}
                <div className="w-32 shrink-0 text-sm font-semibold text-[var(--color-dark)]">
                  {row.day}
                </div>

                {/* Active toggle */}
                <div className="w-20 shrink-0 flex items-center">
                  <input
                    type="checkbox"
                    id={`active-${row.day}`}
                    checked={row.active}
                    onChange={() => toggleActive(i)}
                    className="w-5 h-5 rounded border-slate-300 accent-[var(--color-primary)] cursor-pointer"
                  />
                </div>

                {/* AM window */}
                <div className="flex-1 flex items-center gap-2">
                  <TimeInput
                    value={row.amStart}
                    onChange={(v) => updateRow(i, 'amStart', v)}
                    disabled={!row.active}
                  />
                  <span className={`text-sm select-none ${row.active ? 'text-slate-400' : 'text-slate-200'}`}>–</span>
                  <TimeInput
                    value={row.amEnd}
                    onChange={(v) => updateRow(i, 'amEnd', v)}
                    disabled={!row.active}
                  />
                </div>

                {/* PM window */}
                <div className="flex-1 flex items-center gap-2">
                  <TimeInput
                    value={row.pmStart}
                    onChange={(v) => updateRow(i, 'pmStart', v)}
                    disabled={!row.active}
                  />
                  <span className={`text-sm select-none ${row.active ? 'text-slate-400' : 'text-slate-200'}`}>–</span>
                  <TimeInput
                    value={row.pmEnd}
                    onChange={(v) => updateRow(i, 'pmEnd', v)}
                    disabled={!row.active}
                  />
                </div>

              </div>

              {/* Per-row status */}
              {(row.error || row.saveError || row.saved) && (
                <div className="px-5 pb-3 space-y-0.5">
                  {row.error    && <p className="text-xs text-[var(--color-accent)]">{row.error}</p>}
                  {row.saveError && <p className="text-xs text-[var(--color-accent)]">{row.saveError}</p>}
                  {row.saved && !row.saveError && <p className="text-xs text-green-700 font-medium">Saved.</p>}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Mobile cards (below sm) ── */}
        <div className="sm:hidden space-y-4 mb-6">
          {rows.map((row, i) => (
            <div
              key={row.day}
              className={`bg-white rounded-xl border shadow-sm p-5 space-y-4 ${
                row.error ? 'border-red-200' : 'border-slate-100'
              }`}
            >
              {/* Day + toggle */}
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold text-[var(--color-dark)]">{row.day}</span>
                <label className="flex items-center gap-2 cursor-pointer select-none min-h-[44px]">
                  <input
                    type="checkbox"
                    checked={row.active}
                    onChange={() => toggleActive(i)}
                    className="w-5 h-5 rounded border-slate-300 accent-[var(--color-primary)]"
                  />
                  <span className="text-sm text-slate-500">Active</span>
                </label>
              </div>

              {/* Time windows */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">AM</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <TimeInput
                      value={row.amStart}
                      onChange={(v) => updateRow(i, 'amStart', v)}
                      disabled={!row.active}
                    />
                    <span className={`text-xs select-none ${row.active ? 'text-slate-400' : 'text-slate-200'}`}>–</span>
                    <TimeInput
                      value={row.amEnd}
                      onChange={(v) => updateRow(i, 'amEnd', v)}
                      disabled={!row.active}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">PM</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <TimeInput
                      value={row.pmStart}
                      onChange={(v) => updateRow(i, 'pmStart', v)}
                      disabled={!row.active}
                    />
                    <span className={`text-xs select-none ${row.active ? 'text-slate-400' : 'text-slate-200'}`}>–</span>
                    <TimeInput
                      value={row.pmEnd}
                      onChange={(v) => updateRow(i, 'pmEnd', v)}
                      disabled={!row.active}
                    />
                  </div>
                </div>
              </div>

              {/* Per-row status */}
              {(row.error || row.saveError || row.saved) && (
                <div className="space-y-0.5">
                  {row.error    && <p className="text-xs text-[var(--color-accent)]">{row.error}</p>}
                  {row.saveError && <p className="text-xs text-[var(--color-accent)]">{row.saveError}</p>}
                  {row.saved && !row.saveError && <p className="text-xs text-green-700 font-medium">Saved.</p>}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Save button / inline confirm ── */}
        {confirmSave ? (
          <div className="space-y-3">
            <p className="text-sm text-[var(--color-dark)]">
              Save schedule changes? This will update available time slots for patients.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={confirmSaveSchedule}
                disabled={isSaving}
                className="px-6 py-3 rounded-lg bg-[var(--color-primary)] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              >
                {isSaving ? 'Saving…' : 'Confirm'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmSave(false)}
                disabled={isSaving}
                className="px-6 py-3 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40 min-h-[44px]"
              >
                Back
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleSaveClick}
            className="px-6 py-3 rounded-lg bg-[var(--color-primary)] text-white text-sm font-semibold hover:opacity-90 transition-opacity min-h-[44px]"
          >
            Save Schedule
          </button>
        )}

        {/* ── Stuck slots warning panel ── */}
        {stuckSlots.length > 0 && (
          <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-6">
            <h2 className="text-base font-semibold text-amber-800 mb-1">
              Action Required — Slots with Active Appointments
            </h2>
            <p className="text-sm text-amber-700 mb-4">
              These slots have active appointments and could not be removed. Please resolve them
              manually from the{' '}
              <Link
                to="/clinician-dashboard"
                className="underline hover:text-amber-900 transition-colors"
              >
                Appointment Inbox
              </Link>
              .
            </p>
            <div className="overflow-x-auto rounded-lg border border-amber-200 bg-white">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-amber-100 bg-amber-50">
                    {['Date', 'Start', 'End', 'Active Appointments'].map(col => (
                      <th
                        key={col}
                        className="px-4 py-2.5 font-semibold text-amber-700 whitespace-nowrap"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stuckSlots.map((slot) => (
                    <tr key={slot.slot_id} className="border-b border-amber-50 last:border-0">
                      <td className="px-4 py-3 text-[var(--color-dark)]">{slot.slot_date}</td>
                      <td className="px-4 py-3 text-[var(--color-dark)]">{slot.start_time}</td>
                      <td className="px-4 py-3 text-[var(--color-dark)]">{slot.end_time}</td>
                      <td className="px-4 py-3 text-[var(--color-dark)]">{slot.active_appointment_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
