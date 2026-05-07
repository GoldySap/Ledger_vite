from flask_jwt_extended import get_jwt_identity, get_jwt, create_access_token, create_refresh_token, set_access_cookies, set_refresh_cookies
from functools import wraps
from flask import jsonify
from ..extensions import db
from ..models.data import User, AuditLog, VerificationCode, SecuritySettings
import pyotp, hmac, os, requests, smtplib, secrets
from datetime import datetime, timedelta, UTC
from email.message import EmailMessage

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
    @wraps(fn)
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        if not claims.get("verified"):
            return jsonify({"error": "Verification required"}), 403
        return fn(*args, **kwargs)
    return wrapper

def verification_required(minutes=2):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user_id = int(get_jwt_identity())

            if not is_verified_recently(user_id, minutes):
                return jsonify({"error": "Verification required"}), 403

            return fn(*args, **kwargs)
        return wrapper
    return decorator

def is_verified_recently(user_id, minutes=2, vtype=None):
    cutoff = datetime.now(UTC) - timedelta(minutes=minutes)

    query = AuditLog.query.filter(
        AuditLog.user_id == user_id,
        AuditLog.action.like("verify_%"),
        AuditLog.status == "success",
        AuditLog.created_at >= cutoff
    )

    if vtype:
        query = query.filter(AuditLog.action == f"verify_{vtype}")

    return query.first() is not None


def has_access(user, feature):
    return getattr(user.subscription.access, feature, False)

def subscription_access_required(feature):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user_id = get_jwt_identity()
            user = User.query.get(int(user_id))
            if not has_access(user, feature):
                return jsonify({"error": "Upgrade required"}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator

def verify_turnstile(token):
    res = requests.post(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        data={
            "secret": os.environ["TURNSTILE_SECRET_KEY"],
            "response": token
        }
    )
    return res.json().get("success", False)

def generate_code():
    return str(secrets.randbelow(900000) + 100000)

def verify_code(code, user_input):
    return hmac.compare_digest(str(code), str(user_input))

def generate_totp_secret():
    return pyotp.random_base32()

def get_totp_code(secret):
    return pyotp.TOTP(secret).now()

def verify_totp(secret, user_input):
    return pyotp.TOTP(secret).verify(user_input)


def sendCode(code, method, destination=None):
    send = True
    match method:
        case "email":
            if not destination:
                    return "No email provided"
            if send:
                msg = EmailMessage()
                msg.set_content(f"Your verification code is: {code}")

                msg['Subject'] = 'Your Verification Code'
                msg['From'] = os.getenv("EMAIL_USER")
                msg['To'] = destination

                try:
                    with smtplib.SMTP('smtp.gmail.com', 587) as server:
                        server.set_debuglevel(1)
                        server.starttls()
                        server.login(os.getenv("EMAIL_USER"), os.getenv("EMAIL_APP_PASSWORD"))
                        server.send_message(msg)
                        server.quit()
                        print("Message sent successfully!")
                except Exception as e:
                    print(f"Error: {e}")
            print(f"[EMAIL to {destination}] Your code is: {code}")
            return True
        case "phonenumber":
            if not destination:
                return "No phone number provided"
            # if send:
                # Placeholder for SMS API (Twilio etc.)
                
            print(f"[SMS to {destination}] Your code is: {code}")
            return True
        case _:
            return "No Method Selected"
        
def login_user_response(user):
    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))
    response = jsonify({
        "user": {
            "id": user.id,
            "email": user.email,
            "role": user.role
        }
    })
    set_access_cookies(response, access_token)
    set_refresh_cookies(response, refresh_token)
    log = AuditLog(
        user_id=user.id,
        action="login",
        status="success"
    )
    db.session.add(log)
    db.session.commit()
    return response

def verification_required(minutes=2):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user_id = int(get_jwt_identity())
            user = User.query.get(user_id)
            if not user or not user.last_verified_at:
                return jsonify({"error": "Verification required"}), 403
            if datetime.now(UTC) - user.last_verified_at > timedelta(minutes=minutes):
                return jsonify({"error": "Verification expired"}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator

def create_verification(user_id, method, vtype):
    code = generate_code()
    user = User.query.get(user_id)
    sendCode(code, method, user.email)
    db.session.add(VerificationCode(
        user_id=user_id,
        code=code,
        method=method,
        type=vtype,
        expires_at=datetime.now(UTC) + timedelta(minutes=2)
    ))
    db.session.commit()

def verify_2fa(user, code, vtype="login_2fa"):
    sec = SecuritySettings.query.get(user.id)

    if sec and sec.totp_enabled and sec.totp_secret:
        totp = pyotp.TOTP(sec.totp_secret)

        if totp.verify(code):
            return True

        if sec.backup_codes and code in sec.backup_codes:
            sec.backup_codes.remove(code)
            db.session.commit()
            return True

        return False

    record = VerificationCode.query.filter_by(
        user_id=user.id,
        type=vtype
    ).order_by(VerificationCode.id.desc()).first()

    if not record:
        return False

    if record.expires_at < datetime.now(UTC):
        return False

    if not verify_code(record.code, code):
        return False

    db.session.delete(record)
    db.session.commit()

    return True