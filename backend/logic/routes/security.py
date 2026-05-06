from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta, UTC
from ..extensions import db
from ..models.data import User, VerificationCode, AuditLog, SecuritySettings
from .helpers import generate_code, verify_code, login_user_response, sendCode


security_bp = Blueprint("security", __name__, url_prefix="/api/security")

@security_bp.route("/send", methods=["POST"])
@jwt_required()
def send_verification():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    method = data.get("method", "email")
    vtype = data.get("type", "generic")

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    code = generate_code()

    sendCode(code, method, user.email)

    entry = VerificationCode(
        user_id=user_id,
        code=code,
        method=method,
        type=vtype,
        expires_at=datetime.now(UTC) + timedelta(minutes=2)
    )

    db.session.add(entry)
    db.session.add(AuditLog(
        user_id=user_id,
        action=f"send_{vtype}",
        status="success"
    ))
    db.session.commit()
    return jsonify({"msg": "Verification code sent"})

@security_bp.route("/send/public", methods=["POST"])
def send_verification_public():
    data = request.get_json()

    email = data.get("email")
    method = data.get("method", "email")
    vtype = data.get("type", "generic")

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    code = generate_code()
    sendCode(code, method, email)

    db.session.add(VerificationCode(
        user_id=user.id,
        code=code,
        method=method,
        type=vtype,
        expires_at=datetime.now(UTC) + timedelta(minutes=2)
    ))

    db.session.commit()

    return jsonify({"msg": "Code sent"})

@security_bp.route("/verify", methods=["POST"])
@jwt_required()
def verify_verification():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    code_input = data.get("code")
    vtype = data.get("type", "generic")
    record = VerificationCode.query.filter_by(
        user_id=user_id,
        type=vtype
    ).order_by(VerificationCode.id.desc()).first()
    if not record:
        return jsonify({"error": "No code found"}), 400
    if record.expires_at < datetime.now(UTC):
        return jsonify({"error": "Code expired"}), 400
    if not verify_code(record.code, code_input):
        db.session.add(AuditLog(
            user_id=user_id,
            action=f"verify_{vtype}",
            status="failed"
        ))
        db.session.commit()
        return jsonify({"error": "Invalid code"}), 400
    db.session.delete(record)
    db.session.add(AuditLog(
        user_id=user_id,
        action=f"verify_{vtype}",
        status="success"
    ))
    db.session.commit()
    return jsonify({"success": True})

@security_bp.route("/verify/public", methods=["POST"])
def verify_public():
    data = request.get_json()

    email = data.get("email")
    code_input = data.get("code")
    vtype = data.get("type")

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    record = VerificationCode.query.filter_by(
        user_id=user.id,
        type=vtype
    ).order_by(VerificationCode.id.desc()).first()

    if not record:
        return jsonify({"error": "No code found"}), 400

    if record.expires_at < datetime.now(UTC):
        return jsonify({"error": "Code expired"}), 400

    if not verify_code(record.code, code_input):
        return jsonify({"error": "Invalid code"}), 400
    
    if vtype == "email_verify":
        SecuritySettings.query.filter_by(user_id=user.id).update({"verified": True})
        db.session.commit()
        return login_user_response(user)

    db.session.delete(record)
    db.session.commit()

    return jsonify({"success": True})

@security_bp.route("", methods=["GET"])
@jwt_required()
def get_security():
    user_id = get_jwt_identity()
    sec = SecuritySettings.query.get(user_id)

    if not sec:
        sec = SecuritySettings(user_id=user_id)
        db.session.add(sec)
        db.session.commit()

    return jsonify({
        "verified": sec.verified,
        "email_2fa_enabled": sec.email_2fa_enabled,
        "sms_2fa_enabled": sec.sms_2fa_enabled,
        "totp_enabled": sec.totp_enabled
    })

@security_bp.route("/email-2fa", methods=["POST"])
@jwt_required()
def toggle_email_2fa():
    user_id = get_jwt_identity()
    sec = SecuritySettings.query.get(user_id)

    sec.email_2fa_enabled = not sec.email_2fa_enabled
    db.session.commit()

    return jsonify({
        "email_2fa_enabled": sec.email_2fa_enabled
    })

@security_bp.route("/totp", methods=["POST"])
@jwt_required()
def toggle_totp():
    user_id = get_jwt_identity()
    sec = SecuritySettings.query.get(user_id)

    sec.totp_enabled = not sec.totp_enabled
    db.session.commit()

    return jsonify({
        "totp_enabled": sec.totp_enabled
    })

@security_bp.route("/history", methods=["GET"])
@jwt_required()
def history():
    user_id = get_jwt_identity()

    logs = AuditLog.query.filter_by(user_id=user_id)\
        .order_by(AuditLog.created_at.desc())\
        .limit(20)\
        .all()

    return jsonify([
        {
            "id": log.id,
            "action": log.action,
            "status": log.status,
            "created_at": log.created_at.isoformat()
        }
        for log in logs
    ])