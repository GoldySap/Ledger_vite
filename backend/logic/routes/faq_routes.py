from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from ..extensions import db
from ..models.data import User, FaqItem, UserQuestion
from ..routes.helpers import admin_required
from datetime import datetime, UTC

faq_bp = Blueprint("faq", __name__, url_prefix="/api/faq")

@faq_bp.route("", methods=["GET"])
def get_faq():
    items = FaqItem.query.filter_by(published=True)\
        .order_by(FaqItem.category, FaqItem.sort_order, FaqItem.id).all()
    grouped: dict[str, list] = {}
    for item in items:
        grouped.setdefault(item.category, []).append(item.to_dict())
    return jsonify(grouped)

@faq_bp.route("/questions", methods=["POST"])
def submit_question():
    data = request.get_json() or {}

    question_text = (data.get("question") or "").strip()
    if not question_text:
        return jsonify({"error": "Question is required"}), 400

    user = None
    try:
        verify_jwt_in_request(optional=True)
        uid = get_jwt_identity()
        if uid:
            user = User.query.get(int(uid))
    except Exception:
        pass

    if user:
        name = user.email.split("@")[0]
        email = user.email
        user_id = user.id
    else:
        name  = (data.get("name")  or "").strip()
        email = (data.get("email") or "").strip()
        if not name or not email:
            return jsonify({"error": "Name and email are required"}), 400
        if "@" not in email:
            return jsonify({"error": "Invalid email address"}), 400
        user_id = None

    q = UserQuestion(
        user_id=user_id,
        name=name,
        email=email,
        question=question_text,
    )
    db.session.add(q)
    db.session.commit()
    return jsonify({"message": "Your question has been submitted. We will get back to you by email."}), 201

@faq_bp.route("/questions/gdpr-delete", methods=["POST"])
def gdpr_delete():
    data  = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()

    if not email or "@" not in email:
        return jsonify({"error": "A valid email address is required"}), 400

    rows = UserQuestion.query.filter(
        db.func.lower(UserQuestion.email) == email
    ).all()

    if not rows:
        return jsonify({"message": "If we held any data for that email, it has been removed."})

    for row in rows:
        row.name    = "Deleted user"
        row.email   = f"deleted_{row.id}@removed.local"
        row.user_id = None

    db.session.commit()

    return jsonify({
        "message": f"Personal data has been removed from {len(rows)} submission(s).",
        "removed": len(rows),
    })

@faq_bp.route("/questions/admin", methods=["GET"])
@jwt_required()
@admin_required
def admin_get_questions():
    questions = UserQuestion.query.order_by(UserQuestion.created_at.desc()).all()
    return jsonify([q.to_dict(admin=True) for q in questions])


@faq_bp.route("/questions/admin/<int:q_id>", methods=["PUT"])
@jwt_required()
@admin_required
def admin_update_question(q_id):
    row  = UserQuestion.query.get(q_id)
    if not row:
        return jsonify({"error": "Not found"}), 404
    data = request.get_json() or {}
    if "status" in data and data["status"] in ("pending", "answered", "closed"):
        row.status = data["status"]
    db.session.commit()
    return jsonify(row.to_dict(admin=True))

@faq_bp.route("/questions/admin/<int:q_id>", methods=["DELETE"])
@jwt_required()
@admin_required
def admin_delete_question(q_id):
    row = UserQuestion.query.get(q_id)
    if not row:
        return jsonify({"error": "Not found"}), 404
    db.session.delete(row)
    db.session.commit()
    return jsonify({"success": True})

@faq_bp.route("/admin", methods=["GET"])
@jwt_required()
@admin_required
def admin_get_all():
    items = FaqItem.query.order_by(FaqItem.category, FaqItem.sort_order, FaqItem.id).all()
    return jsonify([i.to_dict() for i in items])


@faq_bp.route("/admin", methods=["POST"])
@jwt_required()
@admin_required
def admin_create():
    data = request.get_json() or {}
    if not data.get("category") or not data.get("question") or not data.get("answer"):
        return jsonify({"error": "category, question, and answer are required"}), 400
    item = FaqItem(
        category=data["category"].lower().strip(),
        question=data["question"].strip(),
        answer=data["answer"].strip(),
        sort_order=int(data.get("sort_order", 0)),
        published=bool(data.get("published", True)),
    )
    db.session.add(item)
    db.session.commit()
    return jsonify(item.to_dict()), 201

@faq_bp.route("/admin/<int:item_id>", methods=["PUT"])
@jwt_required()
@admin_required
def admin_update(item_id):
    item = FaqItem.query.get(item_id)
    if not item:
        return jsonify({"error": "Not found"}), 404
    data = request.get_json() or {}
    if "category"   in data: item.category   = data["category"].lower().strip()
    if "question"   in data: item.question   = data["question"].strip()
    if "answer"     in data: item.answer     = data["answer"].strip()
    if "sort_order" in data: item.sort_order = int(data["sort_order"])
    if "published"  in data: item.published  = bool(data["published"])
    db.session.commit()
    return jsonify(item.to_dict())

@faq_bp.route("/admin/<int:item_id>", methods=["DELETE"])
@jwt_required()
@admin_required
def admin_delete(item_id):
    item = FaqItem.query.get(item_id)
    if not item:
        return jsonify({"error": "Not found"}), 404
    db.session.delete(item)
    db.session.commit()
    return jsonify({"success": True})

def seed_faq():
    if FaqItem.query.first():
        return
    for item in SEED_DATA:
        db.session.add(FaqItem(**item))
    db.session.commit()