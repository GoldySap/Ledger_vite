import os
from flask import Flask, jsonify
from flask_cors import CORS
from logic.extensions import db, migrate, jwt
from logic.routes.debug_routes import debug_bp
from logic.routes.auth_routes import auth_bp
from logic.routes.finance_routes import finance_bp
from logic.routes.investment_routes import investment_bp
from logic.routes.transaction_routes import transaction_bp
from config import DevelopmentConfig, ProductionConfig
from dotenv import load_dotenv

load_dotenv()

def create_app():
    app = Flask(__name__)

    env = os.environ.get("FLASK_ENV", "development")
    if env == "production":
        app.config.from_object(ProductionConfig)
    else:
        app.config.from_object(DevelopmentConfig)

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    CORS(app, supports_credentials=True, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}},)

    app.register_blueprint(debug_bp)
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(finance_bp, url_prefix="/api")
    app.register_blueprint(investment_bp, url_prefix="/api")
    app.register_blueprint(transaction_bp, url_prefix="/api")

    @app.route("/api/health")
    def health():
        return jsonify({"status": "ok"})

    return app

app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)