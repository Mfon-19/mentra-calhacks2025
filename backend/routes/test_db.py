from utils.supabase import supabase
from flask import Blueprint, jsonify

test_db_bp = Blueprint("test_db", __name__)


@test_db_bp.route("/insert-db", methods=["GET"])
def insert_db():
    try:
        supabase.table("lesson").insert(
            {
                "name": "Test Lesson",
                "description": "This is a test lesson",
                "lesson_order": 1,
            }
        ).execute()

        return jsonify({"message": "Lesson inserted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
