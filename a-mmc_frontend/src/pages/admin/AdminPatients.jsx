import { useState, useEffect } from 'react'
import api from '../../services/api'

// ── Constants ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10

// ── AdminPatients ──────────────────────────────────────────────────────────────

export default function AdminPatients() {
  const [patients, setPatients]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [search, setSearch]         = useState('')
  const [page, setPage]             = useState(1)

  useEffect(() => {
    api.get('/admin/patients')
      .then(({ data }) => setPatients(data))
      .catch(() => setFetchError('Failed to load patients.'))
      .finally(() => setLoading(false))
  }, [])

  // Reset to page 1 whenever search changes
  useEffect(() => { setPage(1) }, [search])

  const filtered = patients.filter(p =>
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase().trim())
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageItems  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[var(--color-dark)]">Patients</h1>
        <p className="text-sm text-slate-500 mt-1">{patients.length} total — read only</p>
      </div>

      {/* Search */}
      <div className="mb-5">
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name…"
          className="w-full max-w-sm px-4 py-2.5 rounded-lg border border-slate-200 text-sm text-[var(--color-dark)] bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent min-h-[44px]"
        />
      </div>

      {fetchError && <p className="text-sm text-[var(--color-accent)] mb-4">{fetchError}</p>}

      {loading ? (
        <p className="text-slate-400 text-sm py-10 text-center">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-slate-400 text-sm py-10 text-center">
          {search ? 'No patients match your search.' : 'No patients found.'}
        </p>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Name', 'Email', 'Mobile Number'].map(col => (
                    <th key={col} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageItems.map(p => (
                  <tr key={p.patient_id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-[var(--color-dark)] whitespace-nowrap">
                      {p.first_name} {p.last_name}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{p.login_email}</td>
                    <td className="px-4 py-3 text-slate-600">{p.mobile_number}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
              <button
                type="button"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px] transition-colors"
              >
                ← Prev
              </button>
              <span>Page {page} of {totalPages}</span>
              <button
                type="button"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px] transition-colors"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
