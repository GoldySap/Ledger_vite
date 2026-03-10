import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from config import DevelopmentConfig, ProductionConfig
from logic.routes.finance_routes import finance_bp
from logic.extensions import db, jwt

from logic.routes.auth_routes import auth_bp
from logic.routes.transaction_routes import transaction_bp

db = SQLAlchemy()

def create_app():
    app = Flask(__name__)

    env = os.environ.get("FLASK_ENV", "development")
    
    if env == "production":
        app.config.from_object(ProductionConfig)
    else:
        app.config.from_object(DevelopmentConfig)

    app.config["SQLALCHEMY_DATABASE_URI"] = app.config["DATABASE_URL"]
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
        "pool_pre_ping": True,
        "pool_recycle": 300,
        "pool_size": 5,
        "max_overflow": 10,
    }

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(transaction_bp, url_prefix="/api")
    app.register_blueprint(finance_bp, url_prefix="/api")

    db.init_app(app)

    CORS(app, origins=app.config["CORS_ORIGINS"])

    @app.route("/api/health")
    def health():
        return jsonify({"status": "ok"})

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)