import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Search, SlidersHorizontal, ShieldCheck, CalendarCheck, Clock } from 'lucide-react'
import api from '../../services/api'
import ClinicianCard from '../../components/ClinicianCard'

const HERO_IMAGE = '/assets/images/hero.jpg'

// ── Trust bar ──────────────────────────────────────────────────────────────────

function TrustItem({ icon: Icon, label }) {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
      <Icon size={22} className="text-[var(--color-primary)] shrink-0" />
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </div>
  )
}

// ── Home ───────────────────────────────────────────────────────────────────────

export default function Home() {
  const [clinicians, setClinicians]       = useState([])
  const [loading, setLoading]             = useState(true)
  const [searchQuery, setSearchQuery]     = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('')

  useEffect(() => {
    api.get('/clinicians/')
      .then(({ data }) => setClinicians(data))
      .catch(() => setClinicians([]))
      .finally(() => setLoading(false))
  }, [])

  const departments = useMemo(() => {
    const unique = [...new Set(clinicians.map((c) => c.department))]
    return unique.sort()
  }, [clinicians])

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return clinicians.filter((c) => {
      const nameMatch = !q || `${c.first_name} ${c.last_name}`.toLowerCase().includes(q)
      const deptMatch = !selectedDepartment || c.department === selectedDepartment
      return nameMatch && deptMatch
    })
  }, [clinicians, searchQuery, selectedDepartment])

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">

      {/* ── Hero ── */}
      <header
        className="relative flex items-center min-h-[520px] md:min-h-[520px] min-h-[360px] overflow-hidden"
        style={{
          backgroundImage: `url(${HERO_IMAGE})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to right, rgba(29,64,156,0.80), rgba(29,64,156,0.40))',
          }}
        />

        {/* Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-6 py-16 w-full">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/80 mb-3">
              Your Health Partner
            </p>
            <h1 className="text-4xl md:text-4xl text-2xl font-bold text-white leading-tight">
              Find the Right Doctor,<br />Book with Confidence
            </h1>
            <p className="text-white/80 text-lg mt-4 leading-relaxed">
              Connect with trusted specialists. Simple booking, clear schedules,
              and care designed around you.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <Link
                to="/doctors"
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold text-base bg-[var(--color-accent)] text-white hover:brightness-110 min-h-[48px]"
              >
                Book an Appointment
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold text-base border-2 border-white text-white hover:bg-white/10 min-h-[48px]"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ── Trust bar ── */}
      <div className="bg-white border-b border-[var(--color-border)] py-6">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-0">
          <TrustItem icon={ShieldCheck} label="Trusted Specialists" />
          <div className="hidden sm:block w-px h-8 bg-[var(--color-border)] mx-8" />
          <TrustItem icon={CalendarCheck} label="Easy Scheduling" />
          <div className="hidden sm:block w-px h-8 bg-[var(--color-border)] mx-8" />
          <TrustItem icon={Clock} label="Fast Confirmation" />
        </div>
      </div>

      {/* ── Search bar ── */}
      <div className="max-w-5xl mx-auto px-6">
        <div className="bg-white rounded-2xl shadow-md border border-[var(--color-border)] p-4 mt-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search by name…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-3 rounded-xl border border-[var(--color-border)] text-base text-[var(--color-text)] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)] min-h-[48px]"
            />
          </div>
          <div className="relative sm:w-56">
            <SlidersHorizontal
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full pl-9 pr-4 py-3 rounded-xl border border-[var(--color-border)] text-base text-[var(--color-text)] bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)] min-h-[48px]"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Clinician grid ── */}
      <main className="max-w-5xl mx-auto px-6 pt-8 pb-16">
        {loading ? (
          <p className="text-gray-400 text-sm text-center py-24">Loading…</p>
        ) : filtered.length > 0 ? (
          <>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-5">
              {filtered.length} clinician{filtered.length !== 1 ? 's' : ''} found
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((c) => (
                <ClinicianCard key={c.clinician_id} clinician={c} />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-24">
            <p className="text-gray-500 font-medium text-base">No clinicians match your search.</p>
            <p className="text-gray-400 text-sm mt-1">
              Try a different name or select a different department.
            </p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedDepartment('') }}
              className="mt-5 text-sm text-[var(--color-primary)] hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
