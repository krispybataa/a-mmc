"""
generate_clinicians.py
----------------------
Generate synthetic clinician rows in the same CSV format as clinicians_anon.csv.

Guarantees:
  - Every specialty (22) has at least 2 clinicians
  - Every HMO in HMO_POOL (29) appears on at least 2 clinicians
  - Default count is 64 (minimum safe floor: 22 specialties × 2 = 44,
    but HMO coverage pushes the practical floor higher; see _distribute below)

Usage:
  python data/generate_clinicians.py \\
    data/clinicians_anon.csv \\
    data/clinicians_synthetic.csv \\
    [--count N]
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

# Minimum required count: 22 specialties × 2 = 44, but HMO coverage
# needs at least 2 per HMO across the pool. With 29 HMOs and a typical
# 6–8 HMOs per clinician, ~10 clinicians cover all HMOs once. So 2×
# coverage needs ~20 clinicians just for HMOs. 64 is a safe floor that
# comfortably satisfies both constraints with realistic distribution.
MIN_COUNT = 64


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _normalize_time(raw, is_pm_col=False):
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


def _pick_day_count():
    """Weighted day count: 1=10%, 2=35%, 3=35%, 4=20%."""
    return random.choices([1, 2, 3, 4], weights=[10, 35, 35, 20], k=1)[0]


def _make_schedule_cols(days, am_starts, am_ends, pm_starts, pm_ends, prefix):
    cols = {}
    for day in days:
        has_am = random.random() < 0.70
        has_pm = random.random() < 0.60
        if not has_am and not has_pm:
            has_am = True
        if has_am:
            cols[f'{prefix}{day}_am_start'] = random.choice(am_starts)
            cols[f'{prefix}{day}_am_end']   = random.choice(am_ends)
        if has_pm:
            cols[f'{prefix}{day}_pm_start'] = random.choice(pm_starts)
            cols[f'{prefix}{day}_pm_end']   = random.choice(pm_ends)
    return cols


def _distribute_specialties(count):
    """
    Assign specialties so every specialty gets exactly 2 guaranteed slots,
    then distribute extras randomly. Result is shuffled.
    """
    specialties = list(SPECIALTY_ROOMS.keys())
    n = len(specialties)

    # Base: 2 per specialty
    result = []
    for spec in specialties:
        result.extend([spec, spec])

    # Extras: random picks until we hit count
    extras = count - len(result)
    for _ in range(max(0, extras)):
        result.append(random.choice(specialties))

    random.shuffle(result)
    return result[:count]


def _assign_hmos_with_coverage_guarantee(count, hmo_cols):
    """
    Assign HMO lists to `count` clinicians so that every HMO in HMO_POOL
    appears on at least 2 clinician records.

    Strategy:
      1. Build a coverage queue: each HMO needs to appear at least 2 times.
         Shuffle the 2-copy deck and deal them out as mandatory HMOs,
         one per clinician slot until the deck is exhausted.
      2. Each clinician gets their mandatory HMO(s) plus random extras
         drawn from the full pool, capped at len(hmo_cols).

    Returns a list of `count` lists-of-HMO-strings.
    """
    max_hmos = len(hmo_cols)

    # Build the mandatory deck: 2 copies of each HMO, shuffled
    mandatory_deck = HMO_POOL * 2
    random.shuffle(mandatory_deck)

    # One slot per clinician in the mandatory deck
    # (29 HMOs × 2 = 58 mandatory slots; spread across `count` clinicians)
    mandatory_per_clinician = [[] for _ in range(count)]
    for idx, hmo in enumerate(mandatory_deck):
        mandatory_per_clinician[idx % count].append(hmo)

    # Now build final HMO lists: mandatory + random extras, deduplicated
    result = []
    for mandatory in mandatory_per_clinician:
        # How many slots are left after mandatory?
        slots_left = max_hmos - len(mandatory)
        # Pick random extras (avoid duplicating what's already mandatory)
        pool_without_mandatory = [h for h in HMO_POOL if h not in mandatory]
        extra_count = random.randint(0, min(slots_left, len(pool_without_mandatory)))
        extras = random.sample(pool_without_mandatory, extra_count)
        combined = mandatory + extras
        random.shuffle(combined)
        result.append(combined[:max_hmos])

    return result


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description='Generate synthetic clinician rows in clinicians_anon.csv format.'
    )
    parser.add_argument('input',  help='Path to clinicians_anon.csv (header source + pattern learning)')
    parser.add_argument('output', help='Path to write clinicians_synthetic.csv')
    parser.add_argument(
        '--count', type=int, default=MIN_COUNT,
        help=f'Number of rows to generate (default: {MIN_COUNT}, minimum: {MIN_COUNT})'
    )
    args = parser.parse_args()

    if args.count < MIN_COUNT:
        print(f'WARNING: --count {args.count} is below the minimum safe floor of {MIN_COUNT}.')
        print(f'         HMO coverage guarantee requires at least {MIN_COUNT} clinicians.')
        print(f'         Raising count to {MIN_COUNT}.')
        args.count = MIN_COUNT

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

    # ── Distribute specialties (2 guaranteed per specialty) ───────────────
    specialty_list   = _distribute_specialties(args.count)
    specialty_counts = collections.Counter(specialty_list)

    # ── Assign HMOs (2 guaranteed per HMO across the pool) ────────────────
    hmo_assignments = _assign_hmos_with_coverage_guarantee(args.count, hmo_cols)

    # ── Generate rows ──────────────────────────────────────────────────────
    rows = []
    tele_count = 0

    for i, (specialty, clinician_hmos) in enumerate(zip(specialty_list, hmo_assignments)):
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

        # F2F schedule
        f2f_day_count = _pick_day_count()
        f2f_days      = random.sample(ALL_DAYS, min(f2f_day_count, len(ALL_DAYS)))
        f2f_cols      = _make_schedule_cols(f2f_days, am_starts, am_ends, pm_starts, pm_ends, 'f2f_')

        # Teleconsult schedule (~20% of doctors, on different days from F2F)
        tele_cols = {}
        remaining = [d for d in ALL_DAYS if d not in f2f_days]
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

        for j, hmo_name in enumerate(clinician_hmos):
            if j < len(hmo_cols):
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

    # ── Coverage verification ──────────────────────────────────────────────
    print('\n--- Coverage check ---')

    # Specialty coverage
    spec_ok = True
    for spec in SPECIALTY_ROOMS:
        cnt = specialty_counts[spec]
        if cnt < 2:
            print(f'  FAIL specialty "{spec}": only {cnt} clinician(s)')
            spec_ok = False
    if spec_ok:
        print(f'Specialty coverage: PASS (all {len(SPECIALTY_ROOMS)} specialties ≥ 2)')

    # HMO coverage — scan the written CSV
    hmo_coverage = collections.Counter()
    with open(args.output, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            seen = set()
            for col in hmo_cols:
                val = row.get(col, '').strip()
                if val and val not in seen:
                    hmo_coverage[val] += 1
                    seen.add(val)

    hmo_ok = True
    for hmo in HMO_POOL:
        cnt = hmo_coverage.get(hmo, 0)
        if cnt < 2:
            print(f'  FAIL HMO "{hmo}": only {cnt} clinician(s)')
            hmo_ok = False
    if hmo_ok:
        print(f'HMO coverage: PASS (all {len(HMO_POOL)} HMOs ≥ 2)')

    # ── Summary ────────────────────────────────────────────────────────────
    print(f'\nGenerated {len(rows)} synthetic clinicians')
    print('Specialty distribution:')
    for spec in sorted(specialty_counts):
        print(f'  {spec}: {specialty_counts[spec]}')
    print(f'~{tele_count} doctors have teleconsult schedules')
    print(f'Output: {args.output}')


if __name__ == '__main__':
    main()