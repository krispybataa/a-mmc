import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

// ── Empty basic info template ──────────────────────────────────────────────────

const EMPTY_BASIC = {
  title:         '',
  first_name:    '',
  middle_name:   '',
  last_name:     '',
  suffix:        '',
  department:    '',
  specialty:     '',
  room_number:   '',
  local_number:  '',
  contact_phone: '',
  contact_email: '',
}

function profileToBasic(data) {
  return {
    title:         data.title         ?? '',
    first_name:    data.first_name    ?? '',
    middle_name:   data.middle_name   ?? '',
    last_name:     data.last_name     ?? '',
    suffix:        data.suffix        ?? '',
    department:    data.department    ?? '',
    specialty:     data.specialty     ?? '',
    room_number:   data.room_number   ?? '',
    local_number:  data.local_number  ?? '',
    contact_phone: data.contact_phone ?? '',
    contact_email: data.contact_email ?? '',
  }
}

// ── Shared input style ─────────────────────────────────────────────────────────

const inputCls =
  'w-full px-4 py-3 rounded-lg border border-slate-200 text-sm text-[var(--color-dark)] ' +
  'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ' +
  'focus:border-transparent bg-white'

// ── Sub-components ─────────────────────────────────────────────────────────────

function FieldLabel({ htmlFor, children, optional }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-[var(--color-dark)] mb-1.5">
      {children}
      {!optional && <span className="text-[var(--color-accent)] ml-0.5">*</span>}
    </label>
  )
}

function SaveSuccess() {
  return (
    <p className="text-sm font-medium text-green-700 mt-2">Changes saved.</p>
  )
}

// ── ClinicianProfileManager ────────────────────────────────────────────────────

export default function ClinicianProfileManager() {
  const { user, authLoading } = useAuth()
  const navigate = useNavigate()

  // ── Clinician resolution + fetch ─────────────────────────────────────────────
  const [clinicianId, setClinicianId]   = useState(null)
  const [fetchLoading, setFetchLoading] = useState(false)
  const [fetchError, setFetchError]     = useState('')

  // ── Basic Info state ─────────────────────────────────────────────────────────
  const [basicInfo, setBasicInfo]         = useState(EMPTY_BASIC)
  const [basicSaving, setBasicSaving]     = useState(false)
  const [basicSaveSuccess, setBasicSuccess] = useState(false)
  const [basicSaveError, setBasicError]   = useState('')

  // ── HMO state ────────────────────────────────────────────────────────────────
  const [hmos, setHmos]               = useState([])
  const [newHmo, setNewHmo]           = useState('')
  const [hmoAdding, setHmoAdding]     = useState(false)
  const [hmoAddError, setHmoAddError] = useState('')
  const [removingHmoId, setRemovingHmoId] = useState(null)

  // ── Info state ────────────────────────────────────────────────────────────────
  const [infos, setInfos]                   = useState([])
  const [newInfoLabel, setNewInfoLabel]     = useState('')
  const [newInfoContent, setNewInfoContent] = useState('')
  const [infoAdding, setInfoAdding]         = useState(false)
  const [infoAddError, setInfoAddError]     = useState('')
  const [removingInfoId, setRemovingInfoId] = useState(null)

  // ── Profile picture state ────────────────────────────────────────────────────
  const [previewUrl, setPreviewUrl] = useState(null)
  const fileInputRef = useRef(null)

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/staff/login?redirect=/clinician-dashboard/profile')
    }
  }, [authLoading, user, navigate])

  // Resolve clinician_id based on role
  useEffect(() => {
    if (!user) return
    if (user.role === 'clinician') {
      setClinicianId(user.id)
    } else if (user.role === 'secretary') {
      api.get(`/secretaries/${user.id}`)
        .then(({ data }) => setClinicianId(data.clinician_ids?.[0] ?? null))
        .catch(() => setFetchError('Unable to resolve your linked clinician.'))
    }
  }, [user])

  // Fetch profile when clinicianId is available
  useEffect(() => {
    if (!clinicianId) return
    setFetchLoading(true)
    setFetchError('')
    api.get(`/clinicians/${clinicianId}`)
      .then(({ data }) => {
        setBasicInfo(profileToBasic(data))
        setHmos(data.hmos ?? [])
        setInfos(data.infos ?? [])
        setPreviewUrl(data.profile_picture ?? null)
      })
      .catch(() => setFetchError('Unable to load clinician profile.'))
      .finally(() => setFetchLoading(false))
  }, [clinicianId])

  // Revoke object URL on cleanup to prevent memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  // ── All hooks above this line ────────────────────────────────────────────────

  if (authLoading || !user) return null

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function handleBasicChange(field, value) {
    setBasicInfo(prev => ({ ...prev, [field]: value }))
    if (basicSaveSuccess) setBasicSuccess(false)
    if (basicSaveError) setBasicError('')
  }

  async function handleBasicSave() {
    setBasicSaving(true)
    setBasicError('')
    setBasicSuccess(false)
    try {
      await api.patch(`/clinicians/${clinicianId}`, basicInfo)
      setBasicSuccess(true)
    } catch (err) {
      setBasicError(err?.response?.data?.error ?? 'Failed to save changes.')
    } finally {
      setBasicSaving(false)
    }
  }

  async function handleAddHmo() {
    const trimmed = newHmo.trim()
    if (!trimmed) return
    setHmoAdding(true)
    setHmoAddError('')
    try {
      const { data } = await api.post(`/clinicians/${clinicianId}/hmos`, { hmo_name: trimmed })
      setHmos(prev => [...prev, { hmo_id: data.hmo_id, hmo_name: trimmed }])
      setNewHmo('')
    } catch (err) {
      setHmoAddError(err?.response?.data?.error ?? 'Failed to add HMO.')
    } finally {
      setHmoAdding(false)
    }
  }

  async function handleRemoveHmo(hmoId) {
    setRemovingHmoId(hmoId)
    try {
      await api.delete(`/clinicians/${clinicianId}/hmos/${hmoId}`)
      setHmos(prev => prev.filter(h => h.hmo_id !== hmoId))
    } catch {
      // Re-fetch to restore accurate state on failure
      api.get(`/clinicians/${clinicianId}`)
        .then(({ data }) => setHmos(data.hmos ?? []))
    } finally {
      setRemovingHmoId(null)
    }
  }

  async function handleAddInfo() {
    const content = newInfoContent.trim()
    if (!content) return
    setInfoAdding(true)
    setInfoAddError('')
    try {
      const { data } = await api.post(`/clinicians/${clinicianId}/infos`, {
        label: newInfoLabel.trim() || null,
        content,
      })
      setInfos(prev => [...prev, { info_id: data.info_id, label: newInfoLabel.trim(), content }])
      setNewInfoLabel('')
      setNewInfoContent('')
    } catch (err) {
      setInfoAddError(err?.response?.data?.error ?? 'Failed to add info entry.')
    } finally {
      setInfoAdding(false)
    }
  }

  async function handleRemoveInfo(infoId) {
    setRemovingInfoId(infoId)
    try {
      await api.delete(`/clinicians/${clinicianId}/infos/${infoId}`)
      setInfos(prev => prev.filter(i => i.info_id !== infoId))
    } catch {
      api.get(`/clinicians/${clinicianId}`)
        .then(({ data }) => setInfos(data.infos ?? []))
    } finally {
      setRemovingInfoId(null)
    }
  }

  function handlePhotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    // TODO(integration): wire to backend upload endpoint
    setPreviewUrl(URL.createObjectURL(file))
  }

  // ── Initials avatar ───────────────────────────────────────────────────────────

  const initials = [basicInfo.first_name?.[0], basicInfo.last_name?.[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase()

  // ── Loading / error states ────────────────────────────────────────────────────

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
      <div className="max-w-3xl mx-auto px-6 py-10">

        {/* ── Breadcrumb ── */}
        <div className="mb-6 text-sm text-slate-400">
          <Link to="/clinician-dashboard" className="hover:text-[var(--color-primary)] transition-colors">
            Appointment Inbox
          </Link>
          <span className="mx-2">›</span>
          <span className="text-[var(--color-dark)]">Clinician Profile</span>
        </div>

        {/* ── Page header ── */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--color-dark)]">Clinician Profile</h1>
          {(basicInfo.title || basicInfo.last_name) && (
            <p className="text-base italic text-slate-500 mt-1">
              Managing profile for {basicInfo.title} {basicInfo.last_name}
            </p>
          )}
        </div>

        {/* Inline fetch error (profile loaded but stale) */}
        {fetchError && clinicianId && (
          <p className="text-sm text-[var(--color-accent)] mb-6">{fetchError}</p>
        )}

        {/* ══ Profile picture ══════════════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-8 py-7 mb-6">
          <h2 className="text-lg font-semibold text-[var(--color-dark)] mb-5">Profile Photo</h2>
          <div className="flex items-center gap-6">
            {/* Avatar / preview */}
            <div className="shrink-0">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Profile"
                  className="w-20 h-20 rounded-full object-cover border-2 border-slate-200"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-[var(--color-primary)] flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">{initials || '?'}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handlePhotoChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-5 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-[var(--color-dark)] hover:bg-slate-50 transition-colors min-h-[44px]"
              >
                Upload Photo
              </button>
              <p className="text-xs text-slate-400">
                JPG, PNG, or GIF. Max 5 MB.
              </p>
            </div>
          </div>
        </div>

        {/* ══ Section 1 — Basic Info ══════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-8 py-7 mb-6">
          <h2 className="text-lg font-semibold text-[var(--color-dark)] mb-6">Basic Information</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

            {/* Title */}
            <div>
              <FieldLabel htmlFor="title" optional>Title</FieldLabel>
              <input
                id="title"
                type="text"
                value={basicInfo.title}
                onChange={e => handleBasicChange('title', e.target.value)}
                placeholder="e.g. Dr."
                className={inputCls}
              />
            </div>

            {/* Suffix */}
            <div>
              <FieldLabel htmlFor="suffix" optional>Suffix</FieldLabel>
              <input
                id="suffix"
                type="text"
                value={basicInfo.suffix}
                onChange={e => handleBasicChange('suffix', e.target.value)}
                placeholder="e.g. Jr., MD"
                className={inputCls}
              />
            </div>

            {/* First Name */}
            <div>
              <FieldLabel htmlFor="first_name">First Name</FieldLabel>
              <input
                id="first_name"
                type="text"
                value={basicInfo.first_name}
                onChange={e => handleBasicChange('first_name', e.target.value)}
                placeholder="First name"
                className={inputCls}
              />
            </div>

            {/* Middle Name */}
            <div>
              <FieldLabel htmlFor="middle_name" optional>Middle Name</FieldLabel>
              <input
                id="middle_name"
                type="text"
                value={basicInfo.middle_name}
                onChange={e => handleBasicChange('middle_name', e.target.value)}
                placeholder="Middle name"
                className={inputCls}
              />
            </div>

            {/* Last Name — full width */}
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="last_name">Last Name</FieldLabel>
              <input
                id="last_name"
                type="text"
                value={basicInfo.last_name}
                onChange={e => handleBasicChange('last_name', e.target.value)}
                placeholder="Last name"
                className={inputCls}
              />
            </div>

            {/* Department */}
            <div>
              <FieldLabel htmlFor="department" optional>Department</FieldLabel>
              <input
                id="department"
                type="text"
                value={basicInfo.department}
                onChange={e => handleBasicChange('department', e.target.value)}
                placeholder="e.g. Cardiology"
                className={inputCls}
              />
            </div>

            {/* Specialty */}
            <div>
              <FieldLabel htmlFor="specialty" optional>Specialty</FieldLabel>
              <input
                id="specialty"
                type="text"
                value={basicInfo.specialty}
                onChange={e => handleBasicChange('specialty', e.target.value)}
                placeholder="e.g. Interventional Cardiology"
                className={inputCls}
              />
            </div>

            {/* Room Number */}
            <div>
              <FieldLabel htmlFor="room_number" optional>Room Number</FieldLabel>
              <input
                id="room_number"
                type="text"
                value={basicInfo.room_number}
                onChange={e => handleBasicChange('room_number', e.target.value)}
                placeholder="e.g. Hall A Rm 230"
                className={inputCls}
              />
            </div>

            {/* Local Number */}
            <div>
              <FieldLabel htmlFor="local_number" optional>Local Number</FieldLabel>
              <input
                id="local_number"
                type="text"
                value={basicInfo.local_number}
                onChange={e => handleBasicChange('local_number', e.target.value)}
                placeholder="Internal extension"
                className={inputCls}
              />
            </div>

            {/* Contact Phone */}
            <div>
              <FieldLabel htmlFor="contact_phone" optional>Contact Phone</FieldLabel>
              <input
                id="contact_phone"
                type="tel"
                value={basicInfo.contact_phone}
                onChange={e => handleBasicChange('contact_phone', e.target.value)}
                placeholder="+63 9XX XXX XXXX"
                className={inputCls}
              />
            </div>

            {/* Contact Email */}
            <div>
              <FieldLabel htmlFor="contact_email" optional>Contact Email</FieldLabel>
              <input
                id="contact_email"
                type="email"
                value={basicInfo.contact_email}
                onChange={e => handleBasicChange('contact_email', e.target.value)}
                placeholder="clinic@example.com"
                className={inputCls}
              />
            </div>

          </div>

          {/* Save */}
          <div className="mt-7 flex items-center gap-4">
            <button
              type="button"
              onClick={handleBasicSave}
              disabled={basicSaving}
              className="px-6 py-3 rounded-lg bg-[var(--color-primary)] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              {basicSaving ? 'Saving…' : 'Save Changes'}
            </button>
            {basicSaveSuccess && <SaveSuccess />}
            {basicSaveError && (
              <p className="text-sm font-medium text-[var(--color-accent)]">{basicSaveError}</p>
            )}
          </div>
        </div>

        {/* ══ Section 2 — HMO Accreditations ══════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-8 py-7 mb-6">
          <h2 className="text-lg font-semibold text-[var(--color-dark)] mb-6">HMO Accreditations</h2>

          {hmos.length === 0 ? (
            <p className="text-sm text-slate-400 mb-4">No HMO accreditations added yet.</p>
          ) : (
            <ul className="space-y-2 mb-4">
              {hmos.map(hmo => (
                <li
                  key={hmo.hmo_id}
                  className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg border border-slate-100 bg-slate-50"
                >
                  <span className="text-sm text-[var(--color-dark)]">{hmo.hmo_name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveHmo(hmo.hmo_id)}
                    disabled={removingHmoId === hmo.hmo_id}
                    className="text-xs font-medium text-[var(--color-accent)] hover:opacity-75 transition-opacity disabled:opacity-40 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    {removingHmoId === hmo.hmo_id ? '…' : 'Remove'}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Add HMO */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newHmo}
              onChange={e => { setNewHmo(e.target.value); if (hmoAddError) setHmoAddError('') }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddHmo() } }}
              placeholder="HMO name (e.g. Maxicare)"
              className={inputCls + ' flex-1'}
            />
            <button
              type="button"
              onClick={handleAddHmo}
              disabled={hmoAdding || !newHmo.trim()}
              className="px-5 py-3 rounded-lg bg-[var(--color-primary)] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] whitespace-nowrap"
            >
              {hmoAdding ? '…' : 'Add'}
            </button>
          </div>
          {hmoAddError && (
            <p className="text-sm text-[var(--color-accent)] mt-2">{hmoAddError}</p>
          )}
        </div>

        {/* ══ Section 3 — Additional Info Entries ══════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-8 py-7">
          <h2 className="text-lg font-semibold text-[var(--color-dark)] mb-2">Additional Info</h2>
          <p className="text-xs text-slate-400 mb-6">
            Background, awards, clinical interests — anything visible on the public profile.
          </p>

          {infos.length === 0 ? (
            <p className="text-sm text-slate-400 mb-4">No info entries added yet.</p>
          ) : (
            <div className="space-y-3 mb-6">
              {infos.map(entry => (
                <div
                  key={entry.info_id}
                  className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {entry.label && (
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                          {entry.label}
                        </p>
                      )}
                      <p className="text-sm text-[var(--color-dark)] whitespace-pre-wrap break-words">
                        {entry.content}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveInfo(entry.info_id)}
                      disabled={removingInfoId === entry.info_id}
                      className="text-xs font-medium text-[var(--color-accent)] hover:opacity-75 transition-opacity disabled:opacity-40 shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                      {removingInfoId === entry.info_id ? '…' : 'Remove'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Info entry */}
          <div className="space-y-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">New Entry</p>
            <input
              type="text"
              value={newInfoLabel}
              onChange={e => setNewInfoLabel(e.target.value)}
              placeholder="Label (optional, e.g. Background)"
              className={inputCls}
            />
            <textarea
              rows={3}
              value={newInfoContent}
              onChange={e => { setNewInfoContent(e.target.value); if (infoAddError) setInfoAddError('') }}
              placeholder="Content (required)"
              className={inputCls + ' resize-none'}
            />
            <button
              type="button"
              onClick={handleAddInfo}
              disabled={infoAdding || !newInfoContent.trim()}
              className="px-5 py-2.5 rounded-lg bg-[var(--color-primary)] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
            >
              {infoAdding ? 'Adding…' : 'Add Entry'}
            </button>
            {infoAddError && (
              <p className="text-sm text-[var(--color-accent)]">{infoAddError}</p>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
