import { useState, useEffect } from 'react'
import api from '../../services/api'

// ── Constants ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10

const EMPTY_FORM = {
  title: '', first_name: '', last_name: '', suffix: '',
  contact_phone: '', contact_email: '', login_email: '', password: '',
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatName({ title, first_name, last_name }) {
  return [title, first_name, last_name].filter(Boolean).join(' ')
}

function getLinkedNames(secretary) {
  // API may return linked_clinicians (array of objects) or clinician_ids (array of ids)
  if (Array.isArray(secretary.linked_clinicians) && secretary.linked_clinicians.length > 0) {
    return secretary.linked_clinicians
      .map(c => [c.title, c.first_name, c.last_name].filter(Boolean).join(' '))
      .join(', ')
  }
  if (Array.isArray(secretary.clinician_ids) && secretary.clinician_ids.length > 0) {
    return `${secretary.clinician_ids.length} linked`
  }
  return null
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

// ── Add Secretary modal ────────────────────────────────────────────────────────

function AddSecretaryModal({ onClose, onCreated }) {
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
      'first_name', 'last_name', 'contact_phone', 'contact_email', 'login_email', 'password',
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
      await api.post('/admin/secretaries', {
        ...form,
        suffix: form.suffix || undefined,
      })
      onCreated()
    } catch (err) {
      setServerError(err?.response?.data?.error ?? 'Failed to create secretary.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto">
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md my-8"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[var(--color-dark)]">Add Secretary</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl leading-none min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Title" value={form.title} onChange={v => set('title', v)} />
            <Field label="First Name *" value={form.first_name} onChange={v => set('first_name', v)} error={errors.first_name} />
            <Field label="Last Name *" value={form.last_name} onChange={v => set('last_name', v)} error={errors.last_name} />
          </div>

          <Field label="Suffix" value={form.suffix} onChange={v => set('suffix', v)} />

          <div className="grid grid-cols-2 gap-3">
            <Field label="Contact Phone *" value={form.contact_phone} onChange={v => set('contact_phone', v)} error={errors.contact_phone} type="tel" />
            <Field label="Contact Email *" value={form.contact_email} onChange={v => set('contact_email', v)} error={errors.contact_email} type="email" />
          </div>

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
              {saving ? 'Creating…' : 'Create Secretary'}
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

// ── Link Clinician modal ───────────────────────────────────────────────────────

function LinkClinicianModal({ secretary, onClose, onLinked }) {
  const [clinicians, setClinicians]   = useState([])
  const [fetchLoading, setFetchLoading] = useState(true)
  const [selectedId, setSelectedId]   = useState('')
  const [saving, setSaving]           = useState(false)
  const [serverError, setServerError] = useState('')

  useEffect(() => {
    api.get('/admin/clinicians')
      .then(({ data }) => setClinicians(data))
      .catch(() => setServerError('Failed to load clinicians.'))
      .finally(() => setFetchLoading(false))
  }, [])

  async function handleConfirm() {
    if (!selectedId) return
    setSaving(true)
    setServerError('')
    try {
      await api.post(`/secretaries/${secretary.secretary_id}/clinicians/${selectedId}`)
      onLinked()
    } catch (err) {
      setServerError(err?.response?.data?.error ?? 'Failed to link clinician.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-dark)]">Link Clinician</h2>
            <p className="text-xs text-slate-400 mt-0.5">{formatName(secretary)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl leading-none min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {fetchLoading ? (
            <p className="text-sm text-slate-400">Loading clinicians…</p>
          ) : (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Select Clinician
              </label>
              <select
                value={selectedId}
                onChange={e => setSelectedId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-[var(--color-dark)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent min-h-[44px]"
              >
                <option value="">Select…</option>
                {clinicians.map(c => (
                  <option key={c.clinician_id} value={c.clinician_id}>
                    {formatName(c)} — {c.specialty}
                  </option>
                ))}
              </select>
            </div>
          )}

          {serverError && (
            <p className="text-sm text-[var(--color-accent)]">{serverError}</p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!selectedId || saving || fetchLoading}
              className="flex-1 py-3 rounded-lg bg-[var(--color-primary)] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 min-h-[44px]"
            >
              {saving ? 'Linking…' : 'Confirm Link'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors min-h-[44px]"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── AdminSecretaries ───────────────────────────────────────────────────────────

export default function AdminSecretaries() {
  const [secretaries, setSecretaries] = useState([])
  const [loading, setLoading]         = useState(true)
  const [fetchError, setFetchError]   = useState('')
  const [page, setPage]               = useState(1)
  const [showAddModal, setShowAddModal]     = useState(false)
  const [linkTarget, setLinkTarget]         = useState(null) // secretary object

  function load() {
    setLoading(true)
    setFetchError('')
    api.get('/admin/secretaries')
      .then(({ data }) => { setSecretaries(data); setPage(1) })
      .catch(() => setFetchError('Failed to load secretaries.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function handleDelete(secretary) {
    if (!window.confirm(`Delete ${formatName(secretary)}? This cannot be undone.`)) return
    try {
      await api.delete(`/admin/secretaries/${secretary.secretary_id}`)
      load()
    } catch (err) {
      alert(err?.response?.data?.error ?? 'Delete failed.')
    }
  }

  const totalPages = Math.max(1, Math.ceil(secretaries.length / PAGE_SIZE))
  const pageItems  = secretaries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-dark)]">Secretaries</h1>
          <p className="text-sm text-slate-500 mt-1">{secretaries.length} total</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="px-5 py-3 rounded-lg bg-[var(--color-primary)] text-white text-sm font-semibold hover:opacity-90 transition-opacity min-h-[44px]"
        >
          + Add Secretary
        </button>
      </div>

      {fetchError && <p className="text-sm text-[var(--color-accent)] mb-4">{fetchError}</p>}

      {loading ? (
        <p className="text-slate-400 text-sm py-10 text-center">Loading…</p>
      ) : secretaries.length === 0 ? (
        <p className="text-slate-400 text-sm py-10 text-center">No secretaries found.</p>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Name', 'Email', 'Linked Clinician(s)', '', ''].map((col, i) => (
                    <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageItems.map(s => {
                  const linked = getLinkedNames(s)
                  return (
                    <tr key={s.secretary_id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-[var(--color-dark)] whitespace-nowrap">
                        {formatName(s)}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{s.login_email}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {linked ?? <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setLinkTarget(s)}
                          className="text-xs font-medium text-[var(--color-primary)] hover:underline min-h-[44px] px-2 whitespace-nowrap"
                        >
                          Link Clinician
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(s)}
                          className="text-xs font-medium text-[var(--color-accent)] hover:underline min-h-[44px] px-2"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  )
                })}
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

      {showAddModal && (
        <AddSecretaryModal
          onClose={() => setShowAddModal(false)}
          onCreated={() => { setShowAddModal(false); load() }}
        />
      )}

      {linkTarget && (
        <LinkClinicianModal
          secretary={linkTarget}
          onClose={() => setLinkTarget(null)}
          onLinked={() => { setLinkTarget(null); load() }}
        />
      )}
    </div>
  )
}
