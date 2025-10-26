import json
import requests

# Supabase credentials
SUPABASE_URL = "https://nynhpfozeopaaqkczcqs.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55bmhwZm96ZW9wYWFxa2N6Y3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzNTAxNTQsImV4cCI6MjA3NjkyNjE1NH0.Cn9Ke-dEiTVxQryfqI3MeuLruKUpV8bgjK-p3w7fKIE"

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

def upload_course_to_supabase():
    """Upload generated course using REST API"""
    
    # Load generated course
    with open('generated_course.json', 'r', encoding='utf-8') as f:
        course_data = json.load(f)
    
    print(f"Loaded {len(course_data)} lessons from JSON\n")
    
    # Insert lessons and steps
    for lesson_data in course_data:
        try:
            # Insert lesson
            lesson_insert = {
                'name': lesson_data['title'],
                'description': lesson_data.get('description', ''),
                'lesson_order': lesson_data.get('chapter', 1),
                'is_finished': False
            }
            
            print(f"Inserting lesson: {lesson_insert['name']}")
            
            # POST to Supabase REST API
            response = requests.post(
                f'{SUPABASE_URL}/rest/v1/lesson',
                headers=headers,
                json=lesson_insert
            )
            
            if response.status_code not in [200, 201]:
                print(f"❌ Failed to create lesson: {response.text}")
                continue
            
            lesson_response = response.json()
            lesson_id = lesson_response[0]['id']
            print(f"✅ Created lesson (ID: {lesson_id}): {lesson_insert['name']}")
            
            # Insert steps for this lesson
            if lesson_data.get('steps'):
                steps_to_insert = []
                for step in lesson_data['steps']:
                    step_insert = {
                        'lesson_id': lesson_id,
                        'name': step.get('title', ''),
                        'description': step.get('instruction', ''),
                        'step_order': step.get('step', 1),
                        'finish_criteria': step.get('finished_criteria', '')

                    }
                    steps_to_insert.append(step_insert)
                
                if steps_to_insert:
                    print(f"  Inserting {len(steps_to_insert)} steps...")
                    
                    steps_response = requests.post(
                        f'{SUPABASE_URL}/rest/v1/step',
                        headers=headers,
                        json=steps_to_insert
                    )
                    
                    if steps_response.status_code in [200, 201]:
                        print(f"  ✅ Created {len(steps_to_insert)} steps\n")
                    else:
                        print(f"  ❌ Failed to create steps: {steps_response.text}\n")
                    
        except Exception as e:
            print(f"❌ Error processing lesson '{lesson_data.get('title', 'unknown')}': {e}\n")
            continue
    
    print(f"🎉 Successfully uploaded course to Supabase!")

def get_all_lessons():
    """Fetch all lessons"""
    response = requests.get(
        f'{SUPABASE_URL}/rest/v1/lesson?select=*,step(*)',
        headers=headers
    )
    
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error fetching lessons: {response.text}")
        return []

if __name__ == '__main__':
    # Upload course
    upload_course_to_supabase()
    
    # Test retrieval
    print("\n" + "="*80)
    print("Testing retrieval...")
    print("="*80)
    lessons = get_all_lessons()
    print(f"Retrieved {len(lessons)} lessons")
    for lesson in lessons:
        step_count = len(lesson.get('step', []))
        print(f"  Lesson {lesson.get('lesson_order', '?')}: {lesson['name']} ({step_count} steps)")
