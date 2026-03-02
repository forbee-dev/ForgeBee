# Hook Rules — Always Apply

## Hook Behavior

- Hooks MUST exit 0 to allow the tool use to proceed
- Exit code 2 from PreToolUse hooks BLOCKS the tool use
- PreToolUse hooks receive JSON on stdin with `tool_name` and `tool_input`
- PostToolUse hooks receive JSON on stdin with `tool_name`, `tool_input`, and `tool_output`
- Stop hooks run after each Claude response
- SessionStart hooks run once when a session begins
- Always pass through the original input JSON on stdout (echo "$INPUT")

## Hook Best Practices

- Keep hooks fast (<5s for sync, <10s for async)
- Use `async: true` for non-blocking observation hooks
- Never modify the input JSON — only read it
- Fail silently (|| true) for non-critical operations
- Use stderr (>&2) for warnings/messages to the user
- stdout is for data passthrough only

## Auto-Accept Permissions

- Permission decisions from hooks bypass user prompts
- Use allowlist patterns for known-safe commands
- Use blocklist patterns for known-dangerous commands
- Cache permission decisions with TTL for unknown commands
