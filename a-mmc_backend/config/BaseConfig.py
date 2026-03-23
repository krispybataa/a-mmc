import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

class BaseConfig:
    SECRET_KEY: str = os.environ.get("SECRET_KEY", "change-me-before-production")
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