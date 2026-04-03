# Data Directory

This directory holds CSV files for bulk clinician import.
Files in this directory are gitignored (except this README
and the sample file).

## CSV format
See `clinicians_sample.csv` for column reference.

One row per clinician. F2F and teleconsult schedules are
separate column sets on the same row. Leave all columns
for a consultation type blank if the clinician does not
offer that type. The seed script will only create schedule
rows for consultation types that have at least one
non-blank time column.

Columns:

| Column | Required | Notes |
|---|---|---|
| title | yes | e.g. "Dr." |
| first_name | yes | |
| last_name | yes | |
| middle_name | no | Leave blank if none |
| suffix | no | e.g. "MD" |
| specialty | yes | e.g. "Rheumatology" |
| department | yes | e.g. "Internal Medicine" |
| room_number | yes | e.g. "Hall A Rm 230" |
| local_number | no | Internal extension |
| login_email | yes | Used as login credential |
| hmo_1 … hmo_10 | no | HMO accreditation names; leave blank if none |
| f2f_mon_am_start … f2f_fri_pm_end | no | F2F schedule; HH:MM or blank |
| tele_mon_am_start … tele_fri_pm_end | no | Teleconsult schedule; HH:MM or blank |

`contact_phone` and `contact_email` are NOT in the CSV — the seed script
auto-generates them:
- `contact_phone` defaults to `09000000000`
- `contact_email` is derived from `login_email` by replacing `@` with `.clinic@`

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
- `name_map.csv` (real name → anonymized name mapping) must never be committed
  to the repository
