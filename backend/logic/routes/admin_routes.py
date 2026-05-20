from flask_jwt_extended import (
    jwt_required, create_access_token, get_jwt_identity, set_access_cookies
)
from flask import Blueprint, request, jsonify
from ..extensions import db
from ..models.data import User, Subscription, SubscriptionAccess, AuditLog, Transaction, Holding
from ..routes.helpers import admin_required, verified_required
from ..routes.faq_routes import FaqItem, UserQuestion
from datetime import datetime, UTC, timedelta
from sqlalchemy import func

admin_bp = Blueprint("admin", __name__)


# ── Helpers ────────────────────────────────────────────────────────────────────

def model_to_dict(obj, exclude=None):
    exclude = exclude or []
    return {
        c.name: getattr(obj, c.name)
        for c in obj.__table__.columns
        if c.name not in exclude
    }


# ── Overview / stats ───────────────────────────────────────────────────────────

@admin_bp.route("/stats", methods=["GET"])
@jwt_required()
@admin_required
def get_stats():
    """Summary numbers for the overview dashboard."""
    total_users   = User.query.count()
    active_users  = User.query.filter_by(active=True).count()
    new_this_week = User.query.filter(
        User.created_at >= datetime.now(UTC) - timedelta(days=7)
    ).count()

    sub_counts = (
        db.session.query(Subscription.label, func.count(User.id))
        .join(User, User.subscription_id == Subscription.id)
        .group_by(Subscription.label)
        .all()
    )

    total_transactions = Transaction.query.count()
    pending_questions  = UserQuestion.query.filter_by(status="pending").count()

    recent_logs = (
        AuditLog.query
        .order_by(AuditLog.created_at.desc())
        .limit(5).all()
    )

    return jsonify({
        "total_users":        total_users,
        "active_users":       active_users,
        "new_this_week":      new_this_week,
        "subscription_breakdown": [
            {"label": label, "count": count}
            for label, count in sub_counts
        ],
        "total_transactions":  total_transactions,
        "pending_questions":   pending_questions,
        "recent_logs": [
            {
                "id":         l.id,
                "user_id":    l.user_id,
                "action":     l.action,
                "status":     l.status,
                "created_at": l.created_at.isoformat(),
            }
            for l in recent_logs
        ],
    })


# ── Users ──────────────────────────────────────────────────────────────────────

@admin_bp.route("/users", methods=["GET"])
@jwt_required()
@admin_required
def get_users():
    users = User.query.order_by(User.created_at.desc()).all()
    columns = [
        c.name for c in User.__table__.columns
        if c.name not in ["password_hash"]
    ]
    return jsonify({
        "columns": columns,
        "data":    [
            {**{col: getattr(u, col) for col in columns},
             "subscription_label": u.subscription.label if u.subscription else None}
            for u in users
        ],
        "editable": {
            "id": False, "email": True, "phonenumber": True,
            "role": True, "subscription_id": True,
            "active": True, "created_at": False,
        },
    })


@admin_bp.route("/users/<int:user_id>", methods=["PUT"])
@jwt_required()
@admin_required
def update_user(user_id):
    data = request.get_json()
    user = User.query.get_or_404(user_id)
    allowed = ["role", "active", "subscription_id", "email", "phonenumber"]
    for key in allowed:
        if key in data:
            setattr(user, key, data[key])
    db.session.commit()
    return jsonify({"msg": "User updated"})


@admin_bp.route("/users/<int:user_id>", methods=["DELETE"])
@jwt_required()
@verified_required
@admin_required
def delete_user(user_id):
    user = User.query.get_or_404(user_id)
    db.session.delete(user)
    db.session.commit()
    return jsonify({"msg": "User deleted"})


@admin_bp.route("/users/bulk", methods=["PUT"])
@jwt_required()
@verified_required
@admin_required
def bulk_update_users():
    data    = request.get_json()
    updates = data.get("updates", {})
    allowed = ["role", "active", "subscription_id", "email", "phonenumber"]
    for user_id, changes in updates.items():
        user = User.query.get(int(user_id))
        if not user:
            continue
        for key, value in changes.items():
            if key in allowed:
                setattr(user, key, value)
    db.session.commit()
    return jsonify({"msg": "Bulk updated"})


@admin_bp.route("/users", methods=["POST"])
@jwt_required()
@verified_required
@admin_required
def create_user():
    data = request.get_json()
    if User.query.filter_by(email=data.get("email")).first():
        return jsonify({"error": "Email already exists"}), 400
    user = User(
        email=data["email"],
        role=data.get("role", "user"),
        subscription_id=data.get("subscription_id") or 1,
        active=True,
    )
    user.set_password(data["password"])
    db.session.add(user)
    db.session.commit()
    return jsonify({"msg": "User created", "id": user.id}), 201


# ── Subscriptions ──────────────────────────────────────────────────────────────

@admin_bp.route("/subscriptions", methods=["GET"])
@jwt_required()
@admin_required
def get_subscriptions():
    subs = Subscription.query.all()
    return jsonify([{
        "id":    s.id,
        "label": s.label,
        "price": s.price,
        "user_count": len(s.users),
        "access": model_to_dict(s.access, exclude=["id", "subscription_id"]) if s.access else {},
    } for s in subs])


@admin_bp.route("/subscriptions/<int:sub_id>", methods=["PUT"])
@jwt_required()
@verified_required
@admin_required
def update_subscription(sub_id):
    data = request.get_json()
    sub  = Subscription.query.get_or_404(sub_id)
    if "label" in data: sub.label = data["label"]
    if "price" in data: sub.price = float(data["price"])
    if not sub.access:
        sub.access = SubscriptionAccess(subscription_id=sub.id)
        db.session.add(sub.access)
    access_fields = [
        "can_export_data", "has_finance_access", "has_investment_access",
        "has_analytics_access", "max_accounts", "max_portfolio_transfer_rate",
    ]
    for field in access_fields:
        if field in data:
            setattr(sub.access, field, data[field])
    db.session.commit()
    return jsonify({"msg": "Updated"})


@admin_bp.route("/subscriptions", methods=["POST"])
@jwt_required()
@verified_required
@admin_required
def create_subscription():
    data = request.get_json()
    sub  = Subscription(label=data["label"], price=float(data["price"]))
    db.session.add(sub)
    db.session.flush()
    access_fields = [
        "can_export_data", "has_finance_access", "has_investment_access",
        "has_analytics_access", "max_accounts", "max_portfolio_transfer_rate",
    ]
    access = SubscriptionAccess(
        subscription_id=sub.id,
        **{k: data[k] for k in access_fields if k in data}
    )
    db.session.add(access)
    db.session.commit()
    return jsonify({"msg": "Created", "id": sub.id}), 201


@admin_bp.route("/subscriptions/<int:sub_id>", methods=["DELETE"])
@jwt_required()
@verified_required
@admin_required
def delete_subscription(sub_id):
    sub = Subscription.query.get_or_404(sub_id)
    db.session.delete(sub)
    db.session.commit()
    return jsonify({"msg": "Deleted"})


# ── Audit logs ─────────────────────────────────────────────────────────────────

@admin_bp.route("/audit-logs", methods=["GET"])
@jwt_required()
@admin_required
def get_audit_logs():
    page     = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 50))
    action   = request.args.get("action")
    status   = request.args.get("status")
    user_id  = request.args.get("user_id")

    q = AuditLog.query
    if action:  q = q.filter(AuditLog.action.ilike(f"%{action}%"))
    if status:  q = q.filter_by(status=status)
    if user_id: q = q.filter_by(user_id=int(user_id))

    total   = q.count()
    logs    = q.order_by(AuditLog.created_at.desc())\
               .offset((page - 1) * per_page).limit(per_page).all()

    return jsonify({
        "total": total,
        "page":  page,
        "pages": (total + per_page - 1) // per_page,
        "logs":  [{
            "id":         l.id,
            "user_id":    l.user_id,
            "action":     l.action,
            "status":     l.status,
            "ip_address": l.ip_address,
            "created_at": l.created_at.isoformat(),
        } for l in logs],
    })


# ── FAQ management ─────────────────────────────────────────────────────────────

@admin_bp.route("/faq/items", methods=["GET"])
@jwt_required()
@admin_required
def admin_faq_items():
    items = FaqItem.query.order_by(FaqItem.category, FaqItem.sort_order).all()
    return jsonify([i.to_dict() for i in items])


@admin_bp.route("/faq/items", methods=["POST"])
@jwt_required()
@admin_required
def admin_create_faq():
    data = request.get_json()
    if not data.get("category") or not data.get("question") or not data.get("answer"):
        return jsonify({"error": "category, question, and answer required"}), 400
    item = FaqItem(
        category=data["category"].lower().strip(),
        question=data["question"].strip(),
        answer=data["answer"].strip(),
        sort_order=int(data.get("sort_order", 0)),
        published=bool(data.get("published", True)),
    )
    db.session.add(item)
    db.session.commit()
    return jsonify(item.to_dict()), 201


@admin_bp.route("/faq/items/<int:item_id>", methods=["PUT"])
@jwt_required()
@admin_required
def admin_update_faq(item_id):
    item = FaqItem.query.get_or_404(item_id)
    data = request.get_json()
    if "category"   in data: item.category   = data["category"].lower().strip()
    if "question"   in data: item.question   = data["question"].strip()
    if "answer"     in data: item.answer     = data["answer"].strip()
    if "sort_order" in data: item.sort_order = int(data["sort_order"])
    if "published"  in data: item.published  = bool(data["published"])
    db.session.commit()
    return jsonify(item.to_dict())


@admin_bp.route("/faq/items/<int:item_id>", methods=["DELETE"])
@jwt_required()
@admin_required
def admin_delete_faq(item_id):
    item = FaqItem.query.get_or_404(item_id)
    db.session.delete(item)
    db.session.commit()
    return jsonify({"success": True})


@admin_bp.route("/faq/questions", methods=["GET"])
@jwt_required()
@admin_required
def admin_faq_questions():
    status = request.args.get("status")
    q = UserQuestion.query
    if status: q = q.filter_by(status=status)
    questions = q.order_by(UserQuestion.created_at.desc()).all()
    return jsonify([uq.to_dict(admin=True) for uq in questions])


@admin_bp.route("/faq/questions/<int:q_id>", methods=["PUT"])
@jwt_required()
@admin_required
def admin_update_question(q_id):
    row  = UserQuestion.query.get_or_404(q_id)
    data = request.get_json()
    if "status" in data and data["status"] in ("pending", "answered", "closed"):
        row.status = data["status"]
    db.session.commit()
    return jsonify(row.to_dict(admin=True))


# ── Verify (elevate JWT) ───────────────────────────────────────────────────────

@admin_bp.route("/verify", methods=["POST"])
@jwt_required()
@admin_required
def verify_admin():
    data = request.get_json()
    code = data.get("code")
    if code != "1234":                     # replace with env var in production
        return jsonify({"error": "Invalid code"}), 403
    access_token = create_access_token(
        identity=get_jwt_identity(),
        additional_claims={"verified": True},
    )
    response = jsonify({"verified": True})
    set_access_cookies(response, access_token)
    return response