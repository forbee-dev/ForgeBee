# wordpress-content — Reference Material

Working library for `forgebee/agents/wordpress-content.md`. The persona holds the rules.

---

## Gutenberg block content

```html
<!-- wp:heading {"level":2} -->
<h2 class="wp-block-heading">Why Choose Our Service</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>Lead with the benefit. Every sentence earns the next.</p>
<!-- /wp:paragraph -->

<!-- wp:columns -->
<div class="wp-block-columns">
	<!-- wp:column -->
	<div class="wp-block-column">
		<!-- wp:heading {"level":3} -->
		<h3 class="wp-block-heading">Feature One</h3>
		<!-- /wp:heading -->
		<!-- wp:paragraph -->
		<p>Benefit-driven description of this feature.</p>
		<!-- /wp:paragraph -->
	</div>
	<!-- /wp:column -->
</div>
<!-- /wp:columns -->

<!-- wp:buttons {"layout":{"type":"flex","justifyContent":"center"}} -->
<div class="wp-block-buttons">
	<!-- wp:button -->
	<div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="/contact">Get Started Today</a></div>
	<!-- /wp:button -->
</div>
<!-- /wp:buttons -->
```

## Block binding to post meta

```html
<!-- wp:paragraph {"metadata":{"bindings":{"content":{"source":"core/post-meta","args":{"key":"hero_subheading"}}}}} -->
<p></p>
<!-- /wp:paragraph -->
```

The meta key must be registered with `show_in_rest => true`.

## Block pattern

Prefer a file in the theme's `patterns/` directory with a header comment. Use PHP registration when a plugin ships the pattern:

```php
register_block_pattern(
	'theme/testimonial-section',
	array(
		'title'      => __( 'Testimonial Section', 'theme' ),
		'categories' => array( 'testimonials' ),
		'content'    => '<!-- wp:group {"className":"testimonial-section"} -->
<div class="wp-block-group testimonial-section">
	<!-- wp:quote -->
	<blockquote class="wp-block-quote"><p>Customer quote goes here.</p><cite>Customer Name, Company</cite></blockquote>
	<!-- /wp:quote -->
</div>
<!-- /wp:group -->',
	)
);
```

## ACF Flexible Content plan

Structure content as data that mirrors the field group:

```php
$content_plan = array(
	array(
		'acf_fc_layout' => 'hero_section',
		'heading'       => 'Ship Faster, Break Nothing',
		'subheading'    => 'The deployment platform that gives you confidence.',
		'cta_text'      => 'Start Free Trial',
		'cta_url'       => '/signup',
	),
	array(
		'acf_fc_layout' => 'features_grid',
		'heading'       => 'Everything You Need',
		'features'      => array(
			array(
				'icon'        => 'rocket',
				'title'       => 'Zero-Downtime Deploys',
				'description' => 'Push to production without interrupting users.',
			),
		),
	),
	array(
		'acf_fc_layout' => 'cta_section',
		'heading'       => 'Ready to Ship with Confidence?',
		'cta_text'      => 'Start Your Free Trial',
		'cta_url'       => '/signup',
	),
);
```

## WooCommerce product content

```php
$product = wc_get_product( $product_id );
$product->set_short_description( 'Crystal-clear audio with 30-hour battery life. Active noise cancellation for deep focus.' );
$product->set_description( $long_description_blocks );
$product->save();
```

Long description as blocks:

```html
<!-- wp:heading {"level":2} -->
<h2 class="wp-block-heading">Immersive Sound, All Day</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>Engineered for professionals who need clear audio through long work sessions.</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"level":3} -->
<h3 class="wp-block-heading">What's in the Box</h3>
<!-- /wp:heading -->

<!-- wp:list -->
<ul class="wp-block-list"><li>Headphones</li><li>USB-C cable</li><li>Carrying case</li></ul>
<!-- /wp:list -->
```

## Excerpt fallback from an ACF field

```php
add_filter(
	'get_the_excerpt',
	function ( $excerpt, $post ) {
		if ( '' !== $excerpt ) {
			return $excerpt;
		}
		$intro = get_field( 'intro_text', $post->ID );
		return $intro ? wp_trim_words( wp_strip_all_tags( $intro ), 25 ) : $excerpt;
	},
	10,
	2
);
```
