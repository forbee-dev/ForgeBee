# Styling Conventions

Loaded by the project router when the triage detects SCSS, Tailwind CSS, CSS Modules,
or other styling systems. This is an **overlay** — it loads alongside the primary
domain conventions (WordPress, Next.js, etc.).

---

## SCSS / SASS

### File Organization
```
assets/scss/               # or styles/scss/ or src/styles/
├── main.scss              # Entry point — imports everything
├── _variables.scss        # Design tokens: colors, fonts, spacing, breakpoints
├── _mixins.scss           # Reusable mixins
├── _functions.scss        # SCSS functions
├── _reset.scss            # CSS reset / normalize
├── base/                  # Base element styles
│   ├── _typography.scss
│   ├── _buttons.scss
│   └── _forms.scss
├── layout/                # Layout-level styles
│   ├── _header.scss
│   ├── _footer.scss
│   ├── _grid.scss
│   └── _sidebar.scss
├── components/            # Component-level styles
│   ├── _card.scss
│   ├── _modal.scss
│   └── _nav.scss
├── pages/                 # Page-specific overrides
│   ├── _home.scss
│   └── _about.scss
├── vendors/               # Third-party CSS overrides
└── utilities/             # Utility classes
    └── _helpers.scss
```

### Naming Conventions
- Use BEM (Block Element Modifier) for class names:
  ```scss
  .card {}                    // Block
  .card__title {}             // Element
  .card__title--highlighted {}// Modifier
  .card--featured {}          // Block modifier
  ```
- Prefix component classes to avoid collisions (especially in WordPress):
  ```scss
  .myplugin-card {}
  .myplugin-card__title {}
  ```
- Use kebab-case for class names: `.nav-menu`, not `.navMenu` or `.nav_menu`

### SCSS Best Practices
- **Max nesting depth: 3 levels** — deeper nesting creates specificity problems
  ```scss
  // GOOD
  .card {
    &__title { ... }
    &__body {
      p { ... }    // 3 levels max
    }
  }

  // BAD — too deep
  .page .content .card .card__body p span { ... }
  ```
- **Use variables for all design tokens** — never hardcode colors, fonts, or breakpoints
  ```scss
  // _variables.scss
  $color-primary: #1a73e8;
  $color-text: #333;
  $font-body: 'Inter', -apple-system, sans-serif;
  $spacing-unit: 8px;
  $breakpoint-md: 768px;
  $breakpoint-lg: 1024px;
  ```
- **Use mixins for repeated patterns:**
  ```scss
  @mixin respond-to($breakpoint) {
    @if $breakpoint == md {
      @media (min-width: $breakpoint-md) { @content; }
    } @else if $breakpoint == lg {
      @media (min-width: $breakpoint-lg) { @content; }
    }
  }

  // Usage
  .container {
    padding: 16px;
    @include respond-to(md) {
      padding: 32px;
    }
  }
  ```
- **Avoid `@extend`** — it creates unexpected selector chains. Use mixins instead.
- **Use `//` comments** (SCSS-style) — they're stripped from compiled output
- **One component per file** — `_card.scss` contains only `.card` and its children

### WordPress + SCSS
- Compile SCSS to `style.css` (theme) or `assets/css/` (plugin)
- Include the WordPress theme header in compiled `style.css` via a banner comment
- Use `wp_enqueue_style()` to load the compiled CSS, never the SCSS
- Source maps: enable in dev, disable in production build
- Build command: typically `npm run build:css` or integrated with `@wordpress/scripts`

---

## Tailwind CSS

### Configuration
```js
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',    // Next.js
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    // WordPress: include PHP template files
    './**/*.php',
    './templates/**/*.html',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          900: '#1e3a5f',
        },
        // Map to design tokens
      },
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
      },
      spacing: {
        // Custom spacing if needed
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),  // Prose styles
    require('@tailwindcss/forms'),       // Form resets
  ],
};
```

### Tailwind v4 Notes (if version ≥ 4.0)
- Config moves to CSS: `@theme { --color-primary: #3b82f6; }`
- No more `tailwind.config.js` — use CSS-first configuration
- Content detection is automatic (no `content` array needed)
- `@apply` still works but CSS-native approach is preferred

### Tailwind Best Practices
- **Utility-first** — compose utilities in HTML, not in CSS
- **Extract components** when a pattern repeats 3+ times:
  ```tsx
  // React: extract to a component
  function Button({ children, variant = 'primary' }) {
    const base = 'px-4 py-2 rounded-lg font-medium transition-colors';
    const variants = {
      primary: 'bg-primary-500 text-white hover:bg-primary-600',
      secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
    };
    return <button className={`${base} ${variants[variant]}`}>{children}</button>;
  }
  ```
- **Use `@apply` sparingly** — only for base element styles that can't be componentized:
  ```css
  /* globals.css — base prose styles */
  .prose h2 {
    @apply text-2xl font-bold mt-8 mb-4;
  }
  ```
- **Responsive: mobile-first** — default styles are mobile, use `md:`, `lg:` for larger
- **Dark mode**: use `dark:` variant with `class` strategy (not `media`)
- **Avoid arbitrary values** `[#1a73e8]` when a theme token exists — extend the config instead
- **Group related utilities** logically in the class string:
  ```
  layout → spacing → sizing → typography → colors → effects → states
  "flex items-center gap-4  p-4  w-full  text-sm font-medium  text-gray-900 bg-white  shadow-sm  hover:bg-gray-50"
  ```

### WordPress + Tailwind CSS
- Add PHP file patterns to `content` array: `'./**/*.php'`
- For block themes, also include: `'./templates/**/*.html'`, `'./parts/**/*.html'`, `'./patterns/**/*.php'`
- Prefix Tailwind classes to avoid conflicts with WordPress admin CSS:
  ```js
  // tailwind.config.js
  module.exports = {
    prefix: 'tw-', // Classes become: tw-flex, tw-p-4, etc.
  };
  ```
  (Only if conflicts occur — usually not needed for frontend-only usage)
- Enqueue the compiled Tailwind CSS via `wp_enqueue_style()`
- Consider using `@tailwindcss/typography` for `wp-block-post-content` areas

### Next.js + Tailwind CSS
- Tailwind is the default styling in `create-next-app`
- Import in `globals.css`:
  ```css
  @tailwind base;
  @tailwind components;
  @tailwind utilities;
  ```
- Use `cn()` helper (clsx + tailwind-merge) for conditional classes:
  ```tsx
  import { clsx, type ClassValue } from 'clsx';
  import { twMerge } from 'tailwind-merge';

  export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
  }
  ```
- shadcn/ui components follow this pattern — adopt it project-wide

---

## CSS Modules

### Convention
- File naming: `Component.module.css` or `Component.module.scss`
- Import as object: `import styles from './Component.module.css'`
- camelCase for class names in CSS Modules: `.cardTitle` not `.card-title`
- Compose shared styles: `composes: base from './shared.module.css'`

### With Next.js
```tsx
import styles from './Card.module.scss';

export function Card({ title }: { title: string }) {
  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>{title}</h2>
    </div>
  );
}
```

---

## Mixing Styling Systems

Common combinations and how to handle them:

### SCSS + Tailwind (common in WordPress)
- Use SCSS for complex component styles and WordPress admin UI
- Use Tailwind for utility classes on the frontend
- Keep them in separate build pipelines if possible
- Avoid `@apply` in SCSS files — it creates confusion about which system owns what

### CSS Modules + Tailwind (common in Next.js)
- Use CSS Modules for component-scoped styles with complex selectors
- Use Tailwind for layout, spacing, and simple styling
- Combine with `cn()`: `className={cn(styles.card, 'p-4 shadow-md')}`

---

## Verification Checklist (for agents)

Before marking any styling task as done:

- [ ] No unused CSS being generated (check Tailwind purge / SCSS tree-shaking)
- [ ] Responsive: works at mobile (320px), tablet (768px), desktop (1024px+)
- [ ] Dark mode: if supported, all custom colors have dark variants
- [ ] Accessibility: sufficient color contrast (4.5:1 for text, 3:1 for large text)
- [ ] No hardcoded colors/sizes — all values come from variables/tokens/config
- [ ] BEM naming is consistent (SCSS) or utility classes are grouped logically (Tailwind)
- [ ] Build produces minified CSS in production
- [ ] No CSS specificity conflicts between styling systems
- [ ] WordPress: styles are properly enqueued, not inline
- [ ] Next.js: no flash of unstyled content (FOUC)
