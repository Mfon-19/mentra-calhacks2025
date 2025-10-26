import os
import sys
import types
import pytest


# Ensure backend path is importable
CURRENT_DIR = os.path.dirname(__file__)
BACKEND_DIR = os.path.dirname(CURRENT_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)


# Provide a minimal stub of the letta_client module BEFORE importing learning_agent
class _FakeMessage:
    def __init__(self, content):
        self.content = content


class _FakeAgentsMessages:
    def __init__(self):
        # Default response can be overridden in tests via monkeypatch
        self._messages = [_FakeMessage("YES")]

    def create(self, agent_id, messages):  # noqa: ARG002 - signature matches usage
        return types.SimpleNamespace(messages=list(self._messages))


class _FakeAgents:
    def __init__(self):
        self.messages = _FakeAgentsMessages()

    def create(self, name, system, model, embedding, tools, include_base_tools):  # noqa: ARG002
        # Return an object with an id field as expected by the code
        safe_id = str(name).lower().replace(" ", "_")
        return types.SimpleNamespace(id=f"agent_{safe_id}")


class _FakeLetta:
    def __init__(self, token=None):  # noqa: ARG002
        self.agents = _FakeAgents()


class _FakeMessageCreate:  # noqa: D401 - minimal stub
    """Stub for MessageCreate; only needs to accept ctor args."""

    def __init__(self, role, content):  # noqa: ARG002
        self.role = role
        self.content = content


class _FakeTextContent:  # noqa: D401 - minimal stub
    """Stub for TextContent; carries text."""

    def __init__(self, text):
        self.text = text


class _FakeImageContent:  # noqa: D401 - minimal stub
    """Stub for ImageContent; carries source dict."""

    def __init__(self, source):
        self.source = source


fake_letta_mod = types.ModuleType("letta_client")
fake_letta_mod.Letta = _FakeLetta
fake_letta_mod.MessageCreate = _FakeMessageCreate
fake_letta_mod.TextContent = _FakeTextContent
fake_letta_mod.ImageContent = _FakeImageContent
sys.modules.setdefault("letta_client", fake_letta_mod)


# Import after stubbing external dependency
from utils import learning_agent as la  # noqa: E402


@pytest.fixture(autouse=True)
def reset_agent_state():
    """Reset in-memory caches between tests for isolation."""
    la.lesson_cache.clear()
    la.user_state.clear()
    yield
    la.lesson_cache.clear()
    la.user_state.clear()


@pytest.fixture
def no_sleep(monkeypatch):
    """Disable time.sleep for fast tests."""
    monkeypatch.setattr(la.time, "sleep", lambda s: None)


def test_analyze_screenshot_returns_yes(monkeypatch):
    # Arrange: make the agent reply YES
    def fake_create(agent_id, messages):  # noqa: ARG001
        return types.SimpleNamespace(messages=[types.SimpleNamespace(content="YES")])

    monkeypatch.setattr(la.client.agents.messages, "create", fake_create)
    monkeypatch.setattr(la.db_context, "get_relevant_context", lambda t, i: "")  # noqa: ARG005

    # Act
    result = la.analyze_screenshot(base64_image="abc", finish_criteria="Click next", lesson_id="1")

    # Assert
    assert result.strip() == "YES"


def test_generate_and_send_popup_message_calls_websocket(monkeypatch):
    # Arrange: capture what is sent; function now uses step_description directly
    sent = {}

    def fake_send(message, user_id=None):
        sent["message"] = message
        sent["user_id"] = user_id
        return True

    monkeypatch.setattr(la, "send_popup_via_websocket", fake_send)

    # Act
    out = la.generate_and_send_popup_message(base64_image="abc", step_description="desc", user_id="u1")

    # Assert
    assert out == "desc"
    assert sent == {"message": "desc", "user_id": "u1"}


def test_send_popup_via_websocket_success_and_failure(monkeypatch):
    import requests  # noqa: WPS433 - used for monkeypatch target

    class _Resp:
        def __init__(self, status_code):
            self.status_code = status_code

    # Success
    monkeypatch.setattr(requests, "post", lambda url, json, timeout: _Resp(200))  # noqa: ARG005
    assert la.send_popup_via_websocket("msg") is True

    # Failure
    monkeypatch.setattr(requests, "post", lambda url, json, timeout: _Resp(500))  # noqa: ARG005
    assert la.send_popup_via_websocket("msg") is False


def test__ensure_lesson_loaded_caches(monkeypatch):
    calls = {"count": 0}

    def fake_batch(lesson_id):  # noqa: ARG001
        calls["count"] += 1
        return {1: {"name": "N", "description": "D", "finish_criteria": "C"}}

    monkeypatch.setattr(la.db_context, "get_lesson_steps_batch", fake_batch)

    first = la._ensure_lesson_loaded(lesson_id=7)
    second = la._ensure_lesson_loaded(lesson_id=7)

    assert first == second == {1: {"name": "N", "description": "D", "finish_criteria": "C"}}
    assert calls["count"] == 1  # Only loaded once


def test_handle_screenshot_event_popup_then_not_completed_then_completed(monkeypatch):
    # Arrange lesson data
    lesson_data = {
        1: {"name": "S1", "description": "Do A", "finish_criteria": "Crit"},
    }
    monkeypatch.setattr(la.db_context, "get_lesson_steps_batch", lambda lesson_id: lesson_data)  # noqa: ARG005

    # First call should send popup
    monkeypatch.setattr(la, "generate_and_send_popup_message", lambda img, desc, user_id=None: "Popup")  # noqa: ARG005
    out1 = la.handle_screenshot_event(user_id="u", lesson_id=1, step_order=1, base64_image="img")
    assert out1["completed"] is False
    assert out1["step_order"] == 1

    # Second call not completed
    monkeypatch.setattr(la, "analyze_screenshot", lambda img, crit, lesson_id=None: "NO")  # noqa: ARG005
    out2 = la.handle_screenshot_event(user_id="u", lesson_id=1, step_order=1, base64_image="img")
    assert out2["completed"] is False

    # Third call completed -> lesson_completed (no next step exists)
    monkeypatch.setattr(la, "analyze_screenshot", lambda img, crit, lesson_id=None: "YES")  # noqa: ARG005
    out3 = la.handle_screenshot_event(user_id="u", lesson_id=1, step_order=1, base64_image="img")
    assert out3["completed"] is True
    assert out3["lesson_completed"] is True


def test_execute_learning_flow_completes_lesson(monkeypatch, no_sleep):
    # Arrange two steps where completion is immediately YES
    steps = {
        1: {"name": "S1", "description": "D1", "finish_criteria": "C1"},
        2: {"name": "S2", "description": "D2", "finish_criteria": "C2"},
    }
    monkeypatch.setattr(la.db_context, "get_lesson_steps_batch", lambda lesson_id: steps)  # noqa: ARG005
    monkeypatch.setattr(la, "generate_and_send_popup_message", lambda img, desc, user_id=None: "Popup")  # noqa: ARG005
    monkeypatch.setattr(la, "analyze_screenshot", lambda img, crit, lesson_id=None: "YES")  # noqa: ARG005

    # Act
    result = la.execute_learning_flow(lesson_id=1, step_order=1, base64_image="img", user_id=None)

    # Assert: since step 2 has no following step, should complete
    assert result["status"] == "lesson_completed"


def test_handle_screenshot_event_missing_step_returns_error(monkeypatch):
    # No steps for the lesson
    monkeypatch.setattr(la.db_context, "get_lesson_steps_batch", lambda lesson_id: {})  # noqa: ARG005
    out = la.handle_screenshot_event(user_id="u", lesson_id=123, step_order=9, base64_image="img")
    assert out["completed"] is False
    assert "error" in out


