import os
import sys
import base64

from flask import Flask, jsonify, request
from flask_cors import CORS
from utils.screenshot_analyze import analyze_screenshot

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

app = Flask(__name__)
CORS(app)  # Allow React to make requests

# Import routes
from routes import api_routes
from routes.lesson_plans import lesson_plans_bp
from routes.media_routes import media_bp
from routes.test_db import test_db_bp

# Register blueprints
app.register_blueprint(api_routes.bp)
app.register_blueprint(test_db_bp, url_prefix="/api")
app.register_blueprint(lesson_plans_bp, url_prefix='/api')
app.register_blueprint(media_bp, url_prefix='/api')

@app.route('/screenshot', methods=['POST'])
def screenshot():
    try:
        # Get the request data
        data = request.get_json()

        if not data or 'image' not in data:
            return jsonify({
                "message": "No image data provided",
                "status": "error"
            }), 400

        # Extract the base64 image data from the request
        base64_image = data['image']

        # Optional: Log metadata if provided
        if 'metadata' in data:
            print(f"Screenshot metadata: {data['metadata']}")

    except Exception as e:
        return jsonify({
            "message": f"Error processing request: {str(e)}",
            "status": "error"
        }), 400

    result = analyze_screenshot(base64_image)

    return jsonify({
        "message": "Screenshot analyzed successfully",
        "status": "success",
        "analysis": result
    })

@app.route('/')
def index():
    return jsonify({
        "message": "Flask backend is running!",
        "status": "success",
        "version": "1.0.0"
    })

@app.route('/health')
def health():
    return jsonify({
        "status": "healthy",
        "service": "calhacks2025-backend"
    })

if __name__ == '__main__':
    print("Starting Flask backend...")
    print("Backend will be available at: http://localhost:5000")
    app.run(debug=True, port=5000, host='127.0.0.1')
