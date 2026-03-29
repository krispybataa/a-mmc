from datetime import datetime, timezone
from app import db


class Appointment(db.Model):
    __tablename__ = "appointment"

    appointment_id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey("patient.patient_id"), nullable=False)
    clinician_id = db.Column(db.Integer, db.ForeignKey("clinician.clinician_id"), nullable=False)
    slot_id = db.Column(db.Integer, db.ForeignKey("clinician_timeslot.slot_id"), nullable=False)
    consultation_date = db.Column(db.Date, nullable=False)
    chief_complaint = db.Column(db.String(300))
    chief_complaint_description = db.Column(db.Text)
    payment_type = db.Column(db.String(100))
    consultation_type = db.Column(db.String, nullable=False, server_default='f2f')  # f2f | teleconsult
    # pending | accepted | reschedule_requested | rejected | cancelled
    status = db.Column(db.String(30), nullable=False, default="pending")
    reschedule_reason = db.Column(db.Text)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    patient = db.relationship("Patient", back_populates="appointments")
    clinician = db.relationship("Clinician", back_populates="appointments")
    slot = db.relationship("ClinicianTimeslot", back_populates="appointments")

    def __repr__(self) -> str:
        return f"<Appointment {self.appointment_id}: patient={self.patient_id} clinician={self.clinician_id} [{self.status}]>"
