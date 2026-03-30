import { useState, useEffect, useMemo } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import api from '../../services/api'
import ClinicianCard from '../../components/ClinicianCard'

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
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <header className="bg-[var(--color-primary)] text-white">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-primary-light)] mb-3">
            A-MMC
          </p>
          <h1 className="text-4xl font-bold tracking-tight mb-3">
            Find Your Clinician
          </h1>
          <p className="text-[var(--color-primary-light)] text-base max-w-lg leading-relaxed">
            Browse our team of specialists and book your appointment — all in one place,
            before you arrive.
          </p>
        </div>
      </header>

      {/* Search bar — overlaps hero */}
      <div className="max-w-5xl mx-auto px-6">
        <div className="bg-white rounded-xl shadow-md border border-slate-100 p-4 -mt-6 flex flex-col sm:flex-row gap-3">
          {/* Name search */}
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search by name…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm text-[var(--color-dark)] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
          </div>

          {/* Department filter */}
          <div className="relative sm:w-56">
            <SlidersHorizontal
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm text-[var(--color-dark)] bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Clinician grid */}
      <main className="max-w-5xl mx-auto px-6 pt-8 pb-16">
        {loading ? (
          <p className="text-slate-400 text-sm text-center py-24">Loading…</p>
        ) : filtered.length > 0 ? (
          <>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-5">
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
            <p className="text-slate-500 font-medium text-base">No clinicians match your search.</p>
            <p className="text-slate-400 text-sm mt-1">
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
