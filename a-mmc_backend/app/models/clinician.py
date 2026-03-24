from app import db


class Clinician(db.Model):
    __tablename__ = "clinician"

    clinician_id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(50))
    first_name = db.Column(db.String(100), nullable=False)
    middle_name = db.Column(db.String(100))
    last_name = db.Column(db.String(100), nullable=False)
    suffix = db.Column(db.String(20))
    department = db.Column(db.String(150))
    specialty = db.Column(db.String(150))
    local_number = db.Column(db.String(20))
    room_number = db.Column(db.String(50))
    profile_picture = db.Column(db.String(500))
    contact_phone = db.Column(db.String(30))
    contact_email = db.Column(db.String(200))
    login_email = db.Column(db.String(200), unique=True, nullable=False)
    login_password_hash = db.Column(db.String(256), nullable=False)

    # Relationships
    schedules = db.relationship("ClinicianSchedule", back_populates="clinician", cascade="all, delete-orphan")
    hmos = db.relationship("ClinicianHMO", back_populates="clinician", cascade="all, delete-orphan")
    infos = db.relationship("ClinicianInfo", back_populates="clinician", cascade="all, delete-orphan")
    timeslots = db.relationship("ClinicianTimeslot", back_populates="clinician", cascade="all, delete-orphan")
    secretary_links = db.relationship("SecretaryClinicianLink", back_populates="clinician", cascade="all, delete-orphan")
    appointments = db.relationship("Appointment", back_populates="clinician")

    def __repr__(self) -> str:
        return f"<Clinician {self.clinician_id}: {self.last_name}, {self.first_name}>"


class ClinicianSchedule(db.Model):
    __tablename__ = "clinician_schedule"

    schedule_id = db.Column(db.Integer, primary_key=True)
    clinician_id = db.Column(db.Integer, db.ForeignKey("clinician.clinician_id"), nullable=False)
    day_of_week = db.Column(db.String(10), nullable=False)  # "Monday"–"Saturday"
    am_start = db.Column(db.Time, nullable=True)
    am_end = db.Column(db.Time, nullable=True)
    pm_start = db.Column(db.Time, nullable=True)
    pm_end = db.Column(db.Time, nullable=True)

    clinician = db.relationship("Clinician", back_populates="schedules")

    def __repr__(self) -> str:
        return f"<ClinicianSchedule {self.schedule_id}: {self.day_of_week}>"


class ClinicianHMO(db.Model):
    __tablename__ = "clinician_hmo"

    hmo_id = db.Column(db.Integer, primary_key=True)
    clinician_id = db.Column(db.Integer, db.ForeignKey("clinician.clinician_id"), nullable=False)
    hmo_name = db.Column(db.String(200), nullable=False)

    clinician = db.relationship("Clinician", back_populates="hmos")

    def __repr__(self) -> str:
        return f"<ClinicianHMO {self.hmo_id}: {self.hmo_name}>"


class ClinicianInfo(db.Model):
    __tablename__ = "clinician_info"

    info_id = db.Column(db.Integer, primary_key=True)
    clinician_id = db.Column(db.Integer, db.ForeignKey("clinician.clinician_id"), nullable=False)
    content = db.Column(db.Text, nullable=False)
    label = db.Column(db.String(100))  # e.g. "background", "awards"

    clinician = db.relationship("Clinician", back_populates="infos")

    def __repr__(self) -> str:
        return f"<ClinicianInfo {self.info_id}: [{self.label}]>"


class ClinicianTimeslot(db.Model):
    __tablename__ = "clinician_timeslot"

    slot_id = db.Column(db.Integer, primary_key=True)
    clinician_id = db.Column(db.Integer, db.ForeignKey("clinician.clinician_id"), nullable=False)
    slot_date = db.Column(db.Date, nullable=False)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    status = db.Column(db.String(20), nullable=False, default="available")  # available | blocked
    # Optional soft patient limit. When set, slot is auto-blocked after this many
    # accepted appointments. NULL = no limit (default).
    max_patients = db.Column(db.Integer, nullable=True)

    clinician = db.relationship("Clinician", back_populates="timeslots")
    appointments = db.relationship("Appointment", back_populates="slot")

    def __repr__(self) -> str:
        return f"<ClinicianTimeslot {self.slot_id}: {self.slot_date} {self.start_time}–{self.end_time} [{self.status}]>"
