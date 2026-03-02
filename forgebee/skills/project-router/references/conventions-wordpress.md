# WordPress & PHP Conventions

Loaded by the project router when the triage detects a WordPress or PHP project.
Agents receiving this reference should follow these patterns exactly.

---

## PHP General

### Coding Standards
- Follow [WordPress Coding Standards](https://developer.wordpress.org/coding-standards/wordpress-coding-standards/php/) when in a WP context
- Use tabs for indentation (WordPress standard), NOT spaces
- Opening braces on the same line for functions/classes
- Yoda conditions: `if ( 'value' === $variable )` — constant on the left
- Spaces inside parentheses: `if ( $condition )`, `function_call( $arg )`
- Single quotes for strings unless interpolation is needed
- Snake_case for function names and variables: `get_user_data()`, `$user_name`
- PascalCase for class names: `class User_Authentication {}`
- UPPERCASE for constants: `define( 'MY_PLUGIN_VERSION', '1.0.0' );`

### Security — Non-Negotiable
- **Sanitize all input**: `sanitize_text_field()`, `absint()`, `esc_url()`, `wp_kses_post()`
- **Escape all output**: `esc_html()`, `esc_attr()`, `esc_url()`, `wp_kses_post()`
- **Validate nonces** on every form submission and AJAX handler: `wp_verify_nonce()`
- **Check capabilities** before any privileged action: `current_user_can()`
- **Prepare SQL queries**: Always use `$wpdb->prepare()` — NEVER concatenate user input into SQL
- **Never trust `$_GET`, `$_POST`, `$_REQUEST`** — always sanitize before use
- Use `wp_safe_redirect()` instead of `wp_redirect()` for internal redirects

### Database
- Use `$wpdb` for direct queries — always with `->prepare()`
- Prefer WordPress APIs over raw SQL: `get_option()`, `update_post_meta()`, `WP_Query`
- Use `dbDelta()` for table creation in activation hooks
- Prefix custom tables: `$wpdb->prefix . 'my_table'`
- For custom post types and taxonomies, register in `init` hook

### Error Handling
- Use `WP_Error` for error returns, not exceptions (WordPress convention)
- Check `is_wp_error()` on any function that might return `WP_Error`
- Log with `error_log()` or `wp_die()` for fatal admin errors
- Never show raw PHP errors to users in production

---

## Plugin Development

### Structure
```
my-plugin/
├── my-plugin.php            # Main bootstrap file (Plugin Name header)
├── includes/                # PHP classes and business logic
│   ├── class-my-plugin.php  # Main plugin class
│   ├── class-admin.php      # Admin-specific functionality
│   └── class-public.php     # Frontend-specific functionality
├── admin/                   # Admin assets (CSS, JS)
├── public/                  # Frontend assets
├── languages/               # Translation files (.pot, .po, .mo)
├── templates/               # Template files
├── assets/                  # Source assets (SCSS, unminified JS)
│   ├── scss/
│   └── js/
├── tests/                   # PHPUnit tests
├── uninstall.php            # Clean uninstall handler
├── readme.txt               # WordPress.org readme
├── composer.json             # PHP dependencies
└── package.json              # JS/CSS build tooling (if applicable)
```

### Bootstrap Pattern
```php
// my-plugin.php — single entry point
defined( 'ABSPATH' ) || exit;

define( 'MY_PLUGIN_VERSION', '1.0.0' );
define( 'MY_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'MY_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

// Autoload or manual requires
require_once MY_PLUGIN_DIR . 'includes/class-my-plugin.php';

// Activation/deactivation (must be in main file, not in a class loaded later)
register_activation_hook( __FILE__, array( 'My_Plugin', 'activate' ) );
register_deactivation_hook( __FILE__, array( 'My_Plugin', 'deactivate' ) );

// Initialize
add_action( 'plugins_loaded', array( 'My_Plugin', 'init' ) );
```

### Hook Best Practices
- Register activation/deactivation hooks in the main plugin file only
- Use `plugins_loaded` for initialization, not the constructor
- Guard admin-only code: `if ( is_admin() ) { ... }`
- Use late priorities for hooks that need to override: `add_action( 'init', ..., 20 )`
- Remove hooks cleanly: store references so `remove_action()` can find them
- Prefix ALL function names, hooks, options, and transients: `myplugin_`

### Settings API
- Register settings with `register_setting()` + sanitize callback
- Use `add_options_page()` or `add_submenu_page()` for admin pages
- Validate and sanitize in the `register_setting` callback, not in the render function
- Use `Settings_Errors` API for feedback: `add_settings_error()`, `settings_errors()`

### AJAX
```php
// Register: both logged-in and logged-out if needed
add_action( 'wp_ajax_my_action', 'my_action_callback' );
add_action( 'wp_ajax_nopriv_my_action', 'my_action_callback' ); // Only if public

function my_action_callback() {
    check_ajax_referer( 'my_nonce_action', 'nonce' );

    if ( ! current_user_can( 'edit_posts' ) ) {
        wp_send_json_error( 'Unauthorized', 403 );
    }

    $data = sanitize_text_field( wp_unslash( $_POST['data'] ?? '' ) );
    // ... process ...
    wp_send_json_success( $result );
}
```

### Enqueuing Assets
- Always use `wp_enqueue_script()` / `wp_enqueue_style()` — never raw `<script>` or `<link>`
- Hook: `wp_enqueue_scripts` for frontend, `admin_enqueue_scripts` for admin
- Use `wp_localize_script()` or `wp_add_inline_script()` to pass data to JS
- Version parameter: use plugin version constant or `filemtime()` for cache busting
- Dependencies: declare them properly (e.g., `array( 'jquery', 'wp-element' )`)

---

## Theme Development

### Classic Theme Structure
```
my-theme/
├── style.css                # Required — Theme Name header + main styles
├── functions.php            # Theme setup, hooks, enqueues
├── index.php                # Required fallback template
├── header.php / footer.php  # Template parts
├── template-parts/          # Reusable template fragments
├── page.php / single.php    # Page/post templates
├── archive.php              # Archive template
├── sidebar.php              # Sidebar template
├── searchform.php           # Search form
├── 404.php                  # 404 template
├── assets/
│   ├── scss/                # SCSS source files
│   ├── js/                  # JavaScript source
│   ├── css/                 # Compiled CSS
│   ├── images/              # Theme images
│   └── fonts/               # Custom fonts
├── inc/                     # PHP includes (customizer, widgets, etc.)
├── languages/               # Translations
└── screenshot.png           # Theme preview (1200×900)
```

### Block Theme Structure
```
my-block-theme/
├── style.css                # Theme Name header
├── functions.php            # Minimal — mostly enqueues
├── theme.json               # ⭐ Central config (colors, fonts, spacing, layout)
├── templates/               # Full-page block templates (HTML)
│   ├── index.html
│   ├── single.html
│   ├── page.html
│   ├── archive.html
│   └── 404.html
├── parts/                   # Reusable template parts (HTML)
│   ├── header.html
│   ├── footer.html
│   └── sidebar.html
├── patterns/                # Block patterns (PHP)
├── styles/                  # Style variations (JSON)
└── assets/                  # Static assets
```

### theme.json Conventions
- Define all design tokens here: colors, typography, spacing, layout widths
- Use `settings.color.palette` for custom color palette
- Use `settings.typography.fontFamilies` for fonts
- Use `styles` for global and element-level default styles
- Use `customTemplates` and `templateParts` arrays to register templates
- Prefer theme.json over CSS for design tokens — it enables the Site Editor

### Template Hierarchy
Always follow WordPress template hierarchy — don't fight it:
`page-{slug}.php` → `page-{id}.php` → `page.php` → `singular.php` → `index.php`

---

## Advanced Custom Fields (ACF)

ACF is a core part of many WordPress projects. When the triage detects ACF (`wordpress.ecosystem`
contains `"acf"`), agents must follow these patterns.

### Field Group Registration

**Prefer PHP registration over GUI for version-controlled projects.** This keeps field definitions
in code, reviewable in PRs, and deployable without database syncing.

```php
// inc/acf-fields.php or includes/acf/fields-hero.php
add_action( 'acf/init', 'myplugin_register_hero_fields' );

function myplugin_register_hero_fields() {
    if ( ! function_exists( 'acf_add_local_field_group' ) ) {
        return; // Gracefully degrade if ACF is not active
    }

    acf_add_local_field_group( array(
        'key'      => 'group_hero_section',
        'title'    => 'Hero Section',
        'fields'   => array(
            array(
                'key'   => 'field_hero_heading',
                'label' => 'Heading',
                'name'  => 'hero_heading',
                'type'  => 'text',
            ),
            array(
                'key'   => 'field_hero_image',
                'label' => 'Background Image',
                'name'  => 'hero_image',
                'type'  => 'image',
                'return_format' => 'id', // Always return ID, not array or URL
            ),
        ),
        'location' => array(
            array(
                array(
                    'param'    => 'post_type',
                    'operator' => '==',
                    'value'    => 'page',
                ),
            ),
        ),
    ) );
}
```

**Key naming rules:**
- Field group keys: `group_[descriptive_name]` — globally unique
- Field keys: `field_[descriptive_name]` — globally unique
- Field names (the `name` property): `snake_case` — this is what you use in `get_field()`
- Prefix keys and names when building plugins: `field_myplugin_hero_heading`

### acf-json (Local JSON)

If the project uses the GUI for field management, enable local JSON sync:

```php
// Save JSON to theme/plugin directory
add_filter( 'acf/settings/save_json', function( $path ) {
    return get_stylesheet_directory() . '/acf-json';
} );

// Load JSON from theme/plugin directory
add_filter( 'acf/settings/load_json', function( $paths ) {
    $paths[] = get_stylesheet_directory() . '/acf-json';
    return $paths;
} );
```

- **Always commit `acf-json/` to version control** — these are your field definitions
- JSON files are named by group key: `group_hero_section.json`
- When collaborating: one person exports, commits, others sync on pull

### Getting Field Values

```php
// Simple field
$heading = get_field( 'hero_heading' );              // Current post
$heading = get_field( 'hero_heading', $post_id );     // Specific post
$heading = get_field( 'hero_heading', 'option' );     // Options page
$heading = get_field( 'hero_heading', 'user_' . $user_id ); // User field
$heading = get_field( 'hero_heading', 'term_' . $term_id ); // Taxonomy term

// ALWAYS check before output
if ( $heading ) {
    echo esc_html( $heading );
}

// Image field (return format: ID — preferred)
$image_id = get_field( 'hero_image' );
if ( $image_id ) {
    echo wp_get_attachment_image( $image_id, 'large' );
}

// Repeater field
if ( have_rows( 'team_members' ) ) {
    while ( have_rows( 'team_members' ) ) {
        the_row();
        $name  = get_sub_field( 'name' );
        $role  = get_sub_field( 'role' );
        $photo = get_sub_field( 'photo' ); // ID
        echo '<div class="team-member">';
        echo '<h3>' . esc_html( $name ) . '</h3>';
        echo '<p>' . esc_html( $role ) . '</p>';
        if ( $photo ) {
            echo wp_get_attachment_image( $photo, 'thumbnail' );
        }
        echo '</div>';
    }
}

// Flexible Content
if ( have_rows( 'page_sections' ) ) {
    while ( have_rows( 'page_sections' ) ) {
        the_row();
        $layout = get_row_layout();
        get_template_part( 'template-parts/sections/section', $layout );
    }
}

// Group field
$address = get_field( 'address' ); // Returns array
if ( $address ) {
    echo esc_html( $address['street'] );
    echo esc_html( $address['city'] );
}
```

### ACF Blocks (PRO)

Register custom Gutenberg blocks with ACF — much simpler than native block development
for content-driven blocks.

```php
add_action( 'acf/init', 'myplugin_register_acf_blocks' );

function myplugin_register_acf_blocks() {
    if ( ! function_exists( 'acf_register_block_type' ) ) {
        return;
    }

    acf_register_block_type( array(
        'name'            => 'testimonial',
        'title'           => __( 'Testimonial', 'myplugin' ),
        'description'     => __( 'A testimonial block.', 'myplugin' ),
        'render_template' => 'template-parts/blocks/testimonial.php',
        'category'        => 'formatting',
        'icon'            => 'admin-comments',
        'keywords'        => array( 'testimonial', 'quote', 'review' ),
        'supports'        => array(
            'align'  => true,
            'anchor' => true,
        ),
        'example'         => array(
            'attributes' => array(
                'mode' => 'preview',
                'data' => array(
                    'quote'  => 'This is a preview quote.',
                    'author' => 'Jane Doe',
                ),
            ),
        ),
    ) );
}
```

**ACF Block template (v2 — block.json approach, ACF 6.0+):**
```
blocks/
├── testimonial/
│   ├── block.json         # Block metadata
│   ├── testimonial.php    # Render template
│   └── testimonial.css    # Block styles (optional)
```

```json
// blocks/testimonial/block.json
{
    "name": "acf/testimonial",
    "title": "Testimonial",
    "description": "A testimonial block.",
    "style": [ "file:./testimonial.css" ],
    "category": "formatting",
    "icon": "admin-comments",
    "keywords": [ "testimonial", "quote" ],
    "acf": {
        "mode": "preview",
        "renderTemplate": "testimonial.php"
    },
    "supports": {
        "anchor": true
    }
}
```

Register blocks from a directory:
```php
add_action( 'init', function() {
    register_block_type( get_stylesheet_directory() . '/blocks/testimonial' );
} );
```

**Block render template pattern:**
```php
<?php
// template-parts/blocks/testimonial.php (or blocks/testimonial/testimonial.php)
$quote   = get_field( 'quote' );
$author  = get_field( 'author' );
$photo   = get_field( 'photo' );
$classes = array( 'testimonial-block' );
if ( ! empty( $block['className'] ) ) {
    $classes[] = $block['className'];
}
if ( ! empty( $block['align'] ) ) {
    $classes[] = 'align' . $block['align'];
}
?>
<blockquote class="<?php echo esc_attr( implode( ' ', $classes ) ); ?>">
    <?php if ( $photo ) : ?>
        <div class="testimonial-block__photo">
            <?php echo wp_get_attachment_image( $photo, 'thumbnail' ); ?>
        </div>
    <?php endif; ?>
    <?php if ( $quote ) : ?>
        <p class="testimonial-block__quote"><?php echo esc_html( $quote ); ?></p>
    <?php endif; ?>
    <?php if ( $author ) : ?>
        <cite class="testimonial-block__author"><?php echo esc_html( $author ); ?></cite>
    <?php endif; ?>
</blockquote>
```

### Options Pages (PRO)

```php
add_action( 'acf/init', function() {
    if ( ! function_exists( 'acf_add_options_page' ) ) {
        return;
    }

    acf_add_options_page( array(
        'page_title' => 'Site Settings',
        'menu_title' => 'Site Settings',
        'menu_slug'  => 'site-settings',
        'capability' => 'manage_options',
        'redirect'   => false,
    ) );

    acf_add_options_sub_page( array(
        'page_title'  => 'Header Settings',
        'menu_title'  => 'Header',
        'parent_slug' => 'site-settings',
    ) );
} );

// Retrieve options page fields
$phone = get_field( 'phone_number', 'option' );
$logo  = get_field( 'site_logo', 'option' );
```

### ACF + REST API

Expose ACF fields in the REST API:

```php
// In field group registration, set show_in_rest
'show_in_rest' => true,

// Or expose specific fields manually
add_filter( 'acf/rest_api/field_settings/show_in_rest', '__return_true' );
```

For headless/decoupled setups (WP + Next.js):
```php
// Register fields for the REST API with explicit formatting
add_action( 'rest_api_init', function() {
    register_rest_field( 'page', 'acf_fields', array(
        'get_callback' => function( $post ) {
            return get_fields( $post['id'] );
        },
        'schema'       => null,
    ) );
} );
```

### ACF Best Practices

- **Always check `function_exists( 'acf_add_local_field_group' )`** before registering — don't crash if ACF is deactivated
- **Return format for images: use `id`**, not `array` or `url` — then use `wp_get_attachment_image()` for responsive `srcset`
- **Return format for posts/relationships: use `id`** — fetching full post objects on every page load is expensive
- **Escape all output** — `get_field()` returns raw values, always `esc_html()`, `esc_attr()`, `esc_url()`, or `wp_kses_post()`
- **Never use `the_field()` for attributes** — it echoes unescaped. Use `echo esc_attr( get_field( 'x' ) )` instead
- **Prefix field names in plugins** to avoid collisions with themes or other plugins
- **Use Flexible Content for page builders** — it's the ACF approach to modular page layouts
- **Organize field groups** by context: one group per post type or template, not one giant group
- **Performance**: avoid `get_field()` in loops when you can batch with `get_fields( $post_id )` once
- **Use `acf/save_post` hook** for field validation and post-save logic — not `save_post` (ACF fields aren't saved yet at `save_post`)
- **Clone fields** to reuse field definitions across groups without duplication

### ACF Failure Modes

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Fields return `null` or `false` | Wrong field name, wrong post ID, or ACF not active | Check `get_field( 'name', $post_id )` — verify name matches registration |
| Fields not showing in editor | Location rules don't match, or field group not registered | Check `location` array — verify post type, page template, or user role matches |
| Repeater returns empty | Used `get_field()` instead of `have_rows()` / `the_row()` | Always use the repeater loop pattern with `have_rows()` |
| Block renders empty in editor | Missing `mode => 'preview'` or render template path wrong | Verify `render_template` path is relative to theme root, or use block.json `renderTemplate` |
| Options page fields return null | Forgot `'option'` as second arg to `get_field()` | Always pass `'option'`: `get_field( 'field_name', 'option' )` |
| acf-json not syncing | Save/load paths not configured, or permissions issue | Check `acf/settings/save_json` and `acf/settings/load_json` filters |
| Fields disappear after deploy | Field keys changed between environments | Keep `acf-json/` in version control, use same keys everywhere |

---

## REST API

### Custom Endpoints
```php
add_action( 'rest_api_init', function() {
    register_rest_route( 'myplugin/v1', '/items', array(
        'methods'             => 'GET',
        'callback'            => 'myplugin_get_items',
        'permission_callback' => function() {
            return current_user_can( 'read' );
        },
        'args'                => array(
            'per_page' => array(
                'default'           => 10,
                'sanitize_callback' => 'absint',
            ),
        ),
    ) );
} );
```

- **Always** provide a `permission_callback` — never use `__return_true` unless truly public
- Use `WP_REST_Response` for structured responses
- Version your API namespace: `myplugin/v1`
- Register schemas for automatic validation and documentation

---

## WordPress Performance

- Use transients for expensive operations: `get_transient()` / `set_transient()`
- Use object cache when available: `wp_cache_get()` / `wp_cache_set()`
- Avoid queries in loops — batch with `WP_Query` or `get_posts()`
- Use `'fields' => 'ids'` in WP_Query when you only need post IDs
- Lazy-load where possible — don't init everything on every page load
- Use `wp_defer_term_counting()` during bulk operations

---

## Testing (PHP)

### PHPUnit + WordPress Test Suite
- Use `WP_UnitTestCase` as base class for WordPress integration tests
- Factory methods: `$this->factory->post->create()`, `$this->factory->user->create()`
- Set up test environment: `tests/bootstrap.php` loading `wp-tests-config.php`
- Assertions: `$this->assertWPError()`, `$this->assertQueryTrue()`

### Running Tests
```bash
# If composer-based
composer test

# If wp-env based
npx wp-env run tests-cli phpunit

# Direct
./vendor/bin/phpunit
```

---

## Verification Checklist (for agents)

Before marking any WordPress task as done:

- [ ] All user input is sanitized with appropriate function
- [ ] All output is escaped with `esc_html()`, `esc_attr()`, etc.
- [ ] Nonces are verified on all form submissions and AJAX handlers
- [ ] Capability checks exist before privileged operations
- [ ] SQL queries use `$wpdb->prepare()`
- [ ] Assets are enqueued properly (no inline scripts/styles)
- [ ] Hooks are prefixed to avoid collisions
- [ ] Text strings are translatable: `__()`, `_e()`, `esc_html__()`
- [ ] No PHP warnings/notices in debug mode (`WP_DEBUG = true`)
- [ ] Plugin/theme works with latest WordPress version
