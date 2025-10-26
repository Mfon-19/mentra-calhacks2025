import os

from dotenv import load_dotenv
from letta_client import Letta, MessageCreate, TextContent, ImageContent
from .database_context import db_context

load_dotenv()

client = Letta(
    token=os.getenv("LETTA_API_KEY")
)

# In-memory caches/state
# lesson_cache: { lesson_id: { step_order: { 'name', 'description', 'finish_criteria' } } }
lesson_cache = {}

# user_state: { user_id: { 'lesson_id': int, 'step_order': int, 'popup_sent_for_step': bool } }
user_state = {}


def _ensure_lesson_loaded(lesson_id: int) -> dict:
    """Load all steps for a lesson into memory if not already cached."""
    if lesson_id not in lesson_cache:
        print("Loading all lesson steps in batch...")
        lesson_cache[lesson_id] = db_context.get_lesson_steps_batch(lesson_id)
    return lesson_cache[lesson_id]


def handle_screenshot_event(user_id: str, lesson_id: int, step_order: int, base64_image: str) -> dict:
    """
    Event-driven handler: called whenever a new screenshot arrives.
    Uses in-memory lesson data; sends popup once per step, then checks completion on subsequent screenshots.
    """
    # Ensure lesson data is cached
    lesson_data = _ensure_lesson_loaded(lesson_id)
    if not lesson_data or step_order not in lesson_data:
        return {"status": "end", "message": "Lesson or step not found"}

    # Update user state
    state = user_state.setdefault(user_id, {"lesson_id": lesson_id, "step_order": step_order, "popup_sent_for_step": False})
    state["lesson_id"] = lesson_id
    state["step_order"] = step_order

    step_info = lesson_data[step_order]
    step_description = step_info["description"]
    finish_criteria = step_info["finish_criteria"]

    # If popup not yet sent for this step, generate and send it now, then return
    if not state.get("popup_sent_for_step"):
        popup_message = generate_and_send_popup_message(base64_image, step_description, user_id)
        state["popup_sent_for_step"] = True
        return {"status": "popup_sent", "popup_message": popup_message, "step_order": step_order}

    # Otherwise, check completion using this latest screenshot
    completion_result = analyze_screenshot(base64_image, finish_criteria, lesson_id)
    if completion_result.strip().upper() == "YES":
        next_step_order = step_order + 1
        if next_step_order in lesson_data:
            # Advance to next step; reset popup flag
            state["step_order"] = next_step_order
            state["popup_sent_for_step"] = False
            return {"status": "step_advanced", "next_step_order": next_step_order}
        else:
            # Lesson complete
            user_state.pop(user_id, None)
            return {"status": "lesson_completed", "message": f"Lesson {lesson_id} completed."}

    # Not completed; wait for another screenshot
    return {"status": "not_completed", "step_order": step_order}

# Agent 1: Popup message agent
POPUP_MESSAGE_PROMPT = """You are a helpful popup message generator. Your job is to create concise, visual instructions that guide users through completing a step by analyzing their current screenshot.

INSTRUCTIONS:
1. Analyze the provided screenshot showing the user's current state
2. Take the step_order and step_description as input
3. Generate a helpful popup message that visually guides the user based on what you see
4. Focus on actionable, step-by-step visual instructions
5. Keep messages concise but clear
6. Use friendly, encouraging tone

OUTPUT FORMAT:
- Create a short, actionable popup message (2-3 sentences max)
- Reference specific elements you see in the screenshot (e.g., "Click the blue button", "Look for the green checkmark")
- Use encouraging language
- Focus on what the user should see and do next based on their current state

EXAMPLES:
- "I can see you're on the login page. Look for the 'Submit' button in the bottom right corner and click it to complete this step."
- "Great! I can see the form is filled out. Find the green checkmark icon next to your name - that means you're all set!"
- "I notice you're on the homepage. Click on the 'Create Account' button at the top of the page to proceed."""

popup_message_agent = client.agents.create(
    name="Popup Message Generator",
    system=POPUP_MESSAGE_PROMPT,
    model="openai/gpt-4o",
    embedding="openai/text-embedding-3-small",
    tools=[],
    include_base_tools=False
)

# Agent 2: Task completion decider
SYSTEM_PROMPT = """You are a task completion decider. Your ONLY job is to determine if a user has completed a task by comparing their screenshot against the finish criteria.

INSTRUCTIONS:
1. Look at the screenshot
2. Compare it against the finish criteria
3. Output ONLY "YES" if the task is completed, or "NO" if it's not completed

OUTPUT FORMAT:
- Answer with ONLY "YES" or "NO"
- Do not provide explanations, reasoning, or additional text
- Be precise: only say "YES" if the screenshot exactly matches the finish criteria"""

task_completion_agent = client.agents.create(
    name="Task Completion Decider",
    system=SYSTEM_PROMPT,
    model="openai/gpt-4o",
    embedding="openai/text-embedding-3-small",
    tools=[],
    include_base_tools=False
)


def analyze_screenshot(base64_image: str, finish_criteria: str, lesson_id: str = None) -> str:
    # Get context from database
    context = ""
    
    if lesson_id:
        # Note: This will need to be updated to use async when called from async context
        context += db_context.get_relevant_context("lesson", lesson_id)
    
    prompt = SYSTEM_PROMPT + context

    response = client.agents.messages.create(
        agent_id=task_completion_agent.id,
        messages=[
            MessageCreate(
                role="user",
                content=[
                    ImageContent(
                        source={
                            "type": "base64",
                            "media_type": "image/jpeg",
                            "data": base64_image,
                        }
                    ),
                    TextContent(
                        text=f"FINISH CRITERIA: {finish_criteria}\n\nIs the task completed? Answer YES or NO."
                    )
                ],
            )
        ],
    )

    # Extract the response content
    if response.messages:
        for message in response.messages:
            if hasattr(message, 'content') and message.content:
                print(f"Agent response: {message.content}")
                return str(message.content)
    
    return "No response received from agent"


def generate_and_send_popup_message(base64_image: str, step_description: str, user_id: str = None) -> str:
    """
    Generate a helpful popup message and send it via WebSocket to the frontend.
    
    Args:
        base64_image (str): Base64 encoded screenshot of current state
        step_description (str): Description of what the user should accomplish
        user_id (str): Optional user ID for targeted messaging
        
    Returns:
        str: Generated popup message
    """
    # Create the prompt for the popup message agent
    prompt = f"""STEP DESCRIPTION: {step_description}

Look at the screenshot above and generate a helpful popup message that visually guides the user through completing this step based on what you see."""

    response = client.agents.messages.create(
        agent_id=popup_message_agent.id,
        messages=[
            MessageCreate(
                role="user",
                content=[
                    ImageContent(
                        source={
                            "type": "base64",
                            "media_type": "image/jpeg",
                            "data": base64_image,
                        }
                    ),
                    TextContent(text=prompt)
                ],
            )
        ],
    )

    # Extract the response content
    popup_message = "No popup message generated"
    if response.messages:
        for message in response.messages:
            if hasattr(message, 'content') and message.content:
                popup_message = str(message.content)
                print(f"Generated popup message: {popup_message}")
                break
    
    # Send popup message via WebSocket API
    send_popup_via_websocket(popup_message, user_id)
    
    return popup_message


def send_popup_via_websocket(message: str, user_id: str = None):
    """
    Send popup message to frontend via WebSocket API.
    
    Args:
        message (str): Popup message to send
        user_id (str): Optional user ID for targeted messaging
    """
    try:
        import requests
        
        # WebSocket API endpoint (adjust URL as needed)
        websocket_api_url = "http://localhost:5000/api/send-popup"
        
        payload = {
            "message": message,
            "type": "popup",
            "timestamp": __import__('datetime').datetime.now().isoformat()
        }
        
        if user_id:
            payload["user_id"] = user_id
        
        # Send to WebSocket API
        response = requests.post(websocket_api_url, json=payload)
        
        if response.status_code == 200:
            print(f"Popup sent successfully via WebSocket: {message[:50]}...")
        else:
            print(f"Failed to send popup via WebSocket: {response.status_code}")
            
    except Exception as e:
        print(f"Error sending popup via WebSocket: {e}")
        # Fallback: could log to file or use alternative method


def execute_learning_flow(lesson_id: int, step_order: int, base64_image: str, user_id: str = None) -> dict:
    """
    Execute the complete learning flow as specified with optimized batch loading.
    
    Flow:
    Start -> Load ALL lesson data in one query -> Generate popup -> Wait 10s -> 
    Check completion -> If YES: update state +1, loop back -> If NO: wait 10s, loop back
    
    Args:
        lesson_id (int): Current lesson ID (state variable)
        step_order (int): Current step order (state variable)
        base64_image (str): Screenshot from current state
        user_id (str): Optional user ID for targeted messaging
        
    Returns:
        dict: Result containing status and any messages
    """
    import time
    
    print(f"Starting learning flow for Lesson ID {lesson_id}, Step {step_order}")
    
    # PERFORMANCE OPTIMIZATION: Ensure ALL lesson data is loaded (cached)
    if lesson_id not in lesson_cache:
        print("Loading all lesson steps in batch...")
        lesson_cache[lesson_id] = db_context.get_lesson_steps_batch(lesson_id)
    lesson_data = lesson_cache[lesson_id]
    
    if not lesson_data:
        print("No lesson data found - END")
        return {"status": "end", "message": "No lesson data found"}
    
    if step_order not in lesson_data:
        print(f"Step {step_order} not found in lesson data - END")
        return {"status": "end", "message": f"Step {step_order} not found"}
    
    # Get step information from cached data (no more database calls!)
    step_info = lesson_data[step_order]
    step_name = step_info['name']
    step_description = step_info['description']
    finish_criteria = step_info['finish_criteria']
    
    print(f"Found step: {step_name}")
    print(f"Step description: {step_description}")
    print(f"Finish criteria: {finish_criteria}")
    
    # Generate popup and send via WebSocket (only once per step/user)
    if user_id:
        state = user_state.setdefault(user_id, {"lesson_id": lesson_id, "step_order": step_order, "popup_sent_for_step": False})
        state["lesson_id"] = lesson_id
        state["step_order"] = step_order
        if not state.get("popup_sent_for_step"):
            print("Generating popup message and sending via WebSocket...")
            popup_message = generate_and_send_popup_message(base64_image, step_description, user_id)
            print(f"Generated and sent popup: {popup_message}")
            state["popup_sent_for_step"] = True
    else:
        print("Generating popup message and sending via WebSocket...")
        popup_message = generate_and_send_popup_message(base64_image, step_description)
        print(f"Generated and sent popup: {popup_message}")
    
    # Wait 10 seconds
    print("Waiting 10 seconds...")
    time.sleep(10)
    
    # Main completion check loop (using cached data)
    while True:
        print(f"Checking completion for Step {step_order}...")
        
        # Feed in SS and finish criteria (no database call needed!)
        completion_result = analyze_screenshot(base64_image, finish_criteria, lesson_id)
        print(f"Completion result: {completion_result}")
        
        if completion_result.strip().upper() == "YES":
            # YES: Update state to +1 step and return to start
            print(f"Step {step_order} completed! Moving to step {step_order + 1}")
            
            # Update state (increment step)
            next_step_order = step_order + 1
            
            # Check if next step exists (using cached data - no database call!)
            if next_step_order in lesson_data:
                # Reset popup state for next step and loop back
                if user_id and user_id in user_state:
                    user_state[user_id]["popup_sent_for_step"] = False
                print(f"Looping back to start with Step {next_step_order}")
                return execute_learning_flow_with_data(lesson_data, lesson_id, next_step_order, base64_image, user_id)
            else:
                # No more steps - lesson completed
                print("Lesson completed!")
                return {
                    "status": "lesson_completed", 
                    "message": f"Step {step_order} completed! Lesson {lesson_id} is finished!",
                    "popup_message": "Congratulations! You have completed this lesson."
                }
        
        else:
            # NO: Wait 10 seconds and loop back to completion check
            print(f"Step {step_order} not completed. Waiting 10 seconds and checking again...")
            time.sleep(10)
            # Loop continues automatically


def execute_learning_flow_with_data(lesson_data: dict, lesson_id: int, step_order: int, base64_image: str, user_id: str = None) -> dict:
    """
    Execute learning flow using pre-loaded lesson data for maximum performance.
    This function is called recursively and uses cached data instead of database queries.
    
    Args:
        lesson_data (dict): Pre-loaded lesson data from get_lesson_steps_batch()
        lesson_id (int): Current lesson ID
        step_order (int): Current step order
        base64_image (str): Screenshot from current state
        user_id (str): Optional user ID for targeted messaging
        
    Returns:
        dict: Result containing status and any messages
    """
    import time
    
    print(f"Continuing learning flow for Lesson ID {lesson_id}, Step {step_order}")
    
    if step_order not in lesson_data:
        print(f"Step {step_order} not found in lesson data - END")
        return {"status": "end", "message": f"Step {step_order} not found"}
    
    # Get step information from cached data (no database calls!)
    step_info = lesson_data[step_order]
    step_name = step_info['name']
    step_description = step_info['description']
    finish_criteria = step_info['finish_criteria']
    
    print(f"Found step: {step_name}")
    print(f"Step description: {step_description}")
    
    # Generate popup and send via WebSocket (only once per step/user)
    if user_id:
        state = user_state.setdefault(user_id, {"lesson_id": lesson_id, "step_order": step_order, "popup_sent_for_step": False})
        state["lesson_id"] = lesson_id
        state["step_order"] = step_order
        if not state.get("popup_sent_for_step"):
            print("Generating popup message and sending via WebSocket...")
            popup_message = generate_and_send_popup_message(base64_image, step_description, user_id)
            print(f"Generated and sent popup: {popup_message}")
            state["popup_sent_for_step"] = True
    else:
        print("Generating popup message and sending via WebSocket...")
        popup_message = generate_and_send_popup_message(base64_image, step_description)
        print(f"Generated and sent popup: {popup_message}")
    
    # Wait 10 seconds
    print("Waiting 10 seconds...")
    time.sleep(10)
    
    # Main completion check loop (using cached data)
    while True:
        print(f"Checking completion for Step {step_order}...")
        
        # Feed in SS and finish criteria (no database call needed!)
        completion_result = analyze_screenshot(base64_image, finish_criteria, lesson_id)
        print(f"Completion result: {completion_result}")
        
        if completion_result.strip().upper() == "YES":
            # YES: Update state to +1 step and return to start
            print(f"Step {step_order} completed! Moving to step {step_order + 1}")
            
            # Update state (increment step)
            next_step_order = step_order + 1
            
            # Check if next step exists (using cached data - no database call!)
            if next_step_order in lesson_data:
                # Reset popup state for next step and loop back
                if user_id and user_id in user_state:
                    user_state[user_id]["popup_sent_for_step"] = False
                print(f"Looping back to start with Step {next_step_order}")
                return execute_learning_flow_with_data(lesson_data, lesson_id, next_step_order, base64_image, user_id)
            else:
                # No more steps - lesson completed
                print("Lesson completed!")
                return {
                    "status": "lesson_completed", 
                    "message": f"Step {step_order} completed! Lesson {lesson_id} is finished!",
                    "popup_message": "Congratulations! You have completed this lesson."
                }
        
        else:
            # NO: Wait 10 seconds and loop back to completion check
            print(f"Step {step_order} not completed. Waiting 10 seconds and checking again...")
            time.sleep(10)
            # Loop continues automatically
