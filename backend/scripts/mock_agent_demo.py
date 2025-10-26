import argparse
import logging
import os
import sys
import types
from typing import List, Optional


def install_fake_letta_module():
    """Install a stubbed 'letta_client' module before importing learning_agent."""
    class _FakeMessage:
        def __init__(self, content):
            self.content = content

    class _MessagesAPI:
        def __init__(self):
            # These will be set after import when we can read agent ids
            self._popup_content = "This is a helpful popup."
            self._completion_queue: List[str] = ["YES"]
            self._task_agent_id: Optional[str] = None
            self._popup_agent_id: Optional[str] = None

        def set_behavior(self, popup_message: str, completion_sequence: List[str]):
            self._popup_content = popup_message
            self._completion_queue = list(completion_sequence)

        def set_agent_ids(self, popup_agent_id: str, task_agent_id: str):
            self._popup_agent_id = popup_agent_id
            self._task_agent_id = task_agent_id

        def create(self, agent_id, messages):  # noqa: ARG002 - matches expected signature
            # Route based on agent id
            if self._task_agent_id and agent_id == self._task_agent_id:
                if self._completion_queue:
                    content = self._completion_queue.pop(0)
                else:
                    content = "NO"
                return types.SimpleNamespace(messages=[_FakeMessage(content)])
            # default to popup behavior
            return types.SimpleNamespace(messages=[_FakeMessage(self._popup_content)])

    class _AgentsAPI:
        def __init__(self):
            self.messages = _MessagesAPI()

        def create(self, name, system, model, embedding, tools, include_base_tools):  # noqa: ARG002
            safe_id = str(name).lower().replace(" ", "_")
            return types.SimpleNamespace(id=f"agent_{safe_id}")

    class _FakeLetta:
        def __init__(self, token=None):  # noqa: ARG002
            self.agents = _AgentsAPI()

    class _FakeMessageCreate:
        def __init__(self, role, content):  # noqa: ARG002
            self.role = role
            self.content = content

    class _FakeTextContent:
        def __init__(self, text):
            self.text = text

    class _FakeImageContent:
        def __init__(self, source):
            self.source = source

    fake_mod = types.ModuleType("letta_client")
    fake_mod.Letta = _FakeLetta
    fake_mod.MessageCreate = _FakeMessageCreate
    fake_mod.TextContent = _FakeTextContent
    fake_mod.ImageContent = _FakeImageContent
    sys.modules.setdefault("letta_client", fake_mod)
    return fake_mod


def main():
    parser = argparse.ArgumentParser(description="Run learning agent in a mock environment with debug outputs.")
    parser.add_argument("--mode", choices=["event", "flow"], default="event")
    parser.add_argument("--lesson-id", type=int, default=1)
    parser.add_argument("--steps", type=int, default=1, help="Number of steps for the mock lesson")
    parser.add_argument("--completion", nargs="*", default=["YES"], help="Sequence of YES/NO for completion agent")
    parser.add_argument("--popup", default="Try clicking the Next button in the bottom right.")
    parser.add_argument("--sleep", type=float, default=0.0, help="Seconds to sleep between checks (0 for instant)")
    parser.add_argument("--user-id", default="demo-user")
    args = parser.parse_args()

    logging.basicConfig(level=logging.DEBUG, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
    logger = logging.getLogger("mock_agent_demo")

    # Ensure the backend utils are importable when this script is run directly
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)

    # Install fake letta before importing the agent module
    fake_letta = install_fake_letta_module()

    from utils import learning_agent as la  # noqa: WPS433 - runtime import after stubbing

    # Speed up demo by patching sleep
    import types as _types

    la.time.sleep = lambda s: None if args.sleep <= 0 else __import__("time").sleep(args.sleep)  # type: ignore

    # Provide mock lesson data
    def mock_get_lesson_steps_batch(lesson_id):  # noqa: ARG001
        steps = {}
        for i in range(1, args.steps + 1):
            steps[i] = {
                "name": f"Step {i}",
                "description": f"Do the thing for step {i}",
                "finish_criteria": f"Finish criteria for step {i}",
            }
        return steps

    la.db_context.get_lesson_steps_batch = mock_get_lesson_steps_batch  # type: ignore

    # Mock websocket sender to log instead of HTTP
    def mock_send_popup(message: str, user_id: Optional[str] = None) -> bool:
        logger.info("[MOCK WS] user_id=%s message=%s", user_id, message)
        return True

    la.send_popup_via_websocket = mock_send_popup  # type: ignore

    # Configure the fake letta message behavior now that agents are created
    messages_api = la.client.agents.messages
    messages_api.set_behavior(popup_message=args.popup, completion_sequence=args.completion)  # type: ignore[attr-defined]
    messages_api.set_agent_ids(  # type: ignore[attr-defined]
        popup_agent_id=la.popup_message_agent.id,
        task_agent_id=la.task_completion_agent.id,
    )

    # Run the selected mode
    base64_image = "dGVzdC1pbWFnZS1kYXRh"  # "test-image-data"

    if args.mode == "event":
        logger.info("Running handle_screenshot_event demo: lesson_id=%s step=1", args.lesson_id)
        out1 = la.handle_screenshot_event(args.user_id, args.lesson_id, 1, base64_image)
        logger.info("event[1]: %s", out1)
        # Simulate additional screenshots until completion sequence consumed
        for idx in range(2, len(args.completion) + 3):
            outn = la.handle_screenshot_event(args.user_id, args.lesson_id, 1, base64_image)
            logger.info("event[%s]: %s", idx, outn)

    else:
        logger.info("Running execute_learning_flow demo: lesson_id=%s step=1 steps=%s", args.lesson_id, args.steps)
        result = la.execute_learning_flow(args.lesson_id, 1, base64_image)
        logger.info("flow result: %s", result)


if __name__ == "__main__":
    main()


