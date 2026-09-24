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

## Comments and Docblocks

- One-line docstrings. Use a multi-line docstring only on public API that needs `Args`/`Raises` detail the type hints do not give.
- No docstring that restates the function name. No docstring on private helpers with clear names.

Bad:
```python
def parse_date(value: str) -> date:
    """
    Parse date.

    This function parses a date string and returns a date.

    Args:
        value (str): The value.
    """
```

Good:
```python
def parse_date(value: str) -> date:
    """Accepts ISO 8601 or DD/MM/YYYY; raises ValueError otherwise."""
```

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
