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
| first_name | yes | |
| last_name | yes | |
| middle_name | no | Leave blank if none |
| suffix | no | e.g. "MD" |
| specialty | yes | e.g. "Rheumatology" |
| department | yes | e.g. "Internal Medicine" |
| room_number | yes | e.g. "Hall A 230" |
| local_number | no | Auto-derived from room_number digits if blank |
| login_email | yes | Used as login credential; staff use @ammc.com |
| hmo_1 … hmo_10 | no | HMO accreditation names; leave blank if none |
| f2f_mon_am_start … f2f_sat_pm_end | no | F2F schedule; HH:MM or blank |
| tele_mon_am_start … tele_sat_pm_end | no | Teleconsult schedule; HH:MM or blank |
| password | yes | Login password in plaintext; hashed on import |

`contact_phone` and `contact_email` are NOT in the CSV — the seed script
auto-generates them:
- `contact_phone` defaults to `09000000000`
- `contact_email` is derived from `login_email` by replacing `@` with `.clinic@`

`local_number` is auto-derived from the trailing digits of `room_number`
if left blank (e.g. "Hall A 230" → "230").

## Usage (Railway shell)

```
python seed.py data/clinicians_full.csv
```

## Generating synthetic data

```
python data/generate_clinicians.py \
  data/clinicians_anon.csv \
  data/clinicians_synthetic.csv \
  --count 52
```

The script reads `clinicians_anon.csv` to learn realistic schedule time
patterns, then generates the requested number of synthetic rows with
Filipino names, spread across 21 specialties (minimum 2 per specialty).

## Combining for full seed

Copy `clinicians_anon.csv` to `clinicians_full.csv`.
Then append all data rows (not the header) from
`clinicians_synthetic.csv` to `clinicians_full.csv`.
Then run:

```
python seed.py data/clinicians_full.csv
```

## Notes

- `credentials_manifest.txt` is written to the same directory as the CSV —
  keep this file offline, never commit it
- The seed script is idempotent — safe to run multiple times; existing rows are skipped
- Only Rheumatology clinicians appear in the credentials manifest
- `name_map.csv` (real name → anonymized name mapping) must never be committed
  to the repository
- Email domain for synthetic staff: `@ammc.com` (format: `synth{n}@ammc.com`)
