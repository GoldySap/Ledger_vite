import os
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from . import investment_bp
from ..extensions import db
from ..models.data import (Transaction, Investment, Holding, InvestmentTransaction, PriceHistory, Watchlist, PriceAlert)
from datetime import datetime, timedelta

FINNHUB_API_KEY = os.environ.get("FINNHUB_API_KEY")

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

@investment_bp.route("/portfolio", methods=["GET"])
@jwt_required()
def get_portfolio():
    user_id = get_jwt_identity()
    holdings = Holding.query.filter_by(user_id=user_id).all()
    portfolio_data = []
    total_value = 0
    total_invested = 0
    for holding in holdings:
        current_value = holding.quantity * holding.investment.current_price
        invested_value = holding.quantity * holding.avg_buy_price
        gain_loss = current_value - invested_value
        gain_loss_pct = (gain_loss / invested_value * 100) if invested_value > 0 else 0
        portfolio_data.append({
            "id": holding.id,
            "symbol": holding.investment.symbol,
            "name": holding.investment.name,
            "quantity": holding.quantity,
            "avg_buy_price": holding.avg_buy_price,
            "current_price": holding.investment.current_price,
            "current_value": round(current_value, 2),
            "invested_value": round(invested_value, 2),
            "gain_loss": round(gain_loss, 2),
            "gain_loss_pct": round(gain_loss_pct, 2),
        })
        total_value += current_value
        total_invested += invested_value
    
    return jsonify({
        "holdings": portfolio_data,
        "total_value": round(total_value, 2),
        "total_invested": round(total_invested, 2),
        "total_gain_loss": round(total_value - total_invested, 2),
        "total_gain_loss_pct": round((total_value - total_invested) / total_invested * 100, 2) if total_invested > 0 else 0,
    })

@investment_bp.route("/investments", methods=["GET"])
@jwt_required()
def get_investments():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    investments = Investment.query.paginate(page=page, per_page=per_page)
    data = [{
        "id": inv.id,
        "symbol": inv.symbol,
        "name": inv.name,
        "asset_type": inv.asset_type,
        "current_price": inv.current_price,
        "last_updated": inv.last_updated.isoformat(),
    } for inv in investments.items]
    
    return jsonify({
        "investments": data,
        "total": investments.total,
        "pages": investments.pages,
        "current_page": page,
    })

@investment_bp.route("/investments/search", methods=["GET"])
@jwt_required()
def search_investments():
    query = request.args.get("q", "").upper()
    if not query or len(query) < 1:
        return jsonify({"error": "Query too short"}), 400
    results = Investment.query.filter(
        (Investment.symbol.ilike(f"%{query}%")) |
        (Investment.name.ilike(f"%{query}%"))
    ).limit(10).all()
    data = [{
        "id": inv.id,
        "symbol": inv.symbol,
        "name": inv.name,
        "current_price": inv.current_price,
    } for inv in results]
    
    return jsonify({"results": data})

@investment_bp.route("/holdings/buy", methods=["POST"])
@jwt_required()
def buy_investment():
    user_id = get_jwt_identity()
    data = request.get_json()
    investment_id = data.get("investment_id")
    quantity = data.get("quantity")
    if not investment_id or not quantity or quantity <= 0:
        return jsonify({"error": "Invalid input"}), 400
    investment = Investment.query.get(investment_id)
    if not investment:
        return jsonify({"error": "Investment not found"}), 404
    price_per_share = investment.current_price
    total_cost = quantity * price_per_share
    holding = Holding.query.filter_by(
        user_id=user_id, 
        investment_id=investment_id
    ).first()
    if holding:
        old_cost = holding.quantity * holding.avg_buy_price
        new_cost = quantity * price_per_share
        holding.quantity += quantity
        holding.avg_buy_price = (old_cost + new_cost) / holding.quantity
    else:
        holding = Holding(
            user_id=user_id,
            investment_id=investment_id,
            quantity=quantity,
            avg_buy_price=price_per_share,
        )
        db.session.add(holding)
    transaction = InvestmentTransaction(
        holding_id=holding.id,
        user_id=user_id,
        transaction_type="buy",
        quantity=quantity,
        price_per_share=price_per_share,
        total_value=total_cost,
    )
    db.session.add(transaction)
    db.session.commit()
    
    return jsonify({
        "message": "Purchase successful",
        "holding_id": holding.id,
        "total_cost": round(total_cost, 2),
    }), 201

@investment_bp.route("/holdings/<int:holding_id>/sell", methods=["POST"])
@jwt_required()
def sell_investment(holding_id):
    user_id = get_jwt_identity()
    data = request.get_json()
    quantity = data.get("quantity")
    if not quantity or quantity <= 0:
        return jsonify({"error": "Invalid quantity"}), 400
    holding = Holding.query.filter_by(id=holding_id, user_id=user_id).first()
    if not holding:
        return jsonify({"error": "Holding not found"}), 404
    if holding.quantity < quantity:
        return jsonify({"error": "Insufficient shares"}), 400
    price_per_share = holding.investment.current_price
    total_proceeds = quantity * price_per_share
    holding.quantity -= quantity
    transaction = InvestmentTransaction(
        holding_id=holding.id,
        user_id=user_id,
        transaction_type="sell",
        quantity=quantity,
        price_per_share=price_per_share,
        total_value=total_proceeds,
    )
    db.session.add(transaction)
    if holding.quantity == 0:
        db.session.delete(holding)
    db.session.commit()

    return jsonify({
        "message": "Sale successful",
        "total_proceeds": round(total_proceeds, 2),
    })

@investment_bp.route("/watchlist", methods=["GET"])
@jwt_required()
def get_watchlist():
    user_id = get_jwt_identity()
    watchlist = Watchlist.query.filter_by(user_id=user_id).all()
    data = [{
        "id": item.id,
        "symbol": item.investment.symbol,
        "name": item.investment.name,
        "current_price": item.investment.current_price,
        "investment_id": item.investment_id,
    } for item in watchlist]
    
    return jsonify({"watchlist": data})

@investment_bp.route("/watchlist", methods=["POST"])
@jwt_required()
def add_to_watchlist():
    user_id = get_jwt_identity()
    data = request.get_json()
    investment_id = data.get("investment_id")
    if not investment_id:
        return jsonify({"error": "Invalid input"}), 400
    existing = Watchlist.query.filter_by(
        user_id=user_id,
        investment_id=investment_id
    ).first()
    if existing:
        return jsonify({"error": "Already in watchlist"}), 400
    watchlist_item = Watchlist(user_id=user_id, investment_id=investment_id)
    db.session.add(watchlist_item)
    db.session.commit()
    
    return jsonify({"message": "Added to watchlist"}), 201

@investment_bp.route("/watchlist/<int:watchlist_id>", methods=["DELETE"])
@jwt_required()
def remove_from_watchlist(watchlist_id):
    user_id = get_jwt_identity()
    watchlist_item = Watchlist.query.filter_by(id=watchlist_id, user_id=user_id).first()
    if not watchlist_item:
        return jsonify({"error": "Not found"}), 404
    