# nextjs-content — Reference Material

Working library for `forgebee/agents/nextjs-content.md`. The persona holds rules; this file holds patterns.

---

## MDX Blog Post

```mdx
---
title: "Ship 10x Faster with Zero-Downtime Deploys"
description: "How modern deploy pipelines remove downtime."
publishedAt: "2026-02-15"
author: "Sarah Chen"
category: "Engineering"
tags: ["deployment", "ci-cd"]
image: "/blog/zero-downtime-deploys.png"
featured: true
---

import { Callout } from '@/components/mdx/callout'

Every deploy shouldn't feel like defusing a bomb.

## The Problem with Traditional Deploys

<Callout type="warning">
  Average downtime per traditional deploy: 4.2 minutes.
</Callout>

## The Results

- **Deploy frequency**: 3/week → 12/day
- **Mean time to recovery**: 45 min → 90 seconds

<Callout type="info">
  [Start your free trial](/signup) — no credit card required.
</Callout>
```

## Velite Collection (preferred for new projects)

```ts
// velite.config.ts
import { defineConfig, defineCollection, s } from 'velite';

const posts = defineCollection({
  name: 'Post',
  pattern: 'blog/**/*.mdx',
  schema: s
    .object({
      title: s.string().max(99),
      description: s.string().max(200),
      publishedAt: s.isodate(),
      author: s.string(),
      category: s.string(),
      tags: s.array(s.string()).default([]),
      image: s.string().optional(),
      featured: s.boolean().default(false),
      slug: s.path(),
      metadata: s.metadata(), // reading time + word count
      body: s.mdx(),
    })
    .transform((d) => ({ ...d, slug: d.slug.replace(/^blog\//, '') })),
});

export default defineConfig({ root: 'content', collections: { posts } });
```

Contentlayer (archived): keep `contentlayer.config.ts` only in projects that already use it. Its `computedFields` map to Velite `.transform()`. Add a migration note in the report.

## Blog Post Page

```tsx
// app/blog/[slug]/page.tsx
import { posts } from '#site/content';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { MDXContent } from '@/components/mdx-content';

type Props = { params: Promise<{ slug: string }> };

const getPost = (slug: string) => posts.find((p) => p.slug === slug);

export function generateStaticParams() {
  return posts.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = getPost((await params).slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    openGraph: {
      type: 'article',
      publishedTime: post.publishedAt,
      images: post.image ? [{ url: post.image }] : [],
    },
  };
}

export default async function BlogPost({ params }: Props) {
  const post = getPost((await params).slug);
  if (!post) notFound();
  return (
    <article className="prose prose-lg mx-auto max-w-3xl">
      <h1>{post.title}</h1>
      <time dateTime={post.publishedAt}>{post.publishedAt}</time>
      <MDXContent code={post.body} />
    </article>
  );
}
```

## MDX Components Map

```tsx
// components/mdx/index.tsx
import Image from 'next/image';
import { Callout } from './callout';
import { Tabs, Tab } from './tabs';

export const mdxComponents = {
  Callout,
  Tabs,
  Tab,
  h2: ({ children, ...props }: React.ComponentProps<'h2'>) => {
    const id = slugify(String(children));
    return <h2 id={id} {...props}><a href={`#${id}`}>{children}</a></h2>;
  },
  img: ({ src = '', alt = '' }: React.ComponentProps<'img'>) => (
    <Image src={String(src)} alt={alt} width={1200} height={630} />
  ),
  a: ({ href = '', ...props }: React.ComponentProps<'a'>) =>
    href.startsWith('http')
      ? <a href={href} target="_blank" rel="noopener noreferrer" {...props} />
      : <a href={href} {...props} />,
};
```

## RSS Feed

```ts
// app/feed.xml/route.ts
import { posts } from '#site/content';

export const dynamic = 'force-static';

export function GET() {
  const items = [...posts]
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 20)
    .map((p) => `
    <item>
      <title>${escapeXml(p.title)}</title>
      <link>https://example.com/blog/${p.slug}</link>
      <guid>https://example.com/blog/${p.slug}</guid>
      <pubDate>${new Date(p.publishedAt).toUTCString()}</pubDate>
      <description>${escapeXml(p.description)}</description>
    </item>`)
    .join('');

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>Company Blog</title>
  <link>https://example.com/blog</link>
  <description>Engineering and product insights</description>${items}
</channel></rss>`,
    { headers: { 'Content-Type': 'application/xml' } },
  );
}
```

## Content Rules

1. Use MDX components for callouts, code, and tabs. Do not use raw HTML.
2. Fill every required frontmatter field. Use ISO dates.
3. Images: `next/image` with alt text.
4. External links: `target="_blank" rel="noopener noreferrer"`.
5. H2 for sections, H3 for subsections. The layout owns H1.
6. Code blocks: language annotation and title.
7. CTAs: use the CTA component, not raw links, so conversion tracking works.
