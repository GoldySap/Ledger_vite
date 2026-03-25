from flask_jwt_extended import jwt_required
from flask import Blueprint, request, jsonify
from ..extensions import db
from ..models.data import User, Subscription, SubscriptionAccess
from ..routes.helpers import admin_required

admin_bp = Blueprint("admin", __name__)

def model_to_dict(obj, exclude=None):
    exclude = exclude or []
    return {
        c.name: getattr(obj, c.name)
        for c in obj.__table__.columns
        if c.name not in exclude
    }

@admin_bp.route("/users", methods=["GET"])
@jwt_required()
@admin_required
def get_users():
    users = User.query.all()
    columns = [
        c.name for c in User.__table__.columns
        if c.name not in ["password_hash"]
    ]
    data = []
    for u in users:
        row = {col: getattr(u, col) for col in columns}
        data.append(row)

    return jsonify({
        "columns": columns,
        "data": data
    })

@admin_bp.route("/users/<int:user_id>", methods=["PUT"])
@jwt_required()
@admin_required
def update_user(user_id):
    data = request.get_json()
    user = User.query.get_or_404(user_id)
    user.role = data.get("role", user.role)
    user.active = data.get("active", user.active)
    db.session.commit()
    return jsonify({"msg": "User updated"})

@admin_bp.route("/users", methods=["POST"])
@jwt_required()
@admin_required
def create_user():
    data = request.get_json()
    user = User(
        email=data["email"],
        role=data.get("role", "user"),
        subscription_id=data.get("subscription_id") or 1
    )
    user.set_password(data["password"])
    db.session.add(user)
    db.session.commit()
    return jsonify({"msg": "User created"})

@admin_bp.route("/subscriptions", methods=["GET"])
@jwt_required()
@admin_required
def get_subscriptions():
    subs = Subscription.query.all()
    columns = [c.name for c in Subscription.__table__.columns]
    data = []
    for s in subs:
        row = {col: getattr(s, col) for col in columns}
        data.append(row)

    return jsonify({
        "columns": columns,
        "data": data
    })

@admin_bp.route("/subscriptions/<int:sub_id>", methods=["PUT"])
@jwt_required()
@admin_required
def update_subscription(sub_id):
    data = request.get_json()
    sub = Subscription.query.get_or_404(sub_id)
    sub.label = data.get("label", sub.label)
    sub.price = data.get("price", sub.price)
    if not sub.access:
        sub.access = SubscriptionAccess()
    for key, value in data.items():
        if hasattr(sub.access, key):
            setattr(sub.access, key, value)
    db.session.commit()

    return jsonify({"msg": "Updated"})

@admin_bp.route("/subscriptions", methods=["POST"])
@jwt_required()
@admin_required
def create_subscription():
    data = request.get_json()
    sub = Subscription(
        label=data["label"],
        price=data["price"]
    )
    db.session.add(sub)
    db.session.flush()
    access = SubscriptionAccess(
        subscription_id=sub.id,
        **{k: v for k, v in data.items() if k not in ["label", "price"]}
    )
    db.session.add(access)
    db.session.commit()

    return jsonify({"msg": "Created"})

@admin_bp.route("/subscription-access", methods=["GET"])
@jwt_required()
@admin_required
def get_subscription_access():
    access = SubscriptionAccess.query.all()
    columns = [c.name for c in SubscriptionAccess.__table__.columns]
    data = [{col: getattr(a, col) for col in columns} for a in access]

    return jsonify({
        "columns": columns,
        "data": data
    })