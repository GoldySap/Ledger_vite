from flask import Blueprint, jsonify
from sqlalchemy import text
from ..extensions import db
from ..models.data import User, Subscription, SecuritySettings, SubscriptionAccess
from ..routes.faq_routes import FaqItem, seed_faq
from ..routes.investment_routes import Investment
import os

debug_bp = Blueprint("debug", __name__)


@debug_bp.route("/seed-all")
def seed_all():
    db.create_all()

    subs = [
        {"label": "Free",  "price": 0.0},
        {"label": "Basic", "price": 9.99},
        {"label": "Pro",   "price": 49.99},
    ]
    for s in subs:
        if not Subscription.query.filter_by(label=s["label"]).first():
            db.session.add(Subscription(**s))
    db.session.commit()

    access_config = {
        "Free": {
            "can_export_data":             False,
            "has_finance_access":          False,
            "has_investment_access":       False,
            "has_analytics_access":        False,
            "max_accounts":                1,
            "max_portfolio_transfer_rate": 100,
        },
        "Basic": {
            "can_export_data":             True,
            "has_finance_access":          True,
            "has_investment_access":       False,
            "has_analytics_access":        False,
            "max_accounts":                3,
            "max_portfolio_transfer_rate": 500,
        },
        "Pro": {
            "can_export_data":             True,
            "has_finance_access":          True,
            "has_investment_access":       True,
            "has_analytics_access":        True,
            "max_accounts":                10,
            "max_portfolio_transfer_rate": 5000,
        },
    }
    for label, config in access_config.items():
        sub = Subscription.query.filter_by(label=label).first()
        if sub and not sub.access:
            db.session.add(SubscriptionAccess(subscription_id=sub.id, **config))
    db.session.commit()

    pro_sub        = Subscription.query.filter_by(label="Pro").first()
    ADMIN_EMAIL    = os.environ.get("ADMIN_EMAIL")
    ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD")

    admin = User.query.filter_by(email=ADMIN_EMAIL).first()
    if not admin:
        admin = User(email=ADMIN_EMAIL, role="admin", subscription_id=pro_sub.id)
        admin.set_password(ADMIN_PASSWORD)
        db.session.add(admin)
        db.session.commit()

    if not SecuritySettings.query.filter_by(user_id=admin.id).first():
        db.session.add(SecuritySettings(user_id=admin.id, verified=True))
        db.session.commit()

    stocks = [
        {"symbol": "AAPL",  "name": "Apple Inc.",        "price": 175},
        {"symbol": "TSLA",  "name": "Tesla Inc.",         "price": 250},
        {"symbol": "MSFT",  "name": "Microsoft Corp.",    "price": 320},
        {"symbol": "GOOGL", "name": "Alphabet Inc.",      "price": 2800},
        {"symbol": "AMZN",  "name": "Amazon.com Inc.",    "price": 140},
        {"symbol": "NVDA",  "name": "NVIDIA Corp.",       "price": 875},
        {"symbol": "META",  "name": "Meta Platforms Inc.","price": 485},
    ]
    for s in stocks:
        if not Investment.query.filter_by(symbol=s["symbol"]).first():
            db.session.add(Investment(
                symbol=s["symbol"],
                name=s["name"],
                current_price=s["price"],
            ))
    db.session.commit()

    seed_faq()

    return jsonify({
        "status":        "seed complete",
        "subscriptions": [s.label for s in Subscription.query.all()],
        "admin_email":   ADMIN_EMAIL,
        "faq_items":     FaqItem.query.count(),
    })


@debug_bp.route("/reset-migrations")
def reset_migrations():
    db.session.execute(text("DELETE FROM alembic_version"))
    db.session.commit()
    db.drop_all()
    db.create_all()
    return {"status": "migration reset"}
