# Python Rules

## Type Safety

- Use type hints on all function signatures
- Use `from __future__ import annotations` for forward references
- Prefer `TypedDict` over plain dicts for structured data
- Use `Protocol` for duck typing (structural subtyping)
- Run `mypy --strict` or `pyright` in CI

## Patterns

- Use dataclasses or Pydantic models for structured data
- Use `pathlib.Path` over `os.path` for file operations
- Use `contextlib.contextmanager` for resource cleanup
- Use f-strings for formatting (not `.format()` or `%`)
- Use `collections.defaultdict` and `Counter` over manual dict operations

## Error Handling

- Define custom exception classes per domain
- Use `raise ... from e` to preserve exception chains
- Never catch bare `except:` — use `except Exception:` at minimum
- Use `logging` module — not `print()` for production code
- Use `finally` for cleanup, not relying on garbage collection

## Imports

- Group: stdlib → third-party → local, separated by blank lines
- Use absolute imports over relative
- Avoid wildcard imports (`from module import *`)
- Use `TYPE_CHECKING` guard for type-only imports to avoid circular deps

## Testing

- Use `pytest` with fixtures, not `unittest.TestCase`
- Use `@pytest.mark.parametrize` for data-driven tests
- Use `tmp_path` fixture for temporary file operations
- Mock external services with `unittest.mock.patch` or `pytest-mock`
- Use `freezegun` for time-dependent tests

## FastAPI / Django Specific

- Use dependency injection in FastAPI (Depends)
- Use Pydantic models for request/response schemas
- Use async endpoints when calling external services
- In Django, use `select_related`/`prefetch_related` to prevent N+1 queries
