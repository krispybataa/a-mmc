import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import { uploadFile } from '../../services/uploadService'

// ── Constants ──────────────────────────────────────────────────────────────────

const REQUIRED = [
  'first_name', 'last_name', 'birthday', 'gender',
  'mobile_number', 'address_line_1', 'barangay', 'city', 'province', 'country',
  'preferred_language', 'educational_attainment',
]

const GENDER_OPTIONS = ['Male', 'Female', 'Prefer not to say']

const EMPTY_FORM = {
  first_name: '', last_name: '', middle_name: '', birthday: '',
  gender: '', civil_status: '', nationality: '', religion: '',
  occupation: '', educational_attainment: '',
  mobile_number: '', address_line_1: '', barangay: '', city: '',
  province: '', country: 'Philippines',
  next_of_kin_name: '', next_of_kin_relationship: '', next_of_kin_contact: '',
  preferred_language: '', culture: '', disability_type: '',
  sc_pwd_id_number: '', pwd_id_front: '', pwd_id_back: '',
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function validate(form) {
  const errs = {}
  for (const k of REQUIRED) {
    if (!form[k]?.trim()) errs[k] = 'This field is required.'
  }
  return errs
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
      <h2 className="text-xs font-semibold text-[var(--color-primary)] uppercase tracking-wider mb-5">
        {title}
      </h2>
      {children}
    </div>
  )
}

function Field({ label, required, error, hint, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--color-dark)] mb-1.5">
        {label}
        {required && <span className="text-[var(--color-accent)] ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
      {error && <p className="text-xs text-[var(--color-accent)] mt-1">{error}</p>}
    </div>
  )
}

function inputCls(hasError) {
  return [
    'w-full px-4 py-3 rounded-lg border text-sm text-[var(--color-dark)] bg-white',
    'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-transparent min-h-[44px]',
    hasError
      ? 'border-[var(--color-accent)] focus:ring-[var(--color-accent)]'
      : 'border-slate-200 focus:ring-[var(--color-primary)]',
  ].join(' ')
}

// ── UpdateProfile ──────────────────────────────────────────────────────────────

export default function UpdateProfile() {
  const { user, authLoading } = useAuth()
  const navigate               = useNavigate()

  // ── All hooks first (Rules of Hooks) ────────────────────────────────────────
  const [form, setForm]             = useState(EMPTY_FORM)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [errors, setErrors]         = useState({})
  const [saving, setSaving]         = useState(false)
  const [saveError, setSaveError]   = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [uploadStatus, setUploadStatus] = useState({ pwd_front: null, pwd_back: null })
  const successTimerRef = useRef(null)

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) navigate('/login?redirect=/dashboard/profile', { replace: true })
  }, [authLoading, user, navigate])

  // Clear success timer on unmount
  useEffect(() => {
    return () => { if (successTimerRef.current) clearTimeout(successTimerRef.current) }
  }, [])

  // Fetch profile
  useEffect(() => {
    if (!user) return
    setFetchLoading(true)
    api.get(`/patients/${user.id}`)
      .then(({ data }) => setForm({
        first_name:               data.first_name               ?? '',
        last_name:                data.last_name                ?? '',
        middle_name:              data.middle_name              ?? '',
        birthday:                 data.birthday                 ?? '',
        gender:                   data.gender                   ?? '',
        civil_status:             data.civil_status             ?? '',
        nationality:              data.nationality              ?? '',
        religion:                 data.religion                 ?? '',
        occupation:               data.occupation               ?? '',
        educational_attainment:   data.educational_attainment   ?? '',
        mobile_number:            data.mobile_number            ?? '',
        address_line_1:           data.address_line_1           ?? '',
        barangay:                 data.barangay                 ?? '',
        city:                     data.city                     ?? '',
        province:                 data.province                 ?? '',
        country:                  data.country                  ?? 'Philippines',
        next_of_kin_name:         data.next_of_kin_name         ?? '',
        next_of_kin_relationship: data.next_of_kin_relationship ?? '',
        next_of_kin_contact:      data.next_of_kin_contact      ?? '',
        preferred_language:       data.preferred_language       ?? '',
        culture:                  data.culture                  ?? '',
        disability_type:          data.disability_type          ?? '',
        sc_pwd_id_number:         data.sc_pwd_id_number         ?? '',
        pwd_id_front:             data.pwd_id_front             ?? '',
        pwd_id_back:              data.pwd_id_back              ?? '',
      }))
      .catch(() => setFetchError('Failed to load profile. Please refresh the page.'))
      .finally(() => setFetchLoading(false))
  }, [user])

  // ── Early returns (after all hooks) ─────────────────────────────────────────
  if (authLoading || !user) return null

  if (fetchLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-400 text-sm">Loading…</p>
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <p className="text-[var(--color-accent)] text-sm font-medium">{fetchError}</p>
      </div>
    )
  }

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    if (errors[field]) setErrors(e => ({ ...e, [field]: undefined }))
  }

  async function handleFileUpload(file, context) {
    const statusKey = context === 'pwd_front' ? 'pwd_front' : 'pwd_back'
    const formKey   = context === 'pwd_front' ? 'pwd_id_front' : 'pwd_id_back'
    setUploadStatus(s => ({ ...s, [statusKey]: 'uploading' }))
    try {
      const url = await uploadFile(file, context)
      if (url) {
        setForm(f => ({ ...f, [formKey]: url }))
        setUploadStatus(s => ({ ...s, [statusKey]: 'done' }))
      } else {
        setUploadStatus(s => ({ ...s, [statusKey]: 'unavailable' }))
      }
    } catch {
      setUploadStatus(s => ({ ...s, [statusKey]: 'unavailable' }))
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate(form)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setErrors({})
    setSaving(true)
    setSaveError('')
    setSuccessMsg('')

    const payload = { ...form }
    // Omit empty upload URLs — don't overwrite existing values with blank strings
    if (!payload.pwd_id_front) delete payload.pwd_id_front
    if (!payload.pwd_id_back)  delete payload.pwd_id_back

    try {
      await api.patch(`/patients/${user.id}`, payload)
      setSuccessMsg('Profile updated successfully.')
      if (successTimerRef.current) clearTimeout(successTimerRef.current)
      successTimerRef.current = setTimeout(() => setSuccessMsg(''), 5000)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      setSaveError('Failed to save profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-6 py-10">

        <h1 className="text-3xl font-bold text-[var(--color-dark)] mb-2">Edit Profile</h1>
        <p className="text-sm text-slate-500 mb-8">
          Keep your information up to date.
          Fields marked <span className="text-[var(--color-accent)]">*</span> are required.
        </p>

        {/* Success banner */}
        {successMsg && (
          <div className="mb-6 rounded-xl bg-green-50 border border-green-200 px-5 py-4">
            <p className="text-sm font-medium text-green-800">{successMsg}</p>
          </div>
        )}

        {/* Save error */}
        {saveError && (
          <div className="mb-6 rounded-xl bg-red-50 border border-red-200 px-5 py-4">
            <p className="text-sm text-[var(--color-accent)]">{saveError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-5">

          {/* ── Personal Information ── */}
          <Section title="Personal Information">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="First Name" required error={errors.first_name}>
                  <input
                    type="text"
                    value={form.first_name}
                    onChange={e => set('first_name', e.target.value)}
                    className={inputCls(!!errors.first_name)}
                  />
                </Field>
                <Field label="Middle Name" error={errors.middle_name}>
                  <input
                    type="text"
                    value={form.middle_name}
                    onChange={e => set('middle_name', e.target.value)}
                    className={inputCls(false)}
                  />
                </Field>
                <Field label="Last Name" required error={errors.last_name}>
                  <input
                    type="text"
                    value={form.last_name}
                    onChange={e => set('last_name', e.target.value)}
                    className={inputCls(!!errors.last_name)}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Birthday" required error={errors.birthday}>
                  <input
                    type="date"
                    value={form.birthday}
                    onChange={e => set('birthday', e.target.value)}
                    className={inputCls(!!errors.birthday)}
                  />
                </Field>
                <Field label="Gender" required error={errors.gender}>
                  <select
                    value={form.gender}
                    onChange={e => set('gender', e.target.value)}
                    className={inputCls(!!errors.gender)}
                  >
                    <option value="">Select…</option>
                    {GENDER_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Civil Status" error={errors.civil_status}>
                  <input
                    type="text"
                    value={form.civil_status}
                    onChange={e => set('civil_status', e.target.value)}
                    placeholder="e.g. Single, Married"
                    className={inputCls(false)}
                  />
                </Field>
                <Field label="Nationality" error={errors.nationality}>
                  <input
                    type="text"
                    value={form.nationality}
                    onChange={e => set('nationality', e.target.value)}
                    className={inputCls(false)}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Religion" error={errors.religion}>
                  <input
                    type="text"
                    value={form.religion}
                    onChange={e => set('religion', e.target.value)}
                    className={inputCls(false)}
                  />
                </Field>
                <Field label="Occupation" error={errors.occupation}>
                  <input
                    type="text"
                    value={form.occupation}
                    onChange={e => set('occupation', e.target.value)}
                    className={inputCls(false)}
                  />
                </Field>
              </div>

              <Field label="Educational Attainment" required error={errors.educational_attainment}>
                <input
                  type="text"
                  value={form.educational_attainment}
                  onChange={e => set('educational_attainment', e.target.value)}
                  placeholder="e.g. College Graduate"
                  className={inputCls(!!errors.educational_attainment)}
                />
              </Field>
            </div>
          </Section>

          {/* ── Contact Information ── */}
          <Section title="Contact Information">
            <div className="space-y-4">
              <Field label="Mobile Number" required error={errors.mobile_number}>
                <input
                  type="tel"
                  value={form.mobile_number}
                  onChange={e => set('mobile_number', e.target.value)}
                  placeholder="09XXXXXXXXX"
                  className={inputCls(!!errors.mobile_number)}
                />
              </Field>

              <Field label="Address" required error={errors.address_line_1}>
                <input
                  type="text"
                  value={form.address_line_1}
                  onChange={e => set('address_line_1', e.target.value)}
                  placeholder="Street address, unit number"
                  className={inputCls(!!errors.address_line_1)}
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Barangay" required error={errors.barangay}>
                  <input
                    type="text"
                    value={form.barangay}
                    onChange={e => set('barangay', e.target.value)}
                    className={inputCls(!!errors.barangay)}
                  />
                </Field>
                <Field label="City / Municipality" required error={errors.city}>
                  <input
                    type="text"
                    value={form.city}
                    onChange={e => set('city', e.target.value)}
                    className={inputCls(!!errors.city)}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Province" required error={errors.province}>
                  <input
                    type="text"
                    value={form.province}
                    onChange={e => set('province', e.target.value)}
                    className={inputCls(!!errors.province)}
                  />
                </Field>
                <Field label="Country" required error={errors.country}>
                  <input
                    type="text"
                    value={form.country}
                    onChange={e => set('country', e.target.value)}
                    className={inputCls(!!errors.country)}
                  />
                </Field>
              </div>
            </div>
          </Section>

          {/* ── Next of Kin ── */}
          <Section title="Next of Kin">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Name" error={errors.next_of_kin_name}>
                  <input
                    type="text"
                    value={form.next_of_kin_name}
                    onChange={e => set('next_of_kin_name', e.target.value)}
                    className={inputCls(false)}
                  />
                </Field>
                <Field label="Relationship" error={errors.next_of_kin_relationship}>
                  <input
                    type="text"
                    value={form.next_of_kin_relationship}
                    onChange={e => set('next_of_kin_relationship', e.target.value)}
                    placeholder="e.g. Spouse, Parent"
                    className={inputCls(false)}
                  />
                </Field>
              </div>
              <Field label="Contact Number" error={errors.next_of_kin_contact}>
                <input
                  type="tel"
                  value={form.next_of_kin_contact}
                  onChange={e => set('next_of_kin_contact', e.target.value)}
                  className={inputCls(false)}
                />
              </Field>
            </div>
          </Section>

          {/* ── Preferences ── */}
          <Section title="Preferences">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Preferred Language" required error={errors.preferred_language}>
                  <input
                    type="text"
                    value={form.preferred_language}
                    onChange={e => set('preferred_language', e.target.value)}
                    placeholder="e.g. Filipino, English"
                    className={inputCls(!!errors.preferred_language)}
                  />
                </Field>
                <Field label="Culture / Ethnicity" error={errors.culture}>
                  <input
                    type="text"
                    value={form.culture}
                    onChange={e => set('culture', e.target.value)}
                    className={inputCls(false)}
                  />
                </Field>
              </div>
              <Field label="Disability Type" error={errors.disability_type}
                hint="Leave blank if not applicable.">
                <input
                  type="text"
                  value={form.disability_type}
                  onChange={e => set('disability_type', e.target.value)}
                  className={inputCls(false)}
                />
              </Field>
            </div>
          </Section>

          {/* ── SC / PWD Information ── */}
          <Section title="SC / PWD Information">
            <div className="space-y-5">
              <Field label="SC / PWD ID Number" hint="Senior Citizen or PWD ID number, if applicable.">
                <input
                  type="text"
                  value={form.sc_pwd_id_number}
                  onChange={e => set('sc_pwd_id_number', e.target.value)}
                  className={inputCls(false)}
                />
              </Field>

              {/* PWD ID Front */}
              <UploadField
                label="PWD ID (Front)"
                context="pwd_front"
                status={uploadStatus.pwd_front}
                existingUrl={form.pwd_id_front}
                onFileSelect={file => handleFileUpload(file, 'pwd_front')}
              />

              {/* PWD ID Back */}
              <UploadField
                label="PWD ID (Back)"
                context="pwd_back"
                status={uploadStatus.pwd_back}
                existingUrl={form.pwd_id_back}
                onFileSelect={file => handleFileUpload(file, 'pwd_back')}
              />
            </div>
          </Section>

          {/* ── Submit ── */}
          <div className="flex items-center gap-4 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3 rounded-lg bg-[var(--color-primary)] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            {saving && (
              <p className="text-xs text-slate-400 select-none">Saving your profile…</p>
            )}
          </div>

        </form>
      </div>
    </div>
  )
}

// ── UploadField ────────────────────────────────────────────────────────────────

function UploadField({ label, context, status, existingUrl, onFileSelect }) {
  function handleChange(e) {
    const file = e.target.files?.[0]
    if (file) onFileSelect(file)
  }

  return (
    <div>
      <label className="block text-sm font-medium text-[var(--color-dark)] mb-1.5">
        {label}
      </label>

      {/* Existing file link */}
      {existingUrl && (
        <p className="text-xs text-slate-500 mb-2">
          Current file on record:{' '}
          <a
            href={existingUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[var(--color-primary)] hover:underline"
          >
            View file
          </a>
        </p>
      )}

      <input
        type="file"
        accept="image/*,.pdf"
        onChange={handleChange}
        className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[var(--color-primary)] file:text-white hover:file:opacity-90 file:transition-opacity file:cursor-pointer file:min-h-[44px] cursor-pointer"
      />

      {/* Upload status messages */}
      {status === 'uploading' && (
        <p className="text-xs text-slate-400 mt-1.5">Uploading…</p>
      )}
      {status === 'unavailable' && (
        <p className="text-xs text-slate-500 mt-1.5">
          File upload unavailable — please try again later.
        </p>
      )}
      {status === 'done' && (
        <p className="text-xs text-green-700 mt-1.5 font-medium">Upload successful.</p>
      )}
    </div>
  )
}
