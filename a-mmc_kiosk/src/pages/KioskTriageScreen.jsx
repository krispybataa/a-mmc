import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { TRIAGE_STEPS, SYMPTOM_SPECIALTY_MAP, HMO_LABEL_MAP } from '@triage'
import api from '../services/api'
import KioskClock from '../components/KioskClock'

const PRIMARY   = '#1D409C'
const ACCENT    = '#CE1117'
const MAIN_URL  = import.meta.env.VITE_MAIN_APP_URL || 'http://localhost'

const HMO_STEP     = TRIAGE_STEPS.find(s => s.id === 'hmo')
const noHmoOption  = HMO_STEP.options.find(o => o.emphasized)
const hmoList      = HMO_STEP.options.filter(o => !o.emphasized)

// ── Body region options ───────────────────────────────────────────────────────
const BODY_REGIONS = [
  { icon: '🧠', label: 'Head & Brain',          specialty: 'Neurology' },
  { icon: '👁️',  label: 'Eyes',                  specialty: 'Ophthalmology' },
  { icon: '👂', label: 'Ears, Nose & Throat',   specialty: 'Otorhinolaryngology' },
  { icon: '🦷', label: 'Teeth & Jaw',            specialty: 'Dental Medicine' },
  { icon: '❤️',  label: 'Heart & Chest',          specialty: 'Cardiology' },
  { icon: '🫁', label: 'Lungs & Breathing',      specialty: 'Pulmonary Medicine' },
  { icon: '🫃', label: 'Stomach & Digestion',    specialty: 'Gastroenterology' },
  { icon: '🦴', label: 'Bones & Joints',         specialty: 'Rheumatology' },
  { icon: '🩹', label: 'Bone Injury',             specialty: 'Orthopedic Surgery' },
  { icon: '👩', label: "Women's Health",          specialty: 'Obstetrics & Gynecology' },
  { icon: '🧴', label: 'Skin',                    specialty: 'Dermatology' },
  { icon: '👶', label: "Children's Health",       specialty: 'Pediatrics' },
  { icon: '⚗️',  label: 'Hormones & Metabolism',  specialty: 'Endocrinology' },
  { icon: '🔬', label: 'Others',                  specialty: null },
]

// ── Step metadata ─────────────────────────────────────────────────────────────
const STEP_LABEL = {
  visit:    'Step 1 of 3',
  hmo:      'Step 2 of 3',
  symptoms: 'Step 3 of 3',
  results:  'Results',
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const cardBase = {
  backgroundColor: '#fff',
  border: '1.5px solid #e5e7eb',
  borderRadius: '16px',
  cursor: 'pointer',
  transition: 'all 0.12s',
}

// ── KioskResultCard ───────────────────────────────────────────────────────────
function KioskResultCard({ clinician }) {
  const name     = `${clinician.last_name}, ${clinician.first_name}`
  const initials = [clinician.first_name?.[0], clinician.last_name?.[0]].filter(Boolean).join('').toUpperCase()
  const qrUrl    = `${MAIN_URL}/clinician/${clinician.clinician_id}`

  return (
    <div
      style={{
        ...cardBase,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px 20px',
        minHeight: '400px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        gap: '12px',
      }}
    >
      {/* Avatar */}
      {clinician.profile_picture ? (
        <img
          src={clinician.profile_picture}
          alt=""
          style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${PRIMARY}` }}
          onError={e => { e.target.style.display = 'none' }}
        />
      ) : (
        <div style={{
          width: '72px', height: '72px', borderRadius: '50%',
          backgroundColor: PRIMARY, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ color: '#fff', fontSize: '26px', fontWeight: '700' }}>{initials || '?'}</span>
        </div>
      )}

      {/* Name + specialty + room */}
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '22px', fontWeight: '700', color: '#1e293b', lineHeight: 1.2 }}>{name}</p>
        <p style={{ fontSize: '18px', color: '#6B7280', marginTop: '4px' }}>{clinician.specialty}</p>
        {clinician.room_number && (
          <p style={{ fontSize: '18px', color: '#6B7280' }}>📍 {clinician.room_number}</p>
        )}
      </div>

      {/* QR code */}
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <QRCodeSVG value={qrUrl} size={180} />
        <p style={{ fontSize: '16px', color: '#9CA3AF', textAlign: 'center' }}>
          Scan to book on your phone
        </p>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function KioskTriageScreen({ onNavigate }) {
  const [step,              setStep]             = useState('visit')
  const [selectedHmo,       setSelectedHmo]      = useState(null)
  const [selectedSpecialty, setSelectedSpecialty] = useState(null)
  const [clinicians,        setClinicians]        = useState([])
  const [loading,           setLoading]           = useState(false)
  const [fetchError,        setFetchError]        = useState('')

  // Fetch clinicians when entering results step
  useEffect(() => {
    if (step !== 'results') return
    setLoading(true)
    setFetchError('')
    api.get('/clinicians/')
      .then(res => setClinicians(res.data))
      .catch(() => setFetchError('Unable to load clinicians. Please try again.'))
      .finally(() => setLoading(false))
  }, [step])

  // ── Navigation ──────────────────────────────────────────────────────────────
  function handleBack() {
    if (step === 'visit')    onNavigate('home')
    else if (step === 'hmo')      setStep('visit')
    else if (step === 'symptoms') setStep('hmo')
    else if (step === 'results')  setStep('symptoms')
  }

  function handleHmoSelect(hmoId) {
    setSelectedHmo(hmoId)
    setStep('symptoms')
  }

  function handleRegionSelect(specialty) {
    setSelectedSpecialty(specialty)
    setStep('results')
  }

  function handleReset() {
    setSelectedHmo(null)
    setSelectedSpecialty(null)
    setClinicians([])
    setStep('visit')
  }

  // ── Filtered results ────────────────────────────────────────────────────────
  const filtered = clinicians.filter(c => {
    if (selectedSpecialty && c.specialty !== selectedSpecialty) return false
    if (selectedHmo && selectedHmo !== 'no_hmo') {
      const hmoName = HMO_LABEL_MAP[selectedHmo]
      if (hmoName && !c.hmos?.some(h => h.hmo_name === hmoName)) return false
    }
    return true
  })

  const hmoDisplayLabel = (selectedHmo && selectedHmo !== 'no_hmo')
    ? HMO_LABEL_MAP[selectedHmo]
    : 'All HMOs'

  // ── Shared header ───────────────────────────────────────────────────────────
  const header = (
    <div
      style={{
        backgroundColor: PRIMARY,
        display: 'flex',
        alignItems: 'center',
        padding: '16px 24px',
        gap: '16px',
        flexShrink: 0,
      }}
    >
      <button
        onClick={handleBack}
        style={{
          backgroundColor: '#fff',
          color: PRIMARY,
          border: 'none',
          borderRadius: '12px',
          fontSize: '22px',
          fontWeight: '700',
          minWidth: '80px',
          minHeight: '72px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        ← Back
      </button>
      <p style={{ color: '#fff', fontSize: '20px', fontWeight: '600', flex: 1, textAlign: 'center' }}>
        {STEP_LABEL[step]}
      </p>
      <KioskClock />
    </div>
  )

  // ── Step: visit ─────────────────────────────────────────────────────────────
  if (step === 'visit') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#F8F7FF' }}>
        {header}
        <div style={{ flex: 1, overflowY: 'auto', padding: '40px 48px' }}>
          <p style={{ fontSize: '28px', fontWeight: '700', color: '#1e293b', marginBottom: '12px' }}>
            Is this your first time visiting?
          </p>
          <p style={{ fontSize: '20px', color: '#6B7280', marginBottom: '40px' }}>
            This helps us tailor your experience.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '600px' }}>
            {[
              'Yes, this is my first visit',
              'No, I have visited before',
            ].map(label => (
              <button
                key={label}
                onClick={() => setStep('hmo')}
                style={{
                  ...cardBase,
                  minHeight: '120px',
                  padding: '24px 32px',
                  fontSize: '28px',
                  fontWeight: '600',
                  color: '#1e293b',
                  textAlign: 'left',
                  width: '100%',
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = PRIMARY; e.currentTarget.style.color = '#fff' }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.color = '#1e293b' }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Step: hmo ───────────────────────────────────────────────────────────────
  if (step === 'hmo') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#F8F7FF' }}>
        {header}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px 48px' }}>
          <p style={{ fontSize: '28px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>
            Do you have an HMO card?
          </p>
          <p style={{ fontSize: '20px', color: '#6B7280', marginBottom: '24px' }}>
            Select your HMO so we can show accredited clinicians.
          </p>

          {/* "No HMO" — full width, emphasized */}
          {noHmoOption && (
            <button
              onClick={() => handleHmoSelect(noHmoOption.id)}
              style={{
                width: '100%',
                minHeight: '80px',
                borderRadius: '12px',
                border: `4px solid ${PRIMARY}`,
                backgroundColor: `rgba(29,64,156,0.06)`,
                color: PRIMARY,
                fontSize: '24px',
                fontWeight: '700',
                cursor: 'pointer',
                marginBottom: '20px',
              }}
            >
              {noHmoOption.label}
            </button>
          )}

          {/* HMO grid */}
          <div style={{ maxHeight: '500px', overflowY: 'auto', paddingRight: '4px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {hmoList.map(hmo => (
                <button
                  key={hmo.id}
                  onClick={() => handleHmoSelect(hmo.id)}
                  style={{
                    ...cardBase,
                    minHeight: '80px',
                    padding: '12px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    fontSize: '20px',
                    color: '#1e293b',
                    textAlign: 'center',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = PRIMARY; e.currentTarget.style.backgroundColor = `rgba(29,64,156,0.06)` }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.backgroundColor = '#fff' }}
                >
                  <img
                    src={`/assets/hmo-logos/${hmo.id}.png`}
                    alt=""
                    style={{ width: '48px', height: '48px', objectFit: 'contain' }}
                    onError={e => { e.target.style.display = 'none' }}
                  />
                  <span>{hmo.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Step: symptoms ───────────────────────────────────────────────────────────
  if (step === 'symptoms') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#F8F7FF' }}>
        {header}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px 48px' }}>
          <p style={{ fontSize: '28px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>
            What area concerns you?
          </p>
          <p style={{ fontSize: '20px', color: '#6B7280', marginBottom: '24px' }}>
            Tap the option that best matches your concern.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {BODY_REGIONS.map(region => (
              <button
                key={region.label}
                onClick={() => handleRegionSelect(region.specialty)}
                style={{
                  ...cardBase,
                  minHeight: '160px',
                  padding: 0,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = PRIMARY; e.currentTarget.querySelector('.region-label').style.color = '#fff'; e.currentTarget.querySelector('.region-icon').style.filter = 'brightness(0) invert(1)' }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.querySelector('.region-label').style.color = '#1e293b'; e.currentTarget.querySelector('.region-icon').style.filter = '' }}
              >
                {/* Primary color top strip */}
                <div style={{ backgroundColor: PRIMARY, height: '12px', width: '100%', borderRadius: '16px 16px 0 0' }} />
                {/* Card body */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '16px' }}>
                  <span className="region-icon" style={{ fontSize: '40px', lineHeight: 1 }}>{region.icon}</span>
                  <span className="region-label" style={{ fontSize: '22px', fontWeight: '600', color: '#1e293b', textAlign: 'center', lineHeight: 1.2 }}>
                    {region.label}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Browse all */}
          <div style={{ marginTop: '28px', textAlign: 'center' }}>
            <button
              onClick={() => handleRegionSelect(null)}
              style={{
                fontSize: '20px',
                color: PRIMARY,
                fontWeight: '600',
                textDecoration: 'underline',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                minHeight: '72px',
                padding: '16px',
              }}
            >
              Browse All Doctors →
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Step: results ────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#F8F7FF' }}>
      {header}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 48px' }}>

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
            <p style={{ fontSize: '22px', color: '#6B7280' }}>Loading…</p>
          </div>
        )}

        {fetchError && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '24px' }}>
            <p style={{ fontSize: '22px', color: '#6B7280' }}>{fetchError}</p>
            <button
              onClick={() => { setClinicians([]); setFetchError(''); setStep('results') }}
              style={{ backgroundColor: PRIMARY, color: '#fff', fontSize: '22px', minHeight: '72px', padding: '0 32px', borderRadius: '12px', border: 'none', cursor: 'pointer' }}
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !fetchError && filtered.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '24px', textAlign: 'center' }}>
            <p style={{ fontSize: '24px', color: '#374151' }}>
              No clinicians found matching your selection.
            </p>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                onClick={() => setStep('symptoms')}
                style={{ backgroundColor: PRIMARY, color: '#fff', fontSize: '22px', minHeight: '72px', padding: '0 32px', borderRadius: '12px', border: 'none', cursor: 'pointer' }}
              >
                Try a Different Specialty
              </button>
              <button
                onClick={() => onNavigate('directory')}
                style={{ backgroundColor: '#fff', color: PRIMARY, fontSize: '22px', minHeight: '72px', padding: '0 32px', borderRadius: '12px', border: `2px solid ${PRIMARY}`, cursor: 'pointer' }}
              >
                Browse All Doctors
              </button>
            </div>
          </div>
        )}

        {!loading && !fetchError && filtered.length > 0 && (
          <>
            <p style={{ fontSize: '28px', fontWeight: '700', color: PRIMARY, marginBottom: '6px' }}>
              Recommended Specialists
            </p>
            <p style={{ fontSize: '20px', color: '#6B7280', marginBottom: '28px' }}>
              {selectedSpecialty || 'All Specialties'} · {hmoDisplayLabel}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              {filtered.map(c => (
                <KioskResultCard key={c.clinician_id} clinician={c} />
              ))}
            </div>

            {/* Bottom actions */}
            <div style={{ display: 'flex', gap: '16px', marginTop: '32px', flexWrap: 'wrap' }}>
              <button
                onClick={handleReset}
                style={{ backgroundColor: PRIMARY, color: '#fff', fontSize: '22px', minHeight: '72px', padding: '0 32px', borderRadius: '12px', border: 'none', cursor: 'pointer' }}
              >
                ← Search Again
              </button>
              <button
                onClick={() => onNavigate('directory')}
                style={{ backgroundColor: '#fff', color: PRIMARY, fontSize: '22px', minHeight: '72px', padding: '0 32px', borderRadius: '12px', border: `2px solid ${PRIMARY}`, cursor: 'pointer' }}
              >
                Browse All Doctors →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
