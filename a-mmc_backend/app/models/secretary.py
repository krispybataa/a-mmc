from app import db


class Secretary(db.Model):
    __tablename__ = "secretary"

    secretary_id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(50))
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    suffix = db.Column(db.String(20))
    contact_phone = db.Column(db.String(30))
    contact_email = db.Column(db.String(200))
    login_email = db.Column(db.String(200), unique=True, nullable=False)
    login_password_hash = db.Column(db.String(256), nullable=False)

    # Relationships
    clinician_links = db.relationship("SecretaryClinicianLink", back_populates="secretary", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Secretary {self.secretary_id}: {self.last_name}, {self.first_name}>"


class SecretaryClinicianLink(db.Model):
    """M2M junction between secretaries and clinicians."""
    __tablename__ = "secretary_clinician"

    id = db.Column(db.Integer, primary_key=True)
    secretary_id = db.Column(db.Integer, db.ForeignKey("secretary.secretary_id"), nullable=False)
    clinician_id = db.Column(db.Integer, db.ForeignKey("clinician.clinician_id"), nullable=False)

    secretary = db.relationship("Secretary", back_populates="clinician_links")
    clinician = db.relationship("Clinician", back_populates="secretary_links")

    def __repr__(self) -> str:
        return f"<SecretaryClinicianLink sec={self.secretary_id} → clin={self.clinician_id}>"
