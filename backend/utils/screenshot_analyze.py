import base64
from datetime import datetime

# TODO: Implement LLM integration (OpenAI/Groq/Anthropic) for actual screenshot analysis
# This would require adding the appropriate API key and model integration

def analyze_screenshot(base64_image: str):
    """
    Analyze a screenshot and return analysis results.
    
    Args:
        base64_image (str): Base64 encoded PNG image data
        
    Returns:
        dict: Analysis results with metadata and basic information
    """
    try:
        # Decode the base64 image to get basic information
        image_data = base64.b64decode(base64_image)
        image_size = len(image_data)
        
        # Basic analysis without LLM (for testing purposes)
        analysis_result = {
            "timestamp": datetime.now().isoformat(),
            "image_size_bytes": image_size,
            "image_size_mb": round(image_size / (1024 * 1024), 2),
            "format": "PNG",
            "analysis_type": "basic_metadata",
            "status": "success",
            "message": "Screenshot received and processed successfully",
            "basic_info": {
                "received_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "data_length": len(base64_image),
                "is_valid_base64": True
            },
            "todo": "Integrate with LLM (Groq/OpenAI) for actual content analysis"
        }
        
        return analysis_result
        
    except Exception as e:
        return {
            "timestamp": datetime.now().isoformat(),
            "status": "error",
            "message": f"Error processing screenshot: {str(e)}",
            "analysis_type": "error"
        }

def get_step_context() -> str:
    return ""

# is a tool
# TODO: implement tool calling for this, only when the user is moving on to the next step
def update_step_state(cur_state_index: int):
    # check if it is already final state

    return None


def generate_popup() -> None:
    return None