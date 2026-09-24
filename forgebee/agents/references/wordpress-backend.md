# wordpress-backend — Reference Material

Snippets extracted from `forgebee/agents/wordpress-backend.md`. The persona holds the rules. This file holds working code. All samples use the P7 docblock minimum.

---

## ACF / SCF variant detection

```php
$has_acf = class_exists( 'ACF' );
$is_pro  = $has_acf && function_exists( 'acf_get_pro_version' );
$is_scf  = $has_acf && defined( 'SCF_VERSION' );

if ( ! acf_get_field_type( 'repeater' ) ) {
	// SCF and ACF free have no Repeater: fall back to a CPT or a serialized meta array.
}
```

## Field groups in code

Option A — PHP registration (plugin-shipped fields that editors must not change):

```php
add_action(
	'acf/include_fields',
	function () {
		acf_add_local_field_group(
			array(
				'key'          => 'group_project_hero',
				'title'        => 'Hero',
				'fields'       => array(
					array(
						'key'   => 'field_project_hero_heading',
						'name'  => 'hero_heading',
						'label' => 'Heading',
						'type'  => 'text',
					),
				),
				'location'     => array(
					array(
						array(
							'param'    => 'post_type',
							'operator' => '==',
							'value'    => 'page',
						),
					),
				),
				'show_in_rest' => true,
			)
		);
	}
);
```

Option B — JSON sync (editors keep the UI; commit `acf-json/`):

```php
add_filter( 'acf/settings/save_json', fn() => get_stylesheet_directory() . '/acf-json' );
add_filter(
	'acf/settings/load_json',
	function ( $paths ) {
		$paths[] = get_stylesheet_directory() . '/acf-json';
		return $paths;
	}
);
```

## Storage shape

`get_field( 'hero_heading', 123 )` reads two postmeta rows:

| meta_key | meta_value |
|---|---|
| `hero_heading` | `Welcome` |
| `_hero_heading` | `field_project_hero_heading` |

A Repeater flattens into one row per sub-field per index, plus a row count:

| meta_key | meta_value |
|---|---|
| `slides` | `2` |
| `slides_0_caption` | `First` |
| `slides_1_caption` | `Second` |

## Retrieval

```php
$value = get_field( 'field_name', $post_id );
$logo  = get_field( 'site_logo', 'option' );

if ( have_rows( 'flex_content', $post_id ) ) {
	while ( have_rows( 'flex_content', $post_id ) ) {
		the_row();
		$layout = get_row_layout();
	}
}

update_field( 'hero_heading', 'Welcome', 123 );
update_sub_field( array( 'slides', 2, 'caption' ), $value, $post_id );
```

## Validation and save hooks

```php
add_filter(
	'acf/validate_value/name=vat_number',
	function ( $valid, $value ) {
		if ( true !== $valid || '' === $value ) {
			return $valid;
		}
		return preg_match( '/^[A-Z]{2}\d{8,12}$/', $value ) ? $valid : 'Enter a valid VAT number.';
	},
	10,
	2
);

// Priority below 10 runs before ACF saves; above 10 sees the new values.
add_action( 'acf/save_post', 'myplugin_before_acf_writes', 5 );
add_action( 'acf/save_post', 'myplugin_after_acf_writes', 20 );
```

## Computed REST field

```php
register_rest_field(
	'page',
	'hero',
	array(
		'get_callback' => function ( $post ) {
			return array(
				'heading' => (string) get_field( 'hero_heading', $post['id'] ),
				'image'   => wp_get_attachment_image_url( (int) get_field( 'hero_image', $post['id'], false ), 'large' ),
			);
		},
		'schema'       => array(
			'type'       => 'object',
			'properties' => array(
				'heading' => array( 'type' => 'string' ),
				'image'   => array(
					'type'   => array( 'string', 'null' ),
					'format' => 'uri',
				),
			),
		),
	)
);
```

## ACF Block render callback

In `block.json`: `"acf": { "mode": "preview", "renderCallback": "myplugin_render_hero" }`.

```php
/**
 * Renders the Hero ACF block.
 *
 * @param array $block Block settings and attributes.
 */
function myplugin_render_hero( $block ) {
	echo '<div class="myplugin-hero">' . esc_html( get_field( 'heading' ) ) . '</div>';
}
```

## REST route

```php
add_action(
	'rest_api_init',
	function () {
		register_rest_route(
			'myplugin/v1',
			'/items',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => 'myplugin_get_items',
					'permission_callback' => fn() => current_user_can( 'read' ),
				),
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => 'myplugin_create_item',
					'permission_callback' => fn() => current_user_can( 'edit_posts' ),
					'args'                => array(
						'title' => array(
							'required'          => true,
							'sanitize_callback' => 'sanitize_text_field',
						),
					),
				),
			)
		);
	}
);

/**
 * Lists items.
 *
 * @param WP_REST_Request $request Request.
 * @return WP_REST_Response
 */
function myplugin_get_items( WP_REST_Request $request ) {
	return rest_ensure_response( myplugin_query_items( $request->get_params() ) );
}
```

## Plugin bootstrap

```php
<?php
/**
 * Plugin Name: My Plugin
 * Description: Description here.
 * Version: 1.0.0
 * Requires PHP: 8.1
 * Text Domain: my-plugin
 *
 * @package My_Plugin
 */

defined( 'ABSPATH' ) || exit;

define( 'MY_PLUGIN_VERSION', '1.0.0' );
define( 'MY_PLUGIN_PATH', plugin_dir_path( __FILE__ ) );
define( 'MY_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

require_once MY_PLUGIN_PATH . 'includes/class-my-plugin.php';

add_action( 'plugins_loaded', array( 'My_Plugin', 'instance' ) );
```
