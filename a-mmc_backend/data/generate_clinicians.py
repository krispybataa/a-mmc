"""
generate_clinicians.py
----------------------
Generate synthetic clinician rows in the same CSV format as clinicians_anon.csv.

Reads the real anonymised data to learn schedule time patterns and uses those
to produce realistic-looking synthetic schedules. Does NOT require Flask or
any application context — stdlib only.

Usage:
  python data/generate_clinicians.py \\
    data/clinicians_anon.csv \\
    data/clinicians_synthetic.csv \\
    --count 52
"""

import argparse
import collections
import csv
import os
import random

# ---------------------------------------------------------------------------
# Name pools
# ---------------------------------------------------------------------------

FIRST_NAMES = [
    'Jose', 'Maria', 'Juan', 'Ana', 'Carlo', 'Luz', 'Ramon',
    'Elena', 'Miguel', 'Rosa', 'Eduardo', 'Carla', 'Antonio',
    'Isabel', 'Ricardo', 'Cecilia', 'Fernando', 'Gloria',
    'Roberto', 'Teresita', 'Manuel', 'Corazon', 'Ernesto',
    'Maricel', 'Rodolfo', 'Lourdes', 'Alfredo', 'Remedios',
    'Domingo', 'Estrella', 'Bernardo', 'Felicitas', 'Arturo',
    'Resurreccion', 'Gregorio', 'Paz', 'Leonidas', 'Concepcion',
    'Filomeno', 'Adoracion', 'Victorino', 'Herminia', 'Eugenio',
    'Soledad', 'Amador', 'Milagros', 'Florencio', 'Rosario',
    'Celestino', 'Natividad', 'Renato', 'Aida', 'Wilfredo',
    'Danilo', 'Rowena', 'Ronaldo', 'Evelyn', 'Cristina',
]

LAST_NAMES = [
    'Santos', 'Reyes', 'Cruz', 'Bautista', 'Ocampo', 'Garcia',
    'Torres', 'Castillo', 'Ramos', 'Aquino', 'Villanueva',
    'Dela Cruz', 'Mendoza', 'Tolentino', 'Valdez', 'Soriano',
    'Gonzales', 'Flores', 'Rivera', 'Guerrero', 'Domingo',
    'Pascual', 'Santiago', 'Salazar', 'Mercado', 'Aguilar',
    'Medina', 'Jimenez', 'Dela Torre', 'Espiritu', 'Macaraeg',
    'Buenaventura', 'Evangelista', 'Bernardo', 'Padilla',
    'Manalo', 'Delos Reyes', 'Marquez', 'Lim', 'Tan', 'Co',
    'Uy', 'Sy', 'Concepcion', 'Enriquez', 'Velasquez',
    'Romero', 'Navarro', 'Perez', 'Dela Vega',
]

MIDDLE_NAMES = [
    'Santos', 'Reyes', 'Cruz', 'Garcia', 'Torres', 'Ramos',
    'Rivera', 'Flores', 'Gonzales', 'Mendoza', 'Valdez',
    'Castillo', 'Aquino', 'Bautista', 'Ocampo', 'Soriano',
    '', '', '', '',  # ~25% chance of no middle name
]

# ---------------------------------------------------------------------------
# Specialty → (hall, floor)
# ---------------------------------------------------------------------------

SPECIALTY_ROOMS = {
    'Allergology & Immunology': ('Hall A', 3),
    'Anesthesiology':           ('Hall B', 4),
    'Cardiology':               ('Hall A', 2),
    'Dental Medicine':          ('Hall C', 1),
    'Dermatology':              ('Hall B', 3),
    'Emergency Medicine':       ('Hall A', 1),
    'Endocrinology':            ('Hall C', 3),
    'Gastroenterology':         ('Hall A', 4),
    'Hematology':               ('Hall B', 5),
    'Infectious Diseases':      ('Hall C', 4),
    'Medicine':                 ('Hall A', 2),
    'Nephrology':               ('Hall B', 2),
    'Obstetrics & Gynecology':  ('Hall C', 2),
    'Oncology':                 ('Hall A', 5),
    'Ophthalmology':            ('Hall B', 3),
    'Orthopedic Surgery':       ('Hall C', 5),
    'Otorhinolaryngology':      ('Hall A', 3),
    'Pediatrics':               ('Hall B', 4),
    'Pulmonary Medicine':       ('Hall C', 3),
    'Radiology':                ('Hall A', 2),
    'Surgery':                  ('Hall B', 6),
    'Neurology':                ('Hall B', 3),
}

# ---------------------------------------------------------------------------
# HMO pool
# ---------------------------------------------------------------------------

HMO_POOL = [
    'AMAPhil, Inc.',
    'Asalus (formerly Intellicare)',
    'Avega Managed Care',
    'BenLife Insurance Co. Inc.',
    'Carehealth Plus',
    'Carewell Health Systems, Inc.',
    'Caritas Health Shield',
    'Cocolife Healthcare',
    'Cooperative Health Management Federation',
    'Dynamic Care Corporation',
    'EastWest Healthcare',
    'eTIQA (formerly AsianLife)',
    'Flexicare',
    'Fortune Life Insurance Co., Inc.',
    'GetWell Health Systems Inc.',
    'Health Maintenance Inc. (HMI)',
    'Health Plan Philippines Inc. (HPPI)',
    'Insular Health Care (I-Care)',
    'Kaiser International Healthcare Group',
    'Life & Health HMP, Inc.',
    'Maxicare',
    'Medicard',
    'Medicare Plus, Inc.',
    'Medocare',
    'Optimum Medical & Healthcare Services, Inc.',
    'Pacific Cross Health Care',
    'Philcare',
    'Value Care Health Systems, Inc.',
    'Wellcare',
]

ALL_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']

_DEFAULT_AM_STARTS = ['09:00', '09:30', '10:00']
_DEFAULT_AM_ENDS   = ['11:00', '12:00']
_DEFAULT_PM_STARTS = ['13:00', '14:00', '15:00']
_DEFAULT_PM_ENDS   = ['16:00', '17:00', '18:00']


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _normalize_time(raw, is_pm_col=False):
    """
    Normalize a raw time string (e.g. '9:00', '1:00', '13:00') to HH:MM.
    For PM columns where the hour < 8, add 12 to convert 12-hr → 24-hr.
    Returns None on invalid input.
    """
    raw = raw.strip()
    if not raw:
        return None
    parts = raw.split(':')
    if len(parts) != 2:
        return None
    try:
        h, m = int(parts[0]), int(parts[1])
    except ValueError:
        return None
    if is_pm_col and h < 8:
        h += 12
    return f'{h:02d}:{m:02d}'


def _learn_time_pools(input_path, header):
    """
    Scan all rows in input_path and collect observed AM/PM start/end times.
    Falls back to built-in defaults when fewer than 3 values are found.
    """
    am_starts, am_ends, pm_starts, pm_ends = [], [], [], []

    am_start_cols = [c for c in header if c.endswith('_am_start')]
    am_end_cols   = [c for c in header if c.endswith('_am_end')]
    pm_start_cols = [c for c in header if c.endswith('_pm_start')]
    pm_end_cols   = [c for c in header if c.endswith('_pm_end')]

    with open(input_path, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            for col in am_start_cols:
                t = _normalize_time(row.get(col, ''), is_pm_col=False)
                if t:
                    am_starts.append(t)
            for col in am_end_cols:
                t = _normalize_time(row.get(col, ''), is_pm_col=False)
                if t:
                    am_ends.append(t)
            for col in pm_start_cols:
                t = _normalize_time(row.get(col, ''), is_pm_col=True)
                if t:
                    pm_starts.append(t)
            for col in pm_end_cols:
                t = _normalize_time(row.get(col, ''), is_pm_col=True)
                if t:
                    pm_ends.append(t)

    if len(am_starts) < 3:
        am_starts = _DEFAULT_AM_STARTS
    if len(am_ends) < 3:
        am_ends = _DEFAULT_AM_ENDS
    if len(pm_starts) < 3:
        pm_starts = _DEFAULT_PM_STARTS
    if len(pm_ends) < 3:
        pm_ends = _DEFAULT_PM_ENDS

    return am_starts, am_ends, pm_starts, pm_ends


def _pick_hmo_count():
    """Weighted random HMO count: 0=5%, 1-2=10%, 3-5=30%, 6-8=35%, 9-12=20%."""
    population = list(range(13))
    # Distribute bucket percentages evenly across values in each bucket
    weights = [
        5,                              # 0       → 5%
        5,    5,                        # 1-2     → 10%
        10,   10,   10,                 # 3-5     → 30%
        11.7, 11.7, 11.6,              # 6-8     → 35%
        5,    5,    5,    5,           # 9-12    → 20%
    ]
    return random.choices(population, weights=weights, k=1)[0]


def _pick_day_count():
    """Weighted day count: 1=10%, 2=35%, 3=35%, 4=20%."""
    return random.choices([1, 2, 3, 4], weights=[10, 35, 35, 20], k=1)[0]


def _make_schedule_cols(days, am_starts, am_ends, pm_starts, pm_ends, prefix):
    """
    Build schedule column dict for the given days under `prefix` ('f2f_' or 'tele_').
    Each day gets AM only, PM only, or both — chosen randomly.
    """
    cols = {}
    for day in days:
        has_am = random.random() < 0.70
        has_pm = random.random() < 0.60
        if not has_am and not has_pm:
            has_am = True  # guarantee at least one session per active day
        if has_am:
            cols[f'{prefix}{day}_am_start'] = random.choice(am_starts)
            cols[f'{prefix}{day}_am_end']   = random.choice(am_ends)
        if has_pm:
            cols[f'{prefix}{day}_pm_start'] = random.choice(pm_starts)
            cols[f'{prefix}{day}_pm_end']   = random.choice(pm_ends)
    return cols


def _distribute_specialties(count):
    """
    Assign specialties to `count` doctors.
    Each of the 21 specialties gets at least 2; extras (count - 42) are distributed
    one-per-specialty at random until all count slots are filled.
    Result is shuffled before returning.
    """
    specialties = list(SPECIALTY_ROOMS.keys())
    n = len(specialties)

    allocation = {s: 2 for s in specialties}
    extras = count - (n * 2)   # e.g. 52 - 44 = 8
    if extras > 0:
        for spec in random.sample(specialties, min(extras, n)):
            allocation[spec] += 1

    result = []
    for spec, cnt in allocation.items():
        result.extend([spec] * cnt)

    # If count > n*3, pad with random picks (shouldn't happen at count=52)
    while len(result) < count:
        result.append(random.choice(specialties))

    random.shuffle(result)
    return result[:count]


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description='Generate synthetic clinician rows in clinicians_anon.csv format.'
    )
    parser.add_argument('input',  help='Path to clinicians_anon.csv (header source + pattern learning)')
    parser.add_argument('output', help='Path to write clinicians_synthetic.csv')
    parser.add_argument('--count', type=int, default=52, help='Number of rows to generate (default: 52)')
    args = parser.parse_args()

    if not os.path.isfile(args.input):
        print(f'ERROR: input file not found: {args.input}')
        raise SystemExit(1)

    # ── Read header from input CSV ─────────────────────────────────────────
    with open(args.input, newline='', encoding='utf-8') as f:
        header = next(csv.reader(f))

    print(f'Input header: {len(header)} columns')

    # ── Learn schedule time pools from real data ───────────────────────────
    am_starts, am_ends, pm_starts, pm_ends = _learn_time_pools(args.input, header)

    # ── Identify HMO column names in order ────────────────────────────────
    hmo_cols = [c for c in header if c.startswith('hmo_')]

    # ── Distribute specialties ─────────────────────────────────────────────
    specialty_list   = _distribute_specialties(args.count)
    specialty_counts = collections.Counter(specialty_list)

    # ── Generate rows ──────────────────────────────────────────────────────
    rows = []
    tele_count = 0

    for i, specialty in enumerate(specialty_list):
        hall, floor    = SPECIALTY_ROOMS[specialty]
        room_suffix    = random.randint(1, 99)
        room_number    = f'{hall} {floor}{room_suffix:02d}'
        local_number   = f'{floor}{room_suffix:03d}'

        first_name  = random.choice(FIRST_NAMES)
        last_name   = random.choice(LAST_NAMES)
        middle_name = random.choice(MIDDLE_NAMES)

        login_email = f'synth{i + 1}@ammc.com'
        pw_prefix   = random.choice(['testpassword', 'stafflogin', 'clinicuser', 'testaccount'])
        password    = pw_prefix + str(random.randint(100, 999))

        hmo_count   = min(_pick_hmo_count(), len(hmo_cols), len(HMO_POOL))
        chosen_hmos = random.sample(HMO_POOL, hmo_count)

        # F2F schedule
        f2f_day_count = _pick_day_count()
        f2f_days      = random.sample(ALL_DAYS, min(f2f_day_count, len(ALL_DAYS)))
        f2f_cols      = _make_schedule_cols(f2f_days, am_starts, am_ends, pm_starts, pm_ends, 'f2f_')

        # Teleconsult schedule (~20% of doctors, on different days from F2F)
        tele_cols     = {}
        remaining     = [d for d in ALL_DAYS if d not in f2f_days]
        if remaining and random.random() < 0.20:
            tele_day_count = _pick_day_count()
            tele_days      = random.sample(remaining, min(tele_day_count, len(remaining)))
            tele_cols      = _make_schedule_cols(tele_days, am_starts, am_ends, pm_starts, pm_ends, 'tele_')
            tele_count    += 1

        # ── Build row — ALL header columns initialised to '' ──────────────
        row = {col: '' for col in header}
        row['first_name']   = first_name
        row['last_name']    = last_name
        row['middle_name']  = middle_name
        row['specialty']    = specialty
        row['department']   = specialty
        row['room_number']  = room_number
        row['local_number'] = local_number
        row['login_email']  = login_email
        row['password']     = password

        for j, hmo_name in enumerate(chosen_hmos):
            row[hmo_cols[j]] = hmo_name

        row.update(f2f_cols)
        row.update(tele_cols)

        rows.append(row)

    # ── Write output ───────────────────────────────────────────────────────
    out_dir = os.path.dirname(os.path.abspath(args.output))
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)

    with open(args.output, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=header)
        writer.writeheader()
        writer.writerows(rows)

    # ── Verify column counts ───────────────────────────────────────────────
    print('\n--- Column check ---')
    check_ok = True
    with open(args.output, newline='', encoding='utf-8') as f:
        reader      = csv.reader(f)
        out_header  = next(reader)
        expected    = len(out_header)
        for idx, data_row in enumerate(reader, 1):
            if len(data_row) != expected:
                print(f'  FAIL row {idx}: {len(data_row)} cols (expected {expected})')
                check_ok = False
    if check_ok:
        print('Column check: PASS')

    # ── Summary ────────────────────────────────────────────────────────────
    print(f'\nGenerated {len(rows)} synthetic clinicians')
    print('Specialty distribution:')
    for spec in sorted(specialty_counts):
        print(f'  {spec}: {specialty_counts[spec]}')
    print(f'~{tele_count} doctors have teleconsult schedules')
    print(f'Output: {args.output}')


if __name__ == '__main__':
    main()
