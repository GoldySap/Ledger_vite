import os

class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "devkey")
    DATABASE_HOST = os.environ.get("DB_HOST", "localhost")
    DATABASE_USER = os.environ.get("DB_USER", "root")
    DATABASE_PASSWORD = os.environ.get("DB_PASSWORD", "")
    DATABASE_NAME = os.environ.get("DB_NAME", "ledger")
    LOCAL_DB = f"mariadb+pymysql://{DATABASE_USER}:{DATABASE_PASSWORD}@{DATABASE_HOST}/{DATABASE_NAME}"
    DATABASE_URL = os.environ.get("SUPABASE_CONNECTION_URL", LOCAL_DB)

class DevelopmentConfig(Config):
    DEBUG = True
    CORS_ORIGINS = ["http://localhost:5124"]

class ProductionConfig(Config):
    DEBUG = False
    CORS_ORIGINS = ["https://ledger-vite.vercel.app"]