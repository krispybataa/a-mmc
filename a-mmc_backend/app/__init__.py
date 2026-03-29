from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from flask_jwt_extended import JWTManager

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()

from app.routes.clinician_routes import clinician_bp
from app.routes.secretary_routes import secretary_bp
from app.routes.patient_routes import patient_bp
from app.routes.timeslot_routes import timeslot_bp
from app.routes.auth_routes import auth_bp
from app.routes.appointment_routes import appointment_bp
from app.routes.admin_routes import admin_bp
from app.models import clinician, secretary, patient, appointment  # noqa: F401
from app.models import admin  # noqa: F401

from config.DevelopmentConfig import DevelopmentConfig
from config.ProductionConfig import ProductionConfig

config_by_name: dict = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
}

def create_app(config_name: str = "development") -> Flask:
    """Application factory."""
    app = Flask(__name__)
    app.config.from_object(config_by_name[config_name])

    # Extensions
    db.init_app(app)
    migrate.init_app(app, db)
    CORS(app)
    jwt.init_app(app)
    # DatabasePool.initialize(
    #     dsn=os.environ.get("DB_DSN"),
    #     min_conn=os.environ.get("DB_MIN_CONN", 1),
    #     max_conn=os.environ.get("DB_MAX_CONN", 10)
    # )

    app.register_blueprint(clinician_bp, url_prefix="/api/clinicians")
    app.register_blueprint(secretary_bp, url_prefix="/api/secretaries")
    app.register_blueprint(patient_bp, url_prefix="/api/patients")
    app.register_blueprint(timeslot_bp, url_prefix="/api/timeslots")
    app.register_blueprint(appointment_bp, url_prefix="/api/appointments")
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")

    @app.get("/api/health")
    def health():
        return {"status": "ok"}

    # ------------------------------------------------------------------
    # Centralized error handlers — all errors return { "error": "..." }
    # ------------------------------------------------------------------

    @app.errorhandler(400)
    def bad_request(e):
        return {"error": "Bad request", "detail": str(e)}, 400

    @app.errorhandler(401)
    def unauthorized(e):
        return {"error": "Unauthorized — valid credentials required"}, 401

    @app.errorhandler(403)
    def forbidden(e):
        return {"error": "Forbidden — you do not have permission to perform this action"}, 403

    @app.errorhandler(404)
    def not_found(e):
        return {"error": "Resource not found"}, 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return {"error": "Method not allowed"}, 405

    @app.errorhandler(409)
    def conflict(e):
        return {"error": str(e)}, 409

    @app.errorhandler(422)
    def unprocessable(e):
        return {"error": "Unprocessable entity", "detail": str(e)}, 422

    @app.errorhandler(500)
    def server_error(e):
        return {"error": "Internal server error"}, 500

    return app

