from flask_jwt_extended import create_access_token, create_refresh_token, set_access_cookies, set_refresh_cookies, unset_jwt_cookies, jwt_required, get_jwt_identity, get_csrf_token
from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta, UTC
from logic.extensions import limiter
from ..extensions import db
from ..models.data import User, SecuritySettings, VerificationCode
from ..routes.helpers import login_user_response, verify_turnstile, generate_code, sendCode, verify_code

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
@limiter.limit("5 per minute")
def register():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data"}), 400
    email = data.get("email")
    password = data.get("password")
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "User exists"}), 400
    if not verify_turnstile(data.get("captcha")):
        return jsonify({"error": "Captcha failed"}), 400
    user = User(email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    code = generate_code()
    sendCode(code, "email", user.email)
    db.session.add(VerificationCode(
        user_id=user.id,
        code=code,
        method="email",
        type="email_verify",
        expires_at=datetime.now(UTC) + timedelta(minutes=2)
    ))
    db.session.commit()
    return jsonify({
        "verify_required": True,
        "email": user.email
    })

@auth_bp.route("/register/verify", methods=["POST"])
def register_verify():
    data = request.get_json()
    user = User.query.filter_by(email=data["email"]).first()
    if not user:
        return jsonify({"error": "User not found"}), 404
    record = VerificationCode.query.filter_by(
        user_id=user.id,
        type="email_verify"
    ).order_by(VerificationCode.id.desc()).first()
    if not record or record.expires_at < datetime.now(UTC):
        return jsonify({"error": "Code expired"}), 400
    if not verify_code(record.code, data["code"]):
        return jsonify({"error": "Invalid code"}), 400
    db.session.delete(record)
    return login_user_response(user)

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    user = User.query.filter_by(email=data["email"]).first()
    if not user or not user.check_password(data["password"]):
        return jsonify({"error": "Invalid credentials"}), 401
    if not verify_turnstile(data.get("captcha")):
        return jsonify({"error": "Captcha failed"}), 400
    security = SecuritySettings.query.get(user.id)
    if security and security.email_2fa_enabled:
        code = generate_code()
        sendCode(code, "email", user.email)
        db.session.add(VerificationCode(
            user_id=user.id,
            code=code,
            method="email",
            type="login_2fa",
            expires_at=datetime.now(UTC) + timedelta(minutes=2)
        ))
        db.session.commit()
        return jsonify({
            "2fa_required": True,
            "email": user.email
        })
    return login_user_response(user)

@auth_bp.route("/login/verify", methods=["POST"])
def login_verify():
    data = request.get_json()
    user = User.query.filter_by(email=data["email"]).first()
    if not user:
        return jsonify({"error": "User not found"}), 404
    record = VerificationCode.query.filter_by(
        user_id=user.id,
        type="login_2fa"
    ).order_by(VerificationCode.id.desc()).first()
    if not record or record.expires_at < datetime.now(UTC):
        return jsonify({"error": "Code expired"}), 400
    if not verify_code(record.code, data["code"]):
        return jsonify({"error": "Invalid code"}), 400
    db.session.delete(record)
    db.session.commit()
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
        "subscription_id": user.subscription_id
    })