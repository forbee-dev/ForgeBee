# PHP Rules

## Type Safety

- Use strict types: `declare(strict_types=1)` in every file
- Type-hint all parameters and return types
- Use union types (`string|int`) over mixed
- Use `readonly` properties for immutable data (PHP 8.1+)
- Use enums for fixed sets of values (PHP 8.1+)

## WordPress Specific

- Prefix all functions, hooks, and global variables with project namespace
- Use `wp_nonce_field()` / `check_admin_referer()` on all form submissions
- Escape output: `esc_html()`, `esc_attr()`, `esc_url()`, `wp_kses()`
- Sanitize input: `sanitize_text_field()`, `absint()`, `wp_kses_post()`
- Never use `$_GET`/`$_POST` directly — use `sanitize_*` wrappers
- Register scripts/styles with `wp_enqueue_*` — never hardcode `<script>` tags
- Use `$wpdb->prepare()` for ALL database queries — no raw SQL
- Hook into correct priority — 10 is default, use 20+ for overrides
- Use `wp_safe_redirect()` over `wp_redirect()` for internal redirects

## ACF Specific

- Use `acf/init` hook for field group registration
- Use `get_field()` return type checks — ACF returns `false` for empty
- Register options pages with `acf_add_options_page()` in `acf/init`
- Use `acf/save_post` for post-save processing (priority 20 for after ACF saves)

## Laravel Specific

- Use Form Requests for validation — not inline `$request->validate()`
- Use Eloquent scopes for reusable query conditions
- Use API Resources for response transformation
- Never use `DB::raw()` without parameter binding
- Use Policies for authorization — not inline `Gate::allows()`

## Error Handling

- Use try-catch at the boundary (controllers, CLI commands)
- Log exceptions with context: `Log::error('message', ['context' => $data])`
- Return WP_Error in WordPress functions that can fail
- Use null-safe operator `?->` (PHP 8.0+) for chained access

## Testing

- Use Pest or PHPUnit with data providers for parametric tests
- Mock WordPress functions with Brain\Monkey or WP_Mock
- Use database transactions in tests for cleanup
- Test hooks fire at correct priority and pass correct args
