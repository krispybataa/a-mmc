import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, Check } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import api, { configureApiAuth } from '../../services/api'

// ── Constants ─────────────────────────────────────────────────────────────────

const STEPS = ['Personal', 'Address', 'Account & Details']

const INIT = {
  // Step 1
  first_name: '', middle_name: '', last_name: '', suffix: '',
  birthday: '', gender: '', mobile_number: '',
  civil_status: '', occupation: '',
  // Step 2
  address_line_1: '', barangay: '', city: '', province: '', country: 'Philippines',
  nationality: '', religion: '', culture: '',
  // Step 3
  email: '', password: '', confirm_password: '',
  preferred_language: '', educational_attainment: '',
  next_of_kin_name: '', next_of_kin_relationship: '', next_of_kin_contact: '',
  sc_pwd_id_number: '', pwd_id_front: null, pwd_id_back: null, disability_type: '',
}

const GENDER_OPTS = ['Male', 'Female', 'Prefer not to say']
const CIVIL_OPTS  = ['Single', 'Married', 'Widowed', 'Separated', 'Divorced']
const LANG_OPTS   = ['Filipino', 'English', 'Other']
const EDUC_OPTS   = ['Elementary', 'High School', 'Vocational / Technical', 'College', 'Post-Graduate']

// ── Shared field helpers ──────────────────────────────────────────────────────

function inputCls(hasError) {
  return [
    'w-full px-4 py-3 rounded-xl border text-base min-h-[48px]',
    'text-[var(--color-text)] placeholder:text-gray-400 bg-white',
    'focus:outline-none focus:ring-2 focus:border-[var(--color-primary)]',
    hasError
      ? 'border-[var(--color-accent)] focus:ring-[var(--color-accent)]/30'
      : 'border-[var(--color-border)] focus:ring-[var(--color-primary)]/30',
  ].join(' ')
}

function selectCls(hasError) {
  return [
    'w-full px-4 py-3 rounded-xl border text-base min-h-[48px]',
    'text-[var(--color-text)] bg-white',
    'focus:outline-none focus:ring-2 focus:border-[var(--color-primary)]',
    hasError
      ? 'border-[var(--color-accent)] focus:ring-[var(--color-accent)]/30'
      : 'border-[var(--color-border)] focus:ring-[var(--color-primary)]/30',
  ].join(' ')
}

// Label + children + optional hint + error
function Field({ label, htmlFor, required = false, hint, error, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-[var(--color-dark)] mb-1.5">
        {label}
        {required
          ? <span className="text-[var(--color-accent)] ml-0.5">*</span>
          : <span className="text-xs font-normal text-slate-400 ml-1.5">(optional)</span>}
      </label>
      {children}
      {hint  && <p className="mt-1.5 text-xs text-slate-400">{hint}</p>}
      {error && <p className="mt-1.5 text-xs text-[var(--color-accent)]">{error}</p>}
    </div>
  )
}

// ── Validation ────────────────────────────────────────────────────────────────

function parseDateLocal(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function validateStep(step, fd) {
  const e = {}

  if (step === 1) {
    // first_name
    if (!fd.first_name.trim()) {
      e.first_name = 'First name is required.'
    } else if (/\d/.test(fd.first_name)) {
      e.first_name = 'Please enter a valid name (letters only).'
    }

    // last_name
    if (!fd.last_name.trim()) {
      e.last_name = 'Last name is required.'
    } else if (/\d/.test(fd.last_name)) {
      e.last_name = 'Please enter a valid name (letters only).'
    }

    // middle_name — optional, validate only if non-empty
    if (fd.middle_name.trim() && /\d/.test(fd.middle_name)) {
      e.middle_name = 'Please enter a valid name (letters only).'
    }

    // birthday
    if (!fd.birthday) {
      e.birthday = 'Birthday is required.'
    } else {
      const dob   = parseDateLocal(fd.birthday)
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const minDob = new Date(1900, 0, 1)
      const maxDob = new Date(today.getFullYear() - 15, today.getMonth(), today.getDate())
      if (isNaN(dob.getTime())) {
        e.birthday = 'Please enter a valid date of birth.'
      } else if (dob > today) {
        e.birthday = 'Date of birth cannot be in the future.'
      } else if (dob < minDob) {
        e.birthday = 'Please enter a valid date of birth.'
      } else if (dob > maxDob) {
        e.birthday = 'You must be at least 15 years old to register.'
      }
    }

    // gender
    if (!fd.gender) e.gender = 'Please select a gender.'

    // mobile_number: exactly 11 digits, starting with 09
    const mobile = (fd.mobile_number || '').replace(/\s/g, '')
    if (!mobile) {
      e.mobile_number = 'Mobile number is required.'
    } else if (!/^09\d{9}$/.test(mobile)) {
      e.mobile_number = 'Mobile number must be 11 digits starting with 09.'
    }
  }

  if (step === 2) {
    if (!fd.address_line_1.trim()) e.address_line_1 = 'Address is required.'
    if (!fd.barangay.trim())       e.barangay       = 'Barangay is required.'
    if (!fd.city.trim())           e.city           = 'City is required.'
    if (!fd.province.trim())       e.province       = 'Province is required.'
    if (!fd.country.trim())        e.country        = 'Country is required.'
  }

  if (step === 3) {
    if (!fd.email.trim()) {
      e.email = 'Email address is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fd.email.trim())) {
      e.email = 'Please enter a valid email address.'
    }
    if (!fd.password) {
      e.password = 'Password is required.'
    } else if (fd.password.length < 8) {
      e.password = 'Password must be at least 8 characters.'
    } else if (!/\d/.test(fd.password)) {
      e.password = 'Password must contain at least one number.'
    }
    if (!fd.confirm_password) {
      e.confirm_password = 'Please confirm your password.'
    } else if (fd.password !== fd.confirm_password) {
      e.confirm_password = 'Passwords do not match.'
    }
    if (!fd.preferred_language)     e.preferred_language     = 'Please select a language.'
    if (!fd.educational_attainment) e.educational_attainment = 'Please select your educational attainment.'
    // next_of_kin_name — optional, validate only if non-empty
    if (fd.next_of_kin_name.trim() && /\d/.test(fd.next_of_kin_name)) {
      e.next_of_kin_name = 'Please enter a valid name (letters only).'
    }
    // next_of_kin_contact — optional, validate only if non-empty
    const nokContact = (fd.next_of_kin_contact || '').replace(/\s/g, '')
    if (nokContact && !/^09\d{9}$/.test(nokContact)) {
      e.next_of_kin_contact = 'Mobile number must be 11 digits starting with 09.'
    }
  }

  return e
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Register() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setUser, setToken, logout } = useAuth()

  const [step, setStep]           = useState(1)
  const [formData, setFormData]   = useState(INIT)
  const [errors, setErrors]       = useState({})
  const [loading, setLoading]     = useState(false)
  const [showPassword, setShowPassword]   = useState(false)
  const [showConfirm, setShowConfirm]     = useState(false)

  function update(field, value) {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  function handleNext() {
    const errs = validateStep(step, formData)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})
    setStep((s) => s + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleBack() {
    setErrors({})
    setStep((s) => s - 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleBlur(field) {
    const fieldErrors = validateStep(step, formData)
    if (fieldErrors[field]) {
      setErrors(prev => ({ ...prev, [field]: fieldErrors[field] }))
    }
  }

  async function handleSubmit() {
    const errs = validateStep(3, formData)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setLoading(true)

    const payload = {
      login_email:           formData.email,
      password:              formData.password,
      first_name:            formData.first_name,
      last_name:             formData.last_name,
      birthday:              formData.birthday,
      gender:                formData.gender,
      mobile_number:         formData.mobile_number,
      address_line_1:        formData.address_line_1,
      barangay:              formData.barangay,
      city:                  formData.city,
      province:              formData.province,
      country:               formData.country,
      preferred_language:    formData.preferred_language,
      educational_attainment: formData.educational_attainment,
      // optional fields — omit empty strings so backend receives clean nulls
      ...(formData.middle_name           && { middle_name:              formData.middle_name }),
      ...(formData.suffix                && { suffix:                   formData.suffix }),
      ...(formData.civil_status          && { civil_status:             formData.civil_status }),
      ...(formData.occupation            && { occupation:               formData.occupation }),
      ...(formData.nationality           && { nationality:              formData.nationality }),
      ...(formData.religion              && { religion:                 formData.religion }),
      ...(formData.culture               && { culture:                  formData.culture }),
      ...(formData.next_of_kin_name      && { next_of_kin_name:         formData.next_of_kin_name }),
      ...(formData.next_of_kin_relationship && { next_of_kin_relationship: formData.next_of_kin_relationship }),
      ...(formData.next_of_kin_contact   && { next_of_kin_contact:      formData.next_of_kin_contact }),
      ...(formData.sc_pwd_id_number      && { sc_pwd_id_number:         formData.sc_pwd_id_number }),
      ...(formData.disability_type       && { disability_type:          formData.disability_type }),
      // pwd_id_front / pwd_id_back are File objects — omitted until file upload endpoint exists
    }

    try {
      await api.post('/patients/', payload)
      const { data } = await api.post('/auth/patient/login', {
        email: formData.email,
        password: formData.password,
      })
      configureApiAuth(data.access_token, setToken, logout)
      setToken(data.access_token)
      setUser(data.user)
      navigate(searchParams.get('redirect') || '/dashboard')
    } catch (err) {
      const msg = err.response?.data?.error || 'Registration failed. Please try again.'
      setErrors({ submit: msg })
      setLoading(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex items-start justify-center px-4 py-14">
      <div className="w-full max-w-xl">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-8 py-10">

          {/* Header */}
          <div className="mb-7">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-primary-light)] mb-2">
              Unicorn
            </p>
            <h1 className="text-2xl font-bold text-[var(--color-dark)]">Create your account</h1>
            <p className="text-sm text-slate-400 mt-1">
              Register as a patient to book appointments online.
            </p>
          </div>

          {/* Step progress indicator */}
          <div className="flex items-start mb-8">
            {STEPS.map((label, i) => {
              const num    = i + 1
              const done   = step > num
              const active = step === num
              return (
                <div key={label} className="flex items-start flex-1">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div
                      className={[
                        'w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-colors',
                        done || active
                          ? 'bg-[var(--color-primary)] text-white'
                          : 'bg-slate-100 text-slate-400',
                      ].join(' ')}
                    >
                      {done ? <Check size={15} strokeWidth={2.5} /> : num}
                    </div>
                    <span
                      className={[
                        'text-xs mt-1.5 text-center leading-tight',
                        active ? 'text-[var(--color-primary)] font-semibold' : 'text-slate-400',
                      ].join(' ')}
                      style={{ width: '4.5rem' }}
                    >
                      {label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className={[
                        'flex-1 h-0.5 mt-4 mx-2',
                        step > num ? 'bg-[var(--color-primary)]' : 'bg-slate-200',
                      ].join(' ')}
                    />
                  )}
                </div>
              )
            })}
          </div>

          <div className="border-t border-slate-100 mb-7" />

          {/* ── STEP 1: Personal Information ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="First Name" htmlFor="first_name" required error={errors.first_name}>
                  <input
                    id="first_name" type="text" autoComplete="given-name"
                    value={formData.first_name}
                    onChange={(e) => update('first_name', e.target.value)}
                    onBlur={() => handleBlur('first_name')}
                    placeholder="Maria"
                    className={inputCls(!!errors.first_name)}
                  />
                </Field>
                <Field label="Last Name" htmlFor="last_name" required error={errors.last_name}>
                  <input
                    id="last_name" type="text" autoComplete="family-name"
                    value={formData.last_name}
                    onChange={(e) => update('last_name', e.target.value)}
                    onBlur={() => handleBlur('last_name')}
                    placeholder="Reyes"
                    className={inputCls(!!errors.last_name)}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Middle Name" htmlFor="middle_name" error={errors.middle_name}>
                  <input
                    id="middle_name" type="text" autoComplete="additional-name"
                    value={formData.middle_name}
                    onChange={(e) => update('middle_name', e.target.value)}
                    onBlur={() => handleBlur('middle_name')}
                    placeholder="Santos"
                    className={inputCls(!!errors.middle_name)}
                  />
                </Field>
                <Field label="Suffix" htmlFor="suffix" error={errors.suffix}>
                  <input
                    id="suffix" type="text"
                    value={formData.suffix}
                    onChange={(e) => update('suffix', e.target.value)}
                    placeholder="Jr., Sr., III…"
                    className={inputCls(false)}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Birthday" htmlFor="birthday" required error={errors.birthday}>
                  <input
                    id="birthday" type="date"
                    value={formData.birthday}
                    onChange={(e) => update('birthday', e.target.value)}
                    onBlur={() => handleBlur('birthday')}
                    className={inputCls(!!errors.birthday)}
                  />
                </Field>
                <Field label="Gender" htmlFor="gender" required error={errors.gender}>
                  <select
                    id="gender"
                    value={formData.gender}
                    onChange={(e) => update('gender', e.target.value)}
                    className={selectCls(!!errors.gender)}
                  >
                    <option value="">Select…</option>
                    {GENDER_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </Field>
              </div>

              <Field label="Mobile Number" htmlFor="mobile_number" required error={errors.mobile_number}>
                <input
                  id="mobile_number" type="tel" autoComplete="tel"
                  value={formData.mobile_number}
                  onChange={(e) => update('mobile_number', e.target.value)}
                  onBlur={() => handleBlur('mobile_number')}
                  placeholder="09XX XXX XXXX"
                  className={inputCls(!!errors.mobile_number)}
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Civil Status" htmlFor="civil_status" error={errors.civil_status}>
                  <select
                    id="civil_status"
                    value={formData.civil_status}
                    onChange={(e) => update('civil_status', e.target.value)}
                    className={selectCls(false)}
                  >
                    <option value="">Select…</option>
                    {CIVIL_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="Occupation" htmlFor="occupation" error={errors.occupation}>
                  <input
                    id="occupation" type="text"
                    value={formData.occupation}
                    onChange={(e) => update('occupation', e.target.value)}
                    placeholder="e.g. Teacher"
                    className={inputCls(false)}
                  />
                </Field>
              </div>
            </div>
          )}

          {/* ── STEP 2: Address ── */}
          {step === 2 && (
            <div className="space-y-5">
              <Field label="Address Line 1" htmlFor="address_line_1" required error={errors.address_line_1}>
                <input
                  id="address_line_1" type="text" autoComplete="street-address"
                  value={formData.address_line_1}
                  onChange={(e) => update('address_line_1', e.target.value)}
                  placeholder="House / Unit no., Street, Subdivision"
                  className={inputCls(!!errors.address_line_1)}
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Barangay" htmlFor="barangay" required error={errors.barangay}>
                  <input
                    id="barangay" type="text"
                    value={formData.barangay}
                    onChange={(e) => update('barangay', e.target.value)}
                    placeholder="Barangay"
                    className={inputCls(!!errors.barangay)}
                  />
                </Field>
                <Field label="City / Municipality" htmlFor="city" required error={errors.city}>
                  <input
                    id="city" type="text" autoComplete="address-level2"
                    value={formData.city}
                    onChange={(e) => update('city', e.target.value)}
                    placeholder="City"
                    className={inputCls(!!errors.city)}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Province" htmlFor="province" required error={errors.province}>
                  <input
                    id="province" type="text" autoComplete="address-level1"
                    value={formData.province}
                    onChange={(e) => update('province', e.target.value)}
                    placeholder="Province"
                    className={inputCls(!!errors.province)}
                  />
                </Field>
                <Field label="Country" htmlFor="country" required error={errors.country}>
                  <input
                    id="country" type="text" autoComplete="country-name"
                    value={formData.country}
                    onChange={(e) => update('country', e.target.value)}
                    className={inputCls(!!errors.country)}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Nationality" htmlFor="nationality" error={errors.nationality}>
                  <input
                    id="nationality" type="text"
                    value={formData.nationality}
                    onChange={(e) => update('nationality', e.target.value)}
                    placeholder="Filipino"
                    className={inputCls(false)}
                  />
                </Field>
                <Field label="Religion" htmlFor="religion" error={errors.religion}>
                  <input
                    id="religion" type="text"
                    value={formData.religion}
                    onChange={(e) => update('religion', e.target.value)}
                    className={inputCls(false)}
                  />
                </Field>
                <Field label="Culture / Ethnicity" htmlFor="culture" error={errors.culture}>
                  <input
                    id="culture" type="text"
                    value={formData.culture}
                    onChange={(e) => update('culture', e.target.value)}
                    className={inputCls(false)}
                  />
                </Field>
              </div>
            </div>
          )}

          {/* ── STEP 3: Account & Details ── */}
          {step === 3 && (
            <div className="space-y-5">

              {/* Account credentials */}
              <Field label="Email Address" htmlFor="email" required error={errors.email}>
                <input
                  id="email" type="email" autoComplete="email"
                  value={formData.email}
                  onChange={(e) => update('email', e.target.value)}
                  placeholder="you@example.com"
                  className={inputCls(!!errors.email)}
                />
              </Field>

              <Field
                label="Password" htmlFor="password" required
                hint="At least 8 characters, including one number."
                error={errors.password}
              >
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={(e) => update('password', e.target.value)}
                    placeholder="Create a password"
                    className={inputCls(!!errors.password) + ' pr-12'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>

              <Field label="Confirm Password" htmlFor="confirm_password" required error={errors.confirm_password}>
                <div className="relative">
                  <input
                    id="confirm_password"
                    type={showConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={formData.confirm_password}
                    onChange={(e) => update('confirm_password', e.target.value)}
                    placeholder="Re-enter your password"
                    className={inputCls(!!errors.confirm_password) + ' pr-12'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Preferred Language" htmlFor="preferred_language" required error={errors.preferred_language}>
                  <select
                    id="preferred_language"
                    value={formData.preferred_language}
                    onChange={(e) => update('preferred_language', e.target.value)}
                    className={selectCls(!!errors.preferred_language)}
                  >
                    <option value="">Select…</option>
                    {LANG_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="Educational Attainment" htmlFor="educational_attainment" required error={errors.educational_attainment}>
                  <select
                    id="educational_attainment"
                    value={formData.educational_attainment}
                    onChange={(e) => update('educational_attainment', e.target.value)}
                    className={selectCls(!!errors.educational_attainment)}
                  >
                    <option value="">Select…</option>
                    {EDUC_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </Field>
              </div>

              {/* Next of Kin */}
              <div className="pt-2">
                <p className="text-sm font-semibold text-[var(--color-dark)] mb-4">
                  Next of Kin
                  <span className="text-xs font-normal text-slate-400 ml-2">(optional)</span>
                </p>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Full Name" htmlFor="next_of_kin_name" error={errors.next_of_kin_name}>
                      <input
                        id="next_of_kin_name" type="text"
                        value={formData.next_of_kin_name}
                        onChange={(e) => update('next_of_kin_name', e.target.value)}
                        onBlur={() => handleBlur('next_of_kin_name')}
                        placeholder="Name of contact person"
                        className={inputCls(!!errors.next_of_kin_name)}
                      />
                    </Field>
                    <Field label="Relationship" htmlFor="next_of_kin_relationship" error={errors.next_of_kin_relationship}>
                      <input
                        id="next_of_kin_relationship" type="text"
                        value={formData.next_of_kin_relationship}
                        onChange={(e) => update('next_of_kin_relationship', e.target.value)}
                        placeholder="e.g. Spouse, Child"
                        className={inputCls(false)}
                      />
                    </Field>
                  </div>
                  <Field label="Contact Number" htmlFor="next_of_kin_contact" error={errors.next_of_kin_contact}>
                    <input
                      id="next_of_kin_contact" type="tel"
                      value={formData.next_of_kin_contact}
                      onChange={(e) => update('next_of_kin_contact', e.target.value)}
                      onBlur={() => handleBlur('next_of_kin_contact')}
                      placeholder="09XX XXX XXXX"
                      className={inputCls(!!errors.next_of_kin_contact)}
                    />
                  </Field>
                </div>
              </div>

              {/* PWD / Senior Citizen */}
              <div className="pt-2">
                <p className="text-sm font-semibold text-[var(--color-dark)] mb-1">
                  PWD / Senior Citizen
                  <span className="text-xs font-normal text-slate-400 ml-2">(optional)</span>
                </p>
                <p className="text-xs text-slate-400 mb-4">
                  Fill in this section only if you have a PWD or Senior Citizen ID.
                </p>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="SC / PWD ID Number" htmlFor="sc_pwd_id_number" error={errors.sc_pwd_id_number}>
                      <input
                        id="sc_pwd_id_number" type="text"
                        value={formData.sc_pwd_id_number}
                        onChange={(e) => update('sc_pwd_id_number', e.target.value)}
                        placeholder="ID number"
                        className={inputCls(false)}
                      />
                    </Field>
                    <Field label="Disability Type" htmlFor="disability_type" error={errors.disability_type}>
                      <input
                        id="disability_type" type="text"
                        value={formData.disability_type}
                        onChange={(e) => update('disability_type', e.target.value)}
                        placeholder="e.g. Visual, Mobility"
                        className={inputCls(false)}
                      />
                    </Field>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="PWD ID — Front" htmlFor="pwd_id_front" error={errors.pwd_id_front}>
                      <input
                        id="pwd_id_front" type="file" accept="image/*"
                        onChange={(e) => update('pwd_id_front', e.target.files[0] || null)}
                        className="w-full text-sm text-slate-600 rounded-lg border border-slate-200 px-3 py-2.5 cursor-pointer file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-[var(--color-primary)] hover:file:opacity-80 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      />
                    </Field>
                    <Field label="PWD ID — Back" htmlFor="pwd_id_back" error={errors.pwd_id_back}>
                      <input
                        id="pwd_id_back" type="file" accept="image/*"
                        onChange={(e) => update('pwd_id_back', e.target.files[0] || null)}
                        className="w-full text-sm text-slate-600 rounded-lg border border-slate-200 px-3 py-2.5 cursor-pointer file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-[var(--color-primary)] hover:file:opacity-80 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      />
                    </Field>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Navigation buttons ── */}
          {errors.submit && (
            <p className="mt-6 text-xs text-[var(--color-accent)] text-center">{errors.submit}</p>
          )}
          <div className="flex items-center gap-3 mt-4 pt-6 border-t border-slate-100">
            {step > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="px-6 py-3 rounded-xl text-base font-semibold text-[var(--color-primary)] border-2 border-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white min-h-[48px]"
              >
                ← Back
              </button>
            )}
            <button
              type="button"
              onClick={step < 3 ? handleNext : handleSubmit}
              disabled={loading}
              className="flex-1 py-3 px-6 rounded-xl text-base font-semibold text-white bg-[var(--color-accent)] hover:brightness-110 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed min-h-[48px]"
            >
              {step < 3
                ? 'Continue →'
                : loading ? 'Creating account…' : 'Create Account'}
            </button>
          </div>

          <p className="text-sm text-slate-500 text-center mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-[var(--color-primary)] font-medium hover:underline">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
