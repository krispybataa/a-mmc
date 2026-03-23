from flask import jsonify


def require_fields(data: dict, *fields: str):
    """
    Check that all required field names are present and non-empty in `data`.

    Returns (None, None) if all fields are present.
    Returns (response, 422) if any field is missing — ready to return from a route.

    Usage:
        err = require_fields(data, "patient_id", "slot_id", "consultation_date")
        if err:
            return err
    """
    missing = [f for f in fields if data.get(f) is None]
    if missing:
        return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 422
    return None
