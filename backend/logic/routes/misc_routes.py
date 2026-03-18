from flask import Blueprint, jsonify

health = Blueprint("health", __name__)

@health.route("/api/health")
def health():
    return jsonify({"status": "ok"})