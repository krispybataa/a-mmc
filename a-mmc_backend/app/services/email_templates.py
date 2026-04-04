"""
email_templates.py
------------------
HTML email templates for all Alagang MMC transactional notifications.

Each public function returns a dict: {"subject": str, "html": str}.
No Flask context required — pure Python f-strings with inline CSS only.

Brand colours (inline only — no external stylesheets):
  primary : #1D409C
  accent  : #CE1117
  dark    : #303030
  white   : #FFFFFF
"""


# ---------------------------------------------------------------------------
# Private layout helpers
# ---------------------------------------------------------------------------

def _base(title: str, body_html: str) -> str:
    """Wrap body_html in the standard 600 px centred email shell."""
    return (
        '<!DOCTYPE html>'
        '<html lang="en">'
        '<head>'
        '<meta charset="UTF-8">'
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
        f'<title>{title}</title>'
        '</head>'
        '<body style="margin:0;padding:0;background-color:#f4f4f4;'
        'font-family:Arial,Helvetica,sans-serif;">'
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"'
        ' style="background-color:#f4f4f4;padding:32px 16px;">'
        '<tr><td align="center">'
        '<table role="presentation" width="600" cellpadding="0" cellspacing="0"'
        ' style="max-width:600px;width:100%;">'

        # ── Header ──────────────────────────────────────────────────────────
        '<tr>'
        '<td style="background-color:#1D409C;padding:24px 32px;'
        'border-radius:8px 8px 0 0;">'
        '<p style="margin:0;color:#FFFFFF;font-size:20px;font-weight:bold;'
        'letter-spacing:-0.3px;">Unicorn</p>'
        '</td>'
        '</tr>'

        # ── Body ─────────────────────────────────────────────────────────────
        '<tr>'
        '<td style="background-color:#FFFFFF;padding:32px;color:#303030;'
        'font-size:16px;line-height:1.6;border-left:1px solid #e8e8e8;'
        'border-right:1px solid #e8e8e8;">'
        f'{body_html}'
        '</td>'
        '</tr>'

        # ── Footer ───────────────────────────────────────────────────────────
        '<tr>'
        '<td style="background-color:#f0f0f0;padding:16px 32px;'
        'border-radius:0 0 8px 8px;border:1px solid #e8e8e8;border-top:none;">'
        '<p style="margin:0;color:#888888;font-size:12px;line-height:1.5;">'
        'This is an automated message from Unicorn. '
        'Please do not reply to this email.'
        '</p>'
        '</td>'
        '</tr>'

        '</table>'
        '</td></tr>'
        '</table>'
        '</body>'
        '</html>'
    )


def _detail_table(rows: list) -> str:
    """Render a key/value details table with alternating row shading."""
    cells = ""
    for i, (label, value) in enumerate(rows):
        bg = "#f8f9fc" if i % 2 == 0 else "#FFFFFF"
        cells += (
            f'<tr>'
            f'<td style="padding:10px 14px;font-size:14px;color:#888888;'
            f'background-color:{bg};white-space:nowrap;width:40%;'
            f'border-bottom:1px solid #e8e8e8;">{label}</td>'
            f'<td style="padding:10px 14px;font-size:14px;color:#303030;'
            f'background-color:{bg};font-weight:600;'
            f'border-bottom:1px solid #e8e8e8;">{value}</td>'
            f'</tr>'
        )
    return (
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"'
        ' style="border-collapse:collapse;border:1px solid #e8e8e8;border-radius:6px;'
        'overflow:hidden;margin:20px 0;">'
        + cells +
        '</table>'
    )


def _info_box(text: str, colour: str = "#1D409C", bg: str = "#f0f5ff") -> str:
    """Render a highlighted callout box (blue for info, red accent for warnings)."""
    return (
        f'<p style="margin:20px 0;padding:14px 16px;background-color:{bg};'
        f'border-left:4px solid {colour};border-radius:0 6px 6px 0;'
        f'font-size:14px;color:#303030;">'
        f'{text}'
        f'</p>'
    )


def _credential_box(login_email: str, temporary_password: str) -> str:
    return (
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"'
        ' style="margin:20px 0;">'
        '<tr><td style="background-color:#f0f5ff;border:1px solid #8EA0CE;'
        'border-radius:6px;padding:20px 24px;">'
        '<p style="margin:0 0 6px;font-size:13px;color:#888888;">Login Email</p>'
        f'<p style="margin:0 0 18px;font-size:16px;font-weight:bold;color:#303030;'
        f'font-family:monospace;">{login_email}</p>'
        '<p style="margin:0 0 6px;font-size:13px;color:#888888;">Temporary Password</p>'
        f'<p style="margin:0;font-size:16px;font-weight:bold;color:#303030;'
        f'font-family:monospace;">{temporary_password}</p>'
        '</td></tr>'
        '</table>'
    )


def _cta_button(label: str, url: str) -> str:
    return (
        f'<p style="margin:24px 0 0;text-align:center;">'
        f'<a href="{url}"'
        f' style="display:inline-block;background-color:#1D409C;color:#FFFFFF;'
        f'font-size:15px;font-weight:bold;text-decoration:none;'
        f'padding:14px 32px;border-radius:6px;">{label}</a>'
        f'</p>'
    )


_ARRIVAL_REMINDER = (
    '<strong>Reminder:</strong> Please arrive 30 minutes before your scheduled time '
    'and bring any relevant medical records or referral letters.'
)


# ---------------------------------------------------------------------------
# Template functions
# ---------------------------------------------------------------------------

def appointment_confirmation(
    patient_name: str,
    clinician_name: str,
    clinician_title: str,
    date: str,
    time: str,
    room_number: str,
    chief_complaint: str,
    payment_type: str,
    consultation_type: str,
    secretary_email: str = '',
    secretary_name: str = '',
    secretary_contact_phone: str = '',
) -> dict:
    """
    Sent to the patient when C/S accepts a pending appointment.
    """
    subject = f"Appointment Confirmed \u2014 {date}"
    title_str = clinician_title or ""

    detail_rows = [
        ("Clinician",          f"{title_str} {clinician_name}".strip()),
        ("Date",               date),
        ("Time",               time),
        ("Room / Location",    room_number or "To be confirmed"),
        ("Chief Complaint",    chief_complaint or "\u2014"),
        ("Payment Type",       payment_type or "\u2014"),
        ("Consultation Type",  (consultation_type or "").upper() or "\u2014"),
    ]
    if secretary_name and secretary_email and secretary_contact_phone:
        detail_rows.append((
            "Contact",
            f'For more information about your appointment, contact '
            f'<strong>{secretary_name}</strong> at '
            f'<a href="mailto:{secretary_email}">{secretary_email}</a>'
            f' or {secretary_contact_phone}.',
        ))
    elif secretary_email:
        detail_rows.append((
            "Contact",
            f'For more information, contact the clinic at '
            f'<a href="mailto:{secretary_email}">{secretary_email}</a>.',
        ))

    body = (
        f'<p>Dear <strong>{patient_name}</strong>,</p>'
        f'<p>Your appointment has been confirmed. Please review the details below.</p>'
        f'{_detail_table(detail_rows)}'
        f'{_info_box(_ARRIVAL_REMINDER)}'
        f'<p>If you need to cancel or reschedule, please log in to your account '
        f'at least 24 hours in advance.</p>'
        f'<p style="margin-top:24px;">Thank you for choosing Unicorn.</p>'
    )
    return {"subject": subject, "html": _base(subject, body)}


def reschedule_request_to_patient(
    patient_name: str,
    clinician_name: str,
    clinician_title: str,
    original_date: str,
    original_time: str,
    reason: str,
) -> dict:
    """
    Sent to the patient when C/S initiates a reschedule request.
    """
    subject = "Your Appointment Has Been Rescheduled"
    title_str = clinician_title or ""

    details = _detail_table([
        ("Clinician",      f"{title_str} {clinician_name}".strip()),
        ("Original Date",  original_date),
        ("Original Time",  original_time),
        ("Reason Given",   reason or "Not specified"),
    ])

    body = (
        f'<p>Dear <strong>{patient_name}</strong>,</p>'
        f'<p>Your clinic has requested to reschedule your upcoming appointment. '
        f'Please review the details below.</p>'
        f'{details}'
        f'<p>Please log in to your account to review and select a new time slot. '
        f'If you have questions, please contact the clinic directly.</p>'
        f'<p style="margin-top:24px;">We apologise for any inconvenience caused.</p>'
    )
    return {"subject": subject, "html": _base(subject, body)}


def reschedule_request_to_clinician(
    clinician_name: str,
    clinician_title: str,
    patient_name: str,
    original_date: str,
    original_time: str,
    reason: str,
) -> dict:
    """
    Sent to the clinician when the patient initiates a reschedule request.
    """
    subject = f"Reschedule Request from Patient \u2014 {patient_name}"
    title_str = clinician_title or ""

    details = _detail_table([
        ("Patient",        patient_name),
        ("Original Date",  original_date),
        ("Original Time",  original_time),
        ("Reason Given",   reason or "Not specified"),
    ])

    body = (
        f'<p>Dear <strong>{title_str} {clinician_name}</strong>,</p>'
        f'<p>A patient has requested to reschedule their appointment with you. '
        f'Please review the details below.</p>'
        f'{details}'
        f'<p>Please log in to the clinic portal to confirm a new time slot '
        f'for this patient.</p>'
    )
    return {"subject": subject, "html": _base(subject, body)}


def cancellation_notice(
    recipient_name: str,
    other_party_name: str,
    date: str,
    time: str,
    reason: str,
    cancelled_by: str,
) -> dict:
    """
    Sent to either party when an appointment is cancelled.

    cancelled_by: "patient" | "cs" | "" (unknown)
    """
    subject = "Appointment Cancelled"

    by_rows = []
    if cancelled_by == "patient":
        by_rows = [("Cancelled By", "Patient")]
        next_step = "If you would like to book a new appointment, please log in to your account."
    elif cancelled_by == "cs":
        by_rows = [("Cancelled By", "Clinic")]
        next_step = (
            "If you would like to rebook, please log in to your account or "
            "contact the clinic directly."
        )
    else:
        next_step = (
            "If you would like to rebook, please log in to your account or "
            "contact the clinic directly."
        )

    details = _detail_table([
        ("Date",    date),
        ("Time",    time),
        ("Reason",  reason or "Not specified"),
    ] + by_rows)

    body = (
        f'<p>Dear <strong>{recipient_name}</strong>,</p>'
        f'<p>We are writing to let you know that an appointment has been cancelled.</p>'
        f'{details}'
        f'<p>{next_step}</p>'
        f'<p style="margin-top:24px;">We apologise for any inconvenience.</p>'
    )
    return {"subject": subject, "html": _base(subject, body)}


def noshow_confirmation_prompt(
    patient_name: str,
    clinician_name: str,
    clinician_title: str,
    date: str,
    time: str,
    room_number: str,
) -> dict:
    """
    Appointment reminder sent to the patient the day before their appointment.
    """
    subject = f"Appointment Reminder \u2014 Tomorrow at {time}"
    title_str = clinician_title or ""

    details = _detail_table([
        ("Clinician",       f"{title_str} {clinician_name}".strip()),
        ("Date",            date),
        ("Time",            time),
        ("Room / Location", room_number or "To be confirmed"),
    ])

    body = (
        f'<p>Dear <strong>{patient_name}</strong>,</p>'
        f'<p>This is a reminder of your upcoming appointment scheduled for tomorrow.</p>'
        f'{details}'
        f'{_info_box(_ARRIVAL_REMINDER)}'
        f'<p>If you can no longer make it, please log in to cancel or reschedule '
        f'at least 24 hours in advance.</p>'
    )
    return {"subject": subject, "html": _base(subject, body)}


def initial_credentials_clinician(
    clinician_name: str,
    clinician_title: str,
    login_email: str,
    temporary_password: str,
    system_url: str = "",
) -> dict:
    """
    Sent to a newly created clinician with their login credentials.
    """
    subject = "Welcome to Unicorn \u2014 Your Account Has Been Created"
    title_str = clinician_title or ""
    login_url = (
        f"{system_url.rstrip('/')}/staff/login"
        if system_url else
        "[SYSTEM_URL]/staff/login"
    )

    pw_warning = (
        "<strong>Important:</strong> You must change your password the first "
        "time you log in. Keep your credentials private and do not share "
        "them with anyone."
    )
    body = (
        f'<p>Dear <strong>{title_str} {clinician_name}</strong>,</p>'
        f'<p>Your Unicorn staff account has been created. You can now log in to '
        f'manage your profile, schedule, and appointments.</p>'
        f'{_credential_box(login_email, temporary_password)}'
        f'{_info_box(pw_warning, colour="#CE1117", bg="#fff5f5")}'
        f'{_cta_button("Log In to Staff Portal", login_url)}'
        f'<p style="margin-top:24px;">Welcome aboard.</p>'
    )
    return {"subject": subject, "html": _base(subject, body)}


def initial_credentials_secretary(
    secretary_name: str,
    login_email: str,
    temporary_password: str,
    system_url: str = "",
) -> dict:
    """
    Sent to a newly created secretary with their login credentials.
    """
    subject = "Welcome to Unicorn \u2014 Your Staff Account Is Ready"
    login_url = (
        f"{system_url.rstrip('/')}/staff/login"
        if system_url else
        "[SYSTEM_URL]/staff/login"
    )

    pw_warning = (
        "<strong>Important:</strong> You must change your password the first "
        "time you log in. Keep your credentials private and do not share "
        "them with anyone."
    )
    body = (
        f'<p>Dear <strong>{secretary_name}</strong>,</p>'
        f'<p>Your Unicorn staff account has been created. You can now log in to '
        f'manage clinician profiles, schedules, and patient appointments.</p>'
        f'{_credential_box(login_email, temporary_password)}'
        f'{_info_box(pw_warning, colour="#CE1117", bg="#fff5f5")}'
        f'{_cta_button("Log In to Staff Portal", login_url)}'
        f'<p style="margin-top:24px;">Welcome aboard.</p>'
    )
    return {"subject": subject, "html": _base(subject, body)}


def reschedule_confirmation_to_patient(
    patient_name: str,
    clinician_name: str,
    clinician_title: str,
    new_date: str,
    new_time: str,
    room_number: str,
    secretary_email: str = '',
    secretary_name: str = '',
    secretary_contact_phone: str = '',
) -> dict:
    """
    Sent to the patient when C/S confirms their rescheduled appointment.
    """
    subject = f"Your Appointment Has Been Confirmed for {new_date}"
    title_str = clinician_title or ""

    detail_rows = [
        ("Clinician",       f"{title_str} {clinician_name}".strip()),
        ("New Date",        new_date),
        ("New Time",        new_time),
        ("Room / Location", room_number or "To be confirmed"),
    ]
    if secretary_name and secretary_email and secretary_contact_phone:
        detail_rows.append((
            "Contact",
            f'For more information about your appointment, contact '
            f'<strong>{secretary_name}</strong> at '
            f'<a href="mailto:{secretary_email}">{secretary_email}</a>'
            f' or {secretary_contact_phone}.',
        ))
    elif secretary_email:
        detail_rows.append((
            "Contact",
            f'For more information, contact the clinic at '
            f'<a href="mailto:{secretary_email}">{secretary_email}</a>.',
        ))

    body = (
        f'<p>Dear <strong>{patient_name}</strong>,</p>'
        f'<p>Great news \u2014 your rescheduled appointment has been confirmed. '
        f'Please review your new appointment details below.</p>'
        f'{_detail_table(detail_rows)}'
        f'{_info_box(_ARRIVAL_REMINDER)}'
        f'<p>We look forward to seeing you. If you need to make changes, please log in '
        f'to your account at least 24 hours in advance.</p>'
    )
    return {"subject": subject, "html": _base(subject, body)}
