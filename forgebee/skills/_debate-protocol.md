# Debate Protocol (shared spine)

> Shared rules for all ForgeBee debates: requirements (`/workflow` planning), code (`/workflow` code phase), and strategy (`/growth`). Each debate skill links here and keeps only its domain payload. If this file and a skill disagree, this file wins. Do not keep a parallel copy of these rules.

## Roles

Each role runs in its own forked context (`context: fork`):

- **Advocate** — argues FOR the artifact. Builds the strongest honest case that it is ready.
- **Skeptic** — argues AGAINST the artifact. Finds gaps, bugs, risks, and weak points.
- **Judge** — reads both blind cases, verifies claims independently, and rules.

## Blind-Debate Rules

1. **Advocate and Skeptic argue blind.** Neither sees the other's case. Reason from the artifact and the codebase/market only.
2. **One argument per item.** No rebuttals. Lead with your strongest point.
3. **Evidence beats rhetoric.** Cite `file:line`, an acceptance criterion, a market signal, or a competitor example for every claim. A claim with no reference has no value to the Judge.
4. **Argue honestly.** Advocates concede real weaknesses. Skeptics concede clean items. Your confidence/severity rating is part of the output.
5. **Stay in your lane.** Argue about quality. Do not rewrite the artifact, redesign the system, or make the decision.
6. **Terse output.** One line per claim. Evidence as `path:line`. Skip empty dimensions.

## Verdict Lattice

Each role has its own words. They are not symmetric.

**Advocate** (one per item):
- **APPROVE** — strong case; ready as-is.
- **APPROVE-WITH-CAVEATS** — ready, with named limitations for the Judge to weigh.
- **CANNOT-DEFEND** — no credible case for readiness. As strong a signal as a Skeptic BLOCK. Say it plainly; do not manufacture a defense.

**Skeptic** (one per item):
- **BLOCK** — a concrete problem that must stop the artifact.
- **FLAG** — a real concern to track and proceed past.
- **CLEAN** — no significant concern after rigorous review. Do not invent issues to seem rigorous.

**Judge** (one per item):
- **APPROVE** — proceed.
- **FLAG** — proceed with acknowledged risk; create a tracked follow-up.
- **BLOCK** — do not proceed; specific changes required before re-debate.

Judge mapping defaults:
- Advocate CANNOT-DEFEND, or Skeptic BLOCK with concrete evidence → lean **BLOCK**.
- Advocate APPROVE-WITH-CAVEATS, or Skeptic FLAG → lean **FLAG**.
- Advocate APPROVE + Skeptic CLEAN → **APPROVE**.
- Both sides weak or both strong → **FLAG** with a note; surface the trade-off to the user.

## Severity Scale (CLAUDE.md P6)

Use only these words. Alternates (Warning, Suggestion) break aggregation.

- **Critical** — blocks merge/execution; will fail or cause harm.
- **High** — fix before the next sprint/iteration; degrades the outcome.
- **Medium** — fix when convenient; the artifact works without it.
- **Low** — nice-to-have.

## Judge Input Contract

For each item the Judge reads in full before ruling:
1. The artifact under debate (story + ACs, code diff + criteria, or strategy artifact).
2. The **Advocate's** blind case, with verdict and strength rating.
3. The **Skeptic's** blind case, with verdict, severity, and proposed fix.

The Judge verifies independently (reads the code, checks the criteria, tests the market claim).

## Escalation Rules (Judge)

- **Low/Medium** → rule and move on. The ruling stands unless the user overrides.
- **High/Critical** → rule AND escalate to the user with full context. The ruling is a recommendation; the user has final authority.
- Compile all **BLOCK** items into an escalation report, at any severity.

## Blindness-Leak Guard (Judge)

If either case references, quotes, anticipates, or rebuts the other side ("as the Skeptic will claim…", "contrary to the Advocate…"), the blind constraint has leaked:
- **Flag the leak** in the ruling for that item.
- **Discount** the leaked portion.
- Rule on the clean evidence only.
