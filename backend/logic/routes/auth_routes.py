from flask_jwt_extended import create_access_token, create_refresh_token, set_access_cookies, set_refresh_cookies, unset_jwt_cookies, jwt_required, get_jwt_identity
from flask import Blueprint, request, jsonify
from ..extensions import db
from ..models.data import User

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    identity = get_jwt_identity()
    access_token = create_access_token(identity=identity)
    response = jsonify({"refresh":True})
    set_access_cookies(response, access_token)
    return response

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")
    role = data.get("role") or "user"
    subscription_id = data.get("subscription_id") or 1
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "User exists"}), 400
    user = User(email=email, role=role, subscription_id=subscription_id)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return jsonify({
        "user": {
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "subscription_id": user.subscription_id
        },
        "msg": "User created"
    })

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    user = User.query.filter_by(email=data["email"]).first()
    if not user or not user.check_password(data["password"]):
        return {"error":"Invalid credentials"},401
    access_token = create_access_token(identity=user.id)
    refresh_token = create_refresh_token(identity=user.id)
    response = jsonify({
        "user":{
            "id":user.id,
            "email":user.email,
            "role": user.role,
            "subscription_id": user.subscription_id
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

@auth_bp.route("/me")
@jwt_required()
def me():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    return jsonify({
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "subscription_id": user.subscription_id
    })