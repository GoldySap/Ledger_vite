from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models.data import (
    Investment, Holding, InvestmentTransaction,
    PriceHistory, Watchlist
)
from ..services.finnhub import get_quote, FINNHUB_API_KEY
from datetime import datetime, UTC

investment_bp = Blueprint("investments", __name__)

def _refresh_price(inv):
    """Fetch live quote from Finnhub and persist it + a price-history row."""
    try:
        quote = get_quote(inv.symbol)
        price  = quote.get("price")
        change = quote.get("change_percent", 0)
        if price and price > 0:
            inv.current_price        = price
            inv.price_change_percent = change
            inv.last_updated         = datetime.now(UTC)
            db.session.add(PriceHistory(
                investment_id=inv.id,
                price=price,
                timestamp=datetime.now(UTC)
            ))
    except Exception:
        pass   # fall back to stored price silently


def _holding_payload(holding):
    inv            = holding.investment
    current_value  = holding.quantity * inv.current_price
    invested_value = holding.quantity * holding.avg_buy_price
    gain_loss      = current_value - invested_value
    gain_loss_pct  = (gain_loss / invested_value * 100) if invested_value > 0 else 0
    return {
        "id":             holding.id,
        "investment_id":  holding.investment_id,
        "symbol":         inv.symbol,
        "name":           inv.name,
        "quantity":       holding.quantity,
        "avg_buy_price":  holding.avg_buy_price,
        "current_price":  inv.current_price,
        "change_pct":     inv.price_change_percent,
        "current_value":  round(current_value, 2),
        "invested_value": round(invested_value, 2),
        "gain_loss":      round(gain_loss, 2),
        "gain_loss_pct":  round(gain_loss_pct, 2),
    }


# ── portfolio ──────────────────────────────────────────────────────────────────

@investment_bp.route("/portfolio", methods=["GET"])
@jwt_required()
def get_portfolio():
    user_id  = get_jwt_identity()
    holdings = Holding.query.filter_by(user_id=user_id).all()

    # refresh prices for everything in the portfolio
    for h in holdings:
        _refresh_price(h.investment)
    db.session.commit()

    portfolio_data = [_holding_payload(h) for h in holdings]
    total_value    = sum(p["current_value"]  for p in portfolio_data)
    total_invested = sum(p["invested_value"] for p in portfolio_data)

    return jsonify({
        "holdings":            portfolio_data,
        "total_value":         round(total_value, 2),
        "total_invested":      round(total_invested, 2),
        "total_gain_loss":     round(total_value - total_invested, 2),
        "total_gain_loss_pct": round(
            (total_value - total_invested) / total_invested * 100, 2
        ) if total_invested > 0 else 0,
    })


# ── market / search ────────────────────────────────────────────────────────────

@investment_bp.route("/market/live", methods=["GET"])
@jwt_required()
def live_market():
    investments = Investment.query.all()
    for inv in investments:
        _refresh_price(inv)
    db.session.commit()

    return jsonify([{
        "id":            inv.id,
        "symbol":        inv.symbol,
        "name":          inv.name,
        "sector":        inv.sector,
        "current_price": inv.current_price,
        "change":        inv.price_change_percent,
    } for inv in investments])


@investment_bp.route("/investments/search", methods=["GET"])
@jwt_required()
def search_investments():
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify({"error": "Query required"}), 400

    results = Investment.query.filter(
        (Investment.symbol.ilike(f"%{query}%")) |
        (Investment.name.ilike(f"%{query}%"))
    ).limit(15).all()

    return jsonify({"results": [{
        "id":            inv.id,
        "symbol":        inv.symbol,
        "name":          inv.name,
        "sector":        inv.sector,
        "current_price": inv.current_price,
        "change":        inv.price_change_percent,
    } for inv in results]})


# ── price history (for chart) ──────────────────────────────────────────────────

@investment_bp.route("/investments/<int:investment_id>/history", methods=["GET"])
@jwt_required()
def price_history(investment_id):
    """Return the last N price-history rows for charting."""
    limit = min(int(request.args.get("limit", 90)), 365)

    rows = (
        PriceHistory.query
        .filter_by(investment_id=investment_id)
        .order_by(PriceHistory.timestamp.desc())
        .limit(limit)
        .all()
    )
    rows.reverse()   # oldest → newest

    return jsonify([{
        "price":     r.price,
        "timestamp": r.timestamp.isoformat(),
    } for r in rows])


# ── buy / sell ─────────────────────────────────────────────────────────────────

@investment_bp.route("/holdings/buy", methods=["POST"])
@jwt_required()
def buy_investment():
    user_id       = get_jwt_identity()
    data          = request.get_json()
    investment_id = data.get("investment_id")
    quantity      = data.get("quantity")

    if not investment_id or not quantity or float(quantity) <= 0:
        return jsonify({"error": "Invalid input"}), 400

    quantity = float(quantity)

    investment = Investment.query.get(investment_id)
    if not investment:
        return jsonify({"error": "Investment not found"}), 404

    # refresh price before buying
    _refresh_price(investment)
    db.session.commit()

    price_per_share = investment.current_price
    total_cost      = quantity * price_per_share

    holding = Holding.query.filter_by(user_id=user_id, investment_id=investment_id).first()
    if holding:
        old_cost              = holding.quantity * holding.avg_buy_price
        new_cost              = quantity * price_per_share
        holding.quantity      += quantity
        holding.avg_buy_price  = (old_cost + new_cost) / holding.quantity
    else:
        holding = Holding(
            user_id=user_id,
            investment_id=investment_id,
            quantity=quantity,
            avg_buy_price=price_per_share,
        )
        db.session.add(holding)
        db.session.flush()

    db.session.add(InvestmentTransaction(
        holding_id=holding.id,
        user_id=user_id,
        transaction_type="buy",
        quantity=quantity,
        price_per_share=price_per_share,
        total_value=total_cost,
    ))
    db.session.commit()

    return jsonify({
        "message":    "Purchase successful",
        "holding_id": holding.id,
        "total_cost": round(total_cost, 2),
    }), 201


@investment_bp.route("/holdings/<int:holding_id>/sell", methods=["POST"])
@jwt_required()
def sell_investment(holding_id):
    user_id  = get_jwt_identity()
    data     = request.get_json()
    quantity = data.get("quantity")

    if not quantity or float(quantity) <= 0:
        return jsonify({"error": "Invalid quantity"}), 400

    quantity = float(quantity)

    holding = Holding.query.filter_by(id=holding_id, user_id=user_id).first()
    if not holding:
        return jsonify({"error": "Holding not found"}), 404
    if holding.quantity < quantity:
        return jsonify({"error": "Insufficient shares"}), 400

    _refresh_price(holding.investment)
    db.session.commit()

    price_per_share = holding.investment.current_price
    total_proceeds  = quantity * price_per_share
    holding.quantity -= quantity

    db.session.add(InvestmentTransaction(
        holding_id=holding.id,
        user_id=user_id,
        transaction_type="sell",
        quantity=quantity,
        price_per_share=price_per_share,
        total_value=total_proceeds,
    ))

    if holding.quantity <= 0:
        db.session.delete(holding)

    db.session.commit()
    return jsonify({"message": "Sale successful", "total_proceeds": round(total_proceeds, 2)})


# ── watchlist ──────────────────────────────────────────────────────────────────

@investment_bp.route("/watchlist", methods=["GET"])
@jwt_required()
def get_watchlist():
    user_id   = get_jwt_identity()
    watchlist = Watchlist.query.filter_by(user_id=user_id).all()
    return jsonify({"watchlist": [{
        "id":            item.id,
        "investment_id": item.investment_id,
        "symbol":        item.investment.symbol,
        "name":          item.investment.name,
        "current_price": item.investment.current_price,
        "change":        item.investment.price_change_percent,
    } for item in watchlist]})


@investment_bp.route("/watchlist", methods=["POST"])
@jwt_required()
def add_to_watchlist():
    user_id = get_jwt_identity()
    data    = request.get_json()

    # Accept both investment_id and symbol so the frontend has flexibility
    investment_id = data.get("investment_id")
    symbol        = data.get("symbol", "").upper()

    if not investment_id and symbol:
        inv = Investment.query.filter_by(symbol=symbol).first()
        if inv:
            investment_id = inv.id

    if not investment_id:
        return jsonify({"error": "Invalid input"}), 400

    if Watchlist.query.filter_by(user_id=user_id, investment_id=investment_id).first():
        return jsonify({"error": "Already in watchlist"}), 409   # 409 so frontend can handle gracefully

    db.session.add(Watchlist(user_id=user_id, investment_id=investment_id))
    db.session.commit()
    return jsonify({"message": "Added to watchlist"}), 201


@investment_bp.route("/watchlist/<int:watchlist_id>", methods=["DELETE"])
@jwt_required()
def remove_from_watchlist(watchlist_id):
    user_id        = get_jwt_identity()
    watchlist_item = Watchlist.query.filter_by(id=watchlist_id, user_id=user_id).first()
    if not watchlist_item:
        return jsonify({"error": "Not found"}), 404
    db.session.delete(watchlist_item)
    db.session.commit()
    return jsonify({"success": True})
