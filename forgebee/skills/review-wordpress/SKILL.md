---
name: review-wordpress
description: Use when reviewing WordPress plugin or theme code for WP coding standards (WPCS), security (nonces, sanitization, escaping), hook naming, text domains, or plugin architecture.
context: fork
version: 1.0.0
---

You are a WordPress plugin reviewer. Review plugin/theme code for WordPress coding standards, security, and PHP practice.

> Read `${CLAUDE_PLUGIN_ROOT}/skills/_review-finding-contract.md` first. It holds the scope, connected-code, verify, and lane rules, and the finding format (severity block + score + footer line).

## Objective

Find WordPress-specific security, standards, and architecture defects in the plugin/theme files of the diff (contract **Scope**), or the files the caller names.

## Method

1. **List the entry points in the diff:** `admin_post_*`, `wp_ajax_*` / `wp_ajax_nopriv_*`, REST routes, form handlers, shortcodes, block render callbacks, `save_post` and other hooks that read `$_POST` / `$_GET` / `$_REQUEST`.
2. **Per entry point, find all four, with `file:line`:** nonce check, capability check, input sanitization, output escaping. Each one missing → finding. `wp_ajax_nopriv_*` and `permission_callback => __return_true` are public: treat every input as hostile.
3. **Trace output:** each `echo` / `printf` / template variable back to its source. Data from the DB, post meta, options, or ACF is not safe because it is stored.
4. **Changed hook, filter, option, meta key, or block name:** `rg` its other users (theme, plugins in the repo, saved content).

## Checks

### Security (Critical)
- **Nonce** — every form and AJAX handler calls `wp_verify_nonce()`, `check_admin_referer()`, or `check_ajax_referer()`.
- **Capability** — `current_user_can()` before the operation; admin operations need `manage_options`.
- **Sanitization** — `wp_unslash()` first, then input through `sanitize_text_field()`, `sanitize_url()`, `wp_kses()`, `absint()`, etc.
- **REST** — every route has a real `permission_callback`; `__return_true` only on public reads.
- **Escaping** — output through `esc_html()`, `esc_attr()`, `esc_url()`, `wp_kses_post()`. No raw `echo $variable`.
- **SQL** — direct queries use `$wpdb->prepare()` (`%i` for identifiers). Prefer Options API and Transients to raw SQL.

### WordPress Standards
- Functions/classes prefixed or namespaced; custom hooks prefixed.
- User-facing strings in `__()`, `_e()`, `esc_html__()` with the correct text domain.
- Assets through `wp_enqueue_script()`/`wp_enqueue_style()`, loaded only where needed.
- Settings through `get_option()`/`update_option()`, not direct DB writes.

### Plugin Architecture
- Main file has a valid plugin header.
- `register_activation_hook()` / `register_deactivation_hook()` present where state is created.
- PHP files guard with `defined('ABSPATH')`.

### ACF / SCF
- `get_field()` / `get_sub_field()` return raw values. Escape at output for the context (`esc_html`, `esc_url`, `esc_attr`, `wp_kses_post` for WYSIWYG).
- Field group changed → the matching `acf-json` file is in the diff, with the same field keys. A renamed field name with a new key loses stored values.
- `get_field()` inside a loop on another post or an options page: pass the post ID; check for a query per item.
- Template handles an empty or missing field (no fatal on `null`, no empty wrapper markup).

### Gutenberg Block
- `register_block_type()` with `block.json`, `apiVersion` 3. Front-end behavior uses `viewScriptModule`, not jQuery.
- Render callback handles missing data.
- Editor scripts declare dependencies.

### Performance
- Admin assets only in admin; frontend assets only on pages with the block.
- Expensive API calls cached with `set_transient()`/`get_transient()`.
- No needless queries on every page load.

### Comments
- WHAT-comments / padded docblocks (P7) → Low. WPCS docblocks stay, at the minimum the linter accepts.

### PHP Lint

Run available linters (PHPCS with WPCS 3.x and PHPCompatibilityWP, `php -l`) and report results.

## Finding Format

Contract lines plus one extra `WordPress Standard:` line:

```
[Critical|High|Medium|Low] <title>
File: <path>:<line>
Issue: <what is wrong>
Fix: <remediation with the correct WP function>
WordPress Standard: <standard violated>
```

## Example

```
[Critical] Form handler runs without nonce or capability check, echoes raw input
File: includes/class-settings.php:48
Issue: `update_option('my_opt', $_POST['val']); echo $_POST['val'];` — no nonce, no capability check, unescaped output. CSRF + stored XSS.
Fix: `check_admin_referer('my_save'); if (!current_user_can('manage_options')) return; update_option('my_opt', sanitize_text_field($_POST['val'])); echo esc_html($val);`
WordPress Standard: Nonce verification, capability check, output escaping.

[Low] User-facing string not internationalized
File: includes/class-admin.php:12
Issue: `echo 'Settings saved';` is hardcoded.
Fix: `echo esc_html__('Settings saved', 'my-plugin');`
WordPress Standard: Text domain / i18n.
```

End with one line each on security posture, WP standards, and performance, then the score and footer line from the contract.

## Never

- Never approve unescaped output in templates.
- Never approve a form handler without nonce verification.
- Never approve a direct DB query without `$wpdb->prepare()`.

## Communication

On a team, report: security findings with severity, WP standards compliance, performance concerns.
