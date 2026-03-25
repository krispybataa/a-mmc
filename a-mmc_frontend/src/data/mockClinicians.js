export const mockClinicians = [
  {
    clinician_id: 1,
    title: "Dr.",
    first_name: "Maria",
    middle_name: "Santos",
    last_name: "Reyes",
    suffix: null,
    department: "Rheumatology",
    specialty: "Rheumatology",
    room_number: "Hall A Rm 230",
    profile_picture: null,
    gender: 'F',
    contact_email: "mreyes@mmc.com.ph",
    schedule: [
      { day_of_week: "Monday", am_start: "08:00", am_end: "12:00", pm_start: null, pm_end: null },
      { day_of_week: "Wednesday", am_start: "08:00", am_end: "12:00", pm_start: "13:00", pm_end: "17:00" },
      { day_of_week: "Friday", am_start: null, am_end: null, pm_start: "13:00", pm_end: "17:00" },
    ],
    hmos: ["Maxicare", "Medicard", "PhilCare"],
    info: [
      {
        label: "Background",
        content:
          "Dr. Reyes is a board-certified rheumatologist with over 15 years of clinical experience. She completed her fellowship in Rheumatology at the University of the Philippines – Philippine General Hospital and has been a senior consultant at MMC since 2012.",
      },
      {
        label: "Clinical Interests",
        content:
          "Her primary clinical interests include systemic lupus erythematosus, rheumatoid arthritis, and other autoimmune connective tissue diseases. She is an active member of the Philippine Rheumatology Association.",
      },
    ],
  },
  {
    clinician_id: 2,
    title: "Dr.",
    first_name: "Jose",
    middle_name: "Antonio",
    last_name: "Cruz",
    suffix: "Jr.",
    department: "Cardiology",
    specialty: "Interventional Cardiology",
    room_number: "Cardiac Center Rm 110",
    profile_picture: null,
    gender: 'M',
    contact_email: "jacruz@mmc.com.ph",
    schedule: [
      { day_of_week: "Tuesday", am_start: "07:00", am_end: "11:00", pm_start: "13:00", pm_end: "16:00" },
      { day_of_week: "Thursday", am_start: "07:00", am_end: "11:00", pm_start: null, pm_end: null },
      { day_of_week: "Saturday", am_start: "08:00", am_end: "12:00", pm_start: null, pm_end: null },
    ],
    hmos: ["Maxicare", "Medicard", "MedLife", "Intellicare"],
    info: [
      {
        label: "Background",
        content:
          "Dr. Cruz is an interventional cardiologist with subspecialty training in percutaneous coronary intervention (PCI). He completed his cardiology fellowship at the Philippine Heart Center and his interventional fellowship at St. Luke's Medical Center Global City.",
      },
      {
        label: "Awards & Recognition",
        content:
          "Recipient of the MMC Excellence in Patient Care Award (2021). He has published research on outcomes of primary PCI in the Philippine Journal of Cardiology.",
      },
    ],
  },
  {
    clinician_id: 3,
    title: "Dr.",
    first_name: "Ana",
    middle_name: "Liza",
    last_name: "Dela Cruz",
    suffix: null,
    department: "Pediatrics",
    specialty: "General Pediatrics",
    room_number: "Peds Wing Rm 315",
    profile_picture: null,
    gender: 'F',
    contact_email: "aldelacruz@mmc.com.ph",
    schedule: [
      { day_of_week: "Monday", am_start: "08:00", am_end: "12:00", pm_start: "14:00", pm_end: "18:00" },
      { day_of_week: "Tuesday", am_start: "08:00", am_end: "12:00", pm_start: null, pm_end: null },
      { day_of_week: "Thursday", am_start: null, am_end: null, pm_start: "14:00", pm_end: "18:00" },
      { day_of_week: "Friday", am_start: "08:00", am_end: "12:00", pm_start: "14:00", pm_end: "18:00" },
    ],
    hmos: ["Maxicare", "Medicard"],
    info: [
      {
        label: "Background",
        content:
          "Dr. Dela Cruz is a general pediatrician with over a decade of experience caring for newborns, infants, children, and adolescents. She graduated from the University of Santo Tomas Faculty of Medicine and Surgery and completed her pediatric residency at MMC, where she has remained on staff ever since.",
      },
    ],
  },
]
