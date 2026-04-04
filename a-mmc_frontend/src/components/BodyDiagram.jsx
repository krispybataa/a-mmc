import { useState } from 'react'
import Model from 'react-body-highlighter'

// ── Region substep definitions ────────────────────────────────────────────────

const SUBSTEPS = {
  head: {
    question: 'What part of your head concerns you?',
    options: [
      { label: 'Brain & Nerves',     subtext: 'Headaches, dizziness, seizures',   specialty: 'Neurology' },
      { label: 'Eyes',               subtext: 'Vision, eye pain, irritation',      specialty: 'Ophthalmology' },
      { label: 'Ears, Nose & Throat',subtext: 'Hearing, sinus, throat issues',     specialty: 'Otorhinolaryngology' },
      { label: 'Teeth & Jaw',        subtext: 'Tooth pain, jaw problems',          specialty: 'Dental Medicine' },
    ],
  },
  chest: {
    question: 'What best describes your chest concern?',
    options: [
      { label: 'Heart & Chest',      subtext: 'Chest pain, palpitations',          specialty: 'Cardiology' },
      { label: 'Breathing & Lungs',  subtext: 'Shortness of breath, cough',        specialty: 'Pulmonary Medicine' },
    ],
  },
  abdomen: {
    question: 'What concerns you about your abdomen?',
    options: [
      { label: 'Stomach & Digestion',subtext: 'Pain, reflux, bowel issues',        specialty: 'Gastroenterology' },
      { label: "Women's Health",     subtext: 'Menstrual, pregnancy, pelvic pain', specialty: 'Obstetrics & Gynecology' },
      { label: 'Kidneys & Urinary',  subtext: 'Kidney pain, urination issues',     specialty: 'Nephrology' },
    ],
  },
  limbs: {
    question: 'What concerns you about your muscles or joints?',
    options: [
      { label: 'Joints, Muscles & Arthritis', subtext: 'Joint pain, swelling, stiffness, or arthritis',    specialty: 'Rheumatology' },
      { label: 'Bone or Injury Concerns',     subtext: 'Fractures, injuries, or structural bone issues',   specialty: 'Orthopedic Surgery' },
      { label: 'Skin',                        subtext: 'Rashes, itching, or skin changes',                 specialty: 'Dermatology' },
    ],
  },
}

// ── Muscle → region key (verified react-body-highlighter v2 muscle names) ─────
// Prefix 'direct:' means skip substep, call onSelect immediately.

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

// ── Component ─────────────────────────────────────────────────────────────────

export default function BodyDiagram({ onSelect }) {
  const [highlighted, setHighlighted] = useState(null)
  const [substep,     setSubstep]     = useState(null)  // null or substep definition object

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

  // Clickable muscles: light tint at freq 1; selected muscle full primary at freq 2
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
    <div className="flex flex-col items-center gap-5">

      {/* Body diagram — front view only */}
      <div style={{ width: '100%', maxWidth: '420px', margin: '0 auto' }}>
        <Model
          data={modelData}
          bodyColor="#E2E0F0"
          highlightedColors={['#8EA0CE', '#1D409C']}
          onClick={handleMuscleClick}
          type="anterior"
          svgStyle={{ cursor: 'pointer', width: '100%', height: 'auto' }}
        />
      </div>

      {/* Substep narrowing card */}
      {substep && (
        <div className="w-full bg-white rounded-xl border border-[var(--color-border)] shadow-sm p-5">
          <p className="font-semibold text-base text-[var(--color-text)] mb-4">
            {substep.question}
          </p>
          <div className="flex flex-col gap-3">
            {substep.options.map(opt => (
              <button
                key={opt.specialty}
                onClick={() => handleSubstepSelect(opt.specialty)}
                className="w-full text-left bg-white rounded-xl border border-[var(--color-border)] px-5 py-4 min-h-[72px] flex flex-col hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-all duration-150"
              >
                <span className="font-semibold text-sm text-[var(--color-text)] leading-snug">
                  {opt.label}
                </span>
                <span className="text-xs text-[var(--color-muted)] mt-1 leading-snug">
                  {opt.subtext}
                </span>
              </button>
            ))}
          </div>
          <button
            onClick={dismissSubstep}
            className="mt-4 text-sm text-[var(--color-muted)] hover:text-[var(--color-primary)] transition-colors"
          >
            ← Back
          </button>
        </div>
      )}

    </div>
  )
}
