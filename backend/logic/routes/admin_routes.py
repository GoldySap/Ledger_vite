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

    return jsonify({
        "columns": ["id", "email", "role", "active", "subscription_id"],
        "data": [model_to_dict(u, exclude=["password_hash"]) for u in users]
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
    result = []
    for s in subs:
        data = model_to_dict(s)
        if s.access:
            data.update(model_to_dict(s.access, exclude=["id", "subscription_id"]))
        result.append(data)

    return jsonify({
        "columns": list(result[0].keys()) if result else [],
        "data": result
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