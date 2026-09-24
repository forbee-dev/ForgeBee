# Changelog

All notable changes to ForgeBee are documented here.

The format roughly follows [Keep a Changelog](https://keepachangelog.com/) and the project uses [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

- **`grill` skill + `/grill` command** — interviews the user on a plan in rounds (decision tree, frontier, one recommended answer per question) and writes a resolved decision log. `/workflow` gains a Grill phase before Plan (on for ambiguous or auth/payments/data specs; `--grill` / `--no-grill`). `/team` gains a conditional Step 2 grill (Medium/Large or ambiguous, max 2 rounds).
- **P7 — Lean Output** — comments say why, minimal docblocks (WPCS minimum form), no filler in reports. Added to `CLAUDE.md`, every karpathy block, `inject-principles.js`, and the rules files; `check-agent-contract.js` now fails an agent that drops it. `review-code-style` and `review-docs` flag over-commenting.
- **Agent and skill refresh** — all 45 agents and 34 skills trimmed to current prompt practice: what+when descriptions, one copy per rule, least-privilege tools, long catalogues moved to reference files. Fixes wrong code in several agents (exit-code capture, WPCS sniff name, WooCommerce short description, Supabase admin check, gateway-order filter).
- **`load-context-rules.js` now injects rules** — it only logged before. Rules and the active context go in as `additionalContext` under a 3.2 KB budget; files that do not fit are listed by path.
- **Debate roles invoked as skills** — `/workflow`, `/growth`, and `/idea` state that advocate/skeptic/judge are `context: fork` skills, not `subagent_type` agents.

---

## [5.5.0] — 2026-09-01

**Minor: `/team` now sizes the task before it spends.** A single 5-file change measured 905 API calls and 131.6M billed-equivalent tokens across 7 sessions in 37 minutes — roughly 205,000 tokens per line of code written. Three rules in `/team` produced it, and all three are fixed.

### Fixed — `/team` cost control

- **The scope table set a floor instead of a ceiling.** "3-5 files → 2-3 specialists" read as an instruction to reach that count; the observed run dispatched 6 agents for a 5-file diff. Step 1 is now a mandatory sizing gate with four tiers (Direct 0 agents / Small 1 / Medium 2-3 / Large 3-5), the lead must state its tier and agent count in one line before dispatching, and **ambiguity resolves downward**. Auth, payments, or user data adds `security-auditor` without raising the tier.
- **The Anti-Stop Rule told the lead to keep working, and it did — on the agents' task.** "IMMEDIATELY continue with your own next-step work" produced 75 lead-side `Bash` calls (curl against the local site, `docker exec` PHP dumps, git) while six agents investigated the same code. The rule now scopes "continue" to orchestration and explicitly forbids `Edit`, running the app, hitting its endpoints, container exec, and running its tests while agents are live. If the lead finds itself implementing, it sized the task wrong and drops to Tier Direct.
- **Nothing forbade polling.** The lead called `ListAgents` 12 times at an average 186K context per call. Polling is now banned outright — wait for the harness notification.
- **`security-auditor` and `test-engineer` were unconditional.** "Always include … for code-producing tasks" is replaced by explicit trigger lists: five conditions for security (auth/authz/sessions, payments/PII, untrusted input reaching output, secrets, upload-deserialization-path construction) and three for tests (extendable suite plus a new code path, a bug fix, or an explicit ask). Neither is automatic, and on a Tier Small task both are usually wrong.

### Added

- **Cost rule in `/team`** — states plainly that every agent is a fresh session re-reading the full preamble on each of its tool calls, so a one-paragraph return still costs six figures. Bans the research-then-re-derive pattern that cost 7.5M tokens in the measured run when two research agents were dispatched and the implementer re-derived their findings anyway.
- **Two dispatch-hygiene rules** — full context in an agent's first message (a follow-up round trip costs as much as the first), and reviewers sequenced after implementers rather than alongside them.

### Changed

- `/team`'s `## Never` list gains "never implement, verify, or poll while agents run" and "never dispatch more agents than the tier allows".
- `/team`'s closing `## Rules` now defers to the Step 1 tier for the agent count instead of restating "3-5 agents" as a standalone target.

### Known limitation

The tiers key off file count, which is a proxy for effort rather than a measure of it. A one-file change to a hot path can still warrant a reviewer; the lead is expected to override upward with a stated reason, and the ceiling language permits it.

---

## [5.4.0] — 2026-08-11

**Minor: routing actually fires, and a design-system trio arrives.** ForgeBee shipped 114 surfaces that were effectively unreachable. Five defects, each verified by direct hook test, explain why a WordPress task never reached a `wordpress-*` agent.

### Fixed — the routing path

- **`load-index.js` emitted the entire 20,599-byte `INDEX.md` as `additionalContext`.** The harness rejects an oversized payload, persists it to a file, and injects only a ~2KB preview. Every section past that point — including the whole WordPress agent roster, which starts at byte 7335 — never reached the session. It now emits a digest: the Quick Triage table plus the stack section matching `project-triage.json`, 1.2KB on a node repo and 2.1KB on a WordPress repo, with a hard 3.5KB ceiling and a pointer to read the full file.
- **`skill-activator.js` emitted a top-level `additionalContext`.** `UserPromptSubmit` requires `hookSpecificOutput.additionalContext`. The hook exited 0 with valid JSON and correct content, and the harness discarded all of it — a silent failure with no error surface. This is why skill recommendations never appeared.
- **The activator scanned only skills.** All 45 agents and all 38 commands were invisible to it, so no agent or slash command could ever be recommended. It now builds one manifest across skills, agents, and commands.
- **Matching had a 5-character floor on description words**, which silently excluded every high-signal acronym in the domain — ACF, SCF, SEO, API, RLS, CPT, TDD. Floor lowered to 4, plus a dedicated acronym pass that reads capitalisation from the source description before lowercasing, weighted higher than an ordinary word.
- **Recommendations were unranked and unbounded** — 13 undifferentiated "Consider…" lines per prompt. Now scored (name tokens 3, acronyms 2, description overlap 1, explicit triggers 6, plus a stack boost from detected project type), floored at 3, deduped so a command does not repeat its same-named skill, and capped at 5.

Also fixed: frontmatter values kept their surrounding quotes, which leaked into output as `\"…\"`, and the payload flattened every newline into a space.

### Added

- **`figma-code-sync` skill** — code-first reconciliation of a Figma design system against the code that ships. Carries THE ONE LAW (code is the source of truth; Figma is derived, never approximated from a screenshot), a three-tier free-check pass that needs no source access, 12 defect priors each paired with the counter-case that makes blind application dangerous, ~18 Figma Plugin API traps (including Figma's counter-clockwise-positive `rotation` against CSS's clockwise, and `mainComponent.name` returning the variant while the set name is `mainComponent.parent.name`), absence/census hygiene, and record-keeping rules — one audit file per writer, never shared between concurrent writers.
- **`wp-design-system` agent** — WordPress block design systems. Resolves layer ownership first: core blocks take `theme.json` presets, custom blocks take their own stylesheet, and the two collide by name with different values. Covers the token pipeline in both directions, a cost-ordered choice between pattern / synced pattern / style variation / custom block / Block Bindings, and saved-content safety via deprecations.
- **`/design-system` command** — `audit`, `onboard`, or `tokens`, with a documented context load order that stops when a project-level design-system skill is missing rather than improvising a file key. Audits parallelise across pages, never across writers of one file.
- **Routing Discipline R1–R4** in `CLAUDE.md` — name the route in one line before the first edit, prefer the stack-specific surface over the generic one, read `INDEX.md` rather than guess, and treat hook candidates as input rather than orders.
- **`findAgentsDirs()`** in `hooks/scripts/_common.js`, mirroring `findSkillsDirs()` for flat `<name>.md` agent files.

### Changed

- **`wordpress-backend` is now an ACF/SCF field-architecture specialist.** It previously held retrieval patterns only. Adds field-group registration (`acf_add_local_field_group` versus JSON sync), immutable field keys and why changing one orphans every value, the real meta storage shape — one field is two rows, and a Repeater flattens to `name_<i>_<sub>` so it **cannot** be `meta_query`'d — `update_field` versus `update_post_meta`, meta-cache priming for the archive N+1, validation hooks, REST exposure with schema, and an ACF-PRO-to-SCF migration risk table. Plus 6 new failure modes and 3 new escalation triggers.
- `forgebee/README.md` is now tracked in `.version-bump.json`; its `## Key Features (vX.Y.Z)` heading was drifting outside the declared set.
- Documentation counts corrected across `README.md`, `forgebee/README.md`, and `ARCHITECTURE.md`. The inline/fork skill split in `forgebee/README.md` was already wrong before this release (`11 + 22` against an actual 21 fork skills) and now reads `13 inline + 21 context:fork`.

### Known limitation

The activator's stack boost depends on `project-triage.json`. On a repo triaged as something other than WordPress, a WordPress-flavoured prompt still routes correctly but ranks below generic name-token matches such as `/audit`.

---

## [5.3.1] — 2026-06-12

**Patch: the `checkpoint` hook is revived and wired.** Follow-up to 5.3.0.

### Fixed

- **`checkpoint.js` had broken `_common` imports** — it destructured `PROJECT_DIR`, `initDirs`, and `readStdinSync`, none of which `_common.js` exports. That (not just the missing `hooks.json` entry) is why it was dead code. Repointed to the real APIs (`getProjectDir`, `initializeProjectDirs`, `readStdinJsonSync`) and added a crash guard so it can't fail the event.

### Changed

- **`checkpoint.js` wired into `hooks.json` on `PreCompact`** (alongside `context-guard`): before context compaction it saves the active pipeline phase — derived from `docs/pm/state.yaml` when invoked as a lifecycle hook, so a long-running `/workflow` survives a compact/crash and can resume. Explicit orchestrator calls (`feature`/`phase`/`pipeline` via stdin) still work. Wired hook count **24 → 25**; the README hooks table and parity matrix updated.
- README marketplace install line kept as `forbee-dev/ForgeBee` pending the planned GitHub repo rename (the local-install `git clone` URLs already point at the real `ClaudeDevKit` remote).

## [5.3.0] — 2026-06-12

**Theme: orchestrator hardening + framework self-testing + an exhaustive agent/skill polish pass.** Three deep-research passes drove this release: a defect audit of the executable surface, a forward-looking capability study, and a per-file review of all 44 agents + 33 skills read in full (55 A / 22 B / 0 C). Headlines: `/workflow`'s review-all gate is now an actually-executed step, the framework finally tests its own prompts (golden-task eval), a commit-time secret scanner lands, and the permission-guard is hardened against the bypasses it used to miss.

### Added

- **`/release` command** — gated release flow wrapping `scripts/bump-version.sh` (pre-flight `npm run check` + `review-all` → bump → changelog → tag/PR).
- **`review-prompt` skill** — LLM-app review (prompt-injection trust boundary, tool-call argument validation, output-schema validation, token/cost, eval coverage). Wired into `review-all`'s change-type→skill delegation map.
- **`secret-scan` hook** (PreToolUse Bash) — blocks commits/pushes that introduce hardcoded secrets (AWS/Anthropic/GitHub/Stripe/Google/Slack keys, private-key blocks, `key = "…"` assignments); override with `FORGEBEE_ALLOW_SECRET=1`.
- **`scripts/check-agent-contract.js`** (`npm run check:agents`) — enforces the load-bearing agent contract (Adversarial Input Hardening + Status protocol) on every agent; in the merge gate.
- **`forgebee/eval/golden/`** — golden-task **prompt-output** regression eval: feeds planted fixtures to review skills and asserts the output catches the issue in P6 vocabulary. Opt-in (`npm run eval:golden`), CI-safe (SKIPs without the `claude` CLI). The framework's first test of its own prompts.
- **`forgebee/eval/scenarios/build-scripts.test.js`** — coverage for `build-index`/`check-references`/`bump-version` + the inject-* idempotency invariant.
- **`.github/workflows/check.yml`** — runs the full `npm run check` on every PR with no path filter (the aggregate merge gate).
- **`CONTRIBUTING.md` + `ARCHITECTURE.md`** — surface contracts, the model-tier policy, output modes, source-of-truth/INDEX/mirror, CI matrix.
- **`forgebee/skills/_budget-breaker.md`** (shared reference), **`.gitattributes`** (LF), and a README **platform-parity matrix** (hooks are Claude-Code-only).

### Changed

- **`/workflow`:** added the **Final Gate** — `review-all` on the diff before Deliver, so the "zero Critical/High" success metric is an executed step, not aspirational (load-bearing for Medium runs that skip Code Debate). Spec Compliance now dispatches the existing `verification-enforcer` agent instead of a hand-rolled rubric. Budget breaker slimmed to a one-line cite of `_budget-breaker.md`. Fixed the stale "Phase 7" reference and the "populate stories from scrum-master" line (now reads from the Implementation Plan). Trivial routing no longer bounces through `/team`.
- **`/team`:** added an agent-death recovery path (no parseable Status → BLOCKED → re-dispatch once → escalate) and a named crash-recovery substrate (`state.yaml` / `.claude/team-progress.json`); budget reference.
- **Agents:** `performance-optimizer` gained Write/Edit (it was told to apply fixes with no edit tools) + a Karpathy block; `ux-designer` opus→sonnet; the orphan `flutter-expert`/`ios-expert`/`n8n-builder` wired into `frontend-specialist`/`backend-engineer` + `/team` routing; `market-intel` +WebFetch; `marketing-analyst` broken `When Invoked` restored; `ios-expert` sample updated to the `@Observable` macro; `nextjs-content` Failure-Modes made tool-agnostic (Velite/Contentlayer); evidence/self-review gates and Failure-Modes/Karpathy parity added across `scrum-master`, `devops-engineer`, `dashboard-generator`, `saas-cro`, `audience-architect`, `nextjs-content`, `nextjs-seo`, `wordpress-content`.
- **Skills:** `review-code-style` severity enum/example reconciled; `review-accessibility`/`review-best-practices` aligned to the shared 4-line finding contract; `review-prompt` gained Never/Communication; `brainstorming` dropped the false `/plan` trigger; `elicitation` gained a slug→`method_name` mapping rule; `code-advocate` summary roll-up; `strategy-skeptic` defers verdict mapping to the protocol; `forgebee-setup`/`forgebee-help` anti-drift wording.
- **Consistency:** CRLF→LF across 54 files; `When Invoked` casing unified; surface counts → **37 commands / 33 skills / 24 hooks / 44 agents**; "frontmatter blocks" prose de-numbered so it can't drift.

### Fixed

- **`permission-guard` hardening** — Tier-0 now catches order-independent `rm` (`rm -fr`, `rm -r -f`, `rm --recursive --force`), chmod world-writable/setuid (`0777`/`u+s`/`a+rwx`/`4755`), and redirect-based persistence (`>> ~/.ssh/authorized_keys`, `/etc/cron*`); the allowlist no longer auto-approves arbitrary `node /tmp/x.js`, `cp /etc/passwd`, `mv .env`, or `sed -i /etc/…`. Patterns hoisted to module scope and exported via a pure `classify()` so the eval suite imports the **live** patterns (133 tests — no hand-copied snapshot to drift). Fixed the `/eval.*$(/ ` false-positive that blocked any command touching `forgebee/eval/` with a later `$(…)`. Honest doc framing (best-effort defense-in-depth, not a boundary).
- **`openclaw/install-openclaw.js`** read the gitignored `.claude/` dir (broken on a fresh clone, silently converting 0 agents) — now reads canonical `forgebee/`; emitted version 2.3.0→5.2.0. README clone URLs corrected to the real `ClaudeDevKit` remote.
- **Hook robustness:** `self-improve` no longer crashes the Stop hook on a write failure; 4 SessionStart/PreCompact hooks `exit(1)→exit(0)`; `post-edit-format`/`-typecheck` use the project's local `node_modules/.bin` + timeouts (no `npx` network stall); `observe`/`detect-project` memoize project detection (no per-tool-call `git remote` subprocess + registry rewrite); `task-sync` invalid `\Z` regex + non-atomic rewrite fixed; `session-save` `lstat`/symlink logic + portable fallback; `compress-learnings` guarded + atomic write; `inject-escalation` `existsSync` guard.
- **Scripts:** `build-index --check` surfaces injection-scan rejections (no longer launders the `[REJECTED]` placeholder); `bump-version` treats `null`/missing JSON fields as drift.

### Security

- New commit/push-time `secret-scan` hook (above). Permission-guard bypass-class fixes (above). The guard's test suite can no longer pass while the shipped guard allows what the tests claim is blocked.
- Removed the stale committed `forgebee.plugin` build artifact from version control (gitignored).

## [5.2.0] — 2026-06-02

**Theme: framework-wide quality overhaul + growth-roster consolidation.** The largest release since 5.0 — a full audit-and-improve pass across every agent, skill, command, hook, and the build/CI tooling. Two deep-research audits drove it: a defect audit (security-critical hook fixes, drift, broken commands) and a forward-looking improvement study (prompt quality, capability gaps, model/tool fit). Headline outcomes: a shared finding contract unifies the 12 review skills, a shared debate protocol with a full verdict lattice unifies the 9 debate skills, the growth roster is trimmed 15→11 by merging overlapping agents, and the framework's own JS finally has a CI gate.

### Removed — Growth roster trimmed 15 → 11 (⚠️ breaking for direct agent invocation)

Seven overlapping growth agents were merged into four. **If you invoke any of these by name, update your references:**

| Removed | Now use |
|---------|---------|
| `content-architect`, `idea-machine`, `calendar-builder` | **`content-strategist`** (architecture + ideation + editorial calendar) |
| `content-writer` | **`content-creator`** (now covers social-native *and* long-form) |
| `growth-hacker`, `conversion-optimizer` | **`growth-engineer`** (growth loops + on-page/funnel CRO) |
| `performance-analyst` | **`marketing-analyst`** (renamed — resolves the name collision with `performance-optimizer`) |

`/growth` pipeline, router tables, and all cross-references repointed. Each merged agent is self-contained (inline methods, not reference-only) with a scope fence and a quality/evidence gate.

### Added

- **`content-strategist`, `growth-engineer`, `marketing-analyst`** agents (the merges above).
- **`forgebee/skills/_review-finding-contract.md`** — canonical finding format (P6 severity + 0-100 score + machine-parseable `SCORE: … | {…} | verdict:` footer) so `review-all` and `/audit-self` can aggregate sub-skill output reliably.
- **`forgebee/skills/_debate-protocol.md`** — shared debate spine: blind-debate rules, the full verdict lattice (Advocate `APPROVE`/`APPROVE-WITH-CAVEATS`/`CANNOT-DEFEND` ↔ Skeptic `BLOCK`/`FLAG`/`CLEAN` ↔ Judge), severity scale, judge input contract, and a blindness-leak guard.
- **`.github/workflows/eval.yml`** — runs the eval harness (permission-guard suite + router scenarios) on every PR touching hooks/router/eval/scripts. These tests existed but no CI ran them.
- **`package.json`** — `npm run check` (index + references + version + eval) as a single quality gate; no runtime deps.
- **`scripts/sync-local-install.js`** + `npm run sync:local` — mirrors the canonical `forgebee/` source into the gitignored local `.claude/` install so the two can't drift.
- **Few-shot exemplars** added to review skills, debate skills, and the knowledge-heavy agents (architect, debugger-detective, test-engineer, performance-optimizer, security-auditor).

### Changed

- **Review system:** every review skill adopts the shared finding contract; `review-code-style`/`review-api`/`review-database` gained "detect stack first" gates (no longer assume React/TS, REST, Postgres/RLS as universal); `review-security`/`review-performance`/`review-accessibility` gate static-impossible checks behind `[needs tool]` labels instead of asserting them.
- **Debate system:** the 9 triad skills point to `_debate-protocol.md` and carry only domain payload; verdict asymmetry fixed (advocates can caveat/concede, skeptics can affirm clean).
- **Quality/process agents:** config-derived thresholds with labeled defaults (tdd-enforcer, test-engineer, performance-optimizer, session-librarian) — unconfigured numbers no longer hard-`BLOCK`; `delivery-agent` Step 0↔1 contradiction resolved (consumes verification evidence, doesn't re-run); `verification-enforcer` uses exit-code/pass-count comparison + triage-derived commands; `contract-validator` reads the live roster from `INDEX.md` instead of an embedded registry; `session-librarian` gained its missing Verification section.
- **Stack specialists (14):** each gained a "Targets: `<framework> <version>` + 2026 APIs" line; modernized WooCommerce Blocks checkout, WP Interactivity API + Block Bindings, n8n AI-Agent/RAG nodes, and nextjs-content (Velite/Fumadocs; Contentlayer flagged archived).
- **security-auditor:** expanded to a mapped OWASP-2021 table (incl. SSRF, deserialization, SSTI, JWT, mass-assignment, proactive IDOR) + a CVE-from-memory ban (CVE claims require an actual audit-tool run).

### Fixed

- **`permission-denied-logger.js` command injection** — replaced `echo '…' | node` shell pipe (broken single-quote escaping over untrusted command text) with `spawnSync(…, {input})`.
- **`permission-guard.js` over-broad Tier-0 regexes** — process-substitution now blocks only `<(curl…)`/`bash <(…)`-style network/exec wrapping (benign `diff <(…)` allowed); `--no-verify` anchored to real git invocations; `rm -rf .` no longer blocks `rm -rf ./build`; `find -exec` blocks only destructive verbs. Eval suite updated with regression tests for each.
- **Dead `permission_denied` audit branch** added to `audit-trail.js` (denials were silently dropped).
- **Broken secret-scan commands** in `security-auditor` + `/security` (`grep --include="*.{…}"` matched zero files) → bounded, case-insensitive `rg` covering `.env`/`yml`/`json` + `PRIVATE_KEY`.
- **5 growth agents** had an unclosed ` ```markdown ` fence rendering their guardrails inert — removed; a fence-parity check added to `check-references.js` prevents recurrence.
- **P6 severity vocab** normalized across 6 review skills, `contexts/review.md`, `/review`, and `strategy-skeptic` (no more `BLOCKER`/`MUST FIX`/`Warning`/`Nitpick`/UPPERCASE labels).
- **Count drift** — all manifests + READMEs synced to 32 skills / 44 agents / 36 commands / 23 hooks; the false `README` claim that `bump-version.sh` syncs counts corrected.
- **Scripts hygiene** — `inject-principles.js` docstring (P1/P3/P4), `bump-version.sh` path-anchored excludes, `check-references.js` full-stem heading match; removed the hazardous one-off `trim-agent-descriptions.js`.
- **`context-guard.js`** dead (unreachable) SessionStart restore branch removed.

### Root `.claude/` install

The gitignored local `.claude/` install had drifted to a pre-5.x snapshot (69 agents, debate/review skills duplicated as agents, 0 skills) causing duplicate registration. Re-synced to mirror `forgebee/` (44 agents, 36 commands) via the new `sync-local-install.js`. **Reinstall the plugin to make hook fixes go live** in running sessions.

### Why a minor, not a major

The seven removed agents are an internal specialist toolkit reorganized within the v5 line, not a stable public API — consistent with the project's convention of shipping feature releases as minors (cf. 5.1.0). The breaking note above flags the direct-invocation impact for anyone who scripted those names.

---

## [5.1.3] — 2026-05-20

**Theme: lighter `/workflow` breakdown for ticket-driven work.** Patch release removing the `scrum-master` prompt from the default `/workflow` path. Solo devs (and anyone arriving with a ticket that already has brief + architecture in hand) no longer pay the sprint-ceremony tax — the default is now an ordered Implementation Plan produced directly by the orchestrator.

### Changed — `/workflow` Work Breakdown now defaults to Implementation Plan

- **Default flow no longer prompts the user** to choose between full sprint planning and direct delegation. After Architect, `/workflow` produces a lightweight Implementation Plan directly: ordered workstreams, file scope, agent assignment, dependencies, brief acceptance criteria pulled from the ADR. No story files written to `docs/planning/stories/`. No T-shirt sizing. No estimation ceremony. ~5-10x faster than dispatching `scrum-master` for a typical Medium-complexity ticket.
- **`scrum-master` opt-in via `/workflow --scrum`** for the cases that genuinely warrant full sprint stories (multi-sprint scope, multi-person execution, backlog grooming). The `scrum-master` agent itself is unchanged and still available for direct invocation outside `/workflow`.
- **Step 1 complexity table updated.** Medium/Large/Critical pipelines now say "Implementation Plan after Architect" instead of "Prompt before scrum". Added clarifying note distinguishing default Implementation Plan from opt-in scrum.
- **New "Never" rule:** "Never delegate to `scrum-master` unless the user passed `--scrum` or explicitly asked for sprint stories." Enforces the default.

### Docs

- **README.md** `/workflow` row and Quality Pipeline bullet updated to reflect the new default. Pattern stays consistent with the existing `--skip-checkpoint` and `--strict` opt-in flags.

---

## [5.1.2] — 2026-05-20

**Theme: orchestrator routing + discovery-search hardening.** Patch release fixing two friction points that surfaced during real `/workflow` runs: ambiguous "delegate to /plan" wording that led orchestrators to dispatch a non-existent `forgebee:plan` agent, and unbounded `grep -r` calls during the Plan phase stalling for 10+ minutes on WordPress theme / vendored subtrees.

### Fixed — Workflow routing

- **`/plan` dispatch ambiguity.** `forgebee/commands/workflow.md` said "delegate to `/plan`" in two places. `/plan` is skill-only — no `plan` agent twin exists — so dispatching `forgebee:plan` as a `subagent_type` failed with `Agent type 'forgebee:plan' not found`. Now reads "invoke the `plan` skill via the Skill tool (`Skill({ skill: "plan" })`)" with an explicit "do NOT dispatch `forgebee:plan`" warning. Re-delegation path in the Requirements Debate escalation flow updated to match.
- **Routing reference added to workflow.md.** New section explicitly distinguishing skills (slash-prefixed names like `/plan`, `/debug`, `/idea`, invoke via Skill tool) from agents (plain names like `scrum-master`, `delivery-agent`, dispatch via Task tool). Calls out that a few names exist as both (e.g. `architect`) and that `forgebee:plan` is not a valid `subagent_type`. Added matching "Never" rule.

### Added — Tool Discipline (CLAUDE.md)

New "Tool Discipline (always apply)" section between Core Principles and Agent Output Modes — inherited by every agent and orchestrator via CLAUDE.md injection. Five rules targeting the unbounded-discovery failure mode:

- **T1 — Prefer `rg` over `grep -r`.** 10-50x faster; respects `.gitignore` so `vendor/`, `node_modules/`, `.git/`, build artifacts are excluded for free.
- **T2 — Bound every discovery search.** Bare `grep -r pattern .` or unscoped `rg pattern` on an unfamiliar tree is a P3 violation. Pick one: scope, type filter, or `timeout N` cap.
- **T3 — Map structure before searching content.** `Glob` (or `ls`/`fd`) the tree first, then `rg` on the narrowed scope. WordPress `wp-content/`, plugin folders, and monorepo roots routinely contain MBs of third-party PHP — blanket `grep -r` will hang for minutes.
- **T4 — Explicit exclusions when no `.gitignore`.** `vendor/`, `node_modules/`, `.git/`, `build/`, `dist/`, `.next/`, `target/`, `__pycache__/`. Example: `rg pattern --glob '!vendor' --glob '!node_modules'`.
- **T5 — Background or cancel after 60s.** A discovery command that hasn't returned in ~60s is almost certainly stuck on a vendored subtree — `ctrl+b` to background or cancel and re-scope. Never silently wait past 2 minutes for what should be sub-second work.

### Why a patch, not a minor

Both changes harden existing behavior rather than add functionality — no new skills, agents, or commands. The Tool Discipline rules formalize discipline that *should* have applied since 5.0, and the routing fix corrects a documentation bug. Pure corrective release.

---

## [5.1.1] — 2026-05-19

**Theme: post-release polish + permission-guard fixes.** Patch release addressing audit findings, defensive hook hardening, and friction in the permission system that surfaced after 5.1.0 shipped.

### Fixed — Permission guard

- **Permission mode detection bug.** `detectPermissionMode()` only read root-level `settings.defaultMode`, missed the nested `settings.permissions.defaultMode` shape Claude Code actually uses. Combined with `skipDangerousModePermissionPrompt: true`, this caused auto-mode users to be detected as `bypassPermissions`, which then exited the guard silently and let Claude Code's classifier ask about every command. Now checks (in priority): `settings.permissions.defaultMode` → `settings.defaultMode` → flag fallbacks → `default`. Also reads project-local `.claude/settings.json` for per-project override.
- **Auto mode now genuinely complements the classifier.** Previously the guard ran Tier 0 (blocklist) only in auto mode, then exited — the classifier was asked about every legitimate dev command. Now Tier 0 + Tier 1 (allowlist) both run in auto mode: known-safe commands get `permissionDecision: 'allow'` upfront so the classifier never sees them; unknown commands still fall through to the classifier.
- **Re-wired `permission-guard.js` into `hooks.json`** (was removed in 4.1.2 for double-gating). Auto-mode conflict that caused the original removal is now fixed by the additive Tier-0-plus-allowlist design.

### Added — Permission allowlist coverage

Substantial expansion for non-destructive dev workflows. Auto mode now pre-approves (no classifier ask) for:

- **Git daily ops:** `checkout`, `merge`, `restore`, `cherry-pick`, `rebase` (non-interactive), `config --get/--list`, `worktree`, `bisect`, `rev-parse`, `reflog`, `whatchanged`, `describe`
- **GitHub CLI:** `gh pr/issue/repo/run/workflow` create/view/list, `gh api ... GET`
- **Package mgmt:** `npm i` short form, `npm exec/create/update/upgrade/prune/cache`, `yarn add/remove`, `pnpm add/remove`, `bun add`
- **Ruby / PHP / .NET:** `bundle install/exec`, `rails *`, `rake *`, `php artisan *`, `composer *`, `dotnet build/test/run`
- **Python tooling:** `pytest`, `tox`, `nox`, `coverage`, `uv *`, `poetry *`, `pipx *`, `hatch *`, `python -m {pytest,unittest,black,ruff,mypy,http.server,pip,venv,build,twine,json.tool}`
- **Docker:** `compose restart/pull/stop/start/top/pause`, `start/stop/restart` (container lifecycle), `pull/tag/history/diff/save/export/cp/commit`, `network/volume/system/context ls/inspect/df`, `buildx`, `dc` shell alias
- **Kubernetes:** `kubectl get/describe/logs/top/config view/cluster-info`, `helm list/status/repo`, `minikube status`, `k9s`
- **Cloud read-only:** `aws ec2 describe-*`, `gcloud compute instances list` (nested subcommands), `az vm list`, `terraform plan/init/validate/fmt/show`
- **DB read-only:** `psql -c "SELECT/SHOW/DESCRIBE/\d/\l"`, `redis-cli info/get/keys/scan`, `pg_dump`, `mongodump`
- **Editors / clipboards:** `code .`, `cursor`, `subl`, `vim`, `nvim`, `open`, `xdg-open`, `pbcopy`, `pbpaste`
- **Search tools:** `fd`/`fdfind` (no `-x`/`--exec`), `locate`/`mlocate`/`plocate`, `ctags`/`etags`/`gtags`/`cscope`, modern viewers (`bat`, `lsd`, `eza`, `delta`, `broot`), structured data (`miller`/`mlr`, `csvkit`, `csvq`, `jc`)
- **Process / monitor:** `htop`, `btop`, `glances`, `iotop`, `atop`, `pidstat`, `lsof -i`, `ss`, `netstat` (read-only)
- **Local scripts:** `./bin/*`, `./scripts/*`, `./tools/*`, `./tasks/*` (project-relative scripts)
- **Build tools:** `gradle`, `gradlew`, `mvn`, `just`, `task`, `mage`, `mise`, `asdf`
- **Bench/docs:** `hyperfine`, `time`, `man`, `tldr`, `info`

### Hardened

- **`xargs` no longer permissive.** Previously `xargs <anything>` was allowlisted, which would have let `find ... | xargs rm` bypass the find guard. Now `xargs` only allows a curated list of safe subcommands (`grep`, `wc`, `cat`, `head`, `tail`, `stat`, etc.).
- **`fd -x` / `fd --exec` now properly excluded.** Previous negative lookahead used `\b` which doesn't anchor between two non-word chars (space and `-`); fixed with `(?<=^|\s)` lookbehind and end-of-string anchoring.
- **`find -ok` properly excluded.** Same `\b` bug; same fix.
- **`auto` mode Tier 0 blocklist enforced.** Auto mode no longer skips dangerous-pattern checks. `rm -rf /etc`, force-push, `curl|bash`, etc. blocked in every mode (compliance baseline).
- **Permission cache normalization tightened.** Previously collapsed any path to `<path>`, letting a cache hit for `rm -rf /tmp/foo` allow `rm -rf /etc`. Now preserves basename + never collapses dangerous prefixes (`/etc`, `/var`, `/usr`, `/root`, `/sys`, etc.).

### Added — Hardening helpers

- **`redactForPrompt()`** helper in `_common.js` — strips API keys (sk-, ghp-, AKIA, slack tokens, JWTs, bearer), emails, UUIDs, private key blocks, and large currency amounts from text before it's included in any prompt-type hook. Available for use by future `TaskCompleted`/`PreCompact`/`Notification` hooks.
- **`FORGEBEE_GUARD_LOG_UNKNOWN=1` env var** — when set, every command that falls through to the classifier gets appended (with timestamp + which subcommands matched) to `.claude/session-cache/unknown-commands.log`. Lets users see exactly what's getting asked and decide which patterns to allowlist.

### Fixed — Description sanitization

- **INDEX.md description injection defense** now operates with curated patterns (not over-aggressive backtick rejection). Detects: curl|sh, ignore-previous attempts, override role frames, command substitution to dangerous calls, backticked shell commands, unicode/RTL overrides. Legitimate markdown backticks pass through.

### Misc

- All 3 deployment locations resynced (source, project-local `.claude/hooks/`, plugin cache). 3 hook scripts missing from project-local copy backfilled (`learn-nudge.js`, `load-index.js`, `permission-denied-logger.js`). 86 plugin-cache files refreshed from source.

---

## [5.1.0] — 2026-05-19

**Theme: System discipline.** Major behavioral upgrade across every code-producing agent — Karpathy principles baked into every decision point, adversarial input hardening on all 48 agents, three new skills for forensic diagnosis and stress-testing, token-saving terse-report mode for sub-agents, and an auto-generated routing index that cuts session token cost.

Distilled from external research (BMAD-METHOD, Caveman, ECC, Karpathy guidelines, Ruflo, Superpowers) and a full systematic audit of the existing 25 skills, 48 agents, and 33 commands.

### Added — New skills

- **`brainstorming`** — opt-in hard-gate triggered by `/workflow --strict`. Blocks implementation until a written, approved design spec exists at `docs/planning/specs/`.
- **`elicitation`** + `methods.csv` — 18 named reasoning methods (Pre-mortem, Red Team, Inversion, Stakeholder Round Table, Tree of Thoughts, …) applied to artifacts, not requirements.
- **`surface-ambiguity`** — fires when an agent is about to make a non-trivial silent pick. Forces listing of interpretations + rationale.
- **`terse-report`** — sub-agent compression mode triggered by `responseStyle: "orchestrator"` in handoff contracts. ~65% token reduction.
- **`checkpoint-preview`** — diff-by-concern walkthrough with `[auth]`/`[schema]`/`[billing]`/`[security]`/`[data-loss]` risk tags. Runs after Spec Compliance, before Code Debate.
- **`investigate`** — forensic diagnosis with Confirmed / Deduced / Hypothesized grading. Never erases hypotheses. Hands off to `debugger-detective` for the fix.
- **`audit-self`** — re-runs the full quality scorecard across all skills/agents/commands. Detects regressions since the last audit. Timestamped findings.

### Added — New commands

- **`/investigate`** — forensic case file (diagnosis only; fix is a separate handoff)
- **`/elicit [method-name]`** — stress-test the most recent plan/design with a named method
- **`/audit-self`** — on-demand quality regression check

### Added — Karpathy Core Principles (P1–P6 in CLAUDE.md)

Applied to every code-producing decision via `CLAUDE.md` and per-agent injection (22 code-producing agents got the block):

- **P1 Trace Test** — every changed line traces to the user's request
- **P2 Senior Engineer Test** — would a senior engineer call this overcomplicated?
- **P3 YAGNI Timing** — solve today's problem simply, not tomorrow's prematurely
- **P4 Orphan Rule** — clean only what your changes made unused
- **P5 Anti-Stop Rule** — orchestrators continue work immediately after dispatch (in `/workflow` + `/team`)
- **P6 Severity Standard** — Critical / High / Medium / Low across all review skills

### Added — Safety hardening

- **Adversarial Input Hardening preamble** on all 48 agents — homoglyphs, urgency markers, role-play overrides, embedded instructions flagged not executed
- **Budget circuit breaker** on every `Task()` dispatch in `/workflow` + `/team` (`maxHops` default 8, ceiling 64) with constant-string errors (no oracle leakage)
- **`safeWriteFlag()`** hook helper — `O_NOFOLLOW` symlink-clobber defense for predictable user-owned paths
- **`validateHookFields()`** hook helper — defends against Claude Code's Zod silently dropping `settings.json` on schema mismatch
- **Sensitive-path refusal** in `compress-learnings.js` — never compresses files mentioning `.env`, credentials, `.ssh/`, `.aws/`, private keys, secrets

### Added — Templates

- `templates/decision-log-template.md` — D-NNN decisions across phases, with status (Confirmed/Tentative/Reversed-by)
- `templates/addendum-template.md` — rejected alternatives, options matrices, sizing data
- `templates/failure-capture-template.md` — 7-field block required in `debugger-detective` before any recovery action
- `templates/investigation-case-file.md` — Confirmed/Deduced/Hypothesized case file shape
- `templates/prompt-defense-baseline.md` — canonical Adversarial Input Hardening text

### Added — Workflow discipline

- **Step→Verify plan format** required across `/workflow`, `/team`, `/debug`, `/plan` — every numbered step names its concrete verification
- **Spec Compliance Check** phase in `/workflow` — runs between Execute and Code Debate, asks "did we build what was asked?"
- **Decision logs + addenda** — `/workflow` and `/plan` emit `.decision-log.md` + `.addendum.md` alongside outputs; re-read on subsequent runs

### Added — Infrastructure

- **`forgebee/INDEX.md`** + **`scripts/build-index.js`** — auto-generated routing index loaded on SessionStart. Replaces ~115 frontmatter scans with 1 file read per session.
- **`forgebee/hooks/scripts/load-index.js`** — SessionStart hook emits INDEX.md as `additionalContext`
- **`.github/workflows/index-check.yml`** — CI fails PR if INDEX.md drifts from frontmatter
- **`.github/workflows/sync-manifests.yml`** — auto-fixes manifest version drift on push
- **`forgebee/skills/continuous-learning/scripts/compress-learnings.js`** — ages out >14-day session entries; archives to `learnings-archive-YYYY-Q<N>.md`

### Changed — Existing skills/agents

- **`continuous-learning`** — restructured from 185 → 75 lines; system docs moved to `references/architecture.md` + `references/scope-and-confidence.md`
- **`project-router` description** — trimmed from 422 → 199 chars; leads with "Use when..." trigger
- **`code-skeptic`** — quality gate now references `review-all` as single source of truth (no inline duplication / drift)
- **`tdd-enforcer`** — explicit boundary with `test-engineer` (tdd-enforcer audits cycle; test-engineer writes tests)
- **5 review skills** — severity vocabularies normalized to `Critical / High / Medium / Low` (was `CRITICAL / WARNING / SUGGESTION` in 5 files)
- **`strategy-judge`** — escalation logic now parallel to `code-judge` and `requirements-judge` (severity-based with strategy-specific additions)

### Changed — Agent bloat trim (W16)

6 agents moved framework/template content to `forgebee/agents/references/`:

- `supabase-specialist`: 608 → 158 lines
- `email-strategist`: 393 → 126 lines
- `nextjs-seo`: 380 → 100 lines
- `conversion-optimizer`: 368 → 139 lines
- `saas-cro`: 365 → 98 lines
- `nextjs-content`: 337 → 97 lines

Total: 2,451 → 718 lines in persona files (1,733 lines moved to references).

### Changed — Status protocol

Every one of the 48 agents now reports the canonical `DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT` status. Three agents with domain-specific verdicts (`verification-enforcer`, `delivery-agent`, `tdd-enforcer`) ship a Verdict → Canonical Status mapping table that surfaces both.

### Changed — Command-vs-Agent delegation

5 commands now delegate cleanly to their corresponding agents instead of re-implementing inline:

- `/analytics` → `performance-analyst`
- `/seo` → `seo-specialist`
- `/perf` → `performance-optimizer`
- `/competitive` → `market-intel`
- `/learn` → adds compression step + delegates to `continuous-learning` skill

`/pm` intentionally retained as direct-execution (audit decision — methodology is the work).

### Changed — Email sequence ownership

`email-strategist` is the single source of truth. `content-creator` and `content-writer` no longer hold email-sequence templates — they reference and delegate.

### Fixed — Audit findings (Bucket Z)

- **9 agents** missing `## Escalation` sections — added with per-agent tailored triggers (architect, deep-researcher, flutter-expert, ios-expert, n8n-builder, performance-optimizer, scrum-master, session-librarian, ux-designer)
- **`ux-designer` description** — clarified: produces UX specs, does NOT write code; hand off to `frontend-specialist`
- **`performance-optimizer`** — expanded from 77 → 112 lines with Self-Review (8 checks) + Failure Modes (6 patterns)
- **`n8n-builder`** — removed duplicate Never rules
- **`forgebee-setup` description** — trimmed from 341 → 186 chars

### Multi-platform

Plugin descriptions updated across all 4 manifests (`marketplace.json`, `forgebee/.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, `.cursor-plugin/plugin.json`) to reflect 5.1.0 capabilities.

### Stats delta (5.0.0 → 5.1.0)

| Metric | 5.0.0 | 5.1.0 |
|---|---|---|
| Skills | 25 | 31 |
| Agents | 48 | 48 |
| Commands | 33 | 36 |
| Hooks | 22 | 23 |
| Templates | 0 | 5 |
| Avg agent length | growing | bounded by `/audit-self` |

---

## [5.0.0] — Earlier 2026

**Theme: Distribution + safety nets.**

### Added
- Multi-platform manifests (`.codex-plugin/`, `.cursor-plugin/`, `gemini-extension.json`, `AGENTS.md` symlink)
- `.version-bump.json` + `scripts/bump-version.sh` — single source of truth for version across 6 files; drift detection; full-repo audit
- Auto-learn nudge on SessionStart when ≥5 pending instincts and `/learn` not run in 24h
- Two-stage review in `/workflow` (Spec Compliance before Code Debate)
- 3-failed-fix Iron Law in `debugger-detective` — escalate to architecture after 3 attempts
- Brainstorming skill scaffolding (opt-in via `/workflow --strict`)
- "Use when..." description audit across review-* skill family

### Changed
- All review-* skill descriptions rewritten from "X Review Agent — reviews..." to "Use when..." triggering format

---

## [Older versions]

See git history. v5.0.0 onward maintained in this CHANGELOG.
