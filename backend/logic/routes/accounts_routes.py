from flask_jwt_extended import jwt_required, get_jwt_identity
from flask import Blueprint, request, jsonify
from logic.extensions import limiter
from ..extensions import db
from ..models.data import User, Account, Subscription, SubscriptionAccess

def can_create_account(user):
    sub = Subscription.query.filter_by(id=user.subscription_id).first()
    access = SubscriptionAccess.query.filter_by(subscription_id=sub.id).first()
    max_accounts = access.max_accounts
    current = Account.query.filter_by(user_id=user.id).count()
    return current < max_accounts

accounts_bp = Blueprint("accounts", __name__, url_prefix="/api/accounts")

@accounts_bp.route("/get", methods=["GET"])
@limiter.limit("5 per minute")
@jwt_required()
def get_accounts():
    user_id = get_jwt_identity()

    accounts = Account.query.filter_by(user_id=user_id).all()

    return jsonify([
        {
            "id": a.id,
            "name": a.name,
            "provider": a.provider,
            "last4": a.last4,
            "balance": a.balance,
            "currency": a.currency,
            "is_primary": a.is_primary
        }
        for a in accounts
    ])

@accounts_bp.route("/create", methods=["POST"])
@limiter.limit("5 per minute")
@jwt_required()
def create_account():
    user = User.query.get(get_jwt_identity())
    
    if not user.subscription_id:
        return jsonify({"error": "No subscription"}), 403
    if not can_create_account(user):
        return jsonify({"error": "Account limit reached"}), 403

    data = request.get_json()

    account = Account(
        user_id=user.id,
        name=data["name"],
        provider=data.get("provider"),
        last4=data.get("last4"),
        balance=data.get("balance", 0),
        currency=data.get("currency", "USD"),
        is_primary=False
    )

    db.session.add(account)
    db.session.commit()

    return jsonify({"msg": "created"})

@accounts_bp.route("/<int:id>/primary", methods=["POST"])
@limiter.limit("10 per minute")
@jwt_required()
def set_primary(id):
    user_id = get_jwt_identity()

    Account.query.filter_by(user_id=user_id).update({"is_primary": False})

    acc = Account.query.get(id)
    if not acc or acc.user_id != user_id:
        return jsonify({"error": "Not found"}), 404

    acc.is_primary = True
    db.session.commit()

    return jsonify({"success": True})