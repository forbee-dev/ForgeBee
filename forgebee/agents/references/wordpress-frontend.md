# wordpress-frontend — Reference Material

Working library for `forgebee/agents/wordpress-frontend.md`. The persona holds the rules.

---

## Block Theme Structure

```
theme-name/
├── style.css                    # Theme header (required)
├── theme.json                   # Global styles + settings
├── functions.php                # Enqueue, ACF, custom logic
├── templates/
│   ├── index.html               # Fallback (required)
│   ├── single.html
│   ├── page.html
│   ├── archive.html
│   ├── 404.html
│   └── single-{post-type}.html
├── parts/
│   ├── header.html
│   ├── footer.html
│   └── sidebar.html
├── patterns/
│   └── hero-section.php
└── assets/
    ├── css/
    ├── js/
    └── images/
```


## theme.json Patterns

```json
{
  "$schema": "https://schemas.wp.org/trunk/theme.json",
  "version": 3,
  "settings": {
    "color": {
      "palette": [
        { "slug": "primary", "color": "#1a1a2e", "name": "Primary" },
        { "slug": "secondary", "color": "#16213e", "name": "Secondary" }
      ],
      "custom": false,
      "defaultPalette": false
    },
    "typography": {
      "fontFamilies": [
        {
          "fontFamily": "Inter, sans-serif",
          "slug": "body",
          "name": "Body"
        }
      ],
      "fontSizes": [
        { "slug": "small", "size": "0.875rem", "name": "Small" },
        { "slug": "medium", "size": "1rem", "name": "Medium" },
        { "slug": "large", "size": "1.5rem", "name": "Large" }
      ]
    },
    "layout": {
      "contentSize": "800px",
      "wideSize": "1200px"
    },
    "spacing": {
      "units": ["px", "rem", "%"]
    }
  },
  "styles": {
    "color": {
      "background": "var(--wp--preset--color--primary)",
      "text": "#ffffff"
    },
    "typography": {
      "fontFamily": "var(--wp--preset--font-family--body)",
      "fontSize": "var(--wp--preset--font-size--medium)"
    }
  },
  "templateParts": [
    { "name": "header", "title": "Header", "area": "header" },
    { "name": "footer", "title": "Footer", "area": "footer" }
  ]
}
```


## Block Template Patterns

`templates/single.html`:

```html
<!-- wp:template-part {"slug":"header","area":"header"} /-->

<!-- wp:group {"tagName":"main","layout":{"type":"constrained"}} -->
<main class="wp-block-group">
  <!-- wp:post-title {"level":1} /-->
  <!-- wp:post-featured-image {"align":"wide"} /-->
  <!-- wp:post-content {"layout":{"type":"constrained"}} /-->
  <!-- wp:post-terms {"term":"category"} /-->
</main>
<!-- /wp:group -->

<!-- wp:template-part {"slug":"footer","area":"footer"} /-->
```


## Classic theme `single.php`

```php
<?php get_header(); ?>

<main id="primary" class="site-main">
  <?php while ( have_posts() ) : the_post(); ?>
    <article id="post-<?php the_ID(); ?>" <?php post_class(); ?>>
      <h1 class="entry-title"><?php the_title(); ?></h1>
      <?php if ( has_post_thumbnail() ) : ?>
        <div class="post-thumbnail">
          <?php the_post_thumbnail( 'large' ); ?>
        </div>
      <?php endif; ?>
      <div class="entry-content">
        <?php the_content(); ?>
      </div>
    </article>
  <?php endwhile; ?>
</main>

<?php get_sidebar(); ?>
<?php get_footer(); ?>
```


## Editor styles

```php
/**
 * Registers theme supports and editor styles.
 */
function mytheme_setup() {
	add_editor_style( 'assets/css/editor.css' );
}
add_action( 'after_setup_theme', 'mytheme_setup' );
```

The enqueue example lives in the persona file.
