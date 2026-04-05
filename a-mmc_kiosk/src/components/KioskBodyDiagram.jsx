import { useState } from 'react'
import Model from 'react-body-highlighter'

const PRIMARY       = '#1D409C'
const PRIMARY_LIGHT = '#8EA0CE'

// ── Region substep definitions ─────────────────────────────────────────────────
const SUBSTEPS = {
  head: {
    question: 'What part of your head concerns you?',
    options: [
      { label: 'Brain & Nerves',      subtext: 'Headaches, dizziness, seizures',   specialty: 'Neurology' },
      { label: 'Eyes',                subtext: 'Vision, eye pain, irritation',      specialty: 'Ophthalmology' },
      { label: 'Ears, Nose & Throat', subtext: 'Hearing, sinus, throat issues',     specialty: 'Otorhinolaryngology' },
      { label: 'Teeth & Jaw',         subtext: 'Tooth pain, jaw problems',          specialty: 'Dental Medicine' },
    ],
  },
  chest: {
    question: 'What best describes your chest concern?',
    options: [
      { label: 'Heart & Chest',      subtext: 'Chest pain, palpitations',     specialty: 'Cardiology' },
      { label: 'Breathing & Lungs',  subtext: 'Shortness of breath, cough',   specialty: 'Pulmonary Medicine' },
    ],
  },
  abdomen: {
    question: 'What concerns you about your abdomen?',
    options: [
      { label: 'Stomach & Digestion', subtext: 'Pain, reflux, bowel issues',        specialty: 'Gastroenterology' },
      { label: "Women's Health",      subtext: 'Menstrual, pregnancy, pelvic pain', specialty: 'Obstetrics & Gynecology' },
      { label: 'Kidneys & Urinary',   subtext: 'Kidney pain, urination issues',     specialty: 'Nephrology' },
    ],
  },
  limbs: {
    question: 'What concerns you about your muscles or joints?',
    options: [
      { label: 'Joints, Muscles & Arthritis', subtext: 'Joint pain, swelling, stiffness, or arthritis',  specialty: 'Rheumatology' },
      { label: 'Bone or Injury Concerns',     subtext: 'Fractures, injuries, or structural bone issues', specialty: 'Orthopedic Surgery' },
      { label: 'Skin',                        subtext: 'Rashes, itching, or skin changes',               specialty: 'Dermatology' },
    ],
  },
}

// ── Muscle → region key ────────────────────────────────────────────────────────
const MUSCLE_REGION = {
  head:             'head',
  neck:             'direct:Otorhinolaryngology',
  trapezius:        'direct:Otorhinolaryngology',
  chest:            'chest',
  abs:              'abdomen',
  obliques:         'abdomen',
  biceps:           'limbs',
  triceps:          'limbs',
  forearm:          'limbs',
  'front-deltoids': 'limbs',
  'back-deltoids':  'limbs',
  'upper-back':     'limbs',
  'lower-back':     'limbs',
  quadriceps:       'limbs',
  hamstring:        'limbs',
  calves:           'limbs',
  gluteal:          'limbs',
  'left-soleus':    'limbs',
  'right-soleus':   'limbs',
}

const TAPPABLE_MUSCLES = Object.keys(MUSCLE_REGION)

// ── Component ──────────────────────────────────────────────────────────────────
export default function KioskBodyDiagram({ onSelect, onFallback }) {
  const [highlighted, setHighlighted] = useState(null)
  const [substep,     setSubstep]     = useState(null)

  function handleMuscleClick({ muscle }) {
    const region = MUSCLE_REGION[muscle]
    if (!region) return
    setHighlighted(muscle)
    if (region.startsWith('direct:')) {
      onSelect(region.slice(7))
    } else {
      setSubstep(SUBSTEPS[region])
    }
  }

  function handleSubstepSelect(specialty) {
    setSubstep(null)
    setHighlighted(null)
    onSelect(specialty)
  }

  function dismissSubstep() {
    setSubstep(null)
    setHighlighted(null)
  }

  const modelData = [
    {
      name:      'clickable',
      muscles:   TAPPABLE_MUSCLES.filter(m => m !== highlighted),
      frequency: 1,
    },
    ...(highlighted
      ? [{ name: 'selected', muscles: [highlighted], frequency: 2 }]
      : []),
  ]

  return (
    /*
      Outer shell: centers the whole assembly on the kiosk screen.
      When idle: diagram alone, centered at max 500px.
      When substep open: diagram (300px) + gap + panel (480px) centered as a unit, max 860px.
    */
    <div style={{
      width: '100%',
      maxWidth: substep ? '860px' : '500px',
      margin: '0 auto',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '40px',
      transition: 'max-width 0.2s ease',
    }}>

      {/* Body diagram */}
      <div style={{
        flexShrink: 0,
        width: substep ? '300px' : '100%',
        transition: 'width 0.2s ease',
      }}>
        <Model
          data={modelData}
          bodyColor="#E2E0F0"
          highlightedColors={[PRIMARY_LIGHT, PRIMARY]}
          onClick={handleMuscleClick}
          type="anterior"
          svgStyle={{ cursor: 'pointer', width: '100%', height: 'auto' }}
        />

        {/* Browse all fallback button — shown below diagram at all times */}
        {!substep && (
          <button
            onClick={onFallback}
            style={{
              width: '100%',
              minHeight: '72px',
              fontSize: '22px',
              fontWeight: '700',
              color: PRIMARY,
              backgroundColor: '#fff',
              border: `2px solid ${PRIMARY}`,
              borderRadius: '16px',
              cursor: 'pointer',
              transition: 'all 0.12s',
              marginTop: '24px',
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = PRIMARY; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.color = PRIMARY }}
          >
            Browse All Symptoms →
          </button>
        )}
      </div>

      {/* Substep narrowing — fixed width so it doesn't span the full screen */}
      {substep && (
        <div style={{
          width: '480px',
          flexShrink: 0,
          backgroundColor: '#fff',
          borderRadius: '16px',
          border: '1.5px solid #e5e7eb',
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          padding: '28px',
          alignSelf: 'flex-start',
        }}>
          <p style={{ fontSize: '26px', fontWeight: '700', color: PRIMARY, marginBottom: '20px' }}>
            {substep.question}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {substep.options.map(opt => (
              <button
                key={opt.specialty}
                onClick={() => handleSubstepSelect(opt.specialty)}
                style={{
                  width: '100%',
                  minHeight: '80px',
                  textAlign: 'left',
                  backgroundColor: '#fff',
                  border: `2px solid ${PRIMARY}`,
                  borderRadius: '16px',
                  padding: '16px 24px',
                  cursor: 'pointer',
                  transition: 'all 0.12s',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  gap: '4px',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = PRIMARY
                  e.currentTarget.querySelector('.sub-label').style.color = '#fff'
                  e.currentTarget.querySelector('.sub-subtext').style.color = 'rgba(255,255,255,0.8)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = '#fff'
                  e.currentTarget.querySelector('.sub-label').style.color = '#1e293b'
                  e.currentTarget.querySelector('.sub-subtext').style.color = '#6B7280'
                }}
              >
                <span className="sub-label" style={{ fontSize: '22px', fontWeight: '700', color: '#1e293b' }}>
                  {opt.label}
                </span>
                <span className="sub-subtext" style={{ fontSize: '18px', color: '#6B7280' }}>
                  {opt.subtext}
                </span>
              </button>
            ))}
          </div>
          <button
            onClick={dismissSubstep}
            style={{
              marginTop: '20px',
              fontSize: '20px',
              color: '#6B7280',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px 0',
              minHeight: '48px',
            }}
          >
            ← Back
          </button>
        </div>
      )}

    </div>
  )
}
