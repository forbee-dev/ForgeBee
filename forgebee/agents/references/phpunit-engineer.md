# phpunit-engineer — Reference Material

Working library for `forgebee/agents/phpunit-engineer.md`. The persona holds rules; this file holds patterns.

---

## Bootstrap

```php
<?php // tests/bootstrap.php
$_tests_dir = getenv( 'WP_TESTS_DIR' ) ?: '/tmp/wordpress-tests-lib';

require_once $_tests_dir . '/includes/functions.php';

tests_add_filter(
	'muplugins_loaded',
	function () {
		require dirname( __DIR__ ) . '/my-plugin.php';
	}
);

require $_tests_dir . '/includes/bootstrap.php';
```

Load ACF in the same `muplugins_loaded` callback when tests call `get_field()`.

## Unit Test

```php
class Test_My_Helper extends WP_UnitTestCase {

	public function test_format_price_with_decimals() {
		$this->assertSame( '$19.99', my_plugin_format_price( 19.99 ) );
	}

	public function test_format_price_with_zero() {
		$this->assertSame( '$0.00', my_plugin_format_price( 0 ) );
	}
}
```

## Posts and Meta (AAA)

```php
public function test_get_featured_posts_returns_only_flagged() {
	$featured_id = self::factory()->post->create();
	$plain_id    = self::factory()->post->create();
	update_post_meta( $featured_id, 'is_featured', '1' );
	update_post_meta( $plain_id, 'is_featured', '0' );

	$featured = my_plugin_get_featured_posts();

	$this->assertCount( 1, $featured );
	$this->assertSame( $featured_id, $featured[0]->ID );
}
```

## ACF Fields

ACF stores a Repeater as a row count plus one meta row per sub-field per index. Seed raw meta to test code without ACF active:

```php
public function test_repeater_field_returns_rows() {
	$post_id = self::factory()->post->create();
	update_post_meta( $post_id, 'team_members', 2 );
	update_post_meta( $post_id, 'team_members_0_name', 'Alice' );
	update_post_meta( $post_id, 'team_members_1_name', 'Bob' );

	$members = my_plugin_get_team( $post_id );

	$this->assertCount( 2, $members );
	$this->assertSame( 'Alice', $members[0]['name'] );
}
```

Options page fields live in `wp_options` as `options_<name>` plus the reference row `_options_<name>` (field key). `get_field( 'x', 'option' )` needs ACF loaded in the bootstrap.

## REST Endpoints

```php
class Test_REST_Items extends WP_Test_REST_TestCase {

	public function set_up() {
		parent::set_up();
		do_action( 'rest_api_init' );
	}

	public function test_get_items_returns_200_for_editor() {
		wp_set_current_user( self::factory()->user->create( array( 'role' => 'editor' ) ) );

		$response = rest_do_request( new WP_REST_Request( 'GET', '/myplugin/v1/items' ) );

		$this->assertSame( 200, $response->get_status() );
	}

	public function test_get_items_returns_401_for_anonymous() {
		wp_set_current_user( 0 );

		$response = rest_do_request( new WP_REST_Request( 'GET', '/myplugin/v1/items' ) );

		$this->assertErrorResponse( 'rest_forbidden', $response, 401 );
	}

	public function test_create_item_requires_title() {
		wp_set_current_user( self::factory()->user->create( array( 'role' => 'editor' ) ) );

		$response = rest_do_request( new WP_REST_Request( 'POST', '/myplugin/v1/items' ) );

		$this->assertErrorResponse( 'rest_missing_callback_param', $response, 400 );
	}
}
```

A failed `permission_callback` returns 401 for anonymous users and 403 for logged-in users without the capability.

## Hooks

```php
public function test_custom_action_fires_on_save() {
	$before = did_action( 'my_plugin_after_save' );

	my_plugin_save_item( array( 'title' => 'Test' ) );

	$this->assertSame( $before + 1, did_action( 'my_plugin_after_save' ) );
}
```

## AJAX Handlers

```php
class Test_Ajax_Handler extends WP_Ajax_UnitTestCase {

	public function test_ajax_save_item_success() {
		$this->_setRole( 'editor' );
		$_POST['_nonce'] = wp_create_nonce( 'my_save_action' );
		$_POST['title']  = 'Test Item';

		try {
			$this->_handleAjax( 'my_save_action' );
		} catch ( WPAjaxDieContinueException $e ) {
			// wp_send_json_success() ends in wp_die(); the test harness turns that into this exception.
		}

		$this->assertTrue( json_decode( $this->_last_response )->success );
	}
}
```

## Running Tests

```bash
wp-env run tests-cli phpunit -- --filter=Test_REST_Items
phpunit --filter=Test_My_Helper
phpunit --group=rest-api
phpunit --coverage-text
composer test -- --filter=Test_ACF_Fields
```

## phpunit.xml

```xml
<?xml version="1.0"?>
<phpunit bootstrap="tests/bootstrap.php" backupGlobals="false" colors="true">
  <testsuites>
    <testsuite name="unit">
      <directory suffix=".php">tests/unit</directory>
    </testsuite>
    <testsuite name="integration">
      <directory suffix=".php">tests/integration</directory>
    </testsuite>
  </testsuites>
  <coverage>
    <include>
      <directory suffix=".php">includes</directory>
    </include>
  </coverage>
</phpunit>
```

PHPUnit 9 (the WP test suite default) also accepts `convertErrorsToExceptions`/`convertNoticesToExceptions`/`convertWarningsToExceptions="true"`. PHPUnit 10+ removed them.
