# Data Directory

This directory holds CSV files for bulk clinician import.
Files in this directory are gitignored (except this README
and the sample file).

## CSV format
See `clinicians_sample.csv` for column reference.

Columns:

| Column | Required | Notes |
|---|---|---|
| display_name | yes | Decoy full name for display |
| title | yes | e.g. "Dr." |
| first_name | yes | Anonymized |
| last_name | yes | Anonymized |
| middle_name | no | Leave blank if none |
| suffix | no | e.g. "MD" |
| specialty | yes | e.g. "Rheumatology" |
| department | yes | e.g. "Internal Medicine" |
| room_number | yes | e.g. "Hall A Rm 230" |
| local_number | no | Internal extension |
| contact_phone | yes | e.g. "09171234567" |
| contact_email | yes | |
| login_email | yes | Used as login credential |
| hmo_1 / hmo_2 / hmo_3 | no | HMO accreditations |
| mon_am_start … fri_pm_end | no | HH:MM or blank; one column per day/period |
| consultation_type | yes | "f2f" or "teleconsult" — applies to all schedules for this clinician |

Passwords are NOT in the CSV — the script auto-generates a 12-character
alphanumeric password per clinician.

## Usage (Railway shell)

```
python seed.py data/clinicians.csv
```

## Notes

- Passwords are auto-generated per clinician
- `credentials_manifest.txt` is written to the same directory as the CSV —
  keep this file offline, never commit it
- The script is idempotent — safe to run multiple times; existing rows are skipped
- Only Rheumatology clinicians appear in the credentials manifest
- `name_map.csv` (real name → decoy name mapping) must never be committed
  to the repository
