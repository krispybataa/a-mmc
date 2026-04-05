from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per minute"],
    storage_uri="memory://",
)

from app.routes.clinician_routes import clinician_bp
from app.routes.secretary_routes import secretary_bp
from app.routes.patient_routes import patient_bp
from app.routes.timeslot_routes import timeslot_bp
from app.routes.auth_routes import auth_bp
from app.routes.appointment_routes import appointment_bp
from app.routes.admin_routes import admin_bp
from app.routes.upload_routes import upload_bp
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
    limiter.init_app(app)

    # JWT blocklist — revoke tokens on logout immediately
    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload):
        from app.services.auth_service import is_token_blocked
        return is_token_blocked(jwt_payload["jti"])

    app.register_blueprint(clinician_bp, url_prefix="/api/clinicians")
    app.register_blueprint(secretary_bp, url_prefix="/api/secretaries")
    app.register_blueprint(patient_bp, url_prefix="/api/patients")
    app.register_blueprint(timeslot_bp, url_prefix="/api/timeslots")
    app.register_blueprint(appointment_bp, url_prefix="/api/appointments")
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(upload_bp, url_prefix="/api/uploads")

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

    @app.errorhandler(429)
    def too_many_requests(e):
        return {"error": "Too many requests. Please slow down and try again later."}, 429

    @app.errorhandler(500)
    def server_error(e):
        return {"error": "Internal server error"}, 500

    return app
