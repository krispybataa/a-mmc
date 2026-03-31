import os
from .BaseConfig import BaseConfig
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

class ProductionConfig(BaseConfig):
    DEBUG: bool = False
    SQLALCHEMY_DATABASE_URI: str = os.environ.get("SQLALCHEMY_DATABASE_URI") or os.environ.get("DATABASE_URL")