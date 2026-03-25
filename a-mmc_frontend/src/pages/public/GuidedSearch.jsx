import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { TRIAGE_STEPS, SYMPTOM_SPECIALTY_MAP } from '../../data/triageLogic'

// ── HMO list ──────────────────────────────────────────────────────────────────
// TODO: source the full HMO list from the backend (MMC_HMO table) once available.
const HMOS = [
  'Maxicare', 'Medicard', 'PhilCare', 'Intellicare', 'Carewell', 'Avega',
  'Insular Health Care', 'MedoCard', 'Pacific Cross', 'Value Care',
]

const TOTAL_STEPS = 3

// ── Tap card styles ────────────────────────────────────────────────────────────

const baseCard = [
  'w-full bg-white rounded-xl border border-slate-200 shadow-sm',
  'flex items-center text-left',
  'hover:border-[var(--color-primary)] hover:shadow-md transition-all duration-150',
].join(' ')

// ── Main component ─────────────────────────────────────────────────────────────

export default function GuidedSearch() {
  const navigate = useNavigate()

  const [step,         setStep]         = useState(1)
  const [firstVisit,   setFirstVisit]   = useState(null)  // 'yes' | 'no'
  const [selectedHMO,  setSelectedHMO]  = useState(null)  // hmo string | 'none'

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleFirstVisit(value) {
    setFirstVisit(value)
    // TODO: domain expert input needed — should returning patients skip triage?
    setStep(2)
  }

  function handleHMOSelect(hmoId) {
    setSelectedHMO(hmoId)
    setStep(3)
  }

  function handleSymptomSelect(optionId) {
    const specialty = SYMPTOM_SPECIALTY_MAP[optionId]
    const params    = new URLSearchParams()
    if (specialty)                  params.set('specialty', specialty)
    if (selectedHMO && selectedHMO !== 'none') params.set('hmo', selectedHMO)
    navigate('/doctors?' + params.toString())
  }

  function goBack() {
    setStep(s => s - 1)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-14">
      <div className="w-full max-w-lg">

        {/* Step counter + back button */}
        <div className="flex items-center justify-between mb-6">
          {step > 1 ? (
            <button
              onClick={goBack}
              className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[var(--color-primary)] transition-colors min-h-[44px] pr-3"
            >
              <ArrowLeft size={15} />
              Back
            </button>
          ) : (
            <div />
          )}
          <p className="text-sm font-medium text-slate-400">
            Step {step} of {TOTAL_STEPS}
          </p>
        </div>

        {/* ════════════════════════════
            STEP 1 — First visit check
        ════════════════════════════ */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold text-[var(--color-dark)] mb-2">
              Is this your first time visiting MMC?
            </h2>
            <p className="text-slate-500 mb-8">
              This helps us tailor your experience.
            </p>
            <div className="space-y-4">
              {[
                { id: 'yes', label: 'Yes, this is my first visit' },
                { id: 'no',  label: 'No, I have visited before'   },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => handleFirstVisit(opt.id)}
                  className={`${baseCard} min-h-[72px] px-6 py-5`}
                >
                  <span className="font-semibold text-base text-[var(--color-dark)]">
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ════════════════════════════
            STEP 2 — HMO selection
        ════════════════════════════ */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold text-[var(--color-dark)] mb-2">
              Do you have a Health Maintenance Organization (HMO) card?
            </h2>
            <p className="text-slate-500 mb-8">
              Select your HMO so we can show you accredited clinicians.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {HMOS.map(hmo => (
                <button
                  key={hmo}
                  onClick={() => handleHMOSelect(hmo)}
                  className={`${baseCard} min-h-[56px] px-4 py-3 justify-center text-center`}
                >
                  <span className="text-sm font-medium text-[var(--color-dark)]">{hmo}</span>
                </button>
              ))}
              {/* No HMO — spans full width */}
              <button
                onClick={() => handleHMOSelect('none')}
                className={`${baseCard} col-span-2 min-h-[56px] px-6 py-3 justify-center text-center`}
              >
                <span className="text-sm font-medium text-slate-500">
                  I do not have an HMO
                </span>
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════
            STEP 3 — Symptom selection
        ════════════════════════════ */}
        {step === 3 && (
          <div>
            <h2 className="text-2xl font-bold text-[var(--color-dark)] mb-2">
              {TRIAGE_STEPS[0].question}
            </h2>
            <p className="text-slate-500 mb-8">
              Select the option that best matches your concern.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {TRIAGE_STEPS[0].options.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => handleSymptomSelect(opt.id)}
                  className={`${baseCard} min-h-[64px] px-4 py-4 gap-3`}
                >
                  <span className="text-2xl shrink-0">{opt.icon}</span>
                  <span className="text-sm font-medium text-[var(--color-dark)] leading-snug">
                    {opt.label}
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
