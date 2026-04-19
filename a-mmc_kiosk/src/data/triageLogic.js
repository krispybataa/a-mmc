// [WARNING] SYNC REQUIRED
// This file is maintained in two locations:
//   a-mmc_frontend/src/data/triageLogic.js  (source of truth)
//   a-mmc_kiosk/src/data/triageLogic.js     (mirror)
// Any changes made to either file MUST be manually applied
// to the other. Do not allow these files to diverge.

/*
 * ⚠️  CLINICAL ROUTING — DOMAIN EXPERT REVIEW REQUIRED
 *
 * The weight values in this file represent clinical referral
 * logic. Initial values are derived from Friedman's Problem
 * Oriented Medical Diagnosis (POMD) as recommended by the
 * domain expert, and have been reviewed by the domain expert
 * prior to deployment.
 * Routing outcomes are clinical decisions, not technical ones.
 * Tables marked with "DOMAIN EXPERT: review these values"
 * require ongoing review as the clinician roster evolves.
 * Do not modify weight values without domain expert sign-off.
 */

export const TRIAGE_STEPS = [
  // ── Step 1: HMO selection ───────────────────────────────────────────────────
  {
    id: 'hmo',
    question: 'Do you have an HMO card?',
    options: [
      { id: 'no_hmo',        label: 'I do not have HMO',                              emphasized: true },
      { id: 'amaphil',       label: 'AMAPhil, Inc.' },
      { id: 'asalus',        label: 'Asalus (formerly Intellicare)' },
      { id: 'avega',         label: 'Avega Managed Care' },
      { id: 'benlife',       label: 'BenLife Insurance Co. Inc.' },
      { id: 'carehealth',    label: 'Carehealth Plus' },
      { id: 'carewell',      label: 'Carewell Health Systems, Inc.' },
      { id: 'caritas',       label: 'Caritas Health Shield' },
      { id: 'cocolife',      label: 'Cocolife Healthcare' },
      { id: 'cooperative',   label: 'Cooperative Health Management Federation' },
      { id: 'dynamic',       label: 'Dynamic Care Corporation' },
      { id: 'eastwest',      label: 'EastWest Healthcare' },
      { id: 'etiqa',         label: 'eTIQA (formerly AsianLife)' },
      { id: 'flexicare',     label: 'Flexicare' },
      { id: 'fortune',       label: 'Fortune Life Insurance Co., Inc.' },
      { id: 'getwell',       label: 'GetWell Health Systems Inc.' },
      { id: 'hmi',           label: 'Health Maintenance Inc. (HMI)' },
      { id: 'hppi',          label: 'Health Plan Philippines Inc. (HPPI)' },
      { id: 'icare',         label: 'Insular Health Care (I-Care)' },
      { id: 'kaiser',        label: 'Kaiser International Healthcare Group' },
      { id: 'lifehealth',    label: 'Life & Health HMP, Inc.' },
      { id: 'maxicare',      label: 'Maxicare' },
      { id: 'medicard',      label: 'Medicard' },
      { id: 'medicare_plus', label: 'Medicare Plus, Inc.' },
      { id: 'medocare',      label: 'Medocare' },
      { id: 'optimum',       label: 'Optimum Medical & Healthcare Services, Inc.' },
      { id: 'pacific_cross', label: 'Pacific Cross Health Care' },
      { id: 'philcare',      label: 'Philcare' },
      { id: 'valuecare',     label: 'Value Care Health Systems, Inc.' },
      { id: 'wellcare',      label: 'Wellcare' },
    ],
  },

  // ── Step 4: Symptom selection ───────────────────────────────────────────────
  {
    id: 'symptoms',
    question: 'What best describes your concern?',
    options: [
      {
        id: 'heart',
        label: 'Heart & Chest',
        subtext: 'Chest pain, palpitations, or shortness of breath',
      },
      {
        id: 'joints',
        label: 'Bones, Joints & Muscles',
        subtext: 'Joint pain, swelling, back pain, or stiffness',
      },
      {
        id: 'stomach',
        label: 'Stomach & Digestion',
        subtext: 'Stomach pain, acid reflux, nausea, or bowel issues',
      },
      {
        id: 'womens',
        label: "Women's Health",
        subtext: 'Menstrual issues, pregnancy concerns, or pelvic pain',
      },
      {
        id: 'skin',
        label: 'Skin, Hair & Nails',
        subtext: 'Rashes, itching, hair loss, or skin changes',
      },
      {
        id: 'eyes',
        label: 'Eyes',
        subtext: 'Blurry vision, eye pain, or irritation',
      },
      {
        id: 'ent',
        label: 'Ears, Nose & Throat',
        subtext: 'Hearing issues, sore throat, or nasal problems',
      },
      {
        id: 'mental',
        label: 'Mental Health & Emotions',
        subtext: 'Anxiety, depression, stress, or mood changes',
      },
      {
        id: 'child',
        label: "Children's Health",
        subtext: 'Health concerns for children and infants',
      },
      {
        id: 'hormones',
        label: 'Hormones & Metabolism',
        subtext: 'Diabetes, thyroid issues, or weight concerns',
      },
      {
        id: 'kidneys',
        label: 'Kidneys & Urinary',
        subtext: 'Difficulty urinating, kidney pain, or UTI',
      },
      {
        id: 'brain',
        label: 'Brain & Nerves',
        subtext: 'Headaches, dizziness, numbness, or seizures',
      },
      {
        id: 'others',
        label: 'Others',
        subtext: "My concern isn't listed above",
      },
    ],
  },
]

// ── Body diagram alias block ───────────────────────────────────────────────────
// Body diagram zone keys → specialty strings, passed directly by
// BodyDiagram / KioskBodyDiagram as specialty strings (not scored).
//   cardiology    → 'Cardiology'
//   gastro        → 'Gastroenterology'
//   neurology     → 'Neurology'
//   orthopedic    → 'Orthopedic Surgery'
//   obgyn         → 'Obstetrics & Gynecology'
//   pulmonary     → 'Pulmonary Medicine'
//   dental        → 'Dental Medicine'
//   dermatology   → 'Dermatology'
//   allergy       → 'Allergology & Immunology'
//   pediatrics    → 'Pediatrics'
//   endocrinology → 'Endocrinology'
//   ophthalmology → 'Ophthalmology'

// ── Weighted scoring tables ───────────────────────────────────────────────────
//
// Specialty strings must exactly match the specialty values in the live DB.
// Scores are additive integers. Base: 0–60. Age/sex modifiers: 0–40.
// The specialty with the highest total score becomes the primary referral.

// DOMAIN EXPERT: review these values
export const SYMPTOM_BASE_WEIGHTS = {
  heart:    { 'Cardiology': 55, 'Gastroenterology': 20 },
  joints:   { 'Rheumatology': 50, 'Orthopedic Surgery': 30 },
  stomach:  { 'Gastroenterology': 60 },
  womens:   { 'Obstetrics & Gynecology': 60 },
  skin:     { 'Dermatology': 60 },
  eyes:     { 'Ophthalmology': 60 },
  ent:      { 'Otorhinolaryngology': 60 },
  mental:   { 'Psychiatry': 60 },
  child:    { 'Pediatrics': 60 },
  hormones: { 'Endocrinology': 60 },
  kidneys:  { 'Nephrology': 60 },
  brain:    { 'Neurology': 55, 'Psychiatry': 10 },
}

// DOMAIN EXPERT: review these values
// Age-band modifiers (POMD-informed):
//   heart + u18/18_35 — angina uncommon in younger patients (POMD Ch.3);
//     Gastroenterology competes more strongly
//   heart + 36_55/56p — strong Cardiology
//   joints + 18_35    — SLE/CTD dominant → strong Rheumatology (POMD Ch.8)
//   joints + 56p      — OA dominant → Orthopedic Surgery competes (POMD Ch.8)
//   brain + 18_35     — migraine peak → strong Neurology (POMD Ch.10)
export const AGE_BAND_WEIGHTS = {
  u18: {
    heart:  { 'Cardiology': 0,  'Gastroenterology': 30 },
    joints: { 'Rheumatology': 10, 'Orthopedic Surgery': 5 },
    brain:  { 'Neurology': 10 },
  },
  '18_35': {
    heart:  { 'Cardiology': 5,  'Gastroenterology': 20 },
    joints: { 'Rheumatology': 35, 'Orthopedic Surgery': 5 },
    brain:  { 'Neurology': 30 },
  },
  '36_55': {
    heart:  { 'Cardiology': 30, 'Gastroenterology': 0 },
    joints: { 'Rheumatology': 20, 'Orthopedic Surgery': 15 },
    brain:  { 'Neurology': 15 },
  },
  '56p': {
    heart:  { 'Cardiology': 40, 'Gastroenterology': 0 },
    joints: { 'Rheumatology': 5,  'Orthopedic Surgery': 35 },
    brain:  { 'Neurology': 10 },
  },
}

// DOMAIN EXPERT: review these values
// Sex modifiers (POMD-informed):
//   heart + female   — premenopausal angina uncommon; GI competes more (POMD Ch.3)
//   heart + male     — Cardiology favoured
//   joints + female  — SLE/CTD more prevalent in women → strong Rheumatology (POMD Ch.8)
//   brain + female   — migraine higher prevalence in young adult women (POMD Ch.10)
//   brain + male     — cluster headache almost exclusively male (POMD Ch.10)
//   hormones + female — thyroid nodules more frequent in women (POMD Ch.9)
//   womens + male    — handled in computeTriageScores (early return [])
export const SEX_WEIGHTS = {
  male: {
    heart: { 'Cardiology': 10 },
    brain: { 'Neurology': 15 },
  },
  female: {
    heart:    { 'Gastroenterology': 15 },
    joints:   { 'Rheumatology': 25 },
    brain:    { 'Neurology': 20 },
    hormones: { 'Endocrinology': 20 },
  },
  none: {},
}

/**
 * Computes ranked specialty referrals from three additive factors.
 * Pure function — no React, no imports, no side effects.
 *
 * @param {{ ageBandId: string, sexId: string, symptomId: string }}
 * @returns {{ specialty: string, score: number }[]} sorted descending by score
 */
export function computeTriageScores({ ageBandId, sexId, symptomId }) {
  if (symptomId === 'others') return []
  if (symptomId === 'womens' && sexId === 'male') return []

  const base = SYMPTOM_BASE_WEIGHTS[symptomId]
  if (!base) return []

  const scored = Object.keys(base).map(specialty => ({
    specialty,
    score:
      (SYMPTOM_BASE_WEIGHTS[symptomId]?.[specialty]          ?? 0) +
      (AGE_BAND_WEIGHTS[ageBandId]?.[symptomId]?.[specialty] ?? 0) +
      (SEX_WEIGHTS[sexId]?.[symptomId]?.[specialty]          ?? 0),
  })).filter(e => e.score > 0)

  return scored.sort((a, b) => b.score - a.score)
}

// Backward compat alias — kiosk imports this by name.
// Shape changed from { symptomId: string } to { symptomId: object };
// kiosk components do not read values from this map at runtime.
export const SYMPTOM_SPECIALTY_MAP = SYMPTOM_BASE_WEIGHTS

// Maps HMO option IDs to the exact hmo_name strings stored in the DB.
// null = no HMO filter (patient has no HMO).
export const HMO_LABEL_MAP = {
  no_hmo:        null,
  amaphil:       'AMAPhil, Inc.',
  asalus:        'Asalus (formerly Intellicare)',
  avega:         'Avega Managed Care',
  benlife:       'BenLife Insurance Co. Inc.',
  carehealth:    'Carehealth Plus',
  carewell:      'Carewell Health Systems, Inc.',
  caritas:       'Caritas Health Shield',
  cocolife:      'Cocolife Healthcare',
  cooperative:   'Cooperative Health Management Federation',
  dynamic:       'Dynamic Care Corporation',
  eastwest:      'EastWest Healthcare',
  etiqa:         'eTIQA (formerly AsianLife)',
  flexicare:     'Flexicare',
  fortune:       'Fortune Life Insurance Co., Inc.',
  getwell:       'GetWell Health Systems Inc.',
  hmi:           'Health Maintenance Inc. (HMI)',
  hppi:          'Health Plan Philippines Inc. (HPPI)',
  icare:         'Insular Health Care (I-Care)',
  kaiser:        'Kaiser International Healthcare Group',
  lifehealth:    'Life & Health HMP, Inc.',
  maxicare:      'Maxicare',
  medicard:      'Medicard',
  medicare_plus: 'Medicare Plus, Inc.',
  medocare:      'Medocare',
  optimum:       'Optimum Medical & Healthcare Services, Inc.',
  pacific_cross: 'Pacific Cross Health Care',
  philcare:      'Philcare',
  valuecare:     'Value Care Health Systems, Inc.',
  wellcare:      'Wellcare',
}
