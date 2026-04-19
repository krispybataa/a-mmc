import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ListFilter, X } from 'lucide-react'
import { TRIAGE_STEPS, HMO_LABEL_MAP, computeTriageScores } from '../../data/triageLogic'
import BodyDiagram from '../../components/BodyDiagram'

const HMO_STEP     = TRIAGE_STEPS[0]   // { id: 'hmo', question, options }
const SYMPTOM_STEP = TRIAGE_STEPS[1]   // { id: 'symptoms', question, options }

const TOTAL_STEPS = 4

// ── Shared styles ─────────────────────────────────────────────────────────────

const baseCard = [
  'w-full bg-white rounded-xl border border-[var(--color-border)] shadow-sm',
  'flex items-center text-left',
  'hover:border-[var(--color-primary)] hover:shadow-md transition-all duration-150',
].join(' ')

const tapCard = [
  'bg-white border border-[var(--color-border)] rounded-xl',
  'min-h-[56px] px-4 py-3 text-sm text-center font-medium text-[var(--color-text)]',
  'hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-all duration-150',
].join(' ')

// Legacy flat map used in handleBodyDiagramSelect to find a matching symptom
// option by specialty string. In practice, body diagram zone keys (e.g.
// 'cardiology', 'gastro') never match SYMPTOM_STEP option IDs (e.g. 'heart',
// 'joints'), so the fallthrough to handleDirectSpecialty always fires.
const SYMPTOM_SPECIALTY_MAP_LEGACY = {
  heart:    'Cardiology',
  joints:   'Rheumatology',
  stomach:  'Gastroenterology',
  womens:   'Obstetrics & Gynecology',
  skin:     'Dermatology',
  eyes:     'Ophthalmology',
  ent:      'Otorhinolaryngology',
  mental:   'Psychiatry',
  child:    'Pediatrics',
  hormones: 'Endocrinology',
  kidneys:  'Nephrology',
  brain:    'Neurology',
  others:   null,
}

// ── Age band and sex options ──────────────────────────────────────────────────

const AGE_BANDS = [
  { id: 'u18',   label: 'Under 18' },
  { id: '18_35', label: '18 to 35' },
  { id: '36_55', label: '36 to 55' },
  { id: '56p',   label: '56 and above' },
]

const SEX_OPTIONS = [
  { id: 'male',   label: 'Male' },
  { id: 'female', label: 'Female' },
  { id: 'none',   label: 'Prefer not to say' },
]

// ── Main component ─────────────────────────────────────────────────────────────

export default function GuidedSearch() {
  const navigate = useNavigate()

  const [step,            setStep]           = useState(1)
  const [selectedHmo,     setSelectedHmo]    = useState(null)   // HMO label string or null
  const [selectedAgeBand, setSelectedAgeBand] = useState(null)  // age band id
  const [selectedSex,     setSelectedSex]    = useState('none') // sex id
  const [showFallback,    setShowFallback]   = useState(false)

  function handleHMOSelect(hmoId) {
    setSelectedHmo(hmoId === 'no_hmo' ? null : HMO_LABEL_MAP[hmoId])
    setStep(2)
  }

  function _buildParams(symptomId) {
    const scores = computeTriageScores({
      ageBandId: selectedAgeBand,
      sexId: selectedSex,
      symptomId,
    })
    const params = new URLSearchParams()
    if (selectedHmo) params.set('hmo', selectedHmo)
    if (scores.length > 0) params.set('specialty', scores[0].specialty)
    return params.toString()
  }

  function handleSymptomSelect(optionId) {
    navigate('/doctors?' + _buildParams(optionId))
  }

  function handleDirectSpecialty(specialty) {
    const params = new URLSearchParams()
    if (specialty) params.set('specialty', specialty)
    if (selectedHmo) params.set('hmo', selectedHmo)
    navigate('/doctors?' + params.toString())
  }

  function handleBodyDiagramSelect(specialty) {
    const matchingOption = SYMPTOM_STEP.options.find(
      o => SYMPTOM_SPECIALTY_MAP_LEGACY[o.id] === specialty
    )
    if (matchingOption) {
      handleSymptomSelect(matchingOption.id)
    } else {
      handleDirectSpecialty(specialty)
    }
  }

  function goBack() {
    if (step === 3) setSelectedSex('none')
    if (step === 2) setSelectedAgeBand(null)
    setStep(step - 1)
    setShowFallback(false)
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  // Split HMO options into the emphasized "no HMO" card and the rest
  const noHmoOption = HMO_STEP.options.find(o => o.emphasized)
  const hmoList     = HMO_STEP.options.filter(o => !o.emphasized)

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
            STEP 2 — Age group
        ════════════════════════════ */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold text-[var(--color-text)] mb-2">
              What is your age group?
            </h2>
            <p className="text-[var(--color-muted)] mb-6">
              This helps us suggest the right specialist.
            </p>

            <div className="grid grid-cols-2 gap-3">
              {AGE_BANDS.map(band => (
                <button
                  key={band.id}
                  onClick={() => { setSelectedAgeBand(band.id); setStep(3) }}
                  className={tapCard}
                >
                  {band.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ════════════════════════════
            STEP 3 — Biological sex
        ════════════════════════════ */}
        {step === 3 && (
          <div>
            <h2 className="text-2xl font-bold text-[var(--color-text)] mb-2">
              Which best describes you?
            </h2>
            <p className="text-[var(--color-muted)] mb-6">
              Helps us suggest the right specialist. Not saved or stored.
            </p>

            <div className="grid grid-cols-3 gap-3">
              {SEX_OPTIONS.map(sex => (
                <button
                  key={sex.id}
                  onClick={() => { setSelectedSex(sex.id); setStep(4) }}
                  className={tapCard}
                >
                  {sex.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ════════════════════════════
            STEP 4 — Body diagram
        ════════════════════════════ */}
        {step === 4 && (
          <div>
            <h2 className="text-2xl font-bold text-[var(--color-text)] mb-2">
              {SYMPTOM_STEP.question}
            </h2>
            <p className="text-[var(--color-muted)] mb-6">
              Tap the area of your body that concerns you.
            </p>

            <BodyDiagram
              onSelect={handleBodyDiagramSelect}
              excludeSpecialties={selectedSex === 'male' ? ['Obstetrics & Gynecology'] : []}
            />

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
                    {SYMPTOM_STEP.options.filter(opt =>
                      !(opt.id === 'womens' && selectedSex === 'male')
                    ).map(opt => (
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

