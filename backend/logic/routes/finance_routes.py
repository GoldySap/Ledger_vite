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

@finance_bp.route("/subscription", methods=["GET"])
@jwt_required()
def get_subscription():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    sub = user.subscription

    return jsonify({
        "label": sub.label,
        "price": sub.price
    })

@finance_bp.route("/subscription/upgrade", methods=["POST"])
@jwt_required()
def upgrade():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    pro = Subscription.query.filter_by(label="pro").first()
    user.subscription = pro

    db.session.commit()

    return jsonify({"msg": "upgraded"})