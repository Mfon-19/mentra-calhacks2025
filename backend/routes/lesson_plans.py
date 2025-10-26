from flask import Blueprint, jsonify, request

from lesson_generator import generate_full_course
from tools.bright_data_tool import scrape_to_txt
from upload_to_supabase_simple import upload_course_to_supabase

# Create a blueprint for lesson plan routes
lesson_plans_bp = Blueprint('lesson_plans', __name__)

@lesson_plans_bp.route('/generate-lesson-plan', methods=['POST'])
def generateLessonPlan():
    """Generate a new lesson plan based on input parameters"""
    try:
        data = request.get_json()
        lesson_topic = data.get('topic')
        
        if not lesson_topic:
            return jsonify({"error": "No data provided"}), 400
        
        scrape_to_txt(lesson_topic)
        generate_full_course()
        upload_course_to_supabase()

        # Placeholder response
        generated_lesson_plan = {
            "id": None,  # Will be generated after saving
            "title": data.get('title', 'Generated Lesson Plan'),
            "subject": data.get('subject', 'General'),
            "grade_level": data.get('grade_level', 'Elementary'),
            "duration": data.get('duration', 60),  # minutes
            "objectives": [],  # Will be populated by generation logic
            "activities": [],  # Will be populated by generation logic
            "materials": [],   # Will be populated by generation logic
            "assessment": {},  # Will be populated by generation logic
            "status": "generating"  # or "completed", "failed"
        }
        
        return jsonify({
            "message": "Lesson plan generation started",
            "lesson_plan": generated_lesson_plan
        }), 202  # 202 Accepted for async processing
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
