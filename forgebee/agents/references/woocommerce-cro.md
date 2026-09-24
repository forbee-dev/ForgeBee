# woocommerce-cro — Reference Material

Working library for `forgebee/agents/woocommerce-cro.md`. The persona holds the rules. Block checkout comes first; classic hooks are the fallback for stores that still run the shortcode checkout.

---

## Block checkout (default)

### Field friction

In the Site Editor, select the Checkout block. Its sidebar sets Company, Address line 2, and Phone to hidden / optional / required. Change that before you write code.

### Extra checkout field (order bump, WC 8.9+)

```php
add_action(
	'woocommerce_init',
	function () {
		woocommerce_register_additional_checkout_field(
			array(
				'id'       => 'myplugin/order-bump',
				'label'    => __( 'Add gift wrap for $4', 'myplugin' ),
				'location' => 'order',
				'type'     => 'checkbox',
			)
		);
	}
);

add_action(
	'woocommerce_store_api_checkout_order_processed',
	function ( WC_Order $order ) {
		// Meta key prefix differs by location; confirm it on the target WC version.
		if ( ! $order->get_meta( '_wc_other/myplugin/order-bump' ) ) {
			return;
		}
		$order->add_product( wc_get_product( (int) get_option( 'myplugin_bump_product_id' ) ) );
		$order->calculate_totals();
	}
);
```

### Trust signals

Insert a core Group/Paragraph block inside the Checkout block's inner-block area in the Site Editor. Use `registerCheckoutBlock` (from `@woocommerce/blocks-checkout`) only when the signal needs data or logic.

### Data for custom blocks

Expose server data to the cart/checkout with `woocommerce_store_api_register_endpoint_data` on `woocommerce_blocks_loaded`. Read it client-side from the Store API cart `extensions` key.

## Product page (classic templates)

On block themes the single-product template uses product blocks, so `woocommerce_single_product_summary` does not fire. Add a block or pattern there instead.

```php
add_action(
	'woocommerce_single_product_summary',
	function () {
		global $product;
		$stock = $product->get_stock_quantity();
		if ( $stock > 0 && $stock <= 10 && ! $product->backorders_allowed() ) {
			/* translators: %d: units left in stock. */
			echo '<p class="low-stock">' . esc_html( sprintf( __( 'Only %d left in stock', 'myplugin' ), $stock ) ) . '</p>';
		}
	},
	15 // After the price (priority 10).
);

add_action(
	'woocommerce_after_add_to_cart_form',
	function () {
		global $product;
		$sold = $product->get_total_sales();
		if ( $sold > 100 ) {
			/* translators: %s: number of customers. */
			echo '<p class="social-proof">' . esc_html( sprintf( __( '%s+ customers bought this', 'myplugin' ), number_format_i18n( $sold ) ) ) . '</p>';
		}
	}
);
```

Social proof must use real numbers. Never fake counts or stock.

## Cart

```php
add_action(
	'woocommerce_before_cart',
	function () {
		$threshold = (float) get_option( 'myplugin_free_shipping_min', 50 );
		$remaining = $threshold - (float) WC()->cart->get_subtotal();
		if ( $remaining > 0 ) {
			/* translators: %s: amount left for free shipping. */
			echo '<div class="free-shipping-notice">' . wp_kses_post( sprintf( __( 'Add %s more for free shipping', 'myplugin' ), wc_price( $remaining ) ) ) . '</div>';
		}
	}
);
```

Read the threshold from the Free Shipping method settings when it exists, so the notice and the rule cannot drift.

Exit intent: attach `mouseout` to `document` and fire when `e.clientY < 10` and no `relatedTarget`. Desktop only — mobile has no cursor. Show once per session.

## Classic checkout (shortcode only)

```php
add_filter(
	'woocommerce_checkout_fields',
	function ( $fields ) {
		unset( $fields['billing']['billing_company'], $fields['order']['order_comments'] );
		$fields['billing']['billing_phone']['required'] = false;
		return $fields;
	},
	20
);

add_action(
	'woocommerce_review_order_before_payment',
	function () {
		echo '<div class="checkout-trust">' . esc_html__( 'Secure checkout · 30-day money-back guarantee', 'myplugin' ) . '</div>';
	}
);
```

Classic order bump: render the checkbox on `woocommerce_review_order_before_submit`; add the product server-side in `woocommerce_checkout_create_order`.

## Payment order

Set gateway order in WooCommerce → Settings → Payments first. To force it in code:

```php
add_filter(
	'woocommerce_available_payment_gateways',
	function ( $gateways ) {
		$rank = array(
			'stripe'       => 1,
			'ppcp-gateway' => 2,
		);
		uksort( $gateways, fn( $a, $b ) => ( $rank[ $a ] ?? 99 ) <=> ( $rank[ $b ] ?? 99 ) );
		return $gateways;
	}
);
```

## Cross-sells at checkout (classic)

```php
add_action(
	'woocommerce_after_checkout_form',
	function () {
		$ids = WC()->cart->get_cross_sells();
		if ( ! $ids ) {
			return;
		}
		foreach ( wc_get_products( array( 'include' => $ids, 'limit' => 3 ) ) as $product ) {
			printf(
				'<div class="cross-sell">%s <span>%s</span> <a class="button" href="%s">%s</a></div>',
				wp_kses_post( $product->get_image( 'thumbnail' ) ),
				wp_kses_post( $product->get_name() . ' — ' . $product->get_price_html() ),
				esc_url( $product->add_to_cart_url() ),
				esc_html__( 'Add', 'myplugin' )
			);
		}
	}
);
```
