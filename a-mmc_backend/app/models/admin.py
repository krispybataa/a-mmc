from app import db


class Admin(db.Model):
    __tablename__ = "admin"

    admin_id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    login_email = db.Column(db.String(200), unique=True, nullable=False)
    login_password_hash = db.Column(db.String(256), nullable=False)

    def __repr__(self) -> str:
        return f"<Admin {self.admin_id}: {self.last_name}, {self.first_name}>"
