import { useRef, useState } from 'react'
import Model from 'react-body-highlighter'
import { useAnimeOnMount, useFlipTransition, EASE, DURATION } from '../lib/motion'
import { COLOR_PRIMARY } from '../theme'

// -- Region substep definitions ------------------------------------------------

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
      { label: 'Joints & Muscles', subtext: 'Joint pain, swelling, stiffness, or arthritis',    specialty: 'Rheumatology' },
      { label: 'Bone or Injury Concerns',     subtext: 'Fractures, injuries, or structural bone issues',   specialty: 'Orthopedic Surgery' },
      { label: 'Skin',                        subtext: 'Rashes, itching, or skin changes',                 specialty: 'Dermatology' },
    ],
  },
}

// -- Muscle -> region key (verified react-body-highlighter v2 muscle names) -----
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

// -- Component -----------------------------------------------------------------

export default function BodyDiagram({ onSelect, excludeSpecialties = [] }) {
  const [highlighted, setHighlighted] = useState(null)
  const [substep,     setSubstep]     = useState(null)  // null or substep definition object

  // Substep panel pops in as one block (a quick fade + scale) rather than
  // staggering its handful of options individually - staggering the
  // children too would double-fade them since they'd be nested inside this
  // panel's own opacity/transform tween.
  const substepPanelRef = useRef(null)
  useAnimeOnMount(substepPanelRef, () => {
    if (!substep) return null
    return {
      opacity: [0, 1],
      scale: [0.97, 1],
      duration: DURATION.base,
      ease: EASE.decelerate,
    }
  }, [substep])

  // The diagram wrapper's width class flips (full-width <-> 160px sidebar,
  // sm+ only) whenever a substep opens or closes, to make room for the
  // panel above. That's a layout change, so it can't be animated directly -
  // FLIP smooths it over using only transform. capture() must be called
  // synchronously before the setSubstep() that triggers the width change.
  const diagramWrapperRef = useRef(null)
  const captureDiagramRect = useFlipTransition(diagramWrapperRef, [!!substep])

  function handleMuscleClick({ muscle }) {
    const region = MUSCLE_REGION[muscle]
    if (!region) return

    setHighlighted(muscle)

    if (region.startsWith('direct:')) {
      onSelect(region.slice(7))
    } else {
      captureDiagramRect()
      setSubstep(SUBSTEPS[region])
    }
  }

  function handleSubstepSelect(specialty) {
    setSubstep(null)
    setHighlighted(null)
    onSelect(specialty)
  }

  function dismissSubstep() {
    captureDiagramRect()
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
    /* Mobile: stack vertically. sm+: side-by-side when substep open */
    <div className="flex flex-col sm:flex-row items-start gap-5 w-full">

      {/* Body diagram - pure Tailwind so sm: breakpoints aren't overridden by inline style */}
      <div
        ref={diagramWrapperRef}
        className={
          substep
            ? 'w-full mx-auto max-w-[420px] sm:w-[160px] sm:max-w-[160px] sm:mx-0 shrink-0'
            : 'w-full mx-auto max-w-[420px] shrink-0'
        }
      >
        <Model
          data={modelData}
          bodyColor="#E2E0F0"
          highlightedColors={['#8EA0CE', COLOR_PRIMARY]}
          onClick={handleMuscleClick}
          type="anterior"
          svgStyle={{ cursor: 'pointer', width: '100%', height: 'auto' }}
        />
      </div>

      {/* Substep narrowing card - below on mobile, right-of-diagram on sm+ */}
      {substep && (
        <div ref={substepPanelRef} className="flex-1 w-full bg-white rounded-xl border border-[var(--color-border)] shadow-sm p-5 self-start">
          <p className="font-semibold text-base text-[var(--color-text)] mb-4">
            {substep.question}
          </p>
          <div className="flex flex-col gap-3">
            {substep.options.filter(opt => !excludeSpecialties.includes(opt.specialty)).map(opt => (
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
            &larr; Back
          </button>
        </div>
      )}

    </div>
  )
}
