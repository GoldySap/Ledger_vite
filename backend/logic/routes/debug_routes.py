from flask import Blueprint, jsonify
from sqlalchemy import text
from ..extensions import db
from ..models.data import User, Subscription, SecuritySettings
from ..routes.investment_routes import Investment
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

@debug_bp.route("/seed-all")
def seed_all():
    db.create_all()

    subs = [
        {"label": "Free", "price": 0.0},
        {"label": "Basic", "price": 9.99},
        {"label": "Pro", "price": 49.99}
    ]
    for s in subs:
        if not Subscription.query.filter_by(label=s["label"]).first():
            db.session.add(Subscription(**s))
    db.session.commit()

    pro_sub = Subscription.query.filter_by(label="Pro").first()

    ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL")
    ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD")
    admin = User.query.filter_by(email=ADMIN_EMAIL).first()
    if not admin:
        admin = User(email=ADMIN_EMAIL, role="admin", subscription_id=pro_sub.id)
        admin.set_password(ADMIN_PASSWORD)
        db.session.add(admin)
    db.session.commit()
    adminsec = User.query.filter_by(email=ADMIN_EMAIL).first()
    db.session.add(SecuritySettings(user_id=adminsec.id, verified=True))
    db.session.commit()

    stocks = [
        {"symbol": "AAPL", "name": "Apple Inc.", "price": 175},
        {"symbol": "TSLA", "name": "Tesla Inc.", "price": 250},
        {"symbol": "MSFT", "name": "Microsoft Corp.", "price": 320},
        {"symbol": "GOOGL", "name": "Alphabet Inc.", "price": 2800},
        {"symbol": "AMZN", "name": "Amazon.com Inc.", "price": 140},
    ]

    for s in stocks:
        inv = Investment(
            symbol=s["symbol"],
            name=s["name"],
            current_price=s["price"]
        )
        db.session.add(inv)
    db.session.commit()

    return jsonify({
        "status": "seed complete",
        "subscriptions": [s.label for s in Subscription.query.all()],
        "admin_email": ADMIN_EMAIL
    })