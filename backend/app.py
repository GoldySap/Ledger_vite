import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from logic.extensions import db, migrate, jwt
from logic.routes.debug_routes import debug_bp, seed_all
from logic.routes.admin_routes import admin_bp
from logic.routes.auth_routes import auth_bp
from logic.routes.finance_routes import finance_bp
from logic.routes.investment_routes import investment_bp
from logic.routes.transaction_routes import transaction_bp
from config import DevelopmentConfig, ProductionConfig
from dotenv import load_dotenv
from logic.extensions import limiter

load_dotenv()

def create_app():
    app = Flask(__name__)

    env = os.environ.get("FLASK_ENV", "development")
    if env == "production":
        app.config.from_object(ProductionConfig)
    else:
        app.config.from_object(DevelopmentConfig)

    CORS(app, supports_credentials=True, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}}, allow_headers=["Content-Type", "Authorization", "X-CSRF-TOKEN"], methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"], expose_headers=["Content-Type"],)

    app.register_blueprint(debug_bp)
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
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