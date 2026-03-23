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



class DevelopmentConfig(BaseConfig):
    DEBUG: bool = True
    SQLALCHEMY_DATABASE_URI: str = (
        "postgresql://{user}:{password}@{host}:{port}/{name}".format(
            user=os.environ.get("DB_USER", "postgres"),
            password=os.environ.get("DB_PASSWORD", "postgres"),
            host=os.environ.get("DB_HOST", "localhost"),
            port=os.environ.get("DB_PORT", "5432"),
            name=os.environ.get("DB_NAME", "ammc_dev"),
        )
    )


class ProductionConfig(BaseConfig):
    DEBUG: bool = False
    SQLALCHEMY_DATABASE_URI: str = (
        "postgresql://{user}:{password}@{host}:{port}/{name}".format(
            user=os.environ.get("DB_USER"),
            password=os.environ.get("DB_PASSWORD"),
            host=os.environ.get("DB_HOST"),
            port=os.environ.get("DB_PORT", "5432"),
            name=os.environ.get("DB_NAME"),
        )
    )


config_by_name: dict = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
}
