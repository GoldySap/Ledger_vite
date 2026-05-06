from flask_jwt_extended import create_access_token, create_refresh_token, set_access_cookies, set_refresh_cookies, unset_jwt_cookies, jwt_required, get_jwt_identity
from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta, UTC
from logic.extensions import limiter
from ..extensions import db
from ..models.data import User, SecuritySettings, AuditLog
from ..routes.helpers import login_user_response, verify_turnstile, create_verification

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
def register():
    try:
        data = request.get_json()
        email = data.get("email")
        password = data.get("password")
        if not verify_turnstile(data.get("captcha")):
            return jsonify({"error": "Captcha failed"}), 400
        if User.query.filter_by(email=email).first():
            return jsonify({"error": "User exists"}), 400
        user = User(email=email, subscription_id=1, active=True)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        db.session.add(SecuritySettings(user_id=user.id, verified=False))
        db.session.commit()
        create_verification(user.id, "email", "email_verify")
        db.session.commit()
        log = AuditLog(
            user_id=user.id,
            action="login",
            status="success"
        )
        db.session.add(log)
        db.session.commit()
        return jsonify({
            "verify_required": True,
            "email": email
        })
    except Exception as e:
        print("REGISTER ERROR:", e)
        return jsonify({"error": str(e)}), 500

# @auth_bp.route("/register/verify", methods=["POST"])
# def register_verify():
#     data = request.get_json()
#     email = data["email"]
#     code_input = data["code"]
#     user = User.query.filter_by(email=email).first()
#     if not user:
#         return jsonify({"error": "User not found"}), 404
#     security = SecuritySettings.query.filter_by(user_id=user.id).first()
#     if not security:
#         security = SecuritySettings(user_id=user.id)
#     security.verified = True
#     db.session.add(security)
#     db.session.commit()
#     return login_user_response(user)

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    user = User.query.filter_by(email=data["email"]).first()
    if not user or not user.check_password(data["password"]):
        return jsonify({"error": "Invalid credentials"}), 401
    if not verify_turnstile(data.get("captcha")):
        return jsonify({"error": "Captcha failed"}), 400
    if not user.active:
        return jsonify({"error": "Account Unaccessable"}), 403
    security = SecuritySettings.query.filter_by(user_id=user.id).first()
    if not security:
        security = SecuritySettings(user_id=user.id, verified=False)
        db.session.add(security)
        db.session.commit()
    if not security.verified:
        return jsonify({"error": "Account not Verified"}), 403
    if security and security.email_2fa_enabled:
        create_verification(user.id, "email", "login_2fa")
        return jsonify({
            "2fa_required": True,
            "email": user.email
        })
    return login_user_response(user)

@auth_bp.route("/login/verify", methods=["POST"])
def login_verify():
    data = request.get_json()
    email = data["email"]
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "User not found"}), 404
    return login_user_response(user)

@auth_bp.route("/logout", methods=["POST"])
def logout():
    response = jsonify({"msg": "Logged out"})
    unset_jwt_cookies(response)
    return response

@auth_bp.route("/me")
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
        "subscription_id": user.subscription_id,
        "created_at": user.created_at.isoformat()
    })

@auth_bp.route("/update", methods=["PUT"])
@jwt_required()
def update_account():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    data = request.get_json()
    if not data.get("email"):
        return {"error": "Email required"}, 400
    existing = User.query.filter_by(email=data["email"]).first()
    if existing and existing.id != user.id:
        return {"error": "Email already in use"}, 400
    if "email" in data:
        user.email = data["email"]
    db.session.commit()
    log = AuditLog(
        user_id=user_id,
        action="update_email",
        status="success"
    )
    db.session.add(log)
    db.session.commit()
    return jsonify({"msg": "updated"})