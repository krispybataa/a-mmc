import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { TRIAGE_STEPS, SYMPTOM_SPECIALTY_MAP, HMO_LABEL_MAP } from '../../data/triageLogic'

const HMO_STEP     = TRIAGE_STEPS[0]   // { id: 'hmo', question, options }
const SYMPTOM_STEP = TRIAGE_STEPS[1]   // { id: 'symptoms', question, options }

const TOTAL_STEPS = 3

// ── Shared styles ─────────────────────────────────────────────────────────────

const baseCard = [
  'w-full bg-white rounded-xl border border-[var(--color-border)] shadow-sm',
  'flex items-center text-left',
  'hover:border-[var(--color-primary)] hover:shadow-md transition-all duration-150',
].join(' ')

// ── Main component ─────────────────────────────────────────────────────────────

export default function GuidedSearch() {
  const navigate = useNavigate()

  const [step,        setStep]        = useState(1)
  const [firstVisit,  setFirstVisit]  = useState(null)
  const [selectedHMO, setSelectedHMO] = useState(null)   // HMO option id e.g. 'maxicare'

  function handleFirstVisit(value) {
    setFirstVisit(value)
    setStep(2)
  }

  function handleHMOSelect(hmoId) {
    setSelectedHMO(hmoId)
    setStep(3)
  }

  function handleSymptomSelect(optionId) {
    const specialty = SYMPTOM_SPECIALTY_MAP[optionId]
    const hmoLabel  = selectedHMO && selectedHMO !== 'no_hmo'
      ? HMO_LABEL_MAP[selectedHMO]
      : null

    const params = new URLSearchParams()
    if (specialty) params.set('specialty', specialty)
    if (hmoLabel)  params.set('hmo', hmoLabel)
    navigate('/doctors?' + params.toString())
  }

  function goBack() {
    setStep(s => s - 1)
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  // Split HMO options into the emphasized "no HMO" card and the rest
  const noHmoOption  = HMO_STEP.options.find(o => o.emphasized)
  const hmoList      = HMO_STEP.options.filter(o => !o.emphasized)

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col items-center justify-center px-4 py-14">
      <div className="w-full max-w-lg">

        {/* Step counter + back button */}
        <div className="flex items-center justify-between mb-6">
          {step > 1 ? (
            <button
              onClick={goBack}
              className="inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-primary)] min-h-[44px] pr-3"
            >
              <ArrowLeft size={15} />
              Back
            </button>
          ) : (
            <div />
          )}
          <p className="text-sm font-medium text-[var(--color-muted)]">
            Step {step} of {TOTAL_STEPS}
          </p>
        </div>

        {/* ════════════════════════════
            STEP 1 — First visit check
        ════════════════════════════ */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold text-[var(--color-text)] mb-2">
              Is this your first time visiting the clinic?
            </h2>
            <p className="text-[var(--color-muted)] mb-8">
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
                  <span className="font-semibold text-base text-[var(--color-text)]">
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
            <h2 className="text-2xl font-bold text-[var(--color-text)] mb-2">
              {HMO_STEP.question}
            </h2>
            <p className="text-[var(--color-muted)] mb-6">
              Select your HMO so we can show you accredited clinicians.
            </p>

            {/* "I do not have HMO" — full-width, emphasized, above the grid */}
            {noHmoOption && (
              <button
                onClick={() => handleHMOSelect(noHmoOption.id)}
                className="w-full mb-3 min-h-[56px] px-6 py-4 rounded-xl border-2 border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)] font-semibold text-base text-center hover:bg-[var(--color-primary)]/10 transition-colors"
              >
                {noHmoOption.label}
              </button>
            )}

            {/* Scrollable HMO grid */}
            <div className="max-h-[300px] sm:max-h-[400px] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {hmoList.map(hmo => (
                  <button
                    key={hmo.id}
                    onClick={() => handleHMOSelect(hmo.id)}
                    className="bg-white border border-[var(--color-border)] rounded-xl min-h-[56px] px-4 py-3 text-sm text-center font-medium text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-all duration-150 flex flex-col items-center justify-center gap-1"
                  >
                    <img
                      src={`/assets/hmo-logos/${hmo.id}.png`}
                      alt=""
                      width={28}
                      height={28}
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                    <span>{hmo.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════
            STEP 3 — Symptom selection
        ════════════════════════════ */}
        {step === 3 && (
          <div>
            <h2 className="text-2xl font-bold text-[var(--color-text)] mb-2">
              {SYMPTOM_STEP.question}
            </h2>
            <p className="text-[var(--color-muted)] mb-6">
              Select the option that best matches your concern.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SYMPTOM_STEP.options.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => handleSymptomSelect(opt.id)}
                  className={`${baseCard} min-h-[72px] px-5 py-4 flex-col items-start`}
                >
                  <span className="font-semibold text-sm text-[var(--color-text)] leading-snug">
                    {opt.label}
                  </span>
                  <span className="text-xs text-[var(--color-muted)] mt-1 leading-snug text-left">
                    {opt.subtext}
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
