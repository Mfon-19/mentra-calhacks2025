import json
import os
from typing import Dict, Any, Optional, Tuple
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

class DatabaseContextProvider:
    """Handles database operations and context injection for AI agents using Supabase client."""
    
    def __init__(self):
        # Create Supabase client with SSL handling
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_KEY")
        self.local_course_data = self._load_local_course_data()

        if not url or not key:
            print("Warning: SUPABASE_URL or SUPABASE_KEY not set; using local course data")
            self.sb = None
            return

        try:
            # Try normal connection first
            self.sb = create_client(url, key)
        except Exception as e:
            print(f"Warning: Supabase SSL connection failed: {e}")
            try:
                # Fallback: disable SSL verification for development
                import httpx
                import urllib3
                urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
                
                from supabase.lib.client_options import ClientOptions
                options = ClientOptions()
                options.client = httpx.Client(verify=False)
                
                self.sb = create_client(url, key, options)
            except Exception as fallback_error:
                print(f"Error: Supabase client creation failed completely: {fallback_error}")
                # Create a mock client for testing/fallback
                self.sb = None

    def _load_local_course_data(self):
        course_path = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "generated_course.json")
        )
        try:
            with open(course_path, "r", encoding="utf-8") as handle:
                return json.load(handle)
        except Exception as error:
            print(f"Warning: failed to load local course data: {error}")
            return []

    def _get_local_lesson_steps(self, lesson_id: int) -> Dict[int, Dict[str, str]]:
        if not self.local_course_data:
            return {}

        for lesson in self.local_course_data:
            if lesson.get("chapter") == lesson_id:
                steps = {}
                for step in lesson.get("steps", []):
                    step_order = step.get("step")
                    if step_order is None:
                        continue
                    steps[step_order] = {
                        "name": step.get("title") or f"Step {step_order}",
                        "description": step.get("instruction") or "",
                        "finish_criteria": step.get("finished_criteria")
                        or f"Step {step_order} completion criteria",
                    }
                return steps
        return {}
    
    def get_user_context(self, user_id: str) -> Dict[str, Any]:
        """Retrieve user-specific context from database."""
        # TODO: Implement database query to get user data
        # Example:
        # user_data = self.db.query("SELECT * FROM users WHERE id = %s", (user_id,))
        # return {
        #     "user_preferences": user_data.preferences,
        #     "learning_history": user_data.history,
        #     "current_step": user_data.current_step
        # }
        return {}
    
    def get_lesson_context(self, lesson_id: str) -> Dict[str, Any]:
        """Retrieve lesson-specific context from database."""
        # TODO: Implement database query to get lesson data
        return {}
    
    def get_lesson_id_by_order(self, lesson_order: int) -> Optional[int]:
        """
        Get lesson ID by lesson order number.
        
        Args:
            lesson_order (int): The lesson order number to query
            
        Returns:
            Optional[int]: The lesson ID if found, None otherwise
        """
        try:
            if self.sb is None:
                return None
            resp = (
                self.sb
                .table("lesson")
                .select("id")
                .eq("lesson_order", lesson_order)
                .limit(1)
                .execute()
            )
            data = resp.data or []
            return data[0]["id"] if data else None
        except Exception as e:
            print(f"Error querying lesson by order {lesson_order}: {e}")
            return None
    
    def get_step_context(self, step_id: str) -> str:
        """Get context for a specific learning step."""
        # TODO: Implement database query to get step data
        return ""
    
    def get_lesson_steps_batch(self, lesson_id: int) -> Dict[int, Dict[str, str]]:
        """
        Get all steps for a lesson in a single query for optimal performance.
        
        Args:
            lesson_id (int): The lesson ID to query
            
        Returns:
            Dict[int, Dict[str, str]]: {step_order: {'name': str, 'description': str, 'finish_criteria': str}}
        """
        try:
            if self.sb is None:
                return self._get_local_lesson_steps(lesson_id)
            resp = (
                self.sb
                .table("step")
                .select("step_order,name,description,finish_criteria")
                .eq("lesson_id", lesson_id)
                .order("step_order")
                .execute()
            )
            results = resp.data or []
            lesson_data: Dict[int, Dict[str, str]] = {}
            for row in results:
                step_order = row["step_order"]
                name = row["name"]
                description = row["description"]
                finish_criteria = row.get("finish_criteria")
                lesson_data[step_order] = {
                    "name": name,
                    "description": description,
                    "finish_criteria": finish_criteria if finish_criteria else f"Step {step_order} completion criteria",
                }
            if lesson_data:
                print(f"Loaded {len(lesson_data)} steps for lesson {lesson_id}")
                return lesson_data
            return self._get_local_lesson_steps(lesson_id)
        except Exception as e:
            print(f"Error loading lesson steps for lesson {lesson_id}: {e}")
            return self._get_local_lesson_steps(lesson_id)
    
    def get_step_by_order_and_lesson(self, step_order: int, lesson_id: int) -> Tuple[str, str]:
        """
        Get step name and description by step order number and lesson ID.
        
        Args:
            step_order (int): The step order number to query
            lesson_id (int): The lesson ID to filter by
            
        Returns:
            Tuple[str, str]: (step_name, step_description)
        """
        try:
            if self.sb is None:
                return "", ""
            resp = (
                self.sb
                .table("step")
                .select("name,description")
                .eq("step_order", step_order)
                .eq("lesson_id", lesson_id)
                .limit(1)
                .execute()
            )
            data = resp.data or []
            if data:
                row = data[0]
                return row.get("name", ""), row.get("description", "")
            return "", ""
        except Exception as e:
            print(f"Error querying step by order {step_order} and lesson {lesson_id}: {e}")
            return "", ""
    
    def get_step_by_order_and_lesson_order(self, step_order: int, lesson_order: int) -> Tuple[str, str]:
        """
        Get step name and description by step order and lesson order.
        This is a convenience method that first finds the lesson by order, then the step.
        
        Args:
            step_order (int): The step order number to query
            lesson_order (int): The lesson order number to filter by
            
        Returns:
            Tuple[str, str]: (step_name, step_description)
        """
        try:
            # First resolve lesson_id from lesson_order
            lesson_id = self.get_lesson_id_by_order(lesson_order)
            if lesson_id is None:
                return "", ""
            return self.get_step_by_order_and_lesson(step_order, lesson_id)
        except Exception as e:
            print(f"Error querying step by order {step_order} and lesson order {lesson_order}: {e}")
            return "", ""
    
    def update_user_progress(self, user_id: str, step_id: str, progress_data: Dict[str, Any]) -> bool:
        """Update user progress in database."""
        # TODO: Implement database update
        return True
    
    def get_relevant_context(self, context_type: str, identifier: str) -> str:
        """Generic method to get context based on type and identifier."""
        if context_type == "user":
            context = self.get_user_context(identifier)
        elif context_type == "lesson":
            context = self.get_lesson_context(identifier)
        elif context_type == "step":
            context = self.get_step_context(identifier)
        else:
            return ""
        
        # Format context for injection into agent
        return self._format_context_for_agent(context)
    
    def _format_context_for_agent(self, context: Dict[str, Any]) -> str:
        """Format database context for agent consumption."""
        if not context:
            return ""
        
        formatted_context = "Additional Context:\n"
        for key, value in context.items():
            formatted_context += f"- {key}: {value}\n"
        
        return formatted_context
    
    def get_step_finish_criteria(self, step_order: int, lesson_id: int) -> str:
        """
        Get finish criteria for a specific step from the database.
        
        Args:
            step_order (int): The step order number
            lesson_id (int): The lesson ID
            
        Returns:
            str: Finish criteria for the step
        """
        try:
            if self.sb is None:
                return f"Step {step_order} completion criteria"
            resp = (
                self.sb
                .table("step")
                .select("finish_criteria")
                .eq("step_order", step_order)
                .eq("lesson_id", lesson_id)
                .limit(1)
                .execute()
            )
            data = resp.data or []
            if data:
                value = data[0].get("finish_criteria")
                return value if value else f"Step {step_order} completion criteria"
            return f"Step {step_order} completion criteria"
        except Exception as e:
            print(f"Error querying finish criteria for step {step_order} and lesson {lesson_id}: {e}")
            return f"Step {step_order} completion criteria"
    
    def close_connection(self):
        """No-op for Supabase client."""
        return None

# Global instance for easy import
db_context = DatabaseContextProvider()
