import os
import sys
import types
import pytest


# Ensure we can import `utils.database_context` when tests run from project root
CURRENT_DIR = os.path.dirname(__file__)
BACKEND_DIR = os.path.dirname(CURRENT_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# Insert a minimal Supabase client stub BEFORE importing the module under test
class _SupabaseQuery:
    def __init__(self, table_name, store):
        self.table_name = table_name
        self.store = store
        self.filters = []
        self.columns = None
        self._order = None
        self._limit = None

    def select(self, columns):
        self.columns = columns
        return self

    def eq(self, col, val):
        self.filters.append((col, val))
        return self

    def order(self, col):
        self._order = col
        return self

    def limit(self, n):
        self._limit = n
        return self

    def execute(self):
        data = list(self.store.get(self.table_name, []))
        for col, val in self.filters:
            data = [row for row in data if row.get(col) == val]
        if self._order:
            data.sort(key=lambda r: r.get(self._order))
        if self._limit is not None:
            data = data[: self._limit]
        return types.SimpleNamespace(data=data)


class _SupabaseStub:
    def __init__(self, store):
        self._store = store

    def table(self, name):
        return _SupabaseQuery(name, self._store)

from utils.database_context import DatabaseContextProvider  # noqa: E402


class FakeCursor:
    def __init__(self, behavior):
        self.behavior = behavior
        self.closed = False
        self.last_query = None
        self.last_params = None

    def execute(self, query, params=None):
        self.last_query = " ".join(str(query).split())  # normalize whitespace
        self.last_params = params
        # Optionally raise on configured queries
        raise_map = self.behavior.get("raise_on", {})
        for needle, exc in raise_map.items():
            if needle in self.last_query:
                raise exc

    def fetchone(self):
        one_map = self.behavior.get("fetchone", {})
        for needle, value in one_map.items():
            if needle in (self.last_query or ""):
                return value
        return None

    def fetchall(self):
        all_map = self.behavior.get("fetchall", {})
        for needle, value in all_map.items():
            if needle in (self.last_query or ""):
                return value
        return []

    def close(self):
        self.closed = True


class FakeConnection:
    def __init__(self, behavior=None):
        self.behavior = behavior or {}
        self.closed = False
        self._cursor = FakeCursor(self.behavior)

    def cursor(self):
        return self._cursor

    def close(self):
        self.closed = True


@pytest.fixture
def sb_store(monkeypatch):
    """Provide an in-memory store and inject a Supabase stub into DatabaseContextProvider."""
    store = {
        "lesson": [],
        "step": [],
    }
    
    # Create the stub client
    stub_client = _SupabaseStub(store)
    
    # Patch the create_client function to return our stub
    monkeypatch.setattr("utils.database_context.create_client", lambda url, key, options=None: stub_client)
    
    return store


def test_get_lesson_id_by_order_found(sb_store):
    # Arrange
    sb_store["lesson"].append({"id": 42, "lesson_order": 1})
    ctx = DatabaseContextProvider()

    # Act
    result = ctx.get_lesson_id_by_order(1)

    # Assert
    assert result == 42


def test_get_lesson_id_by_order_not_found(sb_store):
    # Arrange: fetchone default is None
    ctx = DatabaseContextProvider()

    # Act
    result = ctx.get_lesson_id_by_order(999)

    # Assert
    assert result is None


def test_get_lesson_id_by_order_error(monkeypatch, sb_store):
    # Arrange: force error by making create_client raise an exception
    def boom_client(url, key, options=None):
        raise RuntimeError("db error")
    
    monkeypatch.setattr("utils.database_context.create_client", boom_client)
    
    # Act
    ctx = DatabaseContextProvider()
    result = ctx.get_lesson_id_by_order(1)
    
    # Assert: error handled and None returned
    assert result is None


def test_get_lesson_steps_batch_success(sb_store):
    # Arrange: return two steps, one without finish_criteria (None)
    sb_store["step"] += [
        {"lesson_id": 99, "step_order": 1, "name": "Step One", "description": "Desc 1", "finish_criteria": "Click next"},
        {"lesson_id": 99, "step_order": 2, "name": "Step Two", "description": "Desc 2", "finish_criteria": None},
    ]
    ctx = DatabaseContextProvider()

    # Act
    result = ctx.get_lesson_steps_batch(99)

    # Assert
    assert result == {
        1: {"name": "Step One", "description": "Desc 1", "finish_criteria": "Click next"},
        2: {"name": "Step Two", "description": "Desc 2", "finish_criteria": "Step 2 completion criteria"},
    }


def test_get_lesson_steps_batch_error(monkeypatch, sb_store):
    # Arrange: force error by making create_client raise an exception
    def boom_client(url, key, options=None):
        raise RuntimeError("db error")
    
    monkeypatch.setattr("utils.database_context.create_client", boom_client)
    
    # Act
    ctx = DatabaseContextProvider()
    result = ctx.get_lesson_steps_batch(1)
    
    # Assert
    assert result == {}


def test_get_step_by_order_and_lesson_found(sb_store):
    # Arrange
    sb_store["step"].append({"lesson_id": 2, "step_order": 1, "name": "Name", "description": "Desc"})
    ctx = DatabaseContextProvider()

    # Act
    step_name, step_desc = ctx.get_step_by_order_and_lesson(step_order=1, lesson_id=2)

    # Assert
    assert step_name == "Name"
    assert step_desc == "Desc"


def test_get_step_by_order_and_lesson_not_found(sb_store):
    # Arrange: default fetchone None
    ctx = DatabaseContextProvider()

    # Act
    step_name, step_desc = ctx.get_step_by_order_and_lesson(step_order=1, lesson_id=2)

    # Assert
    assert (step_name, step_desc) == ("", "")


def test_get_step_by_order_and_lesson_error(monkeypatch, sb_store):
    # Arrange: force error by making create_client raise an exception
    def boom_client(url, key, options=None):
        raise RuntimeError("db error")
    
    monkeypatch.setattr("utils.database_context.create_client", boom_client)
    
    # Act
    ctx = DatabaseContextProvider()
    step_name, step_desc = ctx.get_step_by_order_and_lesson(step_order=1, lesson_id=2)
    
    # Assert
    assert (step_name, step_desc) == ("", "")


def test_get_step_by_order_and_lesson_order_found(sb_store):
    # Arrange
    sb_store["lesson"].append({"id": 10, "lesson_order": 4})
    sb_store["step"].append({"lesson_id": 10, "step_order": 3, "name": "JoinName", "description": "JoinDesc"})
    ctx = DatabaseContextProvider()

    # Act
    step_name, step_desc = ctx.get_step_by_order_and_lesson_order(step_order=3, lesson_order=4)

    # Assert
    assert (step_name, step_desc) == ("JoinName", "JoinDesc")


def test_get_step_by_order_and_lesson_order_not_found(sb_store):
    # Arrange: default None
    ctx = DatabaseContextProvider()

    # Act
    step_name, step_desc = ctx.get_step_by_order_and_lesson_order(step_order=3, lesson_order=4)

    # Assert
    assert (step_name, step_desc) == ("", "")


def test_get_step_by_order_and_lesson_order_error(monkeypatch, sb_store):
    # Arrange: force error by making create_client raise an exception
    def boom_client(url, key, options=None):
        raise RuntimeError("db error")
    
    monkeypatch.setattr("utils.database_context.create_client", boom_client)
    
    # Act
    ctx = DatabaseContextProvider()
    step_name, step_desc = ctx.get_step_by_order_and_lesson_order(step_order=3, lesson_order=4)
    
    # Assert
    assert (step_name, step_desc) == ("", "")


def test_get_step_finish_criteria_value(sb_store):
    # Arrange
    sb_store["step"].append({"lesson_id": 6, "step_order": 5, "finish_criteria": "Do X"})
    ctx = DatabaseContextProvider()

    # Act
    result = ctx.get_step_finish_criteria(step_order=5, lesson_id=6)

    # Assert
    assert result == "Do X"


def test_get_step_finish_criteria_default_on_none(sb_store):
    # Arrange: finish_criteria is None
    sb_store["step"].append({"lesson_id": 6, "step_order": 5, "finish_criteria": None})
    ctx = DatabaseContextProvider()

    # Act
    result = ctx.get_step_finish_criteria(step_order=5, lesson_id=6)

    # Assert
    assert result == "Step 5 completion criteria"


def test_get_step_finish_criteria_default_on_missing(sb_store):
    # Arrange: fetchone default None
    ctx = DatabaseContextProvider()

    # Act
    result = ctx.get_step_finish_criteria(step_order=7, lesson_id=8)

    # Assert
    assert result == "Step 7 completion criteria"


def test_get_step_finish_criteria_error(monkeypatch, sb_store):
    # Arrange: force error by making create_client raise an exception
    def boom_client(url, key, options=None):
        raise RuntimeError("db error")
    
    monkeypatch.setattr("utils.database_context.create_client", boom_client)
    
    # Act
    ctx = DatabaseContextProvider()
    result = ctx.get_step_finish_criteria(step_order=7, lesson_id=8)
    
    # Assert: default string on error
    assert result == "Step 7 completion criteria"


def test_get_relevant_context_empty_defaults(sb_store):
    ctx = DatabaseContextProvider()

    # user -> get_user_context returns {}
    assert ctx.get_relevant_context("user", "u1") == ""
    # lesson -> get_lesson_context returns {}
    assert ctx.get_relevant_context("lesson", "l1") == ""
    # step -> get_step_context returns "" -> formatted to ""
    assert ctx.get_relevant_context("step", "s1") == ""
    # unknown -> ""
    assert ctx.get_relevant_context("unknown", "x") == ""


def test_close_connection_closes_handles(sb_store):
    ctx = DatabaseContextProvider()
    # Precondition
    assert ctx.sb is not None

    # Act
    ctx.close_connection()

    # Assert: no-op
    assert ctx.close_connection() is None


