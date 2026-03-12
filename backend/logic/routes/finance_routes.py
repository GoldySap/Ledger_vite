from flask import Blueprint, jsonify, request
from ..models.data import Transaction
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