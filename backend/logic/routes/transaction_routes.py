from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models.data import Transaction

transaction_bp = Blueprint("transactions", __name__)

@transaction_bp.route("/transactions")
@jwt_required()
def get_transactions():
    user_id = get_jwt_identity()
    transactions = Transaction.query.filter_by(user_id=user_id).all()
    result = []

    for t in transactions:
        result.append({
            "id": t.id,
            "amount": t.amount,
            "category": t.category
        })

    return jsonify(result)