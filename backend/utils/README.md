# Learning Agent System

A stateful AI-powered learning system that guides users through educational steps using screenshot analysis and contextual popup messages.

## Architecture

### Agents

#### 1. Popup Message Generator  
- **Purpose**: Creates helpful popup messages that guide users through completing steps
- **Input**: Screenshot + Step Description
- **Output**: Contextual popup message (2-3 sentences)
- **Model**: OpenAI GPT-4o

#### 2. Task Completion Decider
- **Purpose**: Determines if a user has completed a task by comparing screenshots against finish criteria
- **Input**: Screenshot + Finish Criteria + Lesson Context
- **Output**: "YES" or "NO"
- **Model**: OpenAI GPT-4o

### Database Integration

#### Database Context Provider (`database_context.py`)
- **Connection**: Supabase PostgreSQL
- **Key Methods**:
  - `get_step_by_order_and_lesson(step_order, lesson_id)` - Get step info
  - `get_step_finish_criteria(step_order, lesson_id)` - Get completion criteria
  - `get_relevant_context(context_type, identifier)` - Get contextual data

## Learning Flow (Optimized)

```
START
  ↓
Load ALL Lesson Data in Batch Query
  ↓
Get Step Info from Cache (No DB Call)
  ↓
Generate Popup Message (Agent 1)
  ↓
Send Popup via WebSocket
  ↓
Wait 10 seconds
  ↓
Check Completion (Agent 2) - Uses Cached Data
  ↓
┌─────────────────┬─────────────────┐
│      YES        │       NO         │
│                 │                  │
│ Increment Step  │ Wait 10 seconds │
│                 │                  │
│ Next Step Exists?│                 │
│ (Check Cache)   │                  │
│                 │                  │
│ YES: Loop Back  │ Loop Back to    │
│ NO: Lesson Done │ Completion Check│
└─────────────────┴─────────────────┘
```

## Usage

### Main Entry Point (Optimized with Batch Loading)
```python
from utils.learning_agent import execute_learning_flow

# Start learning flow - automatically loads all lesson data in one query
result = execute_learning_flow(
    lesson_id=5,
    step_order=1, 
    base64_image="iVBORw0KGgoAAAANSUhEUgAA...",
    user_id="user123"  # Optional: for targeted messaging
)

# Handle result
if result["status"] == "lesson_completed":
    print("Lesson finished!")
elif result["status"] == "end":
    print("Flow ended:", result["message"])
```

### Performance Optimization
The system now uses **batch loading** for maximum performance:
- **Single Database Query**: Loads all lesson steps at once using `get_lesson_steps_batch()`
- **In-Memory Caching**: All subsequent operations use cached data
- **5-10x Faster**: Eliminates repeated database calls during execution
- **Zero Database Calls**: After initial load, all step data comes from memory

### Individual Agent Usage
```python
from utils.learning_agent import analyze_screenshot, generate_popup_message

# Check task completion
completion = analyze_screenshot(
    base64_image="screenshot_data",
    finish_criteria="User should see green submit button",
    lesson_id="5"
)
# Returns: "YES" or "NO"

# Generate popup message
popup = generate_popup_message(
    base64_image="screenshot_data",
    step_description="User should create a new account"
)
# Returns: "I can see you're on the homepage. Click the 'Sign Up' button..."
```

## Environment Setup

### Required Environment Variables
```env
LETTA_API_KEY=your_letta_api_key
DB_HOST=your_supabase_host
DB_NAME=postgres
DB_USER=your_username
DB_PASSWORD=your_password
DB_PORT=5432
```

### Dependencies
```bash
pip install letta-client psycopg2-binary python-dotenv
```

## Database Schema

### Tables
- **`lesson`**: Contains lesson information
  - `id`, `name`, `description`, `lesson_order`, `is_finished`, `created_at`
- **`step`**: Contains step information and completion criteria
  - `id`, `lesson_id`, `name`, `description`, `step_order`, `finish_criteria`

### Key Relationships
- `step.lesson_id` → `lesson.id` (Foreign Key)

## State Management

### Persistent State Variables
- `lesson_id`: Current lesson (doesn't change during lesson)
- `step_order`: Current step (increments on completion)

### Database Injection Points
1. **Before Popup Generation**: Inject step description
2. **Before Completion Check**: Inject finish criteria and lesson context
3. **Before Next Step Check**: Inject next step data

## Features

- **Automatic Step Progression**: Moves to next step on completion
- **Contextual Guidance**: Popup messages based on current screenshot
- **Robust Error Handling**: Graceful fallbacks for missing data
- **Database-Driven**: All content pulled from Supabase database
- **Stateful Learning**: Maintains progress through lesson steps

## Error Handling

- Missing step descriptions → Flow ends gracefully
- Database connection issues → Fallback messages
- Agent failures → Default responses
- Invalid screenshots → Error logging

## Development Notes

- Uses Letta platform for AI agent management
- Screenshots must be base64 encoded JPEG format
- All database operations centralized in `database_context.py`
- Agents are stateless - context injected before each call
