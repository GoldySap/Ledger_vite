from flask_jwt_extended import get_jwt_identity, get_jwt
from functools import wraps
from flask import jsonify
from ..models.data import User
import random, pyotp, time, hashlib, hmac, os, requests, smtplib, secrets
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

def generateTOTPSecret():
    return pyotp.random_base32()

def generateCode(method):
    match method:
        case "OTP":
            return secrets.randbelow(900000) + 100000
        case "TOTP":
            return getTOTPCode()
        case "TFA":
            timestep = int(time.time() // 30)
            msg = f"{timestep}".encode()
            key = os.getenv("CODE_KEY").encode()

            h = hmac.new(key, msg, hashlib.sha1).hexdigest()
            return str(int(h, 16))[-6:]
        case "ADMIN":
            return secrets.randbelow(900000) + 100000
        case _:
            return "No Method Selected"


def sendCode(code, method, destination=None):
    match method:
        case "email":
            if not destination:
                return "No email provided"
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

            # Placeholder for SMS API (Twilio etc.)
            print(f"[SMS to {destination}] Your code is: {code}")
            return True
        case _:
            return "No Method Selected"
        
def verifyCode(code, user_input):
    return hmac.compare_digest(str(code), str(user_input))

def getTOTPCode(secret):
    totp = pyotp.TOTP(secret)
    return totp.now()

def verifyTOTP(secret, user_input):
    totp = pyotp.TOTP(secret)
    return totp.verify(user_input)