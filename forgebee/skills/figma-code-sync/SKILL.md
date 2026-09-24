---
name: figma-code-sync
description: Use when reconciling a Figma design-system file against shipped code — "check Figma against code", "the Figma is wrong", "sync the design system", or onboarding a new component. Code-first.
version: 1.0.0
---

# Figma ↔ Code Sync

## Objective

Bring a Figma design-system file into agreement with the code that ships, one component at a time. Every changed value traces to a line of source.

This is the portable method. Project specifics (file keys, page inventories, token spec paths, local defect history) live in a project skill in that repo's `.claude/skills/`. Read that first when it exists.

**Load `figma-use` too.** It is a mandatory prerequisite before any `use_figma` call. Before writing plugin code, read `plugin-api-traps.md` in this directory.

## THE ONE LAW

**Code is the source of truth. Figma derives from it — never the reverse, and never from a screenshot.**

You do not design during a sync. Read the source, extract declared values, transcribe them. A value you cannot trace to a line of source does not go in the file; flag it unverified and say what you looked for.

- When a doc note disagrees with the code, the code wins and the note gets corrected.
- Fixes go in Figma, not in the theme. Production code is read-only during a sync. Report a real source bug; do not fix it in the same pass.
- Leave open decisions open. Recording a conflict is a correct output.

## Never

- Never eyeball the canvas. Dump node properties programmatically and diff numerically.
- Never pick a plausible value when the source is silent. Flag it unverified.
- Never approximate from a reference screenshot. Decode the real asset.
- Never sweep a page for one defect class. Every prior below has a legitimate exception.
- Never declare a value absent after one grep spelling.
- Never write to a file the project marks read-only reference.

## Part A — audit or fix an existing page

One page at a time. Finish and verify before the next.

1. **Find the production reference.** A mature file names it on the page. If not, locate it by component name and record it for the next pass.
2. **Read that source and its neighbours.** Values split across a base class and a modifier.
3. **Dump the Figma node tree programmatically:** sizes, fills, strokes, radii, padding, gaps, font metrics.
4. **Diff value by value and write the diff down.** The written diff makes the pass reviewable.
5. **Fix only deviations.** Each fix cites a line.
6. **Verify** (below).
7. **Record the audit** (below).

### Free checks — before reading any source

- **Annotation vs drawing.** A mismatch proves one is wrong, not which. Both directions occur.
- **Local frame where an instance belongs.** A frame named like a component but not of type `INSTANCE` drifts because it does not inherit.
- **Opaque white wrappers.** A white fill the source never declares is almost always a frame-creation artifact.

### Defect priors — check before hypothesising

Recurring drift classes. The exception column matters most: a rule applied blindly creates new defects.

| # | Prior | Exception / rule |
|---|---|---|
| 1 | **Label colour inverted against its surface.** Palettes flip the label at a defined step. | A light label on a *brand* colour is often correct by declaration. Check the fill before darkening a label. |
| 2 | **Dark-surface component recoloured for a light board.** `background: transparent` or near-white values mean it belongs on dark. | Add the dark backdrop as page scenery, not a component fill. |
| 3 | **`AUTO` line-height replacing a declared value.** Boxes come out a few px short. | `AUTO` is correct where the source declares none. Match per **selector**, never per font-size. |
| 4 | **Positioning split across base class and modifier.** Symptom: half-applied offsets. | — |
| 5 | **A consumer's scoped override baked into a shared component.** | Shared value on the component; scoped value as instance override. |
| 6 | **Near-identical values conflated** (greys one step apart, hexes one digit apart). | Verify they are the same in source before unifying. Close-but-distinct is often deliberate. |
| 7 | **Auto-width text overflowing its parent.** | `textAutoResize === 'WIDTH_AND_HEIGHT' && width > parent.width` → `'HEIGHT'` plus `layoutSizingHorizontal = 'FILL'`. |
| 8 | **Heading structure mis-modelled.** Read the template, not the visual weight. | SEO-load-bearing: one `h1` per page, no skipped levels. |
| 9 | **Glyph substituted for a real icon.** | Check the project's icon registry for the true name. |
| 10 | **Solid fill where the source declares a gradient.** | Figma paints fills bottom-up: `[base, overlay]`. |
| 11 | **Wrong container clips.** ⚠️ Invisible to a property diff. | Check which selector carries `overflow`. A negative-offset child (badge, ribbon, bleed) means: verify ancestor clipping, and model clearance margins. Flex margins do not collapse; gap plus child margin **sum**. |
| 12 | **Framework preset vs same-named utility class** (two layers define `text-xl`). | Find which layer owns the element before resolving a class name. For WordPress (`theme.json` vs SCSS), see `wp-design-system`. |

## Verification

- **Node reads are authoritative.** Render endpoints lag mutations. Re-read properties before "fixing" again.
- **Screenshots show shape, not colour.** Confirm colour from `fills[0]`.
- **Computed-box cross-check** is the strongest signal: after padding and line-height, element height equals the CSS box.
- Component-set screenshots exclude page scenery. Expected.

## Before declaring a value ABSENT

Grep at least three spellings: shorthand, longhand, and named utilities. For radius, also per-corner longhands, `@extend`ed utilities, and variables. For colour, also scoped variables, custom properties, and base64 data URIs.

1. **Exclude vendored trees** (`node_modules/`, `vendor/`). Framework token files look first-party and inflate usage.
2. **Anchor patterns to the property,** not the bare number, to avoid substring hits in hexes and lengths.
3. **Prefer the token spec over grep.** A reconciled `tokens.json` / `tokens.md` is authoritative and often records zero-consumer tokens. Cite the spec; use grep to corroborate.

## Where the audit record goes

**The repo holds the documentation. Figma gets a summary only.** Long notes in Figma grow doc frames until component frames must move.

**1. Figma doc note** — 2–3 sentences, max ~400 characters:

```
<date> code-audit: <n> defects fixed (<3–5 word themes>). <n> items open.
Full record: <path to the repo audit file>
```

No `file:line` lists in Figma. Replace a stale note; never append a contradiction.

**2. Repo audit file** — one `## <page name>` section each:
- every defect with `file:line` and old → new value
- what was verified correct
- deliberate non-changes, with reason
- unverified values and what you looked for
- escalations: globals, masters outside scope, source bugs

⚠️ **One file per agent or batch. Never share one markdown file between concurrent writers.** Read-before-write tools cannot serialise concurrent appends: a `Write` destroys a peer's content, heredoc appends hit permission guards, and anchored `Edit` keeps failing with "file has been modified since read". One writer merges all files at the end.

## Part B — onboard a NEW component

Do this while you build the component.

1. **Build it** to project conventions.
2. **Decompose before drawing.** If a part is an existing component, **instance it**; never redraw.
3. **Promote anything reused** (test below).
4. **Write the brief** from the project template. Fill every key (`n/a`, not deletion). Record the verified commit SHA.
5. **Create the page:** variant set plus a doc frame naming the production source.
6. **Declare the heading level** against the project's heading contract.
7. **Declare compliance** for regulated or commercial content.
8. **Run the project's pre-push gate** (token-name lints, token drift, SEO suite).
9. **Run Part A on your new page.** Transcription errors surface here. Do not skip it.

### When to promote a shared component

All three hold:
1. It appears in **2+ independent consumers**, or 2+ places in one file (strongest case).
2. Its **internal structure is stable**: same parts, same order.
3. It is **not** just a type step or spacing value. Those are tokens.

If the variant axis is undefined in code, record the finding and do not build. When properties differ per consumer, model **per consumer, not normalised**.

## Status Reporting

When your work concludes, report exactly one of `DONE`, `DONE_WITH_CONCERNS`, `BLOCKED`, or `NEEDS_CONTEXT`, as the last non-empty line. Unverified values and recorded-but-unresolved conflicts are `DONE_WITH_CONCERNS`, not `DONE`.
