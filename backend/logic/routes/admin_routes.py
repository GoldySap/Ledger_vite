from flask_jwt_extended import jwt_required, create_access_token, get_jwt_identity, set_access_cookies
from flask import Blueprint, request, jsonify
from ..extensions import db
from ..models.data import User, Subscription, SubscriptionAccess
from ..routes.helpers import admin_required, verified_required

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
        "data": data,
        "editable": {
            "id": False,
            "email": False,
            "role": False,
            "subscription_id": True,
            "active": True,
            "created_at": False
        }
    })

@admin_bp.route("/users/<int:user_id>", methods=["PUT"])
@jwt_required()
@verified_required
@admin_required
def update_user(user_id):
    data = request.get_json()
    user = User.query.get_or_404(user_id)
    user.role = data.get("role", user.role)
    user.active = data.get("active", user.active)
    db.session.commit()
    return jsonify({"msg": "User updated"})

@admin_bp.route("/users/bulk", methods=["PUT"])
@jwt_required()
@verified_required
@admin_required
def bulk_update_users():
    data = request.get_json()

    updates = data.get("updates", {})
    code = data.get("code")

    # (optional) verify code later
    # if code != "your-secret":
    #     return jsonify({"error": "Invalid code"}), 403

    for user_id, changes in updates.items():
        user = User.query.get(int(user_id))
        if not user:
            continue

        for key, value in changes.items():
            if hasattr(user, key):
                setattr(user, key, value)

    db.session.commit()

    return jsonify({"msg": "Bulk updated"})

@admin_bp.route("/users", methods=["POST"])
@jwt_required()
@verified_required
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
@verified_required
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

@admin_bp.route("/subscriptions/bulk", methods=["PUT"])
@jwt_required()
@verified_required
@admin_required
def bulk_update_subscriptions():
    updates = request.get_json()
    for subscriptions_id, changes in updates.items():
        subscription = Subscription.query.get(subscriptions_id)
        if not subscription:
            continue
        for key, value in changes.items():
            if hasattr(subscription, key):
                setattr(subscription, key, value)
    db.session.commit()
    
    return jsonify({"msg": "Bulk updated"})

@admin_bp.route("/subscriptions", methods=["POST"])
@jwt_required()
@verified_required
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

@admin_bp.route("/verify", methods=["POST"])
@jwt_required()
@admin_required
def verify_admin():
    data = request.get_json()
    code = data.get("code")

    if code != "1234":
        return jsonify({"error": "Invalid code"}), 403
    
    access_token = create_access_token(
        identity=get_jwt_identity(),
        additional_claims={"verified": True}
    )

    response = jsonify({"verified": True})
    set_access_cookies(response, access_token)
    return response
    