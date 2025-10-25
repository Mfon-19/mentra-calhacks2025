import os

from dotenv import load_dotenv
# from groq import Groq
from letta_client import Letta

load_dotenv()

client = Letta(token=os.getenv("LETTA_API_KEY"))

SYSTEM_PROMPT = "I am a helpful AI assistant that analyzes screenshots and provides detailed, accurate descriptions of what you see. Focus on identifying UI elements, text content, layout, and any notable features or issues in the image."

agent_state = client.agents.create(
    model="openai/gpt-4.1",
    embedding="openai/text-embedding-3-small",
    memory_blocks=[
        {
            "label": "persona",
            "value": SYSTEM_PROMPT
        },
    ],
    # tools=["web_search", "run_code"]
)


def analyze_screenshot(base64_image: str):
    prompt = SYSTEM_PROMPT + get_step_context()

    print(agent_state.id)


def get_step_context() -> str:
    return ""


# TODO: implement tool calling for this, only when the user is moving on to the next step
def update_step_state(cur_state_index: int):
    # check if it is already final state

    return None


def generate_popup() -> None:
    return None
