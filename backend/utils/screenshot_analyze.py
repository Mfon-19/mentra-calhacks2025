import os

from dotenv import load_dotenv
from groq import Groq

load_dotenv()


client = Groq(
    api_key=os.getenv("GROQ_API_KEY"),
)

SYSTEM_PROMPT = "You are a helpful AI assistant that analyzes screenshots and provides detailed, accurate descriptions of what you see. Focus on identifying UI elements, text content, layout, and any notable features or issues in the image."
def analyze_screenshot(base64_image: str):
    chat_completion = client.chat.completions.create(
        messages=[
            {
                "role": "system",
                "content": SYSTEM_PROMPT
            },
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Analyze this screenshot"},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/png;base64,{base64_image}"
                        }
                    }
                ]
            }
        ],
        model="meta-llama/llama-4-scout-17b-16e-instruct",
    )

    return chat_completion.choices[0].message.content
