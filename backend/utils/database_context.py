import os
import psycopg2
from typing import List, Dict, Any, Optional, Tuple
from dotenv import load_dotenv

load_dotenv()

class DatabaseContextProvider:
    """Handles database operations and context injection for AI agents."""
    
    def __init__(self):
        # Initialize Supabase PostgreSQL connection
        self.connection = psycopg2.connect(
            host=os.getenv("DB_HOST", "localhost"),
            database=os.getenv("DB_NAME"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            port=os.getenv("DB_PORT", "5432")
        )
        self.cursor = self.connection.cursor()
    
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
            query = "SELECT id FROM lesson WHERE lesson_order = %s"
            self.cursor.execute(query, (lesson_order,))
            result = self.cursor.fetchone()
            
            if result:
                return result[0]
            else:
                return None
                
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
            query = """
            SELECT step_order, name, description, finish_criteria 
            FROM step 
            WHERE lesson_id = %s 
            ORDER BY step_order
            """
            self.cursor.execute(query, (lesson_id,))
            results = self.cursor.fetchall()
            
            lesson_data = {}
            for row in results:
                step_order, name, description, finish_criteria = row
                lesson_data[step_order] = {
                    'name': name,
                    'description': description,
                    'finish_criteria': finish_criteria if finish_criteria else f"Step {step_order} completion criteria"
                }
            
            print(f"Loaded {len(lesson_data)} steps for lesson {lesson_id}")
            return lesson_data
            
        except Exception as e:
            print(f"Error loading lesson steps for lesson {lesson_id}: {e}")
            return {}
    
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
            query = "SELECT s.name, s.description FROM step s WHERE s.step_order = %s AND s.lesson_id = %s"
            self.cursor.execute(query, (step_order, lesson_id))
            result = self.cursor.fetchone()
            
            if result:
                return result[0], result[1]
            else:
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
            query = "SELECT s.name, s.description FROM step s JOIN lesson l ON s.lesson_id = l.id WHERE s.step_order = %s AND l.lesson_order = %s"
            self.cursor.execute(query, (step_order, lesson_order))
            result = self.cursor.fetchone()
            
            if result:
                return result[0], result[1]
            else:
                return "", ""
                
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
            query = "SELECT finish_criteria FROM step WHERE step_order = %s AND lesson_id = %s"
            self.cursor.execute(query, (step_order, lesson_id))
            result = self.cursor.fetchone()
            
            if result:
                return result[0] if result[0] else f"Step {step_order} completion criteria"
            else:
                return f"Step {step_order} completion criteria"
                
        except Exception as e:
            print(f"Error querying finish criteria for step {step_order} and lesson {lesson_id}: {e}")
            return f"Step {step_order} completion criteria"
    
    def close_connection(self):
        """Close database connection."""
        if self.cursor:
            self.cursor.close()
        if self.connection:
            self.connection.close()

# Global instance for easy import
db_context = DatabaseContextProvider()
