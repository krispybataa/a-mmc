import { useState, useEffect } from 'react'
import api from '../../services/api'

// ── Constants ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10

const EMPTY_FORM = {
  title: '', first_name: '', last_name: '', middle_name: '', suffix: '',
  specialty: '', department: '', room_number: '', local_number: '',
  contact_phone: '', contact_email: '', login_email: '', password: '',
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatName({ title, first_name, last_name }) {
  return [title, first_name, last_name].filter(Boolean).join(' ')
}

// ── Modal ──────────────────────────────────────────────────────────────────────

function AddClinicianModal({ onClose, onCreated }) {
  const [form, setForm]       = useState(EMPTY_FORM)
  const [errors, setErrors]   = useState({})
  const [saving, setSaving]   = useState(false)
  const [serverError, setServerError] = useState('')

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    if (errors[field]) setErrors(e => ({ ...e, [field]: undefined }))
  }

  function validate() {
    const REQUIRED = [
      'first_name', 'last_name', 'specialty', 'department',
      'room_number', 'contact_phone', 'contact_email', 'login_email', 'password',
    ]
    const errs = {}
    for (const k of REQUIRED) {
      if (!form[k].trim()) errs[k] = 'Required.'
    }
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setSaving(true)
    setServerError('')
    try {
      await api.post('/admin/clinicians', {
        ...form,
        local_number: form.local_number || undefined,
        middle_name:  form.middle_name  || undefined,
        suffix:       form.suffix       || undefined,
      })
      onCreated()
    } catch (err) {
      setServerError(err?.response?.data?.error ?? 'Failed to create clinician.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto">
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-8"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[var(--color-dark)]">Add Clinician</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl leading-none min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Row: title + first + last */}
          <div className="grid grid-cols-3 gap-3">
            <Field label="Title" value={form.title} onChange={v => set('title', v)} />
            <Field label="First Name *" value={form.first_name} onChange={v => set('first_name', v)} error={errors.first_name} />
            <Field label="Last Name *" value={form.last_name} onChange={v => set('last_name', v)} error={errors.last_name} />
          </div>

          {/* Row: middle + suffix */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Middle Name" value={form.middle_name} onChange={v => set('middle_name', v)} />
            <Field label="Suffix" value={form.suffix} onChange={v => set('suffix', v)} />
          </div>

          {/* Specialty + department */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Specialty *" value={form.specialty} onChange={v => set('specialty', v)} error={errors.specialty} />
            <Field label="Department *" value={form.department} onChange={v => set('department', v)} error={errors.department} />
          </div>

          {/* Room + local number */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Room Number *" value={form.room_number} onChange={v => set('room_number', v)} error={errors.room_number} />
            <Field label="Local Number" value={form.local_number} onChange={v => set('local_number', v)} />
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Contact Phone *" value={form.contact_phone} onChange={v => set('contact_phone', v)} error={errors.contact_phone} type="tel" />
            <Field label="Contact Email *" value={form.contact_email} onChange={v => set('contact_email', v)} error={errors.contact_email} type="email" />
          </div>

          {/* Login */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Login Email *" value={form.login_email} onChange={v => set('login_email', v)} error={errors.login_email} type="email" />
            <Field label="Initial Password *" value={form.password} onChange={v => set('password', v)} error={errors.password} type="password" />
          </div>

          {serverError && (
            <p className="text-sm text-[var(--color-accent)]">{serverError}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 rounded-lg bg-[var(--color-primary)] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 min-h-[44px]"
            >
              {saving ? 'Creating…' : 'Create Clinician'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors min-h-[44px]"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Shared field component ─────────────────────────────────────────────────────

function Field({ label, value, onChange, error, type = 'text' }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={[
          'w-full px-3 py-2.5 rounded-lg border text-sm text-[var(--color-dark)] bg-white',
          'focus:outline-none focus:ring-2 focus:border-transparent min-h-[44px]',
          error
            ? 'border-[var(--color-accent)] focus:ring-[var(--color-accent)]'
            : 'border-slate-200 focus:ring-[var(--color-primary)]',
        ].join(' ')}
      />
      {error && <p className="text-xs text-[var(--color-accent)] mt-1">{error}</p>}
    </div>
  )
}

// ── AdminClinicians ────────────────────────────────────────────────────────────

export default function AdminClinicians() {
  const [clinicians, setClinicians] = useState([])
  const [loading, setLoading]       = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [page, setPage]             = useState(1)
  const [showModal, setShowModal]   = useState(false)

  function load() {
    setLoading(true)
    setFetchError('')
    api.get('/admin/clinicians')
      .then(({ data }) => { setClinicians(data); setPage(1) })
      .catch(() => setFetchError('Failed to load clinicians.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function handleDelete(clinician) {
    if (!window.confirm(`Delete ${formatName(clinician)}? This cannot be undone.`)) return
    try {
      await api.delete(`/admin/clinicians/${clinician.clinician_id}`)
      load()
    } catch (err) {
      alert(err?.response?.data?.error ?? 'Delete failed.')
    }
  }

  const totalPages = Math.max(1, Math.ceil(clinicians.length / PAGE_SIZE))
  const pageItems  = clinicians.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-dark)]">Clinicians</h1>
          <p className="text-sm text-slate-500 mt-1">{clinicians.length} total</p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="px-5 py-3 rounded-lg bg-[var(--color-primary)] text-white text-sm font-semibold hover:opacity-90 transition-opacity min-h-[44px]"
        >
          + Add Clinician
        </button>
      </div>

      {fetchError && <p className="text-sm text-[var(--color-accent)] mb-4">{fetchError}</p>}

      {loading ? (
        <p className="text-slate-400 text-sm py-10 text-center">Loading…</p>
      ) : clinicians.length === 0 ? (
        <p className="text-slate-400 text-sm py-10 text-center">No clinicians found.</p>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Name', 'Specialty', 'Department', 'Room', 'Email', ''].map(col => (
                    <th key={col} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageItems.map(c => (
                  <tr key={c.clinician_id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-[var(--color-dark)] whitespace-nowrap">
                      {formatName(c)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{c.specialty}</td>
                    <td className="px-4 py-3 text-slate-600">{c.department}</td>
                    <td className="px-4 py-3 text-slate-600">{c.room_number}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{c.login_email}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(c)}
                        className="text-xs font-medium text-[var(--color-accent)] hover:underline min-h-[44px] px-2"
                      >
                        Delete
                      </button>
                    </td>
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

      {showModal && (
        <AddClinicianModal
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); load() }}
        />
      )}
    </div>
  )
}
