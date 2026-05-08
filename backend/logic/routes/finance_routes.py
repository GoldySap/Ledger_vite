from flask_jwt_extended import jwt_required, get_jwt_identity
from flask import Blueprint, jsonify, request
from ..models.data import Transaction, User, Subscription, Account, Holding
from datetime import datetime, UTC, timedelta
from sqlalchemy import func
from ..extensions import db

finance_bp = Blueprint("finance", __name__)


# ── Transactions ───────────────────────────────────────────────────────────────

@finance_bp.route("/transactions", methods=["GET"])
@jwt_required()
def get_transactions():
    user_id = get_jwt_identity()
    transactions = Transaction.query.filter_by(user_id=user_id)\
        .order_by(Transaction.created_at.desc()).all()
    return jsonify([{
        "id":         t.id,
        "category":   t.category,
        "amount":     t.amount,
        "account_id": t.account_id,
        "created_at": t.created_at.isoformat(),
    } for t in transactions])


# ── Money: deposit / withdraw / transfer ───────────────────────────────────────

@finance_bp.route("/accounts/<int:account_id>/deposit", methods=["POST"])
@jwt_required()
def deposit(account_id):
    user_id = get_jwt_identity()
    data    = request.get_json()
    amount  = float(data.get("amount", 0))

    if amount <= 0:
        return jsonify({"error": "Amount must be positive"}), 400

    acc = Account.query.filter_by(id=account_id, user_id=user_id).first()
    if not acc:
        return jsonify({"error": "Account not found"}), 404

    acc.balance += amount
    db.session.add(Transaction(
        user_id=user_id, account_id=account_id,
        amount=amount, category="Deposit"
    ))
    db.session.commit()
    return jsonify({"balance": acc.balance, "message": f"Deposited ${amount:,.2f}"})


@finance_bp.route("/accounts/<int:account_id>/withdraw", methods=["POST"])
@jwt_required()
def withdraw(account_id):
    user_id = get_jwt_identity()
    data    = request.get_json()
    amount  = float(data.get("amount", 0))

    if amount <= 0:
        return jsonify({"error": "Amount must be positive"}), 400

    acc = Account.query.filter_by(id=account_id, user_id=user_id).first()
    if not acc:
        return jsonify({"error": "Account not found"}), 404
    if acc.balance < amount:
        return jsonify({"error": "Insufficient funds"}), 400

    # Check transfer rate limit from subscription access
    sub_access = acc.user.subscription.access if acc.user.subscription else None
    if sub_access:
        start_of_month = datetime.now(UTC).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        month_withdrawals = db.session.query(func.sum(func.abs(Transaction.amount))).filter(
            Transaction.user_id  == user_id,
            Transaction.category == "Withdrawal",
            Transaction.created_at >= start_of_month
        ).scalar() or 0
        if month_withdrawals + amount > sub_access.max_portfolio_transfer_rate:
            return jsonify({
                "error": f"Monthly transfer limit of ${sub_access.max_portfolio_transfer_rate:,} reached"
            }), 403

    acc.balance -= amount
    db.session.add(Transaction(
        user_id=user_id, account_id=account_id,
        amount=-amount, category="Withdrawal"
    ))
    db.session.commit()
    return jsonify({"balance": acc.balance, "message": f"Withdrew ${amount:,.2f}"})


@finance_bp.route("/accounts/transfer", methods=["POST"])
@jwt_required()
def transfer():
    user_id = get_jwt_identity()
    data    = request.get_json()
    from_id = data.get("from_account_id")
    to_id   = data.get("to_account_id")
    amount  = float(data.get("amount", 0))

    if amount <= 0:
        return jsonify({"error": "Amount must be positive"}), 400
    if from_id == to_id:
        return jsonify({"error": "Cannot transfer to the same account"}), 400

    from_acc = Account.query.filter_by(id=from_id, user_id=user_id).first()
    to_acc   = Account.query.filter_by(id=to_id,   user_id=user_id).first()

    if not from_acc or not to_acc:
        return jsonify({"error": "Account not found"}), 404
    if from_acc.balance < amount:
        return jsonify({"error": "Insufficient funds"}), 400

    from_acc.balance -= amount
    to_acc.balance   += amount

    db.session.add(Transaction(
        user_id=user_id, account_id=from_id,
        amount=-amount, category="Transfer out"
    ))
    db.session.add(Transaction(
        user_id=user_id, account_id=to_id,
        amount=amount, category="Transfer in"
    ))
    db.session.commit()
    return jsonify({
        "from_balance": from_acc.balance,
        "to_balance":   to_acc.balance,
        "message":      f"Transferred ${amount:,.2f}",
    })


# ── Subscriptions ──────────────────────────────────────────────────────────────

@finance_bp.route("/subscription/subs", methods=["GET"])
@jwt_required()
def get_subscriptions():
    subs = Subscription.query.all()
    data = []
    for s in subs:
        access   = s.access
        features = []
        if access:
            features.append(f"{access.max_accounts} accounts")
            features.append(f"${access.max_portfolio_transfer_rate:,}/mo transfers")
            if access.has_finance_access:   features.append("Finance access")
            if access.has_investment_access: features.append("Investment access")
            if access.has_analytics_access:  features.append("Advanced analytics")
            if access.can_export_data:       features.append("Data export")
        data.append({"id": s.id, "label": s.label, "price": s.price, "features": features})
    return jsonify(data)


@finance_bp.route("/subscription/user", methods=["GET"])
@jwt_required()
def get_subscription():
    user = User.query.get(int(get_jwt_identity()))
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
    user      = User.query.get(int(get_jwt_identity()))
    chosen_id = request.get_json().get("subscription_id")
    tosub     = Subscription.query.filter_by(id=chosen_id).first()
    if not tosub:
        return jsonify({"error": "Plan not found"}), 404
    user.subscription_id = tosub.id
    db.session.commit()
    return jsonify({"label": tosub.label, "price": tosub.price})

@finance_bp.route("/analytics", methods=["GET"]) 
@jwt_required()
def get_analytics():
    user       = User.query.get(int(get_jwt_identity()))
    time_range = request.args.get("range", "30d")
    days       = {"7d": 7, "30d": 30, "90d": 90, "1y": 365}.get(time_range, 30)
    start_date = datetime.now(UTC) - timedelta(days=days)

    total_balance = db.session.query(func.sum(Account.balance)).filter_by(
        user_id=user.id, active=True
    ).scalar() or 0

    accounts      = Account.query.filter_by(user_id=user.id, active=True).all()
    account_balances = [{"label": a.name, "value": a.balance} for a in accounts]

    prev_start = start_date - timedelta(days=days)
    prev_net   = db.session.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id  == user.id,
        Transaction.created_at >= prev_start,
        Transaction.created_at <  start_date
    ).scalar() or 0
    curr_net   = db.session.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id  == user.id,
        Transaction.created_at >= start_date
    ).scalar() or 0
    balance_change = curr_net - prev_net

    transactions = Transaction.query.filter(
        Transaction.user_id   == user.id,
        Transaction.created_at >= start_date
    ).all()

    spending_by_category: dict[str, float] = {}
    total_spent = 0.0
    for tx in transactions:
        if tx.amount < 0 and tx.category not in ("Withdrawal", "Transfer out"):
            cat = tx.category or "Uncategorized"
            spending_by_category[cat] = spending_by_category.get(cat, 0) + abs(tx.amount)
            total_spent += abs(tx.amount)

    spending_data = [
        {"label": k, "value": v}
        for k, v in sorted(spending_by_category.items(), key=lambda x: x[1], reverse=True)[:6]
    ]

    prev_spent = abs(db.session.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id   == user.id,
        Transaction.amount    < 0,
        Transaction.category.notin_(["Withdrawal", "Transfer out"]),
        Transaction.created_at >= prev_start,
        Transaction.created_at <  start_date
    ).scalar() or 0)
    spent_change = prev_spent - total_spent

    balance_trend = []
    step_days = max(1, days // 30)
    cursor = start_date
    while cursor <= datetime.now(UTC):
        net = db.session.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id   == user.id,
            Transaction.created_at <= cursor
        ).scalar() or 0
        balance_trend.append({"date": cursor.strftime("%b %d"), "value": float(total_balance + net)})
        cursor += timedelta(days=step_days)

    holdings        = Holding.query.filter_by(user_id=user.id).all()
    total_invested  = 0.0
    investment_value = 0.0
    holdings_data   = []

    for h in holdings:
        inv        = h.investment
        cost       = h.quantity * h.avg_buy_price
        current    = h.quantity * inv.current_price
        gain_loss  = current - cost
        ret_pct    = (gain_loss / cost * 100) if cost > 0 else 0
        total_invested  += cost
        investment_value += current
        holdings_data.append({
            "id":           h.id,
            "symbol":       inv.symbol,
            "name":         inv.name,
            "quantity":     h.quantity,
            "avgBuyPrice":  h.avg_buy_price,
            "currentPrice": inv.current_price,
            "currentValue": current,
            "costBasis":    cost,
            "gainLoss":     gain_loss,
            "return":       ret_pct,
        })

    investment_change = investment_value - total_invested
    portfolio_return  = (investment_change / total_invested * 100) if total_invested > 0 else 0
    top_holdings      = sorted(holdings_data, key=lambda x: x["currentValue"], reverse=True)[:5]

    asset_allocation: dict[str, float] = {}
    for h in holdings:
        at = h.investment.asset_type or "Other"
        asset_allocation[at] = asset_allocation.get(at, 0) + h.quantity * h.investment.current_price
    allocation_data = [{"label": k, "value": v} for k, v in asset_allocation.items()]

    recent_tx = Transaction.query.filter_by(user_id=user.id)\
        .order_by(Transaction.created_at.desc()).limit(10).all()
    recent_transactions = [{
        "id":          tx.id,
        "description": tx.account.name if tx.account else "—",
        "category":    tx.category,
        "amount":      tx.amount,
        "createdAt":   tx.created_at.isoformat(),
    } for tx in recent_tx]

    return jsonify({
        "totalBalance":          total_balance,
        "balanceChange":         balance_change,
        "totalSpent":            total_spent,
        "spentChange":           spent_change,
        "investmentValue":       investment_value,
        "investmentChange":      investment_change,
        "portfolioReturn":       portfolio_return,
        "portfolioReturnChange": 0,
        "accountBalances":       account_balances,
        "spendingByCategory":    spending_data,
        "balanceTrend":          balance_trend,
        "topHoldings":           top_holdings,
        "assetAllocation":       allocation_data,
        "recentTransactions":    recent_transactions,
    })