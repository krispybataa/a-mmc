import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { TRIAGE_STEPS, SYMPTOM_SPECIALTY_MAP, HMO_LABEL_MAP } from '@triage'
import api from '../services/api'
import KioskClock from '../components/KioskClock'
import KioskBodyDiagram from '../components/KioskBodyDiagram'

const PRIMARY   = '#1D409C'
const ACCENT    = '#CE1117'
const MAIN_URL  = import.meta.env.VITE_MAIN_APP_URL || 'http://localhost'

const HMO_STEP     = TRIAGE_STEPS.find(s => s.id === 'hmo')
const noHmoOption  = HMO_STEP.options.find(o => o.emphasized)
const hmoList      = HMO_STEP.options.filter(o => !o.emphasized)

// ── Body region options ───────────────────────────────────────────────────────
const BODY_REGIONS = [
  { label: 'Head & Brain',          subtext: 'Headaches, dizziness, seizures',               specialty: 'Neurology' },
  { label: 'Eyes',                  subtext: 'Vision problems, eye pain, irritation',         specialty: 'Ophthalmology' },
  { label: 'Ears, Nose & Throat',   subtext: 'Hearing, sinus, or throat issues',              specialty: 'Otorhinolaryngology' },
  { label: 'Teeth & Jaw',           subtext: 'Tooth pain, jaw problems',                     specialty: 'Dental Medicine' },
  { label: 'Heart & Chest',         subtext: 'Chest pain, palpitations',                     specialty: 'Cardiology' },
  { label: 'Lungs & Breathing',     subtext: 'Shortness of breath, cough',                   specialty: 'Pulmonary Medicine' },
  { label: 'Stomach & Digestion',   subtext: 'Pain, reflux, bowel issues',                   specialty: 'Gastroenterology' },
  { label: 'Bones & Joints',        subtext: 'Joint pain, swelling, stiffness, arthritis',   specialty: 'Rheumatology' },
  { label: 'Bone Injury',           subtext: 'Fractures, injuries, structural bone issues',  specialty: 'Orthopedic Surgery' },
  { label: "Women's Health",        subtext: 'Menstrual, pregnancy, pelvic pain',            specialty: 'Obstetrics & Gynecology' },
  { label: 'Skin',                  subtext: 'Rashes, itching, or skin changes',             specialty: 'Dermatology' },
  { label: "Children's Health",     subtext: 'Pediatric concerns, child development',         specialty: 'Pediatrics' },
  { label: 'Hormones & Metabolism', subtext: 'Thyroid, diabetes, metabolic conditions',      specialty: 'Endocrinology' },
  { label: 'Others',                subtext: 'Other concerns not listed above',              specialty: null },
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
function KioskResultCard({ clinician, onSelect }) {
  const name     = `${clinician.last_name}, ${clinician.first_name}`
  const initials = [clinician.first_name?.[0], clinician.last_name?.[0]].filter(Boolean).join('').toUpperCase()
  const qrUrl    = `${MAIN_URL}/clinician/${clinician.clinician_id}`

  return (
    <div
      onClick={() => onSelect?.(clinician)}
      style={{
        backgroundColor: '#fff',
        borderRadius: '16px',
        borderLeft: `4px solid ${PRIMARY}`,
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: '24px',
        padding: '24px',
        cursor: onSelect ? 'pointer' : 'default',
        transition: 'box-shadow 0.15s',
      }}
      onMouseEnter={e => { if (onSelect) e.currentTarget.style.boxShadow = '0 4px 20px rgba(29,64,156,0.18)' }}
      onMouseLeave={e => { if (onSelect) e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)' }}
    >
      {/* Left: profile picture — rounded square */}
      {clinician.profile_picture ? (
        <img
          src={clinician.profile_picture}
          alt=""
          style={{ width: '220px', height: '220px', borderRadius: '16px', objectFit: 'cover', border: `2px solid ${PRIMARY}`, flexShrink: 0 }}
          onError={e => { e.target.style.display = 'none' }}
        />
      ) : (
        <div style={{
          width: '220px', height: '220px', borderRadius: '16px', flexShrink: 0,
          backgroundColor: PRIMARY, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ color: '#fff', fontSize: '60px', fontWeight: '700' }}>{initials || '?'}</span>
        </div>
      )}

      {/* Right: name, specialty, room, QR */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <p style={{ fontSize: '30px', fontWeight: '700', color: '#1e293b', lineHeight: 1.2, marginBottom: '2px' }}>{name}</p>
        <p style={{ fontSize: '20px', color: '#6B7280' }}>{clinician.specialty}</p>
        {clinician.room_number && (
          <p style={{ fontSize: '18px', color: '#6B7280' }}>📍 {clinician.room_number}</p>
        )}
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <QRCodeSVG value={qrUrl} size={190} />
          <p style={{ fontSize: '15px', color: '#9CA3AF' }}>Scan to book on your phone</p>
        </div>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function KioskTriageScreen({ onNavigate, onSelectClinician }) {
  const [step,              setStep]             = useState('visit')
  const [selectedHmo,       setSelectedHmo]      = useState(null)
  const [selectedSpecialty, setSelectedSpecialty] = useState(null)
  const [clinicians,        setClinicians]        = useState([])
  const [loading,           setLoading]           = useState(false)
  const [fetchError,        setFetchError]        = useState('')
  const [showFallback,      setShowFallback]      = useState(false)

  // Reset fallback grid whenever step changes
  useEffect(() => {
    setShowFallback(false)
  }, [step])

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
        ←
      </button>  {/* arrow-only, matches directory back button */}
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
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 48px' }}>
          <div style={{ width: '100%', maxWidth: '672px' }}>
            <h2 style={{ fontSize: '32px', fontWeight: '700', color: PRIMARY, marginBottom: '12px', textAlign: 'center' }}>
              Is this your first time visiting?
            </h2>
            <p style={{ fontSize: '20px', color: '#6B7280', marginBottom: '40px', textAlign: 'center' }}>
              This helps us tailor your experience.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {[
                'Yes, this is my first visit',
                'No, I have visited before',
              ].map(label => (
                <button
                  key={label}
                  onClick={() => setStep('hmo')}
                  style={{
                    minHeight: '120px',
                    padding: '24px 32px',
                    fontSize: '28px',
                    fontWeight: '600',
                    color: '#1e293b',
                    textAlign: 'center',
                    width: '100%',
                    backgroundColor: '#fff',
                    border: `2px solid ${PRIMARY}`,
                    borderRadius: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.12s',
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
            Where do you feel discomfort?
          </p>
          <p style={{ fontSize: '20px', color: '#6B7280', marginBottom: '24px' }}>
            Tap a body area or browse all options below.
          </p>

          <KioskBodyDiagram
            onSelect={(specialty) => {
              setSelectedSpecialty(specialty)
              setStep('results')
            }}
            onFallback={() => setShowFallback(true)}
          />

          {showFallback && (
            <div style={{ marginTop: '32px' }}>
              <p style={{ fontSize: '22px', color: '#6B7280', marginBottom: '16px' }}>
                Select the option that best matches your concern:
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {BODY_REGIONS.map(region => (
                  <button
                    key={region.label}
                    onClick={() => handleRegionSelect(region.specialty)}
                    style={{
                      ...cardBase,
                      minHeight: '100px',
                      padding: '20px 24px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      textAlign: 'left',
                      borderLeft: `4px solid ${PRIMARY}`,
                      borderRadius: '12px',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor = PRIMARY
                      e.currentTarget.style.borderLeftColor = PRIMARY
                      e.currentTarget.querySelector('.rl').style.color = '#fff'
                      e.currentTarget.querySelector('.rs').style.color = 'rgba(255,255,255,0.75)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = '#fff'
                      e.currentTarget.style.borderLeftColor = PRIMARY
                      e.currentTarget.querySelector('.rl').style.color = '#1e293b'
                      e.currentTarget.querySelector('.rs').style.color = '#6B7280'
                    }}
                  >
                    <span className="rl" style={{ fontSize: '22px', fontWeight: '700', color: '#1e293b', lineHeight: 1.25 }}>
                      {region.label}
                    </span>
                    <span className="rs" style={{ fontSize: '18px', color: '#6B7280', marginTop: '6px', lineHeight: 1.4 }}>
                      {region.subtext}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
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
                <KioskResultCard key={c.clinician_id} clinician={c} onSelect={onSelectClinician} />
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
