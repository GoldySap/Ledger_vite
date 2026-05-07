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
    columns = [c.name for c in Subscription.__table__.columns]
    data = []
    for s in subs:
        row = {col: getattr(s, col) for col in columns}
        data.append(row)

    return jsonify({
        "columns": columns,
        "data": data
    })

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
    pro = Subscription.query.filter_by(label="pro").first()
    if not pro:
        return jsonify({"error": "Pro plan not found"}), 404

    user.subscription_id = pro.id
    db.session.commit()
    return jsonify({"label": pro.label, "price": pro.price})