import os
import sys

from flask import Flask, jsonify
from flask_cors import CORS
from utils.screenshot_analyze import analyze_screenshot

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

app = Flask(__name__)
CORS(app)  # Allow React to make requests

# Import routes
from routes import api_routes

# Register blueprints
app.register_blueprint(api_routes.bp)

@app.route('/screenshot', methods=['POST'])
def screenshot():
    analyze_screenshot(None)

    return jsonify({
        "message": "This endpoint is deprecated. Please use /api/analyze-screenshot instead.",
        "status": "success"
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
