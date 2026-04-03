import os
from .BaseConfig import BaseConfig
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

class DevelopmentConfig(BaseConfig):
    DEBUG: bool = True
    # Cookies do not require HTTPS over localhost
    JWT_COOKIE_SECURE: bool = False
    database_url = os.environ.get("DATABASE_URL")

    if database_url:
        SQLALCHEMY_DATABASE_URI = database_url
    else:
        SQLALCHEMY_DATABASE_URI = (
            f"postgresql://{os.getenv('POSTGRES_USER')}:"
            f"{os.getenv('POSTGRES_PASSWORD')}@"
            f"{os.getenv('POSTGRES_HOST')}:"
            f"{os.getenv('POSTGRES_PORT')}/"
            f"{os.getenv('POSTGRES_DB')}"
        )