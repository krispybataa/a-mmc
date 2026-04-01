import os
from .BaseConfig import BaseConfig
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

class DevelopmentConfig(BaseConfig):
    DEBUG: bool = True
    # Cookies do not require HTTPS over localhost
    JWT_COOKIE_SECURE: bool = False
    SQLALCHEMY_DATABASE_URI: str = os.environ.get("SQLALCHEMY_DATABASE_URI") or os.environ.get("DATABASE_URL")
