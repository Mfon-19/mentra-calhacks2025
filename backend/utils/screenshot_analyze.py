import os

from dotenv import load_dotenv
from letta_client import Letta

load_dotenv()

client = Letta(token=os.getenv("LETTA_API_KEY"))

SYSTEM_PROMPT = "I am a helpful AI assistant that analyzes screenshots and provides detailed, accurate descriptions of what you see. Focus on identifying UI elements, text content, layout, and any notable features or issues in the image."

agent_state = client.agents.create(
    # model="anthropic/claude-3-5-haiku",
    model="openai/gpt-4.1",
    embedding="openai/text-embedding-3-small",
    memory_blocks=[
        {
            "label": "persona",
            "value": SYSTEM_PROMPT
        },
    ],
    tools=["web_search", "run_code"]
)


def analyze_screenshot(base64_image: str) -> str:
    prompt = SYSTEM_PROMPT + get_step_context()

    response = client.agents.messages.create(
        agent_id=agent_state.id,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/jpeg",
                            "data": base64_image,
                        },
                    },
                    {
                        "type": "text",
                        "text": "Describe the image. Say sigma boi."
                    }
                ],
            }
        ],
    )

    for message in response.messages:
        print(message)
        return message.content
    return ""


def get_step_context() -> str:
    return ""


# TODO: implement tool calling for this, only when the user is moving on to the next step
def update_step_state(cur_state_index: int):
    # check if it is already final state

    return None

# TODO: return pop up format instead of pure string
def generate_popup() -> None:
    return None
