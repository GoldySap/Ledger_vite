from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models.data import Transaction
from ..extensions import db

page_bp = Blueprint("pages", __name__)

@page_bp.route("/transactions", methods=["GET"])
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

@page_bp.route("/transactions", methods=["GET"])
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