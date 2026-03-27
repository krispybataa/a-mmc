import os
from .BaseConfig import BaseConfig
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

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