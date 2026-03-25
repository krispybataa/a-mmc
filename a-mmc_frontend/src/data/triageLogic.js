/*
 * ⚠️  PLACEHOLDER — PENDING DOMAIN EXPERT REVIEW
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
  {
    id: 'symptoms',
    question: 'What best describes your concern?',
    options: [
      { id: 'joints',    label: 'Joint or muscle pain',      icon: '🦴' },
      { id: 'heart',     label: 'Chest or heart concerns',   icon: '❤️' },
      { id: 'child',     label: 'Child health concern',      icon: '👶' },
      { id: 'general',   label: 'General health or illness', icon: '🩺' },
      { id: 'breathing', label: 'Breathing or lung issues',  icon: '🫁' },
      { id: 'unsure',    label: 'I am not sure',             icon: '❓' },
    ],
  },
]

// Specialty strings must exactly match the specialty values in mockClinicians.js.
// null = no specialty filter — show all clinicians.
export const SYMPTOM_SPECIALTY_MAP = {
  joints:    'Rheumatology',
  heart:     'Interventional Cardiology',
  child:     'General Pediatrics',
  general:   null,
  breathing: null,
  unsure:    null,
}
