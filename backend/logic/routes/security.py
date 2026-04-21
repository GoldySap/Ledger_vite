from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta, UTC

from ..extensions import db
from ..models.data import User, VerificationCode, AuditLog
from .helpers import generate_code, verify_code
from .helpers import sendCode

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