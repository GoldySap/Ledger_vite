import os

class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "devkey")
    MARIADB_HOST = os.environ.get("MARIADB_HOST", "localhost")
    MARIADB_USER = os.environ.get("MARIADB_USER", "root")
    MARIADB_PASSWORD = os.environ.get("MARIADB_PASSWORD", "")
    MARIADB_DB = os.environ.get("MARIADB_DB", "ledger")

class DevelopmentConfig(Config):
    DEBUG = True
    CORS_ORIGINS = ["http://localhost:5124"]

class ProductionConfig(Config):
    DEBUG = False
    CORS_ORIGINS = ["https://ledger-vite.vercel.app"]