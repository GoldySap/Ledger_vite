from flask_jwt_extended import get_jwt_identity, get_jwt
from functools import wraps
from flask import jsonify
from ..models.data import User

def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user or user.role != "admin":
            return jsonify({"error": "Admin access required"}), 403

        return fn(*args, **kwargs)
    return wrapper

def verified_required(fn):
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        if not claims.get("verified"):
            return jsonify({"error": "Verification required"}), 403
        return fn(*args, **kwargs)
    return wrapper

def has_access(user, feature):
    return getattr(user.subscription.access, feature, False)

def subscription_access_required(feature):
    def decorator(fn):
        def wrapper(*args, **kwargs):
            user_id = get_jwt_identity()
            user = User.query.get(int(user_id))
            if not has_access(user, feature):
                return jsonify({"error": "Upgrade required"}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator

def codeGenerator(type):
    if type == "OTP":
        return
    if type == "TFA":
        return
    if type == "ADMIN":
        return