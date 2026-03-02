# Connectors

## How tool references work

Plugin files use `~~category` as a placeholder for whatever tool the user
connects in that category. Plugins are tool-agnostic — they describe
workflows in terms of categories rather than specific products.

## Connectors for this plugin

ForgeBee is primarily a **workflow framework** — most commands describe development processes
rather than integrating with specific external tools. However, a few commands work better
when connected to external services:

| Category | Placeholder | Options |
|----------|-------------|---------|
| Source control | `~~source control` | GitHub, GitLab, Bitbucket |
| CI/CD | `~~CI/CD` | GitHub Actions, Jenkins, CircleCI, GitLab CI |
| Project tracker | `~~project tracker` | Jira, Linear, Asana, Monday |
| Analytics | `~~analytics` | Google Analytics, Mixpanel, Amplitude, PostHog |
| Payment processor | `~~payment processor` | Stripe, LemonSqueezy, Paddle |
| Hosting | `~~hosting` | Vercel, Netlify, AWS, GCP, Railway |

## Notes

Most ForgeBee commands work entirely offline with just Claude Code and your local codebase.
External connectors enhance specific commands:

- `/deploy` benefits from `~~CI/CD` and `~~hosting`
- `/analytics` benefits from `~~analytics`
- `/payments` benefits from `~~payment processor`
- `/competitive` and `/launch` benefit from web search
- `/workflow` and `/pm` are fully self-contained (use local state.yaml)
