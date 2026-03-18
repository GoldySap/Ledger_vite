from flask import Blueprint, jsonify
from sqlalchemy import text
from ..extensions import db
from ..models.data import User, Subscription
import os

debug_bp = Blueprint("debug", __name__)

@debug_bp.route("/reset-migrations")
def reset_migrations():

    db.session.execute(text("DELETE FROM alembic_version"))
    db.session.commit()
    from app import db
    db.drop_all()
    db.create_all()

    return {"status": "migration reset"}

seed_bp = Blueprint("seed", __name__)

@seed_bp.route("/seed-admin")
def seed_admin():
    db.create_all()

    sub = Subscription.query.filter_by(label="Pro").first()
    if not sub:
        sub = Subscription(label="Pro", price=49.99)
        db.session.add(sub)
        db.session.commit()

    admin = User.query.filter_by(email="admin@test.com").first()
    if not admin:
        admin = User(
            email="admin@test.com", 
            role="admin", 
            subscription_id=sub.id
        )
        admin.set_password("Admin123!")
        db.session.add(admin)
        db.session.commit()

    return jsonify({"status": "admin seeded", "email": "admin@test.com", "password": "Admin123!"})

seed_all_bp = Blueprint("seed_all", __name__)

@seed_all_bp.route("/seed-all")
def seed_all():
    db.create_all()

    default_subscriptions = [
        {"label": "Free", "price": 0.0},
        {"label": "Basic", "price": 9.99},
        {"label": "Pro", "price": 49.99},
    ]

    for sub_data in default_subscriptions:
        sub = Subscription.query.filter_by(label=sub_data["label"]).first()
        if not sub:
            sub = Subscription(label=sub_data["label"], price=sub_data["price"])
            db.session.add(sub)
    db.session.commit()

    pro_sub = Subscription.query.filter_by(label="Pro").first()

    ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL")
    ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD")
    admin = User.query.filter_by(email=ADMIN_EMAIL).first()
    if not admin:
        admin = User(
            email=ADMIN_EMAIL,
            role="admin",
            subscription_id=pro_sub.id,
        )
        admin.set_password(ADMIN_PASSWORD)
        db.session.add(admin)
    db.session.commit()

    return jsonify({
        "status": "seed complete",
        "subscriptions": [sub.label for sub in Subscription.query.all()],
        "admin_email": ADMIN_EMAIL,
        "admin_password": ADMIN_PASSWORD
    })