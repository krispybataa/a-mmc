import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SlidersHorizontal, X } from 'lucide-react'
import api from '../../services/api'
import ClinicianCard from '../../components/ClinicianCard'

// ── Constants ──────────────────────────────────────────────────────────────────

const DAYS    = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const PERIODS = ['AM', 'PM']

// ── Filter logic ───────────────────────────────────────────────────────────────

function applyFilters(clinicians, { name, spec, days, periods, hmo }) {
  return clinicians.filter(c => {
    // Name
    if (name.trim()) {
      const q    = name.trim().toLowerCase()
      const full = `${c.first_name} ${c.last_name}`.toLowerCase()
      if (!full.includes(q)) return false
    }
    // Specialty
    if (spec.trim()) {
      if (!c.specialty.toLowerCase().includes(spec.trim().toLowerCase())) return false
    }
    // Day + Period
    if (days.size > 0 || periods.size > 0) {
      const match = c.schedules.some(s => {
        const dayOk    = days.size === 0    || days.has(s.day_of_week.slice(0, 3))
        const amOk     = periods.has('AM') && s.am_start != null
        const pmOk     = periods.has('PM') && s.pm_start != null
        const periodOk = periods.size === 0 || amOk || pmOk
        return dayOk && periodOk
      })
      if (!match) return false
    }
    // HMO — hmos from list endpoint are flat name strings
    if (hmo && !c.hmos.includes(hmo)) return false

    return true
  })
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function Doctors() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Initialize from URL params (passed by GuidedSearch triage flow)
  const paramSpec = searchParams.get('specialty') ?? ''
  const paramHMO  = searchParams.get('hmo')       ?? ''

  const [clinicians,    setClinicians]    = useState([])
  const [fetchLoading,  setFetchLoading]  = useState(true)
  const [fetchError,    setFetchError]    = useState('')

  const [nameQuery,       setNameQuery]       = useState('')
  const [specQuery,       setSpecQuery]       = useState(paramSpec)
  const [selectedDays,    setSelectedDays]    = useState(new Set())
  const [selectedPeriods, setSelectedPeriods] = useState(new Set())
  const [selectedHMO,     setSelectedHMO]     = useState(paramHMO)
  const [filtersOpen,     setFiltersOpen]     = useState(!!(paramSpec || paramHMO))
  const [showBanner,      setShowBanner]      = useState(!!(paramSpec || paramHMO))

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get('/clinicians/')
        setClinicians(data.slice().sort((a, b) => a.last_name.localeCompare(b.last_name)))
      } catch {
        setFetchError('Unable to load clinicians. Please try again.')
      } finally {
        setFetchLoading(false)
      }
    }
    load()
  }, [])

  // ── Derived data ───────────────────────────────────────────────────────────

  const allHmos = useMemo(
    () => [...new Set(clinicians.flatMap(c => c.hmos))].sort(),
    [clinicians]
  )

  const visible = useMemo(() => applyFilters(clinicians, {
    name:    nameQuery,
    spec:    specQuery,
    days:    selectedDays,
    periods: selectedPeriods,
    hmo:     selectedHMO,
  }), [clinicians, nameQuery, specQuery, selectedDays, selectedPeriods, selectedHMO])

  // ── Handlers ──────────────────────────────────────────────────────────────

  function toggleDay(d) {
    setSelectedDays(prev => {
      const next = new Set(prev)
      next.has(d) ? next.delete(d) : next.add(d)
      return next
    })
  }

  function togglePeriod(p) {
    setSelectedPeriods(prev => {
      const next = new Set(prev)
      next.has(p) ? next.delete(p) : next.add(p)
      return next
    })
  }

  function resetFilters() {
    setNameQuery('')
    setSpecQuery('')
    setSelectedDays(new Set())
    setSelectedPeriods(new Set())
    setSelectedHMO('')
    setShowBanner(false)
    setSearchParams({})
  }

  function clearTriage() {
    setSpecQuery('')
    setSelectedHMO('')
    setShowBanner(false)
    setSearchParams({})
  }

  // ── Shared input class ─────────────────────────────────────────────────────

  const inputCls = 'w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-[var(--color-dark)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent'

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[var(--color-dark)]">Clinician Directory</h1>
          <p className="text-sm text-slate-400 mt-1">Browse and find the right specialist for your needs.</p>
        </div>

        {/* ── Triage results banner ── */}
        {showBanner && (
          <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 mb-6">
            <div className="flex-1 text-sm text-blue-800">
              Showing results based on your responses.{' '}
              <button
                onClick={clearTriage}
                className="font-semibold underline hover:no-underline"
              >
                Clear filters
              </button>
              {' '}to see all doctors.
            </div>
            <button
              onClick={clearTriage}
              aria-label="Dismiss"
              className="text-blue-500 hover:text-blue-700 transition-colors p-0.5 shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* ── Filter panel ── */}
        {(() => {
          const activeCount = [
            specQuery.trim() !== '',
            selectedHMO !== '',
            selectedDays.size > 0,
            selectedPeriods.size > 0,
          ].filter(Boolean).length

          return (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm mb-8">

              {/* ── Search row (always visible) ── */}
              <div className="flex items-center gap-3 px-5 py-4">
                <input
                  type="text"
                  value={nameQuery}
                  onChange={e => setNameQuery(e.target.value)}
                  placeholder="Search by name..."
                  className={`flex-1 ${inputCls}`}
                />
                <button
                  onClick={() => setFiltersOpen(v => !v)}
                  className={[
                    'shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors min-h-[44px]',
                    activeCount > 0
                      ? 'border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent)]/5'
                      : 'border-slate-200 text-[var(--color-dark)] hover:bg-slate-50',
                  ].join(' ')}
                >
                  <SlidersHorizontal size={15} className="text-slate-400" />
                  <span>Filters{activeCount > 0 ? ` · ${activeCount}` : ''}</span>
                  {activeCount > 0 && (
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--color-primary)] text-white text-xs font-bold">
                      {activeCount}
                    </span>
                  )}
                </button>
              </div>

              {/* ── Expandable filter body ── */}
              <div
                className={[
                  'overflow-hidden transition-all duration-200',
                  filtersOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0',
                ].join(' ')}
              >
                <div className="px-5 pb-5 pt-5 border-t border-slate-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

                    {/* Specialization */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Specialization
                      </label>
                      <input
                        type="text"
                        value={specQuery}
                        onChange={e => setSpecQuery(e.target.value)}
                        placeholder="e.g. Cardiology"
                        className={inputCls}
                      />
                    </div>

                    {/* HMO Accreditation */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        HMO Accreditation
                      </label>
                      <select
                        value={selectedHMO}
                        onChange={e => setSelectedHMO(e.target.value)}
                        className={inputCls}
                      >
                        <option value="">All HMOs</option>
                        {allHmos.map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>

                    {/* Clinic Day */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Clinic Day
                      </label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {DAYS.map(d => (
                          <label key={d} className="flex items-center gap-1.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={selectedDays.has(d)}
                              onChange={() => toggleDay(d)}
                              className="w-4 h-4 rounded border-slate-300 accent-[var(--color-primary)]"
                            />
                            <span className="text-sm text-[var(--color-dark)]">{d}</span>
                          </label>
                        ))}
                      </div>
                      <div className="flex gap-4">
                        {PERIODS.map(p => (
                          <label key={p} className="flex items-center gap-1.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={selectedPeriods.has(p)}
                              onChange={() => togglePeriod(p)}
                              className="w-4 h-4 rounded border-slate-300 accent-[var(--color-primary)]"
                            />
                            <span className="text-sm text-[var(--color-dark)]">{p}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                  </div>

                  {/* Filter actions */}
                  <div className="flex gap-3 mt-5 pt-5 border-t border-slate-100">
                    <button
                      onClick={resetFilters}
                      className="px-5 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors min-h-[44px]"
                    >
                      Reset
                    </button>
                    <button
                      onClick={() => {}} // Filters already applied live on change
                      className="px-5 py-2.5 rounded-lg bg-[var(--color-primary)] text-white text-sm font-semibold hover:opacity-90 transition-opacity min-h-[44px]"
                    >
                      Search
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )
        })()}

        {/* ── Clinician grid ── */}
        {fetchLoading ? (
          <div className="text-center py-20">
            <p className="text-slate-400 text-sm">Loading clinicians…</p>
          </div>
        ) : fetchError ? (
          <div className="text-center py-20">
            <p className="text-[var(--color-accent)] text-sm font-medium">{fetchError}</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-500 font-medium">No clinicians match your search.</p>
            <button
              onClick={resetFilters}
              className="mt-4 text-sm font-medium text-[var(--color-primary)] hover:underline"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {visible.map(c => (
              <ClinicianCard
                key={c.clinician_id}
                clinician={c}
                displayName={`${c.last_name}, ${c.first_name}`}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
