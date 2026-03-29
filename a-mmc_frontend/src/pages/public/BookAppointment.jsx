import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Check, MapPin } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import SlotPicker from '../../components/shared/SlotPicker'

// ── Constants ─────────────────────────────────────────────────────────────────

const STEPS        = ['Date & Time', 'Details', 'Review']
const BOOKING_TYPES = ['New Consultation', 'Follow-up', 'Referral']
const PAYMENT_BASE  = ['HMO', 'Out of Pocket', 'Senior Citizen Discount', 'PWD Discount']

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const WEEKDAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

// ── Utilities ─────────────────────────────────────────────────────────────────

function formatFullDate(dateStr) {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const dow = WEEKDAYS[new Date(y, mo - 1, d).getDay()]
  return `${dow}, ${MONTHS[mo - 1]} ${d}, ${y}`
}

function formatName({ title, first_name, middle_name, last_name, suffix }) {
  const mid  = middle_name ? `${middle_name[0]}.` : ''
  const base = [title, first_name, mid, last_name].filter(Boolean).join(' ')
  return suffix ? `${base}, ${suffix}` : base
}

function getInitials(first_name, last_name) {
  return `${first_name[0]}${last_name[0]}`.toUpperCase()
}

function toDateStr(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ReviewRow({ label, value }) {
  return (
    <div className="flex gap-4">
      <span className="text-sm text-slate-400 w-36 shrink-0">{label}</span>
      <span className="text-sm text-[var(--color-dark)] font-medium">{value || '—'}</span>
    </div>
  )
}

// ── Step indicator (shared visual style with Register.jsx) ────────────────────

function StepIndicator({ step }) {
  return (
    <div className="flex items-start">
      {STEPS.map((label, i) => {
        const num    = i + 1
        const done   = step > num
        const active = step === num
        return (
          <div key={label} className="flex items-start flex-1">
            <div className="flex flex-col items-center shrink-0">
              <div className={[
                'w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-colors',
                done || active ? 'bg-[var(--color-primary)] text-white' : 'bg-slate-100 text-slate-400',
              ].join(' ')}>
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
              <div className={[
                'flex-1 h-0.5 mt-4 mx-2',
                step > num ? 'bg-[var(--color-primary)]' : 'bg-slate-200',
              ].join(' ')} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function BookAppointment() {
  const { id }                  = useParams()
  const navigate                = useNavigate()
  const { user, authLoading }   = useAuth()

  // ── All hooks first (Rules of Hooks) ────────────────────────────────────────
  const [step, setStep]               = useState(1)
  // Step 1
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedSlot, setSelectedSlot] = useState(null)
  // Step 2
  const [chiefComplaint, setChiefComplaint] = useState('')
  const [description, setDescription]       = useState('')
  const [bookingType, setBookingType]       = useState('')
  const [paymentType, setPaymentType]       = useState('')
  const [step2Errors, setStep2Errors]       = useState({})
  // Step 3
  const [confirmed, setConfirmed] = useState(false)
  const [loading, setLoading]     = useState(false)
  const [submitError, setSubmitError] = useState('')
  // Data
  const [clinician, setClinician]         = useState(null)
  const [availableSlots, setAvailableSlots] = useState(null)
  const [fetchLoading, setFetchLoading]   = useState(true)
  const [fetchError, setFetchError]       = useState('')

  // Auth guard — wait for auth to resolve before redirecting
  useEffect(() => {
    if (!authLoading && !user) navigate(`/login?redirect=/book/${id}`, { replace: true })
  }, [authLoading, user, id, navigate])

  // Fetch clinician profile + available slots
  useEffect(() => {
    let cancelled = false
    async function load() {
      setFetchLoading(true)
      setFetchError('')
      try {
        const [clinRes, slotsRes] = await Promise.all([
          api.get(`/clinicians/${id}`),
          api.get('/timeslots/', { params: { clinician_id: id, status: 'available' } }),
        ])
        if (cancelled) return
        setClinician(clinRes.data)
        const map = {}
        for (const s of slotsRes.data) {
          if (!map[s.slot_date]) map[s.slot_date] = []
          map[s.slot_date].push(s)
        }
        setAvailableSlots(map)
      } catch {
        if (!cancelled) setFetchError('Failed to load clinician information. Please try again.')
      } finally {
        if (!cancelled) setFetchLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id])

  // ── Early returns (after all hooks) ─────────────────────────────────────────
  if (authLoading || !user) return null

  if (fetchLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-400 text-sm">Loading…</p>
      </div>
    )
  }

  if (fetchError || !clinician) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-slate-500 text-base font-medium">{fetchError || 'Clinician not found.'}</p>
        <Link
          to="/doctors"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--color-primary)] hover:underline"
        >
          <ArrowLeft size={13} />
          Back to Directory
        </Link>
      </div>
    )
  }

  // ── Derived values (clinician is guaranteed non-null here) ───────────────────
  const today          = new Date()
  const minDate        = toDateStr(today)
  const maxDate        = toDateStr(new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000))
  const fullName       = formatName(clinician)
  const initials       = getInitials(clinician.first_name, clinician.last_name)
  const paymentOptions = clinician.hmos.length > 0
    ? PAYMENT_BASE
    : PAYMENT_BASE.filter((p) => p !== 'HMO')

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function handleDateChange(dateStr) {
    setSelectedDate(dateStr)
    setSelectedSlot(null)
  }

  function handleNext() {
    if (step === 2) {
      const errs = {}
      if (!chiefComplaint.trim())
        errs.chiefComplaint = 'Chief complaint is required.'
      else if (chiefComplaint.trim().length > 100)
        errs.chiefComplaint = 'Maximum 100 characters.'
      if (!bookingType) errs.bookingType = 'Please select a booking type.'
      if (!paymentType) errs.paymentType = 'Please select a payment type.'
      if (Object.keys(errs).length > 0) { setStep2Errors(errs); return }
      setStep2Errors({})
    }
    setStep((s) => s + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleBack() {
    setStep((s) => s - 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit() {
    setLoading(true)
    setSubmitError('')
    try {
      await api.post('/appointments/', {
        patient_id: user.id,
        clinician_id: Number(id),
        slot_id: selectedSlot.slot_id,
        consultation_date: selectedDate,
        chief_complaint: chiefComplaint.trim(),
        chief_complaint_description: description.trim() || undefined,
        payment_type: paymentType,
      })
      navigate('/dashboard', { state: { bookingSuccess: true } })
    } catch (err) {
      setSubmitError(err?.response?.data?.error ?? 'Failed to submit. Please try again.')
      setLoading(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 flex items-start justify-center px-4 py-14">
      <div className="w-full max-w-xl">

        {/* Back to profile */}
        <div className="mb-4">
          <Link
            to={`/clinician/${id}`}
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[var(--color-primary)] transition-colors"
          >
            <ArrowLeft size={13} />
            Back to Profile
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-8 py-8">

          {/* ── Clinician context header (visible on all steps) ── */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white font-bold text-base shrink-0 select-none">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-[var(--color-dark)] text-sm leading-snug truncate">
                {fullName}
              </p>
              <p className="text-[var(--color-primary)] text-xs font-medium mt-0.5">
                {clinician.specialty}
              </p>
              <p className="text-slate-400 text-xs flex items-center gap-1 mt-0.5">
                <MapPin size={11} className="shrink-0" />
                {clinician.room_number}
              </p>
            </div>
            <p className="text-xs text-slate-400 text-right shrink-0 hidden sm:block">
              Step {step} of {STEPS.length}
            </p>
          </div>

          <div className="border-t border-slate-100 mb-7" />

          {/* ── Step indicator ── */}
          <div className="mb-8">
            <StepIndicator step={step} />
          </div>

          <div className="border-t border-slate-100 mb-7" />

          {/* ════════════════════════════════════════════════
              STEP 1 — Select Date & Time
          ════════════════════════════════════════════════ */}
          {step === 1 && (
            <SlotPicker
              schedule={clinician.schedules}
              availableSlots={availableSlots}
              clinicianName={fullName}
              selectedDate={selectedDate}
              onDateChange={handleDateChange}
              selectedSlot={selectedSlot}
              onSlotSelect={setSelectedSlot}
              minDate={minDate}
              maxDate={maxDate}
              dateInputId="book-appt-date"
            />
          )}

          {/* ════════════════════════════════════════════════
              STEP 2 — Appointment Details
          ════════════════════════════════════════════════ */}
          {step === 2 && (
            <div className="space-y-5">

              {/* Chief Complaint */}
              <div>
                <label htmlFor="chief-complaint" className="block text-sm font-medium text-[var(--color-dark)] mb-1.5">
                  Chief Complaint
                  <span className="text-[var(--color-accent)] ml-0.5">*</span>
                </label>
                <input
                  id="chief-complaint"
                  type="text"
                  maxLength={100}
                  value={chiefComplaint}
                  onChange={(e) => {
                    setChiefComplaint(e.target.value)
                    if (step2Errors.chiefComplaint)
                      setStep2Errors((p) => ({ ...p, chiefComplaint: undefined }))
                  }}
                  placeholder="e.g. Joint pain, follow-up consultation"
                  className={[
                    'w-full px-4 py-3 rounded-lg border text-sm text-[var(--color-dark)]',
                    'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-transparent',
                    step2Errors.chiefComplaint
                      ? 'border-[var(--color-accent)] focus:ring-[var(--color-accent)]'
                      : 'border-slate-200 focus:ring-[var(--color-primary)]',
                  ].join(' ')}
                />
                <div className="flex justify-between items-start mt-1.5">
                  {step2Errors.chiefComplaint
                    ? <p className="text-xs text-[var(--color-accent)]">{step2Errors.chiefComplaint}</p>
                    : <span />}
                  <p className="text-xs text-slate-400 ml-auto">{chiefComplaint.length}/100</p>
                </div>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-[var(--color-dark)] mb-1.5">
                  Description
                  <span className="text-xs font-normal text-slate-400 ml-1.5">(optional)</span>
                </label>
                <textarea
                  id="description"
                  maxLength={500}
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Briefly describe your concern"
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm text-[var(--color-dark)] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none"
                />
                <p className="text-xs text-slate-400 mt-1 text-right">{description.length}/500</p>
              </div>

              {/* Booking Type */}
              <div>
                <label htmlFor="booking-type" className="block text-sm font-medium text-[var(--color-dark)] mb-1.5">
                  Booking Type
                  <span className="text-[var(--color-accent)] ml-0.5">*</span>
                </label>
                <select
                  id="booking-type"
                  value={bookingType}
                  onChange={(e) => {
                    setBookingType(e.target.value)
                    if (step2Errors.bookingType)
                      setStep2Errors((p) => ({ ...p, bookingType: undefined }))
                  }}
                  className={[
                    'w-full px-4 py-3 rounded-lg border text-sm text-[var(--color-dark)] bg-white',
                    'focus:outline-none focus:ring-2 focus:border-transparent',
                    step2Errors.bookingType
                      ? 'border-[var(--color-accent)] focus:ring-[var(--color-accent)]'
                      : 'border-slate-200 focus:ring-[var(--color-primary)]',
                  ].join(' ')}
                >
                  <option value="">Select…</option>
                  {BOOKING_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                {step2Errors.bookingType && (
                  <p className="mt-1.5 text-xs text-[var(--color-accent)]">{step2Errors.bookingType}</p>
                )}
              </div>

              {/* Payment Type */}
              <div>
                <label htmlFor="payment-type" className="block text-sm font-medium text-[var(--color-dark)] mb-1.5">
                  Payment Type
                  <span className="text-[var(--color-accent)] ml-0.5">*</span>
                </label>
                <select
                  id="payment-type"
                  value={paymentType}
                  onChange={(e) => {
                    setPaymentType(e.target.value)
                    if (step2Errors.paymentType)
                      setStep2Errors((p) => ({ ...p, paymentType: undefined }))
                  }}
                  className={[
                    'w-full px-4 py-3 rounded-lg border text-sm text-[var(--color-dark)] bg-white',
                    'focus:outline-none focus:ring-2 focus:border-transparent',
                    step2Errors.paymentType
                      ? 'border-[var(--color-accent)] focus:ring-[var(--color-accent)]'
                      : 'border-slate-200 focus:ring-[var(--color-primary)]',
                  ].join(' ')}
                >
                  <option value="">Select…</option>
                  {paymentOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                {step2Errors.paymentType && (
                  <p className="mt-1.5 text-xs text-[var(--color-accent)]">{step2Errors.paymentType}</p>
                )}
                {clinician.hmos.length === 0 && (
                  <p className="mt-1.5 text-xs text-slate-400">
                    This clinician does not accept HMO at this time.
                  </p>
                )}
              </div>

              {/* Reminder banner */}
              <div className="rounded-xl bg-blue-50 border border-blue-100 p-5 mt-2">
                <p className="text-sm font-semibold text-[var(--color-primary)] mb-3">
                  Before your appointment, please remember to:
                </p>
                <ul className="space-y-2">
                  {[
                    'Arrive at least 15 minutes early',
                    'Bring any relevant medical records or test results',
                    'Prepare a list of your current medications',
                    'Have your HMO card ready if applicable',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-slate-600">
                      <span className="text-[var(--color-primary-light)] font-bold mt-0.5 shrink-0">·</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════
              STEP 3 — Review & Confirm
          ════════════════════════════════════════════════ */}
          {step === 3 && (
            <div className="space-y-6">

              {/* CLINICIAN */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Clinician
                </p>
                <div className="space-y-2.5">
                  <ReviewRow label="Name"      value={fullName} />
                  <ReviewRow label="Specialty" value={clinician.specialty} />
                  <ReviewRow label="Room"      value={clinician.room_number} />
                </div>
              </div>

              <div className="border-t border-slate-100" />

              {/* APPOINTMENT */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Appointment
                </p>
                <div className="space-y-2.5">
                  <ReviewRow label="Date"         value={formatFullDate(selectedDate)} />
                  <ReviewRow label="Time Slot"    value={selectedSlot?.label} />
                  <ReviewRow label="Booking Type" value={bookingType} />
                  <ReviewRow label="Payment Type" value={paymentType} />
                </div>
              </div>

              <div className="border-t border-slate-100" />

              {/* YOUR CONCERN */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Your Concern
                </p>
                <div className="space-y-2.5">
                  <ReviewRow label="Chief Complaint" value={chiefComplaint} />
                  <ReviewRow label="Description"     value={description.trim() || '—'} />
                </div>
              </div>

              <div className="border-t border-slate-100" />

              {/* Confirmation checkbox */}
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-0.5 w-5 h-5 rounded border-slate-300 cursor-pointer accent-[var(--color-primary)]"
                />
                <span className="text-sm text-slate-600 leading-relaxed">
                  I confirm that the information above is correct and I agree to arrive on
                  time for my appointment.
                </span>
              </label>

              {submitError && (
                <p className="text-sm text-[var(--color-accent)]">{submitError}</p>
              )}
            </div>
          )}

          {/* ── Navigation buttons ── */}
          <div className="flex items-center gap-3 mt-8 pt-6 border-t border-slate-100">
            {step > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="px-5 py-3 rounded-lg text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                ← Back
              </button>
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={step === 1 && (!selectedDate || !selectedSlot)}
                className="flex-1 py-3 px-6 rounded-lg text-sm font-semibold text-white bg-[var(--color-primary)] hover:opacity-90 transition-opacity duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!confirmed || loading}
                className="flex-1 py-3 px-6 rounded-lg text-sm font-semibold text-white bg-[var(--color-primary)] hover:opacity-90 transition-opacity duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting…' : 'Submit Appointment'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
