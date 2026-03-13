from flask import Blueprint, jsonify
from sqlalchemy import text
from ..extensions import db
from ..models.data import User, Subscription

debug_bp = Blueprint("debug", __name__)

@debug_bp.route("/reset-migrations")
def reset_migrations():

    db.session.execute(text("DELETE FROM alembic_version"))
    db.session.commit()

    return {"status": "migration reset"}

seed_bp = Blueprint("seed", __name__)

@seed_bp.route("/seed-admin")
def seed_admin():
    # Create a default subscription
    sub = Subscription.query.filter_by(label="Pro").first()
    if not sub:
        sub = Subscription(label="Pro", price=49.99)
        db.session.add(sub)
        db.session.commit()

    # Create admin user
    admin = User.query.filter_by(email="admin@test.com").first()
    if not admin:
        admin = User(email="admin@test.com", role="admin", subscription_id=sub.id)
        admin.set_password("Admin123!")
        db.session.add(admin)
        db.session.commit()

    return jsonify({"status": "admin seeded", "email": "admin@test.com", "password": "Admin123!"})