from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS

from app.config import config_by_name

db = SQLAlchemy()
migrate = Migrate()


def create_app(config_name: str = "development") -> Flask:
    """Application factory."""
    app = Flask(__name__)
    app.config.from_object(config_by_name[config_name])

    # Extensions
    db.init_app(app)
    migrate.init_app(app, db)
    CORS(app)

    # Import models so Flask-Migrate can detect them
    from app.models import clinician, secretary, patient, appointment  # noqa: F401

    # Register blueprints
    from app.routes.clinician_routes import clinician_bp
    from app.routes.secretary_routes import secretary_bp
    from app.routes.patient_routes import patient_bp
    from app.routes.timeslot_routes import timeslot_bp
    from app.routes.appointment_routes import appointment_bp

    app.register_blueprint(clinician_bp, url_prefix="/api/clinicians")
    app.register_blueprint(secretary_bp, url_prefix="/api/secretaries")
    app.register_blueprint(patient_bp, url_prefix="/api/patients")
    app.register_blueprint(timeslot_bp, url_prefix="/api/timeslots")
    app.register_blueprint(appointment_bp, url_prefix="/api/appointments")

    @app.get("/api/health")
    def health():
        return {"status": "ok"}

    return app
