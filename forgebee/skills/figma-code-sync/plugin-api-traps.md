# Figma Plugin API traps

Read before writing any `use_figma` code in a sync or onboarding pass. Each trap costs a debugging cycle the first time.

| Trap | Rule |
|---|---|
| `createFrame()` / `createAutoLayout()` default to **opaque white** | Always `fills = []`. |
| `layoutPositioning = 'ABSOLUTE'` throws without an auto-layout parent | Set it **after** `appendChild`, then `x`/`y`. |
| Auto-layout overrides `x`/`y` | Set `layoutPositioning = 'ABSOLUTE'` first to place freely. |
| `resize()` does **not** scale children | Use `rescale(factor)`. |
| Hug sizing | `counterAxisSizingMode = 'AUTO'` / `primaryAxisSizingMode = 'AUTO'`. `layoutSizingVertical` throws on non-auto-layout parents. |
| A leftover `FILL` collapses heights to 1px | Set `'HUG'` explicitly. |
| `combineAsVariants` does not lay variants out | Re-apply `layoutMode` plus sizing on the set afterwards. |
| `createNodeFromSvg` sizes to **path bounds, not viewBox** | Add a transparent anchor `<rect>` matching the viewBox before resizing. |
| Instance-internal nodes cannot be removed | Mutate the **master**. Guard with `try`/`catch`; skip nodes with an `INSTANCE` ancestor. |
| Editing a variable | **Resolve by name first**; check primitive vs semantic alias. Re-aliasing a shared primitive silently corrupts every consumer. |
| Font mutation | `getStyledTextSegments(['fontName'])` → `loadFontAsync` each → then mutate. Load the target style before assigning it. |
| Rotated nodes — writing | Rotation moves the bounding box. Position by measuring `absoluteBoundingBox` and iterating, with the correct sign. |
| Rotated nodes — **reading** ⚠️ | **Figma `rotation` is counter-clockwise-positive; CSS `rotate()` is clockwise-positive.** CSS `rotate(90deg)` reads as **−90** in Figma. Judge direction from a screenshot, never from the raw number. |
| **`mainComponent.name` returns the VARIANT, not the set** ⚠️ | The set name is `mainComponent.parent.name`. Matching a set name against `mainComponent.name` finds **zero** instances, which makes the "local frame where an instance belongs" check report every instanced section as redrawn. |
| Removal versus `visible: false` | An override that **removes** a node leaves no `visible: false`. Confirm by walking the subtree and comparing node counts against an un-overridden control instance. |
| Template placeholders (`{{mustache}}` and similar) | The file's convention for dynamic content. **Not** defects. |
| Localised copy on page mockups | Faithful to the cited live page. Message IDs are usually the source language; never promote a localised literal to a component's canonical label. |
