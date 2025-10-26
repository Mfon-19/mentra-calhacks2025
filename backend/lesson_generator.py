import os
import requests
import json
from dotenv import load_dotenv

load_dotenv('.env')

def call_lava(messages, model='llama-3.3-70b-versatile', temperature=0.7, max_tokens=2000):
    """Make a call to Groq via Lava"""
    # Groq endpoint
    groq_endpoint = 'https://api.groq.com/openai/v1/chat/completions'
    
    # Build Lava forward URL
    from urllib.parse import quote
    lava_base = os.getenv('LAVA_BASE_URL', 'https://api.lavapayments.com/v1')
    url = f"{lava_base}/forward?u={quote(groq_endpoint)}"
    
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f"Bearer {os.getenv('LAVA_FORWARD_TOKEN')}"
    }
    
    request_body = {
        'model': model,
        'messages': messages,
        'temperature': temperature,
        'max_tokens': max_tokens
    }
    
    response = requests.post(url, headers=headers, json=request_body)
    
    # Debug: Check response status and content
    print(f'Response status: {response.status_code}')
    
    if response.status_code != 200:
        print(f'Error response: {response.text}')
        raise Exception(f"API request failed with status {response.status_code}: {response.text}")
    
    try:
        data = response.json()
    except json.JSONDecodeError:
        print(f'Failed to parse JSON. Response text: {response.text[:500]}')
        raise
    
    request_id = response.headers.get('x-lava-request-id')
    print(f'Lava request ID: {request_id}')
    
    # Track usage
    if 'usage' in data:
        usage = data['usage']
        print(f"Tokens used: {usage.get('total_tokens', 0)}")
    
    # Check for errors in response
    if 'error' in data:
        print(f"API Error: {data['error']}")
        raise Exception(f"API returned error: {data['error']}")
    
    return data

def load_scraped_content():
    """Load the scraped Figma documentation"""
    file_path = os.path.join(os.path.dirname(__file__), 'tools', 'scraped_results.txt')
    with open(file_path, 'r', encoding='utf-8') as f:
        return f.read()

def generate_lesson_plan():
    """Step 1: Generate a 5-chapter lesson plan"""
    print("\n" + "="*80)
    print("STEP 1: Generating Lesson Plan")
    print("="*80)
    
    messages = [
        {
            'role': 'user', 
            'content': 'Imagine I was someone unfamiliar with Figma, come up with a course study plan involving 5 chapters. Make them distinct from each other but also beginner friendly. Return ONLY a JSON array with this format: [{"chapter": 1, "title": "...", "description": "..."}]'
        }
    ]
    
    response = call_lava(messages)
    
    # Extract the lesson plan
    content = response['choices'][0]['message']['content']
    print(f"\nLesson Plan:\n{content}")
    
    # Parse the JSON
    try:
        # Try to extract JSON from markdown code blocks if present
        if '```json' in content:
            content = content.split('```json')[1].split('```')[0].strip()
        elif '```' in content:
            content = content.split('```')[1].split('```')[0].strip()
        
        lesson_plan = json.loads(content)
        return lesson_plan
    except json.JSONDecodeError:
        print("Warning: Could not parse lesson plan as JSON. Using raw response.")
        return None

def generate_chapter_content(chapter_num, chapter_title, chapter_desc, scraped_content):
    """Step 2: Generate detailed steps for a specific chapter using scraped docs"""
    print("\n" + "="*80)
    print(f"STEP 2.{chapter_num}: Generating Content for Chapter {chapter_num}")
    print("="*80)
    
    messages = [
        {
            'role': 'system',
            'content': 'You are a Figma course instructor. Use the provided Figma documentation to create detailed, actionable steps for the chapter.'
        },
        {
            'role': 'user',
            'content': f"""Chapter {chapter_num}: {chapter_title}
Description: {chapter_desc}

Using the Figma documentation below, create 5-7 specific, actionable steps for this chapter. Each step should:
- Reference specific Figma features from the documentation
- Be beginner-friendly with clear instructions
- Build upon previous steps

Figma Documentation:
{scraped_content[:15000]}

Return a JSON array: [{{"step": 1, "title": "...", "instruction": "...", "figma_feature": "..."}}]"""
        }
    ]
    
    response = call_lava(messages)
    content = response['choices'][0]['message']['content']
    
    print(f"\nChapter {chapter_num} Content:\n{content[:500]}...")
    
    # Parse the JSON
    try:
        if '```json' in content:
            content = content.split('```json')[1].split('```')[0].strip()
        elif '```' in content:
            content = content.split('```')[1].split('```')[0].strip()
        
        steps = json.loads(content)
        return steps
    except json.JSONDecodeError:
        print("Warning: Could not parse chapter content as JSON.")
        return None

def generate_full_course():
    """Main function: Generate lesson plan + detailed content for each chapter"""
    
    # Step 1: Generate lesson plan
    lesson_plan = generate_lesson_plan()
    
    if not lesson_plan:
        print("Failed to generate lesson plan")
        return
    
    # Load scraped Figma documentation
    print("\n" + "="*80)
    print("Loading Figma Documentation")
    print("="*80)
    scraped_content = load_scraped_content()
    print(f"Loaded {len(scraped_content)} characters of documentation")
    
    # Step 2: Generate content for each chapter
    full_course = []
    
    for chapter in lesson_plan:
        chapter_num = chapter.get('chapter', 0)
        chapter_title = chapter.get('title', '')
        chapter_desc = chapter.get('description', '')
        
        steps = generate_chapter_content(chapter_num, chapter_title, chapter_desc, scraped_content)
        
        full_course.append({
            'chapter': chapter_num,
            'title': chapter_title,
            'description': chapter_desc,
            'steps': steps
        })
    
    # Save the full course
    output_file = os.path.join(os.path.dirname(__file__), 'generated_course.json')
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(full_course, f, indent=2, ensure_ascii=False)
    
    print("\n" + "="*80)
    print(f"✅ Course generated and saved to: {output_file}")
    print("="*80)
    
    return full_course

if __name__ == '__main__':
    generate_full_course()
