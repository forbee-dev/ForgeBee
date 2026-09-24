# saas-cro — Reference Material

Working library for `forgebee/agents/saas-cro.md`. The persona holds rules; this file holds patterns.

---

## Pricing Page

```tsx
'use client';
import { useState } from 'react';

const PLANS = [
  { name: 'Starter', monthly: 19, annual: 15, features: ['5 projects', '10GB storage'], cta: 'Start Free Trial' },
  { name: 'Pro', monthly: 49, annual: 39, features: ['Unlimited projects', 'API access'], cta: 'Start Free Trial', badge: 'Most Popular' },
  { name: 'Enterprise', monthly: 149, annual: 119, features: ['SSO', 'Dedicated support'], cta: 'Contact Sales' },
];

export function Pricing() {
  const [annual, setAnnual] = useState(true);
  return (
    <section>
      <button role="switch" aria-checked={annual} onClick={() => setAnnual(!annual)}>
        Annual <span>Save 20%</span>
      </button>
      <div className="pricing-grid">
        {PLANS.map((p) => (
          <PricingCard key={p.name} plan={p} price={annual ? p.annual : p.monthly} highlighted={!!p.badge} />
        ))}
      </div>
      <p>14-day free trial. No credit card required. Cancel anytime.</p>
    </section>
  );
}
```

Psychology in this pattern: annual default (anchoring), highlighted middle tier with badge (Von Restorff + social proof), guarantee under the grid (risk reversal). To persist the toggle across navigation, put it in a URL param.

## Multi-Step Signup

```tsx
'use client';
import { useState } from 'react';

const STEPS = ['Account', 'Profile', 'Workspace'] as const;
const FIELDS = [
  { name: 'email', type: 'email', label: 'Work email' },
  { name: 'name', type: 'text', label: 'Your name' },
  { name: 'workspace', type: 'text', label: 'Workspace name' },
] as const;

export function SignupFlow({ onSubmit }: { onSubmit: (d: Record<string, string>) => void }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<Record<string, string>>({});
  const field = FIELDS[step];
  const last = step === STEPS.length - 1;

  return (
    <form onSubmit={(e) => { e.preventDefault(); last ? onSubmit(data) : setStep(step + 1); }}>
      <ol aria-label="Progress">
        {STEPS.map((s, i) => <li key={s} aria-current={i === step ? 'step' : undefined}>{s}</li>)}
      </ol>
      <label>
        {field.label}
        <input
          key={field.name}
          type={field.type}
          required
          autoFocus
          value={data[field.name] ?? ''}
          onChange={(e) => setData({ ...data, [field.name]: e.target.value })}
        />
      </label>
      <button type="submit">{last ? 'Create workspace' : 'Continue'}</button>
      {step > 0 && <button type="button" onClick={() => setStep(step - 1)}>Back</button>}
      {step === 0 && <p>No credit card required</p>}
    </form>
  );
}
```

Email-only first step (low friction), one field per step (Hick's Law), visible progress (commitment/consistency). Create the account server-side after step 1 so a drop-off at step 2 is still a lead.

## Social Proof

```tsx
export function MetricsBar({ metrics }: { metrics: { value: string; label: string }[] }) {
  return (
    <dl className="metrics-bar">
      {metrics.map((m) => <div key={m.label}><dt>{m.label}</dt><dd>{m.value}</dd></div>)}
    </dl>
  );
}
```

Feed it real, specific numbers from data ("12,418 teams", not "10,000+"). Real company logos and dated testimonials beat invented counters.

## A/B Test — Server-Side Assignment

Assign in middleware so the variant is known before first paint (no flash, no hydration mismatch).

```ts
// middleware.ts
import { NextResponse, type NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  if (!req.cookies.has('ab_hero_v2')) {
    res.cookies.set('ab_hero_v2', Math.random() < 0.5 ? 'control' : 'variant', {
      maxAge: 60 * 60 * 24 * 30,
      sameSite: 'lax',
    });
  }
  return res;
}

export const config = { matcher: ['/'] };
```

```tsx
// app/page.tsx (Server Component)
import { cookies } from 'next/headers';

export default async function Home() {
  const variant = (await cookies()).get('ab_hero_v2')?.value ?? 'control';
  return (
    <>
      <h1>{variant === 'variant' ? 'Ship 10x faster — no compromises' : 'Build faster with Product'}</h1>
      <TrackExposure experiment="hero_v2" variant={variant} />
    </>
  );
}
```

`TrackExposure` is a small client component that sends one exposure event on mount. Set the sample size and significance threshold before launch.

## Exit Intent (desktop only)

```tsx
'use client';
import { useEffect, useState } from 'react';

export function ExitIntent({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // mouseout is unreliable on touch devices.
    if (!window.matchMedia('(pointer: fine)').matches) return;
    const onOut = (e: MouseEvent) => {
      if (e.clientY < 10 && !sessionStorage.getItem('exit_shown')) {
        sessionStorage.setItem('exit_shown', '1');
        setShow(true);
      }
    };
    document.addEventListener('mouseout', onOut);
    return () => document.removeEventListener('mouseout', onOut);
  }, []);

  return show ? <dialog open onClose={() => setShow(false)}>{children}</dialog> : null;
}
```
