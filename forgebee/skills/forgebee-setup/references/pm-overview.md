# Project Management System

ForgeBee includes an automated PM layer that tracks features across sessions using a hybrid YAML + Markdown approach.

## Architecture

### Storage: Hybrid YAML + Markdown

- **`docs/pm/state.yaml`** — Machine-readable project state. Single source of truth for all features, stories, decisions, risks, and counters. Read/written by `/workflow`, `/idea`, `/plan`, and `/pm`.
- **`docs/pm/index.md`** — Auto-generated project dashboard. Rebuilt from state.yaml by `/pm` and the `dashboard-generator` agent.
- **`docs/pm/features/*.md`** — Per-feature detail pages with visual phase trackers, story tables, decision history, and risk tracking.
- **`docs/pm/decisions.md`** — Append-only decision log collecting all debate rulings, architecture decisions, and user overrides.

### Feature Lifecycle Phases

Features progress through phases depending on their origin:

```
idea → idea-debate → mvp-definition → mvp-debate → planning → requirements-debate →
architecture → sprint-planning → execution → code-debate → delivery → done
```

Entry points:
- `/idea` starts at `idea`
- `/plan` starts at `planning`
- `/workflow` starts at `planning` (or resumes existing)

### Automated Tracking

Every command that touches the PM system follows the same pattern:

1. **On start**: Read state.yaml, create or resume feature entry
2. **At phase transitions**: Update phase and timestamp immediately
3. **On decisions**: Append to decisions array with sequential ID
4. **On risks**: Append to risks array from debate Skeptic findings
5. **On stories**: Populate stories array from sprint planning
6. **On completion**: Set phase to done, regenerate dashboards

### TASKS.md Integration

TASKS.md is a downstream consumer of the PM system. The `/pm` command syncs stories from state.yaml into TASKS.md sections (Active, Waiting On, Done). The `task-sync` hook keeps TASKS.md in sync at session boundaries.

### pm-sync Hook

Runs on SessionStart and Stop:
- Reports active feature count and blocked stories
- Detects stale features (not updated in 7+ days)
- Creates PM directories if they don't exist

### State Schema

```yaml
project:
  name: ""
  updated: ""

features:
  - id: feat-001
    name: "Feature Name"
    phase: planning
    created: "2026-02-27"
    updated: "2026-02-27T12:00:00Z"
    origin: workflow | idea | plan
    stories:
      - id: story-001
        title: "Story Title"
        status: pending | in-progress | done | blocked
        agent: ""
        blocked_by: ""
    decisions:
      - id: dec-001
        type: idea-debate | requirements-debate | code-debate | architecture | user-override
        ruling: approved | blocked | flagged | proceed | pivot | kill | trim
        summary: ""
        date: ""
        details: ""
    risks:
      - description: ""
        severity: low | medium | high | critical
        source: requirements-debate | code-debate | idea-debate
        status: open | mitigated | accepted
    blocked:
      - description: ""
        since: ""
        waiting_on: ""

counters:
  feature: 0
  story: 0
  decision: 0
```
