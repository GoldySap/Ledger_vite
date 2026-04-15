from flask_jwt_extended import create_access_token, create_refresh_token, set_access_cookies, set_refresh_cookies, unset_jwt_cookies, jwt_required, get_jwt_identity
from flask import Blueprint, request, jsonify
from ..extensions import db
from ..models.data import User, SecuritySettings
from ..routes.helpers import admin_required, verify_turnstile, generateCode, sendCode, verifyCode
from logic.extensions import limiter

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    identity = get_jwt_identity()
    access_token = create_access_token(identity=identity)
    response = jsonify({"refresh": True})
    set_access_cookies(response, access_token)
    return response

@auth_bp.route("/register", methods=["POST"])
@limiter.limit("3 per minute")
def register():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data"}), 400
    email = data.get("email")
    password = data.get("password")
    role = data.get("role") or "user"
    subscription_id = data.get("subscription_id") or 1
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "User exists"}), 400
    if not verify_turnstile(data.get("captcha")):
        return jsonify({"error": "Captcha failed"}), 400
    user = User(email=email, role=role, subscription_id=subscription_id)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    db.session.close()
    return jsonify({
        "user": {
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "subscription_id": user.subscription_id
        }
    })

@auth_bp.route("/login", methods=["POST"])
@limiter.limit("5 per minute")
def login():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data"}), 400
    user = User.query.filter_by(email=data["email"]).first()
    if not user or not user.check_password(data["password"]):
        return jsonify({"error":"Invalid credentials"}), 401
    if not verify_turnstile(data.get("captcha")):
        return jsonify({"error": "Captcha failed"}), 400
    # security = SecuritySettings.query.get(user.id)
    # if not security.verified:
    #     return jsonify({"error": "Email not verified"}), 403
    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))
    response = jsonify({
        "user": {
            "id": user.id,
            "email": user.email,
            "role": user.role or "user",
            "subscription_id": user.subscription_id or 1
        }
    })
    set_access_cookies(response, access_token)
    set_refresh_cookies(response, refresh_token)
    return response

@auth_bp.route("/logout", methods=["POST"])
def logout():
    response = jsonify({"msg": "Logged out"})
    unset_jwt_cookies(response)
    return response

@auth_bp.route("/auth/me")
@jwt_required()
def me():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    if not user:
        response = jsonify({"error": "User not found"})
        unset_jwt_cookies(response)
        return response, 401

    return jsonify({
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "subscription_id": user.subscription_id
    })