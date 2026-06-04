from flask_jwt_extended import jwt_required, get_jwt_identity
from flask import Blueprint, request, jsonify
from datetime import datetime
from logic.extensions import limiter
from ..extensions import db
from ..models.data import User, Account, AuditLog, Card

def can_create_account(user):
    if not user.subscription or not user.subscription.access:
        return False
    
    max_accounts = user.subscription.access.max_accounts
    current_count = Account.query.filter_by(user_id=user.id).count()
    return current_count <= max_accounts

accounts_bp = Blueprint("accounts", __name__)

@accounts_bp.route("/get", methods=["GET"])
@limiter.limit("10 per minute")
@jwt_required()
def get_accounts():
    user = User.query.get(get_jwt_identity())

    accounts = Account.query.filter_by(user_id=user.id, active=True).all()
    max_accounts = user.subscription.access.max_accounts

    active_accounts = (
        Account.query
            .filter_by(user_id=user.id, active=True)
            .order_by(Account.created_at.asc())
            .all()
    )

    extra_accounts = len(active_accounts) - max_accounts
    current_count = Account.query.filter_by(user_id=user.id, active=True).count()

    if extra_accounts > 0:
        for i in range(extra_accounts):
            active_accounts[-(i + 1)].active = False

    # inactive_accounts = (
    #     Account.query
    #         .filter_by(user_id=user.id, active=False)
    #         .order_by(Account.created_at.asc())
    #         .all()
    # )

    # available_slots = max_accounts - current_count

    # for account in inactive_accounts[:available_slots]:
    #     account.active = True

    db.session.commit()

    return jsonify([
    {
        "id": a.id,
        "name": a.name,
        "provider": a.provider,
        "last4": a.last4,
        "balance": a.balance,
        "currency": a.currency,
        "is_primary": a.is_primary,
        "card_count": len([c for c in a.cards if c.active])
    }
    for a in accounts
])

@accounts_bp.route("/create", methods=["POST"])
@limiter.limit("5 per minute")
@jwt_required()
def create_account():
    user = User.query.get(get_jwt_identity())

    if not can_create_account(user):
        return jsonify({"error": "Account limit reached"}), 403

    data = request.get_json()

    account = Account(
        user_id=user.id,
        name=data["name"],
        provider=data.get("provider"),
        last4=data.get("last4"),
        balance=data.get("balance", 1000),
        currency=data.get("currency", "USD"),
        is_primary=False,
        active=True
    )

    db.session.add(account)
    db.session.commit()

    log = AuditLog(
        user_id=user.id,
        action="account_creation",
        status="success"
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({"msg": "created"})

@accounts_bp.route("/<int:id>/update", methods=["PUT"])
@jwt_required()
def update_account(id):
    user = User.query.get(get_jwt_identity())
    acc = Account.query.filter_by(id=id, user_id=user.id, active=True).first()

    if not acc or acc.user_id != user.id:
        return jsonify({"error": "Not found"}), 404

    data = request.get_json()

    if "name" in data:
        acc.name = data["name"]

    if "provider" in data:
        acc.provider = data["provider"]

    if "last4" in data:
        if len(data["last4"]) != 4 or not data["last4"].isdigit():
            return jsonify({"error": "Invalid last4"}), 400
        acc.last4 = data["last4"]

    db.session.commit()

    log = AuditLog(
        user_id=user.id,
        action="account_update",
        status="success"
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({"success": True})

@accounts_bp.route("/<int:id>/primary", methods=["POST"])
@limiter.limit("10 per minute")
@jwt_required()
def set_primary(id):
    user = User.query.get(get_jwt_identity())
    acc = Account.query.filter_by(id=id, user_id=user.id, active=True).first()

    Account.query.filter_by(user_id=user.id).update({"is_primary": False})

    if not acc or acc.user_id != user.id:
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

    if not acc or acc.user_id != user.id:
        return jsonify({"error": "Not found"}), 404

    acc.active = False
    acc.name = f"deleted_{acc.id}"
    acc.provider = "deleted"
    acc.cardnumber = None
    acc.last4 = "0000"
    
    db.session.commit()

    log = AuditLog(
        user_id=user.id,
        action="account_deletion",
        status="success"
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({"success": True})

@accounts_bp.route("/<int:account_id>/cards", methods=["GET"])
@jwt_required()
def get_account_cards(account_id):
    user_id = get_jwt_identity()

    account = Account.query.filter_by(
        id=account_id,
        user_id=user_id,
        active=True
    ).first()

    if not account:
        return jsonify({"error": "Account not found"}), 404

    cards = Card.query.filter_by(
        account_id=account_id,
        active=True
    ).all()

    # print([card.to_dict() for card in cards])

    return jsonify([
        {
            "id": card.id,
            "provider": card.provider,
            "last4": card.last4,
            "accountnumber": card.accountnumber,
            "expires_at": card.expires_at.isoformat() if card.expires_at else None,
            "accountnumber": card.accountnumber,
            "currency": card.currency,
            "is_card": card.is_card,
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

    account = Account.query.filter_by(
        id=account_id,
        user_id=user_id,
        active=True
    ).first()

    if not account:
        return jsonify({"error": "Account not found"}), 404

    max_cards = user.subscription.access.max_cards_per_accounts
    current_card_count = Card.query.filter_by(
        account_id=account_id,
        active=True
    ).count()

    if current_card_count >= max_cards:
        return jsonify({"error": f"Card limit reached ({max_cards} per account)"}), 403

    data = request.get_json()

    if not data.get("provider"):
        return jsonify({"error": "Provider is required"}), 400

    is_card = data.get("is_card", True)

    if is_card:
        cardnumber = data.get("cardnumber", "").replace(" ", "")

        if not cardnumber or len(cardnumber) < 12:
            return jsonify({"error": "Card number must be at least 12 digits"}), 400

        if not is_valid_card_number(cardnumber):
            return jsonify({"error": "Invalid card number"}), 400

        existing = Card.query.filter_by(cardnumber=cardnumber).first()
        if existing and existing.active == True:
            return jsonify({"error": "This card is already linked"}), 409

        securitycode = data.get("securitycode")
        if securitycode and (len(str(securitycode)) < 3 or len(str(securitycode)) > 4):
            return jsonify({"error": "Invalid security code"}), 400

        expires_at = data.get("expires_at")
        if expires_at:
            try:
                exp_date = datetime.fromisoformat(expires_at)
                if exp_date < datetime.now():
                    return jsonify({"error": "Card is expired"}), 400
            except (ValueError, TypeError):
                return jsonify({"error": "Invalid expiry date format"}), 400

        last4 = cardnumber[-4:] if len(cardnumber) >= 4 else cardnumber

        card = Card(
            user_id=user_id,
            account_id=account_id,
            is_card=True,
            provider=data.get("provider"),
            cardnumber=cardnumber,
            securitycode=securitycode,
            last4=last4,
            expires_at=expires_at,
            currency=data.get("currency", account.currency),
            active=True
        )

    else:
        accountnumber = data.get("accountnumber", "").strip()

        if not accountnumber or len(accountnumber) < 8:
            return jsonify({"error": "Account number must be at least 8 characters"}), 400

        existing = Card.query.filter_by(accountnumber=accountnumber).first()
        if existing:
            return jsonify({"error": "This account is already linked"}), 409

        card = Card(
            user_id=user_id,
            account_id=account_id,
            is_card=False,
            provider=data.get("provider"),
            accountnumber=accountnumber,
            currency=data.get("currency", account.currency),
            active=True
        )

    db.session.add(card)
    db.session.commit()

    log = AuditLog(
        user_id=user_id,
        action="card_creation",
        status="success"
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({
        "id": card.id,
        "provider": card.provider,
        "last4": card.last4,
        "message": "Card added successfully"
    }), 201

@accounts_bp.route("/<int:account_id>/cards/<int:card_id>/delete", methods=["DELETE"])
@limiter.limit("10 per minute")
@jwt_required()
def delete_card(account_id, card_id):
    user_id = get_jwt_identity()

    account = Account.query.filter_by(
        id=account_id,
        user_id=user_id,
        active=True
    ).first()

    if not account:
        return jsonify({"error": "Account not found"}), 404

    card = Card.query.filter_by(
        id=card_id,
        account_id=account_id,
        active=True
    ).first()

    if not card:
        return jsonify({"error": "Card not found"}), 404

    card.active = False
    card.provider = "deleted"
    card.cardnumber = None
    card.securitycode = None
    card.last4 = "0000"
    card.accountnumber = None
    
    db.session.commit()

    log = AuditLog(
        user_id=user_id,
        action="card_deletion",
        status="success"
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({"success": True, "message": "Card deleted successfully"})


def is_valid_card_number(cardnumber):
    digits = [int(d) for d in cardnumber if d.isdigit()]
    
    if len(digits) < 12:
        return False
    
    # Luhn algorithm
    checksum = 0
    for i, digit in enumerate(reversed(digits)):
        if i % 2 == 1:
            digit *= 2
            if digit > 9:
                digit -= 9
        checksum += digit
    
    return checksum % 10 == 0
