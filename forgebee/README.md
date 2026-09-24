# ForgeBee — Plugin Package

The plugin directory Claude Code loads. Single source of truth for the framework.

```
forgebee/
├── .claude-plugin/
│   └── plugin.json              # Plugin metadata (name, version, hooks)
├── INDEX.md                     # Auto-generated routing index — loaded on SessionStart
├── hooks/
│   ├── hooks.json               # Hook event wiring
│   └── scripts/                 # 25 wired lifecycle hooks (+ _common.js shared helper)
├── agents/
│   ├── *.md                     # 45 specialist agent personas
│   └── references/              # Reference material extracted from agents (W16 bloat trim)
├── commands/                    # 38 slash commands
├── contexts/                    # Session modes (dev, research, review)
├── rules/                       # Language-specific conventions (common, TS, PHP, Python)
├── skills/
│   ├── audit-self/              # On-demand quality scorecard with regression detection
│   ├── brainstorming/           # Opt-in hard-gate via /workflow --strict
│   ├── checkpoint-preview/      # Diff-by-concern review before Code Debate
│   ├── code-{advocate,skeptic,judge}/      # Code debate triad (context: fork)
│   ├── continuous-learning/     # Instinct-based learning system + references/
│   ├── elicitation/             # 18 reasoning methods (methods.csv)
│   ├── figma-code-sync/         # Code-first Figma design-system reconciliation
│   ├── forgebee-setup/          # Project initialization
│   ├── investigate/             # Forensic case files (Confirmed/Deduced/Hypothesized)
│   ├── project-router/          # Stack detection + routing
│   ├── requirements-{advocate,skeptic,judge}/ # Requirements debate triad (context: fork)
│   ├── review-*/                # 11 focused review skills (context: fork)
│   ├── review-all/              # Inline pre-push quality gate
│   ├── strategy-{advocate,skeptic,judge}/  # Strategy debate triad (context: fork)
│   ├── surface-ambiguity/       # Catch silent picks mid-task
│   └── terse-report/            # Sub-agent token compression for orchestrators
├── templates/                   # Decision log, addendum, failure-capture, investigation case file, prompt-defense baseline
└── eval/                        # Eval scenarios
```

## Key Features (v5.6.0)

### Behavioral discipline (Karpathy principles)
- **P1 Trace test** — every changed line traces to the user's request; no drive-by edits
- **P2 Senior engineer test** — "would a senior engineer call this overcomplicated?" before reporting DONE
- **P3 YAGNI timing** — solve today's problem simply, not tomorrow's prematurely
- **P4 Orphan rule** — clean only what your changes made unused
- **P5 Anti-stop rule** — orchestrators continue with next-step work immediately after dispatch
- **P6 Severity standard** — Critical / High / Medium / Low across all review skills

### Quality pipeline
- **Two-stage review** in `/workflow`: Spec Compliance Check → Checkpoint Preview → Code Debate → Deliver
- **Adversarial debate triads** (advocate/skeptic/judge) for requirements, code, and strategy
- **3-failed-fix Iron Law** in `debugger-detective` — escalate to architecture after 3 attempts
- **Failure-Capture template** (7 fields) required before any recovery action
- **Verification-enforcer + delivery-agent contract** — Step 0 reads verdict, does NOT re-run

### Token efficiency
- **Routing index** (`INDEX.md`) — Claude reads 1 file once per session vs. scanning every agent/skill/command frontmatter block
- **Terse-report mode** — sub-agent reports compress ~65% via `responseStyle: "orchestrator"` contract
- **Learnings compression** — `/learn` ages entries >14 days, archives originals
- **Bloat-trimmed agents** — 6 worst offenders moved to `references/` (1,733 lines extracted)

### Safety
- **Adversarial Input Hardening** preamble on all 45 agents (homoglyphs, urgency, role-play overrides flagged)
- **Budget circuit breaker** on every `Task()` dispatch (maxHops default 8, ceiling 64) with constant-string errors
- **Defensive hooks** — `safeWriteFlag` (O_NOFOLLOW symlink defense), `validateHookFields` (settings.json guard)
- **Sensitive-path refusal** in compression (`.env`, credentials, `.ssh/`, `.aws/`, private keys)

### Counts
- **38 slash commands** — orchestration, diagnosis, quality, growth, learning, meta
- **45 specialist agents** — code, growth, debate, WordPress, Next.js, mobile, CRO, tool
- **34 skills** — 13 inline + 21 context:fork
- **25 lifecycle hooks** across 10 events
- **6 templates** — decision log, addendum, failure-capture, investigation case file, prompt-defense baseline, brainstorming/spec

### Other capabilities
- **Multi-platform** — works with Claude Code, Codex, Cursor, Gemini, OpenClaw (separate manifests)
- **Adaptive pipeline** — `/workflow` scrum phase is promptable (full sprint planning OR direct delegation)
- **Decision logs + addenda** — `/workflow` and `/plan` persist decisions across runs
- **Continuous learning** — `/learn` extracts instincts; `/evolve` clusters them; auto-nudge on SessionStart
- **`/audit-self`** — re-runs the quality scorecard, surfaces regressions since last audit
- **`/elicit`** — 18 named reasoning methods (Pre-mortem, Red Team, Inversion, Stakeholder Round Table) applied to artifacts
- **Growth OS** — 9-phase marketing pipeline with strategy debate and CRO
- **Project management** — state.yaml, TASKS.md, automated dashboards
- **Instruction priority** — CLAUDE.md > Inline skills > Forked skills > Subagents > Defaults

## Install

```bash
/plugin marketplace add forbee-dev/ForgeBee
/plugin install forgebee@forbee-dev
```

For full documentation, see the [main README](../README.md).
For the routing index, see [INDEX.md](./INDEX.md) — auto-generated, never hand-edit.
