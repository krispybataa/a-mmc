import { useState } from 'react'
import Model from 'react-body-highlighter'

// ── Muscle → specialty mapping (verified against react-body-highlighter v2 muscle names) ──

const MUSCLE_SPECIALTY = {
  head:             'Neurology',
  neck:             'Otorhinolaryngology',
  chest:            'Cardiology',
  abs:              'Gastroenterology',
  obliques:         'Gastroenterology',
  biceps:           'Orthopedic Surgery',
  triceps:          'Orthopedic Surgery',
  forearm:          'Orthopedic Surgery',
  'front-deltoids': 'Orthopedic Surgery',
  'back-deltoids':  'Orthopedic Surgery',
  trapezius:        'Orthopedic Surgery',
  'upper-back':     'Orthopedic Surgery',
  'lower-back':     'Orthopedic Surgery',
  quadriceps:       'Orthopedic Surgery',
  hamstring:        'Orthopedic Surgery',
  calves:           'Orthopedic Surgery',
  gluteal:          'Orthopedic Surgery',
  'left-soleus':    'Orthopedic Surgery',
  'right-soleus':   'Orthopedic Surgery',
}

// Specialty shortcut buttons for regions not represented by muscle groups
const OVERLAY_SPECIALTIES = [
  { label: 'Eyes',         specialty: 'Ophthalmology' },
  { label: 'Teeth & Jaw',  specialty: 'Dental Medicine' },
  { label: 'Lungs',        specialty: 'Pulmonary Medicine' },
  { label: 'Skin',         specialty: 'Dermatology' },
  { label: 'Pelvis',       specialty: 'Obstetrics & Gynecology' },
  { label: 'Allergies',    specialty: 'Allergology & Immunology' },
  { label: 'Children',     specialty: 'Pediatrics' },
  { label: 'Hormones',     specialty: 'Endocrinology' },
]

// All clickable muscles, pre-coloured at low intensity so users know they're tappable
const TAPPABLE_MUSCLES = Object.keys(MUSCLE_SPECIALTY)

export default function BodyDiagram({ onSelect, onFallback }) {
  const [side,        setSide]        = useState('anterior')
  const [highlighted, setHighlighted] = useState(null)

  function handleMuscleClick({ muscle }) {
    const specialty = MUSCLE_SPECIALTY[muscle]
    if (!specialty) return
    setHighlighted(muscle)
    onSelect(specialty)
  }

  // Highlighted muscle gets primary blue; all others get a light tint to signal clickability
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

      {/* Front / Back toggle */}
      <div className="flex rounded-lg border border-[var(--color-border)] overflow-hidden self-center">
        {[
          { value: 'anterior', label: 'Front' },
          { value: 'posterior', label: 'Back' },
        ].map(({ value, label }) => (
          <button
            key={value}
            onClick={() => { setSide(value); setHighlighted(null) }}
            className={[
              'px-6 py-2 text-sm font-medium transition-colors min-h-[44px]',
              side === value
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-white text-[var(--color-muted)] hover:bg-slate-50',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Body diagram */}
      <div style={{ width: '160px' }}>
        <Model
          data={modelData}
          bodyColor="#E2E0F0"
          highlightedColors={['#8EA0CE', '#1D409C']}
          onClick={handleMuscleClick}
          type={side}
          svgStyle={{ cursor: 'pointer' }}
        />
      </div>

      {/* Specialty shortcut buttons for non-muscle regions */}
      <div className="w-full">
        <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider text-center mb-2">
          Or select a specific area
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {OVERLAY_SPECIALTIES.map(({ label, specialty }) => (
            <button
              key={specialty}
              onClick={() => onSelect(specialty)}
              className="px-3 py-2.5 text-sm font-medium rounded-lg border border-[var(--color-border)] bg-white text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-all min-h-[44px]"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Fallback link */}
      <button
        onClick={onFallback}
        className="text-sm text-[var(--color-primary)] hover:underline"
      >
        Can't find your area? Browse all symptoms →
      </button>

    </div>
  )
}
