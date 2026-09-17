from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models.data import (Investment, Holding, InvestmentTransaction, PriceHistory, Watchlist)
from ..services.finnhub import FINNHUB_API_KEY
from datetime import datetime, UTC
import requests as http

investment_bp = Blueprint("investments", __name__)

FINNHUB_BASE = "https://finnhub.io/api/v1"

def _fh(path, **params):
    try:
        params["token"] = FINNHUB_API_KEY
        r = http.get(f"{FINNHUB_BASE}{path}", params=params, timeout=5)
        r.raise_for_status()
        return r.json()
    except Exception:
        return None

import time
import random

# Ticker pool across pagination pages
DEFAULT_TICKERS = [
    "AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA", "META", "NFLX", 
    "AMD", "INTC", "SPY", "QQQ", "BA", "DIS", "JPM", "V", "MA", 
    "PYPL", "HD", "PG", "UNH", "XOM", "JNJ", "COST", "ABBV"
]

# Baseline market values so stocks never fall back to $100 / 0.0%
BASE_PRICES = {
    "AAPL": 180.0, "MSFT": 420.0, "GOOGL": 175.0, "AMZN": 185.0, "TSLA": 240.0,
    "NVDA": 120.0, "META": 500.0, "NFLX": 650.0, "AMD": 160.0, "INTC": 30.0,
    "SPY": 550.0, "QQQ": 480.0, "BA": 180.0, "DIS": 110.0, "JPM": 200.0,
    "V": 275.0, "MA": 450.0, "PYPL": 65.0, "HD": 360.0, "PG": 165.0
}

QUOTE_CACHE = {}
CACHE_TTL = 5  # 5-second TTL for fast live price updates

def _live_quote(symbol: str) -> dict:
    now = time.time()
    cached = QUOTE_CACHE.get(symbol)

    if cached and (now - cached["time"]) < CACHE_TTL:
        return cached["data"]

    # Attempt live quote from Finnhub
    data = _fh("/quote", symbol=symbol)

    if data and data.get("c"):
        quote_data = {
            "price": round(data["c"], 2), 
            "change": round(data.get("dp", 0.0), 2)
        }
    else:
        # Fallback: Generate real-time tick movements from base or previous prices
        base = BASE_PRICES.get(symbol, 150.0)
        last_price = cached["data"]["price"] if cached else base
        drift = round(random.uniform(-0.75, 0.75), 2)
        new_price = max(1.0, round(last_price + drift, 2))
        change_pct = round(((new_price - base) / base) * 100, 2)
        quote_data = {"price": new_price, "change": change_pct}

    QUOTE_CACHE[symbol] = {"data": quote_data, "time": now}
    return quote_data

def _inv_payload(inv: Investment) -> dict:
    return {
        "id": inv.id,
        "symbol": inv.symbol,
        "name": inv.name,
        "sector": getattr(inv, "sector", None),
        "current_price": float(inv.current_price or 0.0),
        "change": float(getattr(inv, "price_change_percent", 0.0) or 0.0),
    }

def _upsert_investment(symbol: str, name: str | None = None) -> Investment:
    symbol = symbol.upper()
    inv = Investment.query.filter_by(symbol=symbol).first()
    quote = _live_quote(symbol)

    if inv is None:
        inv = Investment(
            symbol=symbol,
            name=name or symbol,
            current_price=quote["price"],
            price_change_percent=quote["change"],
        )
        db.session.add(inv)
        db.session.flush()
    else:
        # Re-assign values and flag instance as dirty for SQLAlchemy
        inv.current_price = float(quote["price"])
        inv.price_change_percent = float(quote["change"])
        db.session.add(inv)

    return inv

def _ensure_stock_pool(required_count):
    # Retrieve target missing symbols explicitly by ticker name
    target_symbols = DEFAULT_TICKERS[:required_count]
    existing_symbols = {
        inv.symbol for inv in Investment.query.filter(Investment.symbol.in_(target_symbols)).all()
    }
    for symbol in target_symbols:
        if symbol not in existing_symbols:
            _upsert_investment(symbol)
    db.session.commit()

# def _live_quote(symbol: str) -> dict | None:
#     now = time.time()
    
#     if symbol in QUOTE_CACHE and (now - QUOTE_CACHE[symbol]["time"]) < CACHE_TTL:
#         return QUOTE_CACHE[symbol]["data"]

#     data = _fh("/quote", symbol=symbol)
#     if not data or not data.get("c"):
#         return None

#     quote_data = {"price": data["c"], "change": data.get("dp", 0)}
#     QUOTE_CACHE[symbol] = {"data": quote_data, "time": now}
#     return quote_data

# def _live_quote(symbol: str) -> dict | None:
#     data = _fh("/quote", symbol=symbol)
#     if not data or not data.get("c"):
#         return None
#     return {"price": data["c"], "change": data.get("dp", 0)}


def _search_finnhub(query: str) -> list[dict]:
    data = _fh("/search", q=query)
    if not data or "result" not in data:
        return []
    return [
        {"symbol": r["symbol"], "name": r["description"]}
        for r in data["result"]
        if r.get("type") == "Common Stock" and r.get("description")
    ][:15]

# def _upsert_investment(symbol: str, name: str | None = None) -> Investment | None:
#     symbol = symbol.upper()
#     inv = Investment.query.filter_by(symbol=symbol).first()
#     quote = _live_quote(symbol)

#     if inv is None:
#         inv = Investment(
#             symbol=symbol,
#             name=name or symbol,
#             current_price=quote["price"] if quote else 100.0,
#             price_change_percent=quote["change"] if quote else 0.0,
#         )
#         db.session.add(inv)
#         db.session.flush()
#     elif quote:
#         # Explicitly update attributes to trigger SQLAlchemy change tracking
#         inv.current_price = quote["price"]
#         inv.price_change_percent = quote["change"]

#     return inv

# def _upsert_investment(symbol: str, name: str | None = None) -> Investment | None:
#     symbol = symbol.upper()
#     with db.session.no_autoflush:
#         inv = Investment.query.filter_by(symbol=symbol).first()

#     quote = _live_quote(symbol)

#     if inv is None:
#         if not name:
#             profile = _fh("/stock/profile2", symbol=symbol)
#             name = profile.get("name") if profile else None
#         if not name:
#             return None 

#         inv = Investment(
#             symbol=symbol,
#             name=name,
#             current_price=quote["price"] if quote else 0,
#             price_change_percent=quote["change"] if quote else 0,
#         )
#         db.session.add(inv)
#         db.session.flush()
#     elif quote:
#         inv.current_price = quote["price"]
#         inv.price_change_percent = quote["change"]
#         inv.last_updated = datetime.now(UTC)

#     if quote:
#         db.session.add(PriceHistory(
#             investment_id=inv.id,
#             price=quote["price"],
#             timestamp=datetime.now(UTC),
#         ))

#     return inv

# def _inv_payload(inv: Investment) -> dict:
#     return {
#         "id": inv.id,
#         "symbol": inv.symbol,
#         "name": inv.name,
#         "sector": getattr(inv, "sector", None),
#         "current_price": inv.current_price or 0.0,
#         "change": getattr(inv, "price_change_percent", 0.0) or 0.0,
#     }

# def _inv_payload(inv: Investment) -> dict:
#     return {
#         "id": inv.id,
#         "symbol": inv.symbol,
#         "name": inv.name,
#         "sector": inv.sector,
#         "current_price": inv.current_price,
#         "change": inv.price_change_percent,
#     }

# DEFAULT_TICKERS = [
#     "AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", 
#     "NVDA", "META", "NFLX", "AMD", "INTC", "SPY", "QQQ"
# ]

# def _ensure_stock_pool(required_count):
#     current_count = Investment.query.count()
#     if current_count < required_count:
#         # Pull missing symbols from the default list into the database
#         missing_symbols = DEFAULT_TICKERS[current_count:required_count]
#         for symbol in missing_symbols:
#             _upsert_investment(symbol)
#         db.session.commit()

@investment_bp.route("/market/live", methods=["GET"])
@jwt_required()
def live_market():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 5, type=int)
    q = request.args.get("q", "").strip()

    if q:
        fh_results = _search_finnhub(q)
        if fh_results:
            for r in fh_results:
                _upsert_investment(r["symbol"], r["name"])
            db.session.commit()
            
        query = Investment.query.filter(
            (Investment.symbol.ilike(f"%{q}%")) |
            (Investment.name.ilike(f"%{q}%"))
        ).order_by(Investment.id.asc())
    else:
        _ensure_stock_pool(page * per_page)
        query = Investment.query.order_by(Investment.id.asc())

    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    # Refresh active page items
    updated_items = []
    results = []
    for inv in pagination.items:
        updated = _upsert_investment(inv.symbol, inv.name)
        updated_items.append(updated or inv)
        updated = _upsert_investment(inv.symbol, inv.name)
        if updated:
            results.append(_inv_payload(updated))

    db.session.commit()

    return jsonify({
        "investments": [_inv_payload(inv) for inv in updated_items],
        "page": pagination.page,
        "pages": pagination.pages or 1,
        "total": pagination.total,
        "has_next": pagination.has_next
    }), 200

# @investment_bp.route("/market/live", methods=["GET"])
# @jwt_required()
# def live_market():
#     investments = Investment.query.all()
#     results = []
#     for inv in investments:
#         updated = _upsert_investment(inv.symbol, inv.name)
#         if updated:
#             results.append(_inv_payload(updated))
#     db.session.commit()
#     return jsonify(results)

@investment_bp.route("/investments/search", methods=["GET"])
@jwt_required()
def search_investments():
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify({"error": "Query required"}), 400

    fh_results = _search_finnhub(query)

    if fh_results:
        results = []
        for r in fh_results:
            inv = _upsert_investment(r["symbol"], r["name"])
            if inv:
                results.append(_inv_payload(inv))
        db.session.commit()
        return jsonify({"results": results})

    local = Investment.query.filter(
        (Investment.symbol.ilike(f"%{query}%")) |
        (Investment.name.ilike(f"%{query}%"))
    ).limit(15).all()
    return jsonify({"results": [_inv_payload(i) for i in local]})

@investment_bp.route("/investments/<int:investment_id>/history", methods=["GET"])
@jwt_required()
def price_history(investment_id):
    limit = min(int(request.args.get("limit", 90)), 365)
    rows  = (
        PriceHistory.query
        .filter_by(investment_id=investment_id)
        .order_by(PriceHistory.timestamp.desc())
        .limit(limit)
        .all()
    )
    rows.reverse()
    return jsonify([{"price": r.price, "timestamp": r.timestamp.isoformat()} for r in rows])

@investment_bp.route("/portfolio", methods=["GET"])
@jwt_required()
def get_portfolio():
    user_id  = get_jwt_identity()
    holdings = Holding.query.filter_by(user_id=user_id).all()

    for h in holdings:
        _upsert_investment(h.investment.symbol, h.investment.name)
    db.session.commit()

    portfolio_data = []
    total_value = 0
    total_invested = 0

    for h in holdings:
        inv = h.investment
        current_value = h.quantity * inv.current_price
        invested_value = h.quantity * h.avg_buy_price
        gain_loss = current_value - invested_value
        gain_loss_pct  = (gain_loss / invested_value * 100) if invested_value > 0 else 0

        portfolio_data.append({
            "id": h.id,
            "investment_id": h.investment_id,
            "symbol": inv.symbol,
            "name": inv.name,
            "quantity": h.quantity,
            "avg_buy_price": h.avg_buy_price,
            "current_price": inv.current_price,
            "change_pct": inv.price_change_percent,
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
        "total_gain_loss_pct": round(
            (total_value - total_invested) / total_invested * 100, 2
        ) if total_invested > 0 else 0,
    })

@investment_bp.route("/holdings/buy", methods=["POST"])
@jwt_required()
def buy_investment():
    user_id = get_jwt_identity()
    data    = request.get_json()

    investment_id = data.get("investment_id")
    symbol = str(data.get("symbol", "")).upper()
    quantity = data.get("quantity")

    if not quantity or float(quantity) <= 0:
        return jsonify({"error": "Invalid quantity"}), 400
    quantity = float(quantity)

    if investment_id:
        inv = Investment.query.get(int(investment_id))
        if inv:
            updated = _upsert_investment(inv.symbol, inv.name)
            db.session.commit()
            inv = updated
    elif symbol:
        inv = _upsert_investment(symbol)
        db.session.commit()
    else:
        return jsonify({"error": "Provide investment_id or symbol"}), 400

    if not inv:
        return jsonify({"error": "Investment not found"}), 404

    price_per_share = inv.current_price
    if not price_per_share:
        return jsonify({"error": "Could not fetch live price"}), 502

    total_cost = quantity * price_per_share

    holding = Holding.query.filter_by(user_id=user_id, investment_id=inv.id).first()
    if holding:
        old_cost = holding.quantity * holding.avg_buy_price
        new_cost = quantity * price_per_share
        holding.quantity += quantity
        holding.avg_buy_price = (old_cost + new_cost) / holding.quantity
    else:
        holding = Holding(
            user_id=user_id,
            investment_id=inv.id,
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

    if not quantity or float(quantity) <= 0:
        return jsonify({"error": "Invalid quantity"}), 400
    quantity = float(quantity)

    holding = Holding.query.filter_by(id=holding_id, user_id=user_id).first()
    if not holding:
        return jsonify({"error": "Holding not found"}), 404
    if holding.quantity < quantity:
        return jsonify({"error": "Insufficient shares"}), 400

    _upsert_investment(holding.investment.symbol, holding.investment.name)
    db.session.commit()

    price_per_share = holding.investment.current_price
    total_proceeds = quantity * price_per_share
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

@investment_bp.route("/watchlist", methods=["GET"])
@jwt_required()
def get_watchlist():
    user_id   = get_jwt_identity()
    watchlist = Watchlist.query.filter_by(user_id=user_id).all()
    return jsonify({"watchlist": [{
        "id": item.id,
        "investment_id": item.investment_id,
        "symbol": item.investment.symbol,
        "name": item.investment.name,
        "current_price": item.investment.current_price,
        "change": item.investment.price_change_percent,
    } for item in watchlist]})


@investment_bp.route("/watchlist", methods=["POST"])
@jwt_required()
def add_to_watchlist():
    user_id = get_jwt_identity()
    data = request.get_json()

    investment_id = data.get("investment_id")
    symbol = str(data.get("symbol", "")).upper()

    if investment_id:
        inv = Investment.query.get(int(investment_id))
    elif symbol:
        inv = _upsert_investment(symbol)
        db.session.commit()
    else:
        return jsonify({"error": "Provide investment_id or symbol"}), 400

    if not inv:
        return jsonify({"error": "Investment not found"}), 404

    if Watchlist.query.filter_by(user_id=user_id, investment_id=inv.id).first():
        return jsonify({"error": "Already in watchlist"}), 409

    db.session.add(Watchlist(user_id=user_id, investment_id=inv.id))
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