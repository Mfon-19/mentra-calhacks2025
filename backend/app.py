import os
import sys
import base64

from flask import Flask, jsonify
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

# Register blueprints
app.register_blueprint(api_routes.bp)
app.register_blueprint(lesson_plans_bp, url_prefix='/api')
app.register_blueprint(media_bp, url_prefix='/api')

@app.route('/screenshot', methods=['POST'])
def screenshot():
    # FOR TESTING
    img_path = os.path.join(os.path.dirname(__file__), 'utils', 'img.png')
    with open(img_path, 'rb') as img_file:
        img_data = img_file.read()
        base64_image = base64.b64encode(img_data).decode('utf-8')

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
