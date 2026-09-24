# wordpress-seo — Reference Material

Working library for `forgebee/agents/wordpress-seo.md`. The persona holds rules; this file holds patterns. Code follows WPCS (tabs, Yoda, spaces in parentheses).

---

## Yoast SEO

```php
add_filter(
	'wpseo_title',
	function ( $title ) {
		if ( is_post_type_archive( 'product' ) ) {
			return 'Shop All Products | ' . get_bloginfo( 'name' );
		}
		return $title;
	}
);

add_filter(
	'wpseo_metadesc',
	function ( $desc ) {
		if ( is_singular( 'product' ) && '' === $desc ) {
			return wp_trim_words( get_the_excerpt(), 25 );
		}
		return $desc;
	}
);

add_filter(
	'wpseo_schema_graph_pieces',
	function ( $pieces, $context ) {
		$pieces[] = new Myplugin_Schema_Piece( $context );
		return $pieces;
	},
	10,
	2
);
```

## RankMath

```php
add_filter(
	'rank_math/frontend/title',
	function ( $title ) {
		return is_post_type_archive( 'product' ) ? 'Shop All Products | ' . get_bloginfo( 'name' ) : $title;
	}
);

add_filter(
	'rank_math/json_ld',
	function ( $data, $jsonld ) {
		if ( is_singular( 'service' ) ) {
			$data['service'] = array(
				'@type'    => 'Service',
				'name'     => get_the_title(),
				'provider' => array( '@id' => home_url( '/#organization' ) ),
			);
		}
		return $data;
	},
	10,
	2
);
```

## Core XML Sitemap (no SEO plugin)

```php
add_filter(
	'wp_sitemaps_post_types',
	function ( $post_types ) {
		unset( $post_types['attachment'] );
		return $post_types;
	}
);

add_filter(
	'wp_sitemaps_posts_query_args',
	function ( $args, $post_type ) {
		if ( 'page' === $post_type ) {
			$args['post__not_in'] = array( (int) get_option( 'page_on_front' ) );
		}
		return $args;
	},
	10,
	2
);
```

Yoast owns the sitemap when active. Add custom sitemaps with `wpseo_sitemap_index` (append `<sitemap><loc>…</loc><lastmod>` with `gmdate( 'c' )`).

## Permalinks for CPTs and Taxonomies

```php
register_post_type(
	'service',
	array(
		'public'      => true,
		'has_archive' => 'services',
		'rewrite'     => array(
			'slug'       => 'services',
			'with_front' => false, // Keep a "/blog/" permalink base out of CPT URLs.
		),
	)
);

register_taxonomy(
	'service_category',
	'service',
	array(
		'rewrite' => array(
			'slug'         => 'services/category',
			'with_front'   => false,
			'hierarchical' => true,
		),
	)
);

register_activation_hook(
	__FILE__,
	function () {
		// Rules for the CPT exist only after it is registered.
		myplugin_register_post_types();
		flush_rewrite_rules();
	}
);
```

Flush rewrite rules on activation only, never on `init`.

## WooCommerce Product Schema

```php
add_filter(
	'woocommerce_structured_data_product',
	function ( $markup, $product ) {
		$brands = get_the_terms( $product->get_id(), 'product_brand' );
		if ( $brands && ! is_wp_error( $brands ) ) {
			$markup['brand'] = array(
				'@type' => 'Brand',
				'name'  => $brands[0]->name,
			);
		}

		$gtin = $product->get_global_unique_id();
		if ( $gtin ) {
			$markup['gtin'] = $gtin;
		}

		return $markup;
	},
	10,
	2
);
```

WooCommerce 9.2+ has a core GTIN field (`get_global_unique_id()`). Never copy the SKU into `gtin` — a false GTIN fails Merchant Center validation.

## ACF Content and SEO Analysis

Yoast and RankMath analyze content in the editor with JavaScript. PHP filters do not feed that analysis.
- Yoast: install "ACF Content Analysis for Yoast SEO", or register a YoastSEO.js content modification.
- RankMath: add field text through the `rank_math_content` JS filter (`wp.hooks.addFilter`).

## FAQ Schema from an ACF Repeater

```php
/**
 * Builds FAQPage JSON-LD from the ACF "faq" repeater.
 *
 * @param int $post_id Post ID.
 * @return array|null Schema array, or null when the repeater is empty.
 */
function myplugin_faq_schema( $post_id ) {
	$items = array();
	while ( have_rows( 'faq', $post_id ) ) {
		the_row();
		$items[] = array(
			'@type'          => 'Question',
			'name'           => wp_strip_all_tags( get_sub_field( 'question' ) ),
			'acceptedAnswer' => array(
				'@type' => 'Answer',
				'text'  => wp_kses_post( get_sub_field( 'answer' ) ),
			),
		);
	}

	if ( ! $items ) {
		return null;
	}

	return array(
		'@context'   => 'https://schema.org',
		'@type'      => 'FAQPage',
		'mainEntity' => $items,
	);
}
```

Print it with `wp_json_encode()` in a `<script type="application/ld+json">` tag. Google shows FAQ rich results only for authoritative government and health sites; the markup still helps other consumers. If Yoast/RankMath is active, add the piece to their graph instead of a second script.
