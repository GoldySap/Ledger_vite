import os
from datetime import timedelta

class Config:
    IS_PROD = os.environ.get("FLASK_ENV") == "production"

    SECRET_KEY = os.environ.get("SECRET_KEY")

    DATABASE_USER = os.environ.get("DB_USER", "root")
    DATABASE_PASSWORD = os.environ.get("DB_PASSWORD", "")
    DATABASE_HOST = os.environ.get("DB_HOST", "localhost")
    DATABASE_NAME = os.environ.get("DB_NAME", "ledger")
    LOCAL_DB = f"mysql+pymysql://{DATABASE_USER}:{DATABASE_PASSWORD}@{DATABASE_HOST}/{DATABASE_NAME}"

    SUBABASE_DB_URL = os.environ.get("SUPABASE_SESSION_POOL_URL", "")
    EXTERNAL_DB_URL = os.environ.get("RENDER_DB_URL_EXTERNAL", "")
    INTERNAL_DB_URL = os.environ.get("RENDER_DB_URL_INTERNAL", "")
    SUBA_URL = f"postgresql+psycopg2://{SUBABASE_DB_URL}?sslmode=require"
    REND_URL = f"postgresql+psycopg2://{INTERNAL_DB_URL}?sslmode=require" if IS_PROD else f"postgresql+psycopg2://{EXTERNAL_DB_URL}?sslmode=require"

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 300,
        "pool_size": 5,
        "max_overflow": 10,
    }

    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY")

    JWT_TOKEN_LOCATION = ["cookies"]
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=15)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=7)
    JWT_COOKIE_SECURE = IS_PROD
    JWT_COOKIE_SAMESITE = "None" if IS_PROD else "Lax"
    JWT_COOKIE_HTTPONLY = True
    JWT_COOKIE_CSRF_PROTECT = True
    JWT_CSRF_IN_COOKIES = True
    JWT_CSRF_CHECK_FORM = False
    JWT_ACCESS_CSRF_COOKIE_NAME = "csrf_access_token"
    JWT_REFRESH_CSRF_COOKIE_NAME = "csrf_refresh_token"
    JWT_ACCESS_CSRF_HEADER_NAME = "X-CSRF-TOKEN"
    JWT_REFRESH_CSRF_HEADER_NAME = "X-CSRF-TOKEN"

class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = Config.SUBA_URL if os.environ.get("FLASK_USE") == "external" else Config.LOCAL_DB
    CORS_ORIGINS = list(filter(None, [
        "http://localhost:5124",
        "http://127.0.0.1:5124",
        # os.environ.get("VITE_BACKEND_URL")
    ]))


class ProductionConfig(Config):
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = Config.SUBA_URL
    CORS_ORIGINS = list(filter(None, [
        "http://localhost:5124",
        "http://127.0.0.1:5124",
        os.environ.get("VITE_FRONTEND_URL")
        # os.environ.get("VITE_BACKEND_URL")
    ]))