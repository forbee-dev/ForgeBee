# nextjs-seo — Reference Material

Working library for `forgebee/agents/nextjs-seo.md`. The persona holds rules; this file holds patterns.

---

## App Router

### Root Layout Metadata

```tsx
// app/layout.tsx
export const metadata: Metadata = {
  metadataBase: new URL('https://example.com'),
  title: { default: 'Company Name', template: '%s | Company Name' },
  description: 'Default site description.',
  robots: {
    index: true,
    follow: true,
    googleBot: { 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
  },
};
```

With `metadataBase` and `title.template` set, child pages use relative URLs and a bare title.

### Dynamic Metadata

```tsx
// app/blog/[slug]/page.tsx
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      type: 'article',
      publishedTime: post.publishedAt,
      authors: [post.author.name],
      images: [{ url: post.coverImage, width: 1200, height: 630 }],
    },
    twitter: { card: 'summary_large_image' },
  };
}
```

`getPost` is called by both `generateMetadata` and the page. Wrap it in React `cache()` (or rely on `fetch` memoization) so it runs once.

Static pages use `export const metadata: Metadata = { ... }` with the same shape.

### i18n Alternates

```tsx
alternates: {
  canonical: '/about',
  languages: { 'en-US': '/en-us/about', 'pt-BR': '/pt-br/about' },
},
```

### Sitemap

```ts
// app/sitemap.ts
import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getAllPosts();
  return [
    { url: 'https://example.com', lastModified: new Date() },
    ...posts.map((p) => ({
      url: `https://example.com/blog/${p.slug}`,
      lastModified: new Date(p.updatedAt),
    })),
  ];
}
```

Google ignores `priority` and `changeFrequency`; an accurate `lastModified` is what matters. Above 50,000 URLs, use `generateSitemaps()`.

### Robots

```ts
// app/robots.ts
import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/admin/', '/private/'] }],
    sitemap: 'https://example.com/sitemap.xml',
  };
}
```

### OG Image

```tsx
// app/blog/[slug]/opengraph-image.tsx
import { ImageResponse } from 'next/og';

export const alt = 'Blog post cover';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const post = await getPost((await params).slug);
  return new ImageResponse(
    (
      <div style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center',
        justifyContent: 'center', padding: 60, fontSize: 48, color: 'white', background: '#4f46e5' }}>
        {post.title}
      </div>
    ),
    size,
  );
}
```

`ImageResponse` supports flexbox only — every element with children needs `display: 'flex'`.

### JSON-LD

```tsx
// components/json-ld.tsx
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // Escape "<" so CMS content cannot close the script tag (XSS).
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}
```

```tsx
<JsonLd data={{
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: post.title,
  datePublished: post.publishedAt,
  author: { '@type': 'Person', name: post.author.name },
  image: post.coverImage,
}} />
```

Render it in a Server Component so it is in the initial HTML.

## Pages Router (next-seo)

```tsx
// pages/blog/[slug].tsx
import { NextSeo, ArticleJsonLd } from 'next-seo';

export default function BlogPost({ post }) {
  return (
    <>
      <NextSeo
        title={post.title}
        description={post.excerpt}
        canonical={`https://example.com/blog/${post.slug}`}
        openGraph={{ type: 'article', images: [{ url: post.coverImage, width: 1200, height: 630 }] }}
      />
      <ArticleJsonLd
        title={post.title}
        datePublished={post.publishedAt}
        authorName={post.author.name}
        description={post.excerpt}
      />
      <article>{post.body}</article>
    </>
  );
}
```

Pages Router sitemap: serve XML from `getServerSideProps` in `pages/sitemap.xml.tsx` (set `Content-Type: text/xml`, `res.write`, `res.end`), or use `next-sitemap` at build time.
