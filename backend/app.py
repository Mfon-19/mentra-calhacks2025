import os
import sys
from dotenv import load_dotenv

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load environment variables from parent directory's .env file
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(parent_dir, ".env")
load_dotenv(env_path)

app = Flask(__name__)
CORS(app)  # Allow React to make requests

# Import routes
from routes import api_routes
from routes.lesson_plans import lesson_plans_bp
from routes.media_routes import media_bp
from routes.test_db import test_db_bp

# Register blueprints
app.register_blueprint(api_routes.bp)
app.register_blueprint(lesson_plans_bp, url_prefix="/api")
app.register_blueprint(media_bp, url_prefix="/api")
app.register_blueprint(test_db_bp, url_prefix="/api")


@app.route("/")
def index():
    return jsonify(
        {
            "message": "Flask backend is running!",
            "status": "success",
            "version": "1.0.0",
        }
    )


@app.route("/health")
def health():
    return jsonify({"status": "healthy", "service": "calhacks2025-backend"})


if __name__ == "__main__":
    print("Starting Flask backend...")
    print("Backend will be available at: http://localhost:5000")
    app.run(debug=True, port=5000, host="127.0.0.1")
