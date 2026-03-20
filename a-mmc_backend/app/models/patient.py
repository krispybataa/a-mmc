from app import db


class Patient(db.Model):
    __tablename__ = "patient"

    patient_id = db.Column(db.Integer, primary_key=True)

    # Personal info
    last_name = db.Column(db.String(100), nullable=False)
    first_name = db.Column(db.String(100), nullable=False)
    middle_name = db.Column(db.String(100))
    birthday = db.Column(db.Date, nullable=False)
    gender = db.Column(db.String(30), nullable=False)
    civil_status = db.Column(db.String(30))
    nationality = db.Column(db.String(50))
    religion = db.Column(db.String(100))
    occupation = db.Column(db.String(100))

    # Contact
    mobile_number = db.Column(db.String(30), nullable=False)

    # Next of kin
    next_of_kin_name = db.Column(db.String(200))
    next_of_kin_relationship = db.Column(db.String(100))
    next_of_kin_contact = db.Column(db.String(30))

    # Address
    address_line_1 = db.Column(db.String(300), nullable=False)
    province = db.Column(db.String(100), nullable=False)
    city = db.Column(db.String(100), nullable=False)
    barangay = db.Column(db.String(100), nullable=False)
    country = db.Column(db.String(100), nullable=False, default="Philippines")

    # Auth
    login_email = db.Column(db.String(200), unique=True, nullable=False)
    login_password_hash = db.Column(db.String(256), nullable=False)

    # SC / PWD
    sc_pwd_id_number = db.Column(db.String(100))
    pwd_id_front = db.Column(db.String(500))
    pwd_id_back = db.Column(db.String(500))

    # Background / accessibility
    preferred_language = db.Column(db.String(50), nullable=False, default="Filipino")
    culture = db.Column(db.String(100))
    educational_attainment = db.Column(db.String(100), nullable=False)
    disability_type = db.Column(db.String(100))

    # Relationships
    appointments = db.relationship("Appointment", back_populates="patient")

    def __repr__(self) -> str:
        return f"<Patient {self.patient_id}: {self.last_name}, {self.first_name}>"
