import os
from .BaseConfig import BaseConfig
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

class DevelopmentConfig(BaseConfig):
    DEBUG: bool = True
    # Cookies do not require HTTPS over localhost
    JWT_COOKIE_SECURE: bool = False
    SQLALCHEMY_DATABASE_URI: str = (
        f"postgresql://"
        f"{os.environ.get('DB_USER', 'postgres')}:"
        f"{os.environ.get('DB_PASSWORD', 'postgres')}@"
        f"{os.environ.get('DB_HOST', 'localhost')}:"
        f"{os.environ.get('DB_PORT', '5432')}/"
        f"{os.environ.get('DB_NAME', 'ammc_dev')}"
    )