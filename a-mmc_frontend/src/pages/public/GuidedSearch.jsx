import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ListFilter, X } from 'lucide-react'
import { TRIAGE_STEPS, SYMPTOM_SPECIALTY_MAP, HMO_LABEL_MAP } from '../../data/triageLogic'
import BodyDiagram from '../../components/BodyDiagram'

const HMO_STEP     = TRIAGE_STEPS[0]   // { id: 'hmo', question, options }
const SYMPTOM_STEP = TRIAGE_STEPS[1]   // { id: 'symptoms', question, options }

const TOTAL_STEPS = 2

// ── Shared styles ─────────────────────────────────────────────────────────────

const baseCard = [
  'w-full bg-white rounded-xl border border-[var(--color-border)] shadow-sm',
  'flex items-center text-left',
  'hover:border-[var(--color-primary)] hover:shadow-md transition-all duration-150',
].join(' ')

// ── Main component ─────────────────────────────────────────────────────────────

export default function GuidedSearch() {
  const navigate = useNavigate()

  const [step,         setStep]         = useState(1)
  const [selectedHMO,  setSelectedHMO]  = useState(null)   // HMO option id e.g. 'maxicare'
  const [showFallback, setShowFallback] = useState(false)

  function handleHMOSelect(hmoId) {
    setSelectedHMO(hmoId)
    setStep(2)
  }

  function _buildParams(specialty) {
    const hmoLabel = selectedHMO && selectedHMO !== 'no_hmo'
      ? HMO_LABEL_MAP[selectedHMO]
      : null
    const params = new URLSearchParams()
    if (specialty) params.set('specialty', specialty)
    if (hmoLabel)  params.set('hmo', hmoLabel)
    return params
  }

  function handleSymptomSelect(optionId) {
    navigate('/doctors?' + _buildParams(SYMPTOM_SPECIALTY_MAP[optionId]).toString())
  }

  function handleDirectSpecialty(specialty) {
    navigate('/doctors?' + _buildParams(specialty).toString())
  }

  function handleBodyDiagramSelect(specialty) {
    const matchingOption = SYMPTOM_STEP.options.find(
      o => SYMPTOM_SPECIALTY_MAP[o.id] === specialty
    )
    if (matchingOption) {
      handleSymptomSelect(matchingOption.id)
    } else {
      handleDirectSpecialty(specialty)
    }
  }

  function goBack() {
    setStep(s => s - 1)
    setShowFallback(false)
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
            STEP 1 — HMO selection
        ════════════════════════════ */}
        {step === 1 && (
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
                      className="w-14 h-14 object-contain mx-auto mb-2"
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
            STEP 2 — Body diagram
        ════════════════════════════ */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold text-[var(--color-text)] mb-2">
              {SYMPTOM_STEP.question}
            </h2>
            <p className="text-[var(--color-muted)] mb-6">
              Tap the area of your body that concerns you.
            </p>

            <BodyDiagram onSelect={handleBodyDiagramSelect} />

            <button
              onClick={() => setShowFallback(true)}
              className="mt-6 w-full flex items-center justify-center gap-2 border-2 border-[var(--color-primary)] text-[var(--color-primary)] font-semibold rounded-xl py-3 px-6 hover:bg-[var(--color-primary)] hover:text-white transition-all duration-150"
            >
              <ListFilter className="w-5 h-5" />
              Browse Typical Symptoms
            </button>

            {/* Symptom drawer */}
            {showFallback && (
              <>
                {/* Overlay */}
                <div
                  aria-hidden="true"
                  className="fixed inset-0 bg-black/50 z-50"
                  onClick={() => setShowFallback(false)}
                />
                {/* Drawer panel */}
                <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[80vh] overflow-y-auto p-6 z-50">
                  <div className="flex items-center justify-between mb-4">
                    <p className="font-semibold text-base text-[var(--color-text)]">
                      Typical Symptoms
                    </p>
                    <button
                      onClick={() => setShowFallback(false)}
                      aria-label="Close"
                      className="text-slate-400 hover:text-slate-600 transition-colors p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {SYMPTOM_STEP.options.map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => { setShowFallback(false); handleSymptomSelect(opt.id) }}
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
              </>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
