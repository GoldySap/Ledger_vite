from flask import Blueprint
from sqlalchemy import text
from ..extensions import db

debug_bp = Blueprint("debug", __name__)

@debug_bp.route("/reset-migrations")
def reset_migrations():

    db.session.execute(text("DELETE FROM alembic_version"))
    db.session.commit()

    return {"status": "migration reset"}