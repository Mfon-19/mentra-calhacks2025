import os
import sys
import base64
from datetime import datetime

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room
from utils.learning_agent import (
    analyze_screenshot,
    handle_screenshot_event,
    user_state,
    generate_and_send_popup_message,
)
from utils.database_context import db_context

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

app = Flask(__name__)
CORS(app)  # Allow React to make requests

# Initialize SocketIO
socketio = SocketIO(app, cors_allowed_origins="*")

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

        # Determine finish_criteria and lesson_id if provided
        finish_criteria = data.get('finish_criteria')
        lesson_id = data.get('lesson_id')
        step_order = data.get('step_order')
        user_id = data.get('user_id')

        # If lesson_id and step_order provided but no explicit finish_criteria, derive via batched fetch
        if (not finish_criteria) and (lesson_id is not None) and (step_order is not None):
            try:
                lesson_id_int = int(lesson_id)
                step_order_int = int(step_order)
                lesson_data = db_context.get_lesson_steps_batch(lesson_id_int)
                if step_order_int in lesson_data:
                    finish_criteria = lesson_data[step_order_int].get('finish_criteria') or ""
                else:
                    finish_criteria = ""
            except Exception as derive_err:
                print(f"Warning: failed to derive finish_criteria from lesson data: {derive_err}")
                finish_criteria = ""

    except Exception as e:
        return jsonify({
            "message": f"Error processing request: {str(e)}",
            "status": "error"
        }), 400

    # Decide flow: default to progression-aware handler. If explicitly stateless, skip progression.
    stateless = bool(data.get('stateless', False))

    if not stateless:
        # Resolve identifiers from data, then from current user_state, then from defaults
        resolved_user_id = str(user_id or os.getenv("DEFAULT_USER_ID", "default-user"))
        resolved_lesson_id = lesson_id
        resolved_step_order = step_order

        if resolved_lesson_id is None or resolved_step_order is None:
            existing = user_state.get(resolved_user_id)
            if existing:
                resolved_lesson_id = existing.get("lesson_id")
                resolved_step_order = existing.get("step_order")

        if resolved_lesson_id is None or resolved_step_order is None:
            # Fallback to defaults (lesson 1, step 1) or environment overrides
            resolved_lesson_id = int(os.getenv("DEFAULT_LESSON_ID", "1"))
            resolved_step_order = 1

        try:
            progression_result = handle_screenshot_event(
                resolved_user_id,
                int(resolved_lesson_id),
                int(resolved_step_order),
                base64_image,
            )
            return jsonify({
                "status": "success",
                **progression_result
            })
        except Exception as event_err:
            return jsonify({
                "message": f"Event handling failed: {str(event_err)}",
                "status": "error"
            }), 500

    # Stateless analysis path: compute completion and return
    try:
        analysis = analyze_screenshot(base64_image, finish_criteria or "", lesson_id)
        completed = str(analysis).strip().upper() == "YES"
        return jsonify({
            "message": "Screenshot analyzed successfully",
            "status": "success",
            "analysis": analysis,
            "completed": completed
        })
    except Exception as analyze_err:
        return jsonify({
            "message": f"Analysis failed: {str(analyze_err)}",
            "status": "error"
        }), 500

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

## Removed consolidated event endpoint; use /screenshot only

# Explicit start endpoint to trigger popup and set state before first screenshot
@app.route('/api/start-step', methods=['POST'])
def start_step():
    try:
        data = request.get_json(silent=True) or {}

        resolved_user_id = str(data.get('user_id') or os.getenv("DEFAULT_USER_ID", "default-user"))
        lesson_id = data.get('lesson_id')
        step_order = data.get('step_order')

        # If not provided, derive from current state or defaults
        existing = user_state.get(resolved_user_id)
        if lesson_id is None:
            lesson_id = existing.get('lesson_id') if existing else int(os.getenv("DEFAULT_LESSON_ID", "1"))
        if step_order is None:
            step_order = existing.get('step_order') if existing else 1

        lesson_id = int(lesson_id)
        step_order = int(step_order)

        # Load lesson data and send popup for current step
        lesson_data = db_context.get_lesson_steps_batch(lesson_id)
        if step_order not in lesson_data:
            return jsonify({
                "status": "error",
                "message": f"Step {step_order} not found for lesson {lesson_id}"
            }), 400

        step_description = lesson_data[step_order].get('description') or ""
        generate_and_send_popup_message("", step_description, resolved_user_id)

        # Update state to indicate popup already sent for this step
        state = user_state.setdefault(resolved_user_id, {"lesson_id": lesson_id, "step_order": step_order, "popup_sent_for_step": True})
        state["lesson_id"] = lesson_id
        state["step_order"] = step_order
        state["popup_sent_for_step"] = True

        return jsonify({
            "status": "success",
            "message": "Step initialized and popup sent",
            "user_id": resolved_user_id,
            "lesson_id": lesson_id,
            "step_order": step_order
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Failed to start step: {str(e)}"
        }), 500

# WebSocket API endpoint for sending popup messages
@app.route('/api/send-popup', methods=['POST'])
def send_popup():
    """
    API endpoint to send popup messages via WebSocket to connected clients.
    
    Expected JSON payload:
    {
        "message": "Popup message text",
        "type": "popup",
        "user_id": "optional_user_id",
        "timestamp": "optional_timestamp"
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'message' not in data:
            return jsonify({
                "message": "No message provided",
                "status": "error"
            }), 400
        
        # Extract popup data
        popup_message = data['message']
        popup_type = data.get('type', 'popup')
        user_id = data.get('user_id')
        timestamp = data.get('timestamp', datetime.now().isoformat())
        
        # Prepare the popup data to send
        popup_data = {
            "message": popup_message,
            "type": popup_type,
            "timestamp": timestamp,
            "user_id": user_id
        }
        
        # Send popup to all connected clients or specific user
        if user_id:
            # Send to specific user (if user rooms are implemented)
            socketio.emit('popup_message', popup_data, room=user_id)
            print(f"Popup sent to user {user_id}: {popup_message[:50]}...")
        else:
            # Send to all connected clients
            socketio.emit('popup_message', popup_data)
            print(f"Popup broadcasted to all clients: {popup_message[:50]}...")
        
        return jsonify({
            "message": "Popup sent successfully",
            "status": "success",
            "popup_data": popup_data
        })
        
    except Exception as e:
        return jsonify({
            "message": f"Error sending popup: {str(e)}",
            "status": "error"
        }), 500

# WebSocket event handlers
@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    print(f"Client connected: {request.sid}")
    emit('status', {'message': 'Connected to popup service'})

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    print(f"Client disconnected: {request.sid}")

@socketio.on('join_user_room')
def handle_join_user_room(data):
    """Handle user joining their specific room for targeted messaging"""
    user_id = data.get('user_id')
    if user_id:
        join_room(user_id)
        print(f"User {user_id} joined room")
        emit('status', {'message': f'Joined room for user {user_id}'})

if __name__ == '__main__':
    print("Starting Flask backend with WebSocket support...")
    print("Backend will be available at: http://localhost:5000")
    print("WebSocket endpoint: ws://localhost:5000/socket.io/")
    socketio.run(app, debug=True, port=5000, host='127.0.0.1', allow_unsafe_werkzeug=True)
