from flask import Blueprint, jsonify, request
from ..models.data import Transaction
from ..extensions import db

investment_bp = Blueprint("investments", __name__)

@investment_bp.route("/transactions", methods=["GET"])
def get_investments():
    user_id = request.args.get("user_id")
    investments = Transaction.query.filter_by(user_id=user_id).all()
    result = []

    for t in investments:
        result.append({
            "id": t.id,
            "type": t.type,
            "category": t.category,
            "amount": t.amount
        })

    return jsonify(result)