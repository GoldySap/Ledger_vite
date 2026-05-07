from flask_jwt_extended import jwt_required, get_jwt_identity
from flask import Blueprint, request, jsonify
from logic.extensions import limiter
from ..extensions import db
from ..models.data import User, Account, Subscription, SubscriptionAccess

def can_create_account(user):
    if not user.subscription or not user.subscription.access:
        return False
    
    max_accounts = user.subscription.access.max_accounts
    current_count = Account.query.filter_by(user_id=user.id).count()
    return current_count <= max_accounts

accounts_bp = Blueprint("accounts", __name__, url_prefix="/api/accounts")

@accounts_bp.route("/get", methods=["GET"])
@limiter.limit("10 per minute")
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

    print(f"User ID: {user.id}")
    print(f"User subscription_id: {user.subscription_id}")
    print(f"User.subscription: {user.subscription}")
    if user.subscription:
        print(f"Subscription ID: {user.subscription.id}")
        print(f"Subscription.access: {user.subscription.access}")

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

@accounts_bp.route("/<int:id>/update", methods=["PUT"])
@jwt_required()
def update_account(id):
    user_id = get_jwt_identity()
    acc = Account.query.get(id)

    if not acc or acc.user_id != user_id:
        return jsonify({"error": "Not found"}), 404

    data = request.get_json()

    if "name" in data:
        acc.name = data["name"]

    if "provider" in data:
        acc.provider = data["provider"]

    if "last4" in data:
        if len(data["last4"]) != 4 or not data["last4"].isdigit():
            return jsonify({"error": "Invalid last4"}), 400
        acc.last4 = data["last4"]

    db.session.commit()

    return jsonify({"success": True})

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

@accounts_bp.route("/<int:id>/delete", methods=["DELETE"])
@limiter.limit("10 per minute")
@jwt_required()
def delete_account(id):
    user_id = get_jwt_identity()

    acc = Account.query.get(id)

    if not acc or acc.user_id != user_id:
        return jsonify({"error": "Not found"}), 404

    db.session.delete(acc)
    db.session.commit()

    return jsonify({"success": True})