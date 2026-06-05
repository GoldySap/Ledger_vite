from flask_jwt_extended import jwt_required, get_jwt_identity
from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash
from datetime import datetime
from logic.extensions import limiter
from ..extensions import db
from ..models.data import User, Account, AuditLog, Card

def can_create_account(user):
    if not user.subscription or not user.subscription.access:
        return False
    max_accounts = user.subscription.access.max_accounts
    current_count = Account.query.filter_by(user_id=user.id, active=True).count()
    return current_count < max_accounts

def can_create_card(user, account_id):
    if not user.subscription or not user.subscription.access:
        return False
    max_cards = user.subscription.access.max_cards_per_accounts
    current_count = Card.query.filter_by(account_id=account_id, active=True).count()
    return current_count < max_cards

def default_card_dict(account):
    card = Card.query.filter_by(account_id=account.id, is_default=True, active=True).first()
    if not card:
        card = Card.query.filter_by(account_id=account.id, active=True).first()
    if not card:
        return None
    return {
        "id": card.id,
        "provider": card.provider,
        "last4": card.last4,
        "accountnumber": card.accountnumber,
        "expires_at": card.expires_at.isoformat() if card.expires_at else None,
        "is_card": card.is_card,
        "is_default": card.is_default,
        "currency": card.currency,
    }

def account_to_dict(a):
    return {
        "id": a.id,
        "name": a.name,
        "balance": a.balance,
        "currency": a.currency,
        "is_primary": a.is_primary,
        "card_count": len([c for c in a.cards if c.active]),
        "default_card": default_card_dict(a),
    }

accounts_bp = Blueprint("accounts", __name__)

@accounts_bp.route("/get", methods=["GET"])
@limiter.limit("10 per minute")
@jwt_required()
def get_accounts():
    user = User.query.get(get_jwt_identity())

    max_accounts = user.subscription.access.max_accounts
    active_accounts = (
        Account.query
            .filter_by(user_id=user.id, active=True)
            .order_by(Account.created_at.asc())
            .all()
    )

    extra = len(active_accounts) - max_accounts
    if extra > 0:
        for i in range(extra):
            active_accounts[-(i + 1)].active = False
        db.session.commit()
        active_accounts = active_accounts[:-extra]

    return jsonify([account_to_dict(a) for a in active_accounts])

@accounts_bp.route("/create", methods=["POST"])
@limiter.limit("5 per minute")
@jwt_required()
def create_account():
    user = User.query.get(get_jwt_identity())

    if not can_create_account(user):
        return jsonify({"error": "Account limit reached for your plan"}), 403

    data = request.get_json()

    if not data.get("name"):
        return jsonify({"error": "Account name is required"}), 400

    card_data = data.get("card")
    if not card_data:
        return jsonify({"error": "A default card or account number is required"}), 400

    account = Account(
        user_id=user.id,
        name=data["name"],
        balance=data.get("balance", 0),
        currency=data.get("currency", "USD"),
        is_primary=False,
        active=True,
    )
    db.session.add(account)
    db.session.flush()

    is_card = card_data.get("is_card", True)
    provider = card_data.get("provider", "").strip()
    if not provider:
        return jsonify({"error": "Card provider is required"}), 400

    if is_card:
        cardnumber = card_data.get("cardnumber", "").replace(" ", "")
        if not cardnumber or len(cardnumber) < 12:
            return jsonify({"error": "Card number must be at least 12 digits"}), 400
        if not is_valid_card_number(cardnumber):
            return jsonify({"error": "Invalid card number (failed Luhn check)"}), 400
        existing = Card.query.filter_by(cardnumber=cardnumber, active=True).first()
        if existing:
            return jsonify({"error": "This card is already linked to another account"}), 409

        securitycode = card_data.get("securitycode")
        if securitycode and not (3 <= len(str(securitycode)) <= 4):
            return jsonify({"error": "Invalid security code"}), 400
        sc = generate_password_hash(securitycode)

        expires_at = None
        raw_exp = card_data.get("expires_at")
        if raw_exp:
            try:
                exp_date = datetime.fromisoformat(raw_exp)
                if exp_date < datetime.now():
                    return jsonify({"error": "Card is expired"}), 400
                expires_at = raw_exp
            except (ValueError, TypeError):
                return jsonify({"error": "Invalid expiry date format"}), 400

        card = Card(
            user_id=user.id,
            account_id=account.id,
            is_card=True,
            provider=provider,
            cardnumber=cardnumber,
            securitycode=sc,
            last4=cardnumber[-4:],
            expires_at=expires_at,
            currency=card_data.get("currency", account.currency),
            is_default=True,
            active=True,
        )
    else:
        accountnumber = card_data.get("accountnumber", "").strip()
        if not accountnumber or len(accountnumber) < 8:
            return jsonify({"error": "Account number must be at least 8 characters"}), 400
        existing = Card.query.filter_by(accountnumber=accountnumber, active=True).first()
        if existing:
            return jsonify({"error": "This account number is already linked"}), 409

        card = Card(
            user_id=user.id,
            account_id=account.id,
            is_card=False,
            provider=provider,
            accountnumber=accountnumber,
            currency=card_data.get("currency", account.currency),
            is_default=True,
            active=True,
        )

    db.session.add(card)

    db.session.add(AuditLog(user_id=user.id, action="account_creation", status="success"))
    db.session.commit()

    return jsonify(account_to_dict(account)), 201

@accounts_bp.route("/<int:id>/update", methods=["PUT"])
@jwt_required()
def update_account(id):
    user = User.query.get(get_jwt_identity())
    acc = Account.query.filter_by(id=id, user_id=user.id, active=True).first()

    if not acc:
        return jsonify({"error": "Not found"}), 404

    data = request.get_json()

    if "name" in data:
        acc.name = data["name"].strip()

    if "currency" in data:
        acc.currency = data["currency"]

    db.session.add(AuditLog(user_id=user.id, action="account_update", status="success"))
    db.session.commit()

    return jsonify(account_to_dict(acc))

@accounts_bp.route("/<int:id>/primary", methods=["POST"])
@limiter.limit("10 per minute")
@jwt_required()
def set_primary(id):
    user = User.query.get(get_jwt_identity())

    Account.query.filter_by(user_id=user.id).update({"is_primary": False})

    acc = Account.query.filter_by(id=id, user_id=user.id, active=True).first()
    if not acc:
        return jsonify({"error": "Not found"}), 404

    acc.is_primary = True
    db.session.commit()

    return jsonify({"success": True})

@accounts_bp.route("/<int:id>/delete", methods=["DELETE"])
@limiter.limit("10 per minute")
@jwt_required()
def delete_account(id):
    user = User.query.get(get_jwt_identity())
    acc = Account.query.filter_by(id=id, user_id=user.id, active=True).first()

    if not acc:
        return jsonify({"error": "Not found"}), 404

    acc.active = False
    acc.name = f"deleted_{acc.id}"

    for card in acc.cards:
        card.active = False
        card.is_default = False

    db.session.add(AuditLog(user_id=user.id, action="account_deletion", status="success"))
    db.session.commit()

    return jsonify({"success": True})

@accounts_bp.route("/<int:account_id>/cards", methods=["GET"])
@jwt_required()
def get_account_cards(account_id):
    user_id = get_jwt_identity()
    account = Account.query.filter_by(id=account_id, user_id=user_id, active=True).first()
    if not account:
        return jsonify({"error": "Account not found"}), 404

    cards = Card.query.filter_by(account_id=account_id, active=True).all()
    return jsonify([
        {
            "id": card.id,
            "provider": card.provider,
            "last4": card.last4,
            "accountnumber": card.accountnumber,
            "expires_at": card.expires_at.isoformat() if card.expires_at else None,
            "currency": card.currency,
            "is_card": card.is_card,
            "is_default": card.is_default,
            "created_at": card.created_at.isoformat() if card.created_at else None,
        }
        for card in cards
    ])

@accounts_bp.route("/<int:account_id>/cards", methods=["POST"])
@limiter.limit("10 per minute")
@jwt_required()
def create_card(account_id):
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    account = Account.query.filter_by(id=account_id, user_id=user_id, active=True).first()
    if not account:
        return jsonify({"error": "Account not found"}), 404

    if not can_create_card(user, account_id):
        max_cards = user.subscription.access.max_cards_per_accounts
        return jsonify({"error": f"Card limit reached ({max_cards} per account)"}), 403

    data = request.get_json()
    provider = data.get("provider", "").strip()
    if not provider:
        return jsonify({"error": "Provider is required"}), 400

    is_card = data.get("is_card", True)
    already_has_default = Card.query.filter_by(account_id=account_id, is_default=True, active=True).first()

    if is_card:
        cardnumber = data.get("cardnumber", "").replace(" ", "")
        if not cardnumber or len(cardnumber) < 12:
            return jsonify({"error": "Card number must be at least 12 digits"}), 400
        if not is_valid_card_number(cardnumber):
            return jsonify({"error": "Invalid card number"}), 400
        existing = Card.query.filter_by(cardnumber=cardnumber, active=True).first()
        if existing:
            return jsonify({"error": "This card is already linked"}), 409

        securitycode = data.get("securitycode")
        if securitycode and not (3 <= len(str(securitycode)) <= 4):
            return jsonify({"error": "Invalid security code"}), 400
        sc = generate_password_hash(securitycode)

        expires_at = None
        raw_exp = data.get("expires_at")
        if raw_exp:
            try:
                exp_date = datetime.fromisoformat(raw_exp)
                if exp_date < datetime.now():
                    return jsonify({"error": "Card is expired"}), 400
                expires_at = raw_exp
            except (ValueError, TypeError):
                return jsonify({"error": "Invalid expiry date format"}), 400

        card = Card(
            user_id=user_id,
            account_id=account_id,
            is_card=True,
            provider=provider,
            cardnumber=cardnumber,
            securitycode=sc,
            last4=cardnumber[-4:],
            expires_at=expires_at,
            currency=data.get("currency", account.currency),
            is_default=not bool(already_has_default),
            active=True,
        )
    else:
        accountnumber = data.get("accountnumber", "").strip()
        if not accountnumber or len(accountnumber) < 8:
            return jsonify({"error": "Account number must be at least 8 characters"}), 400
        existing = Card.query.filter_by(accountnumber=accountnumber, active=True).first()
        if existing:
            return jsonify({"error": "This account number is already linked"}), 409

        card = Card(
            user_id=user_id,
            account_id=account_id,
            is_card=False,
            provider=provider,
            accountnumber=accountnumber,
            currency=data.get("currency", account.currency),
            is_default=not bool(already_has_default),
            active=True,
        )

    db.session.add(card)
    db.session.add(AuditLog(user_id=user_id, action="card_creation", status="success"))
    db.session.commit()

    return jsonify({
        "id": card.id,
        "provider": card.provider,
        "last4": card.last4,
        "is_default": card.is_default,
        "message": "Card added successfully",
    }), 201

accounts_bp.route("/<int:account_id>/cards/<int:card_id>/default", methods=["POST"])
@limiter.limit("10 per minute")
@jwt_required()
def set_default_card(account_id, card_id):
    user_id = get_jwt_identity()

    account = Account.query.filter_by(id=account_id, user_id=user_id, active=True).first()
    if not account:
        return jsonify({"error": "Account not found"}), 404

    card = Card.query.filter_by(id=card_id, account_id=account_id, active=True).first()
    if not card:
        return jsonify({"error": "Card not found"}), 404

    try:
        Card.query.filter_by(account_id=account_id).update({"is_default": False})
        
        card.is_default = True
        db.session.commit()
        
        return jsonify({"success": True})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to update default card"}), 500

@accounts_bp.route("/<int:account_id>/cards/<int:card_id>/delete", methods=["DELETE"])
@limiter.limit("10 per minute")
@jwt_required()
def delete_card(account_id, card_id):
    user_id = get_jwt_identity()

    account = Account.query.filter_by(id=account_id, user_id=user_id, active=True).first()
    if not account:
        return jsonify({"error": "Account not found"}), 404

    card = Card.query.filter_by(id=card_id, account_id=account_id, active=True).first()
    if not card:
        return jsonify({"error": "Card not found"}), 404

    was_default = card.is_default

    card.active = False
    card.is_default = False
    db.session.flush()

    if was_default:
        next_card = Card.query.filter_by(account_id=account_id, active=True).first()
        if next_card:
            next_card.is_default = True

    db.session.add(AuditLog(user_id=user_id, action="card_deletion", status="success"))
    db.session.commit()

    return jsonify({"success": True, "message": "Card deleted successfully"})


# Luhn check
def is_valid_card_number(cardnumber):
    digits = [int(d) for d in cardnumber if d.isdigit()]
    if len(digits) < 12:
        return False
    checksum = 0
    for i, digit in enumerate(reversed(digits)):
        if i % 2 == 1:
            digit *= 2
            if digit > 9:
                digit -= 9
        checksum += digit
    return checksum % 10 == 0
