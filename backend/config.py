import os

class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "devkey")

    DATABASE_USER = os.environ.get("DB_USER", "root")
    DATABASE_PASSWORD = os.environ.get("DB_PASSWORD", "")
    DATABASE_HOST = os.environ.get("DB_HOST", "localhost")
    DATABASE_NAME = os.environ.get("DB_NAME", "ledger")
    LOCAL_DB = f"mysql+pymysql://{DATABASE_USER}:{DATABASE_PASSWORD}@{DATABASE_HOST}/{DATABASE_NAME}"

    EXTERNAL_DB_URL = os.environ.get("RENDER_DB_URL_EXTERNAL", "")
    INTERNAL_DB_URL = os.environ.get("RENDER_DB_URL_INTERNAL", "")
    DB_URL = f"postgresql+psycopg2://{INTERNAL_DB_URL}" if os.environ.get("FLASK_ENV") == "production" else f"postgresql+psycopg2://{EXTERNAL_DB_URL}"

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 300,
        "pool_size": 5,
        "max_overflow": 10,
    }

class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = Config.DB_URL if os.environ.get("FLASK_USE") == "external" else Config.LOCAL_DB
    CORS_ORIGINS = ["http://localhost:5124"]


class ProductionConfig(Config):
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = Config.DB_URL
    CORS_ORIGINS = ["https://ledger-vite.vercel.app"]