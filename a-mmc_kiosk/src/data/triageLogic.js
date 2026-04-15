// [WARNING] SYNC REQUIRED
// This file is maintained in two locations:
//   a-mmc_frontend/src/data/triageLogic.js  (source of truth)
//   a-mmc_kiosk/src/data/triageLogic.js     (mirror)
// Any changes made to either file MUST be manually applied
// to the other. Do not allow these files to diverge.

/*
 * [WARNING]  PLACEHOLDER — PENDING DOMAIN EXPERT REVIEW
 *
 * This file contains the symptom-to-specialty mapping used by the unaware
 * patient triage flow. The symptom categories, their descriptions, and the
 * resulting specialty referrals below are placeholder values only.
 *
 * This file MUST be reviewed and validated by a licensed clinician before
 * any real patient-facing deployment. The routing logic (which symptoms map
 * to which specialties) is a clinical decision, not a technical one.
 *
 * To update: edit the TRIAGE_STEPS array and the SYMPTOM_SPECIALTY_MAP object.
 * Do not change the data structure — only the content of each entry.
 */

export const TRIAGE_STEPS = [
  // ── Step 2: HMO selection ───────────────────────────────────────────────────
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

  // ── Step 3: Symptom selection ───────────────────────────────────────────────
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

// Specialty strings must exactly match the specialty values in the live DB.
// null = no specialty filter — show full clinician directory.
export const SYMPTOM_SPECIALTY_MAP = {
  // ── Text symptom step options ────────────────────────────────────────────
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
  // ── Body diagram muscle / overlay aliases ────────────────────────────────
  cardiology:    'Cardiology',
  gastro:        'Gastroenterology',
  neurology:     'Neurology',
  orthopedic:    'Orthopedic Surgery',
  obgyn:         'Obstetrics & Gynecology',
  pulmonary:     'Pulmonary Medicine',
  dental:        'Dental Medicine',
  dermatology:   'Dermatology',
  allergy:       'Allergology & Immunology',
  pediatrics:    'Pediatrics',
  endocrinology: 'Endocrinology',
  ophthalmology: 'Ophthalmology',
}

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
