"""
mask_names.py
-------------
Replaces real clinician names in a CSV with randomized Filipino
decoy names. Saves the mapping to name_map.csv for your records.

Usage:
    python mask_names.py clinicians_real.csv clinicians_anon.csv

Inputs:
    clinicians_real.csv  — your filled-in CSV with real names
Outputs:
    clinicians_anon.csv  — same CSV with names replaced
    name_map.csv         — mapping of real → decoy names (keep offline)

NEVER commit clinicians_real.csv or name_map.csv to the repository.
"""

import csv
import random
import sys
import os
from datetime import datetime

# ---------------------------------------------------------------------------
# Decoy name pools — common Filipino names
# ---------------------------------------------------------------------------

FIRST_NAMES = [
    "Jose", "Maria", "Juan", "Ana", "Carlo", "Luz", "Ramon", "Elena",
    "Miguel", "Rosa", "Eduardo", "Carla", "Antonio", "Isabel", "Ricardo",
    "Cecilia", "Fernando", "Gloria", "Roberto", "Teresita", "Manuel",
    "Corazon", "Ernesto", "Maricel", "Rodolfo", "Lourdes", "Alfredo",
    "Remedios", "Domingo", "Estrella", "Bernardo", "Felicitas", "Arturo",
    "Resurreccion", "Gregorio", "Paz", "Leonidas", "Conception", "Filomeno",
    "Adoracion", "Victorino", "Herminia", "Eugenio", "Soledad", "Amador",
    "Milagros", "Florencio", "Rosario", "Celestino", "Natividad"
]

LAST_NAMES = [
    "Santos", "Reyes", "Cruz", "Bautista", "Ocampo", "Garcia", "Torres",
    "Castillo", "Ramos", "Aquino", "Villanueva", "Dela Cruz", "Mendoza",
    "Tolentino", "Valdez", "Soriano", "Gonzales", "Flores", "Rivera",
    "Guerrero", "Domingo", "Pascual", "Santiago", "Salazar", "Mercado",
    "Aguilar", "Medina", "Jimenez", "Dela Torre", "Espiritu", "Macaraeg",
    "Buenaventura", "Evangelista", "Bernardo", "Padilla", "Manalo",
    "Delos Reyes", "Marquez", "Lim", "Tan", "Co", "Uy", "Sy",
    "Concepcion", "Enriquez", "Velasquez", "Romero", "Navarro", "Perez"
]

MIDDLE_NAMES = [
    "Santos", "Reyes", "Cruz", "Garcia", "Torres", "Ramos", "Rivera",
    "Flores", "Gonzales", "Mendoza", "Valdez", "Castillo", "Aquino",
    "Bautista", "Ocampo", "Villanueva", "Soriano", "Domingo", "Pascual",
    "Salazar", "Aguilar", "Medina", "Jimenez", "Espiritu", "Padilla"
]

# ---------------------------------------------------------------------------
# Name generator
# ---------------------------------------------------------------------------

def generate_decoy_name(used_combinations):
    """Generate a unique decoy first + last name combination."""
    attempts = 0
    while attempts < 1000:
        first = random.choice(FIRST_NAMES)
        last = random.choice(LAST_NAMES)
        combo = (first, last)
        if combo not in used_combinations:
            used_combinations.add(combo)
            return first, last
        attempts += 1
    raise RuntimeError("Exhausted unique name combinations — add more names to the pool.")

def generate_decoy_middle(middle_name):
    """Return a random middle name if the original had one, else empty."""
    if not middle_name or not middle_name.strip():
        return ""
    return random.choice(MIDDLE_NAMES)

def generate_login_email(first_name, last_name, department, used_emails):
    """Generate a login email from decoy name."""
    base = f"{first_name.lower().replace(' ', '')}.{last_name.lower().replace(' ', '')}@ammc.test"
    if base not in used_emails:
        used_emails.add(base)
        return base
    # Add number suffix if collision
    i = 2
    while True:
        candidate = f"{first_name.lower().replace(' ', '')}.{last_name.lower().replace(' ', '')}{i}@ammc.test"
        if candidate not in used_emails:
            used_emails.add(candidate)
            return candidate
        i += 1

def generate_contact_email(first_name, last_name):
    return f"{first_name.lower().replace(' ', '')}.{last_name.lower().replace(' ', '')}@ammc.clinic"

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def mask_csv(input_path, output_path):
    if not os.path.exists(input_path):
        print(f"ERROR: Input file not found: {input_path}")
        sys.exit(1)

    used_combinations = set()
    used_emails = set()
    name_map = []  # list of dicts for name_map.csv

    output_rows = []

    with open(input_path, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames

        required = ['first_name', 'last_name', 'login_email']
        for req in required:
            if req not in fieldnames:
                print(f"ERROR: Missing required column '{req}' in input CSV.")
                sys.exit(1)

        for i, row in enumerate(reader, start=2):  # start=2 (row 1 is header)
            real_first = row.get('first_name', '').strip()
            real_last = row.get('last_name', '').strip()
            real_middle = row.get('middle_name', '').strip()
            real_login = row.get('login_email', '').strip()

            if not real_first or not real_last:
                print(f"WARNING: Row {i} missing first_name or last_name — skipping.")
                continue

            # Generate decoy names
            decoy_first, decoy_last = generate_decoy_name(used_combinations)
            decoy_middle = generate_decoy_middle(real_middle)
            # Keep the pre-assigned login_email from the CSV
            decoy_login = real_login if real_login else generate_login_email(
                decoy_first, decoy_last,
                row.get('department', ''),
                used_emails
            )
            used_emails.add(decoy_login)
            decoy_contact = generate_contact_email(decoy_first, decoy_last)

            # Record mapping
            name_map.append({
                'real_first_name': real_first,
                'real_last_name': real_last,
                'real_middle_name': real_middle,
                'real_login_email': real_login,
                'decoy_first_name': decoy_first,
                'decoy_last_name': decoy_last,
                'decoy_middle_name': decoy_middle,
                'decoy_login_email': decoy_login,
                'specialty': row.get('specialty', ''),
                'department': row.get('department', ''),
            })

            # Build output row
            out_row = dict(row)
            out_row['first_name'] = decoy_first
            out_row['last_name'] = decoy_last
            out_row['middle_name'] = decoy_middle
            out_row['login_email'] = decoy_login
            # Keep all schedule, HMO, and other fields unchanged

            output_rows.append(out_row)

    # Write anonymized CSV
    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(output_rows)

    # Write name map
    map_dir = os.path.dirname(output_path) or '.'
    map_path = os.path.join(map_dir, 'name_map.csv')
    map_fields = [
        'real_first_name', 'real_last_name', 'real_middle_name',
        'real_login_email', 'decoy_first_name', 'decoy_last_name',
        'decoy_middle_name', 'decoy_login_email', 'specialty', 'department'
    ]
    with open(map_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=map_fields)
        writer.writeheader()
        writer.writerows(name_map)

    print(f"Done.")
    print(f"  Anonymized CSV → {output_path} ({len(output_rows)} clinicians)")
    print(f"  Name map       → {map_path}")
    print(f"")
    print(f"IMPORTANT: Keep name_map.csv offline. Never commit it.")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python mask_names.py <input_real.csv> <output_anon.csv>")
        print("Example: python mask_names.py clinicians_real.csv clinicians_anon.csv")
        sys.exit(1)

    mask_csv(sys.argv[1], sys.argv[2])
