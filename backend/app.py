import os
from flask import Flask, jsonify
from flask_cors import CORS
from logic.extensions import db, migrate, jwt
from logic.routes.debug_routes import debug_bp, seed_all
from logic.routes.faq_routes import faq_bp
from logic.routes.admin_routes import admin_bp
from logic.routes.auth_routes import auth_bp
from logic.routes.finance_routes import finance_bp
from logic.routes.investment_routes import investment_bp
from logic.routes.transaction_routes import transaction_bp
from logic.routes.security import security_bp
from logic.routes.accounts_routes import accounts_bp
from config import DevelopmentConfig, ProductionConfig
from dotenv import load_dotenv
from logic.extensions import limiter

load_dotenv()

NEEDED_ENV_VARIABLES = [
    "SECRET_KEY", "JWT_SECRET_KEY", "CARD_ENCRYPTION_KEY", "FLASK_ENV", "VITE_FRONTEND_URL", 
    "VITE_BACKEND_URL", "FLASK_USE", "DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME", 
    "SUBABASE_DB_URL", "SUPABASE_SESSION_POOL_URL", "RENDER_DB_URL_EXTERNAL", 
    "RENDER_DB_URL_INTERNAL", "DATADOG_API_KEY", "ADMIN_EMAIL", "ADMIN_PASSWORD", 
    "EMAIL_USER", "EMAIL_APP_PASSWORD", "FINNHUB_API_KEY", "TURNSTILE_SECRET_KEY"
]

def _check_required_env():
    missing = [k for k in NEEDED_ENV_VARIABLES if not os.environ.get(k)]
    if missing:
        raise RuntimeError(
            f"Missing required environment variables: {', '.join(missing)}\n"
        )

def create_app():
    _check_required_env()
    app = Flask(__name__)

    env = os.environ.get("FLASK_ENV", "development")
    if env == "production":
        app.config.from_object(ProductionConfig)
    else:
        app.config.from_object(DevelopmentConfig)

    CORS(app, supports_credentials=True, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}}, allow_headers=["Content-Type", "Authorization", "X-CSRF-TOKEN"], methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]) # "X-CSRF-TOKEN-ACCESS", "X-CSRF-TOKEN-REFRESH"

    app.register_blueprint(debug_bp)
    app.register_blueprint(faq_bp)
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(security_bp, url_prefix="/api/security")
    app.register_blueprint(accounts_bp, url_prefix="/api/accounts")
    app.register_blueprint(finance_bp, url_prefix="/api")
    app.register_blueprint(investment_bp, url_prefix="/api/investment")
    app.register_blueprint(transaction_bp, url_prefix="/api")

    @app.route("/api/health")
    def health():
        return jsonify({"status": "ok"})

    return app

app = create_app()

limiter.init_app(app)
db.init_app(app)
migrate.init_app(app, db)
jwt.init_app(app)

with app.app_context():
    if os.environ.get("FLASK_ENV") == "development":
        db.drop_all()
        db.create_all()
        seed_all()
        db.engine.connect()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)

# run command: gunicorn --bind 0.0.0.0:5000 app:app or flask run --host=localhost --port=5000 or flask run
# Ctrl+Shift+P Select Interpreter