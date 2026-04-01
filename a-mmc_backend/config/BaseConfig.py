import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()


def _db_uri() -> str:
    """
    Resolve the SQLAlchemy database URI.

    Priority:
      1. DATABASE_URL        — set by Railway / GitHub Actions CI
      2. SQLALCHEMY_DATABASE_URI — legacy / direct override
      3. Split DB_* vars     — local Docker Compose default
    """
    direct = os.environ.get("DATABASE_URL") or os.environ.get("SQLALCHEMY_DATABASE_URI")
    if direct:
        return direct
    return (
        f"postgresql://"
        f"{os.environ.get('DB_USER', 'postgres')}:"
        f"{os.environ.get('DB_PASSWORD', 'postgres')}@"
        f"{os.environ.get('DB_HOST', 'localhost')}:"
        f"{os.environ.get('DB_PORT', '5432')}/"
        f"{os.environ.get('DB_NAME', 'ammc_dev')}"
    )


class BaseConfig:
    SECRET_KEY: str = os.environ.get("SECRET_KEY", "change-me-before-production")
    SQLALCHEMY_DATABASE_URI: str = _db_uri()
    SQLALCHEMY_TRACK_MODIFICATIONS: bool = False

    # JWT — used by flask-jwt-extended
    # TODO(security): Set a strong JWT_SECRET_KEY in .env (see .env.example for generation command)
    JWT_SECRET_KEY: str = os.environ.get("JWT_SECRET_KEY", "change-jwt-secret-before-production")
    # TODO(security): Tune token lifetime and consider adding refresh token rotation
    JWT_ACCESS_TOKEN_EXPIRES: timedelta = timedelta(
        seconds=int(os.environ.get("JWT_ACCESS_TOKEN_EXPIRES", "3600"))
    )
    # TODO(security): Swap to RS256 (asymmetric) if you need cross-service token verification
    JWT_ALGORITHM: str = "HS256"
    JWT_REFRESH_TOKEN_EXPIRES: timedelta = timedelta(
        seconds=int(os.environ.get("REFRESH_TOKEN_EXPIRES", str(7 * 24 * 3600)))
    )

    # Token location — access tokens come in via Authorization header,
    # refresh tokens come in via httpOnly cookie
    JWT_TOKEN_LOCATION: list = ["headers", "cookies"]
    JWT_COOKIE_SAMESITE: str = "Lax"
    JWT_REFRESH_COOKIE_NAME: str = "refresh_token"
    # TODO(security): Enable CSRF protection before production. When enabled,
    # the frontend must read the CSRF double-submit cookie and send it as a
    # header on state-changing requests.
    JWT_COOKIE_CSRF_PROTECT: bool = False
    # Secure flag requires HTTPS — overridden to False in DevelopmentConfig
    JWT_COOKIE_SECURE: bool = True

    # Email (SMTP) — all values must be set in .env before any mail is sent
    # See .env.example for Mailtrap configuration
    MAIL_SERVER: str = os.environ.get("MAIL_SERVER", "smtp.mailtrap.io")
    MAIL_PORT: int = int(os.environ.get("MAIL_PORT", "587"))
    MAIL_USERNAME: str = os.environ.get("MAIL_USERNAME", "")
    MAIL_PASSWORD: str = os.environ.get("MAIL_PASSWORD", "")
    MAIL_FROM: str = os.environ.get("MAIL_FROM", "noreply@alagang-mmc.local")
    MAIL_USE_TLS: bool = os.environ.get("MAIL_USE_TLS", "true").lower() == "true"