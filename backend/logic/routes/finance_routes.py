from flask_jwt_extended import jwt_required, get_jwt_identity
from flask import Blueprint, jsonify, request
from ..models.data import Transaction, User, Subscription
from ..extensions import db

finance_bp = Blueprint("finance", __name__)

@finance_bp.route("/transactions", methods=["GET"])
def get_transactions():
    user_id = request.args.get("user_id")
    transactions = Transaction.query.filter_by(user_id=user_id).all()
    result = []

    for t in transactions:
        result.append({
            "id": t.id,
            "type": t.type,
            "category": t.category,
            "amount": t.amount
        })

    return jsonify(result)

@finance_bp.route("/subscription/subs", methods=["GET"])
@jwt_required()
def get_subscriptions():
    subs = Subscription.query.all()

    data = []

    for s in subs:
        access = s.access
        features = []
        if access:
            features.append(f"{access.max_accounts} accounts")
            features.append(f"${access.max_portfolio_transfer_rate:,}/mo transfers")
            if access.has_finance_access:
                features.append("Finance access")
            if access.has_investment_access:
                features.append("Investment access")
            if access.has_analytics_access:
                features.append("Advanced analytics")
            if access.can_export_data:
                features.append("Data export")

        data.append({
            "id": s.id,
            "label": s.label,
            "price": s.price,
            "features": features
        })
    return jsonify(data)

@finance_bp.route("/subscription/user", methods=["GET"])
@jwt_required()
def get_subscription():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))

    if not user or not user.subscription:
        sub = Subscription.query.get(1)
        if not sub:
            return jsonify({"error": "No subscription plans found"}), 500
        return jsonify({"label": sub.label, "price": sub.price})

    sub = user.subscription
    return jsonify({"label": sub.label, "price": sub.price})


@finance_bp.route("/subscription/upgrade", methods=["POST"])
@jwt_required()
def upgrade_subscription():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    chosensub = request.get_json()["subscription_id"]
    tosub = Subscription.query.filter_by(id=chosensub).first()
    if not tosub:
        return jsonify({"error": "Plan not found"}), 404

    user.subscription_id = tosub.id
    db.session.commit()
    return jsonify({"label": tosub.label, "price": tosub.price})