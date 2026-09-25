# Theme fallback gap-fill — design & plan

**Ticket:** [onecx/internal-tasks#644](https://github.com/onecx/internal-tasks/issues/644)
**Branch:** `feat/theming-fallback` (base `feat/theme-v2`)
**Status:** plan (not yet implemented)

## Purpose

On-demand gap-fill for Theme V2 custom properties. A referenced-but-undefined
`--onecx-theme-*` variable is declared as `var(--<less-specific-combo>)` per the
theme's `fallbackOrder`, recursed until a concrete value (or the terminal
fully-relaxed base). The browser resolves the chains lazily, so fallbacks are
created *before* the theme's concrete values are present and resolve automatically
once `ThemeApplyService` applies them to `document.documentElement`.

## Non-goals

- No modification of existing stylesheets. The only element written is a single
  dedicated gap-fill `<style>`.
- No inline `setProperty` on the root. That remains the `ThemeApplyService`
  concern; the gap-fill sheet is a separate stylesheet the cascade composes with
  the root's inline values.
- No reaction to `<link>` external stylesheets. Their `cssText` is not readable
  cross-origin and the MFE/remote-component cases targeted here arrive as inline
  `<style>` nodes.
- No `@supports`/`@scope` handling in the gap-fill sheet. It contains plain
  `--name: var(--…)` declarations only, so the scope polyfill is inert with
  respect to it.

## Monitor

### Placement

A single head-level `MutationObserver` registered at app bootstrap, co-located
with `styleChangesListenerInitializer` in `app.module.ts` (the existing
head-level `{childList}` observer bootstrapped there). It shares the same
`document.head` target and the same mutation surface the existing observer
consumes.

Registration order relative to the other observers (see "Existing monitors"
below) does not matter: the scan is idempotent and reads only final content.

### What it scans

Only added `<style>` elements that:

1. are not the gap-fill sheet itself (identified by a `data-theme-gap-fill`
   attribute on the element),
2. are still connected at read time (`node.isConnected`),
3. are not the same node identity that was already scanned (a `WeakSet` of
   processed nodes — the gap-fill sheet is the only element we ever create and
   it is skipped by rule 1 before reaching this check).

External `<link>` nodes and any other element kind are skipped.

### When it scans (final-content guarantee)

Mutations are collected from the observer callback and the scan is deferred to
a `queueMicrotask`. Two properties of the existing style-interception system
make the deferred read always against **final** content:

1. **The scope polyfill only replaces nodes wholesale.** Its
   `deconstructScopeRule` rewrites `@supports`-containing sheets by removing
   the old `<style>` and appending a *new* one with the rewritten text. It never
   mutates the text content of a surviving node in place. A node that is still
   connected when we read it therefore has content that is final with respect to
   `--onecx-theme-*` (the `--p-` prefix interceptor — `replacePrimengPrefix` —
   does not touch `--onecx-theme-*` at all).
2. **`isConnected` filters out nodes the polyfill swapped.** If the polyfill
   removed and re-inserted a scoped sheet between our observer's callback and
   our microtask, the node we originally received is disconnected and skipped;
   the polyfill's replacement node arrives as a separate `addedNode` mutation
   and is processed on its own pass, against its final content.

Combined: we only ever read a node whose `--onecx-theme-*` content is already
post-modification, and a name that is expanded into the gap-fill sheet is
reported as "present" by the DOM thereafter (see "Zero-state dedup"), so the
same name is never expanded twice.

### Initial sweep

At the same moment as observer registration, one pass over
`document.head.querySelectorAll('style')` (excluding the gap-fill sheet by its
marker) seeds the scan for any stylesheets present before the observer was
attached. The scan is idempotent, so this is safe to run unconditionally at
bootstrap.

## Scan algorithm

For each qualifying `<style>` node:

```
names = findOnexThemeVariables(node.textContent, name => !hasValueInDom(name))
for name of names:
    expand(name)
```

`findOnexThemeVariables` (from `@onecx/angular-utils/theme`) matches
`var(--onecx-theme-*)` references in the CSS text. The default filter,
`hasValueInDom`, keeps variables that **resolve to a value** on
`document.documentElement`; we invert it to keep the **absent** ones.

`expand(name)` walks the fallback chain and appends declarations to the gap-fill
sheet:

```
expand(name):
    cur = name
    while true:
        if hasValueInDom(cur): break          // concrete value present (theme applied it) — done
        next = resolveLeafFallback(cur, fallbackOrder)
        if next === undefined: break          // terminal base / not a known leaf — done
        gapFillSheet.textContent += `  ${cur}: var(${next});\n`
        cur = next
```

Full-chain expansion is deliberate and required: a single link written without
its continuation would leave the intermediate `var(…)` unresolvable, which the
browser reports as *invalid at computed value time* and the whole chain comes
out unset. Writing the entire chain down to a name that either has a concrete
value or is the terminal base is what makes the top variable actually resolve.

## Zero-state dedup

The only persistent state is the single gap-fill `<style>` element. No `Set`
or `WeakSet` keyed by variable name is needed:

- After `expand` completes for a name, that name resolves through the
  now-complete chain to a concrete value (or is itself the terminal base, which
  receives its concrete value later from `ThemeApplyService`). Either way,
  `hasValueInDom(name)` then reports **present**.
- A second sheet that references the same name therefore gets it filtered out
  at the extraction step, for free.
- The browser's cascade + our sheet's content are the dedup mechanism; there is
  no auxiliary index to maintain and the memory footprint is exactly the
  artifact itself — one line per distinct fallback link — which is the
  irreducible minimum.

## Gap-fill sheet

- Created lazily on the first gap found, by `ensureGapFillSheet()`.
- Appended to `document.head` **at the end** (not at registration time), so any
  MFE/remote-component `<style>` injected afterwards still overrides it.
- `:root` selector, applied to `<html>`; global by definition.
- Tagged with a `data-theme-gap-fill` attribute so the monitor skips it and so
  the initial sweep skips it.
- Content is append-only within a session.

Cascade order (highest to lowest priority for a given property):

1. `ThemeApplyService` inline `setProperty` on `document.documentElement` — wins
   by being an inline style.
2. MFE / remote-component `<style>` sheets appended after the gap-fill sheet.
3. The gap-fill sheet — safety net, overridden by both of the above.

This is the intended precedence: the sheet exists to fill gaps that neither the
theme nor the consumer content has filled.

## Theme-independence

The scan does not depend on the theme being applied. When the concrete values
are not present yet, `expand` walks down to the terminal base, writes the
scaffold, and stops (the base itself gets no `var(…)` line — it will receive
its concrete value later). When `ThemeApplyService` later sets the base on
`document.documentElement`, the already-written scaffold resolves. No
re-observer, no re-scan.

This is why the monitor registers at bootstrap, before the theme is applied.

## `fallbackOrder` source

The Shell already parses `ThemePropertiesV2` in `ThemeApplyService`. The gap-
fill reads `fallbackOrder` from the same parsed theme; when no theme has been
applied yet it uses `FALLBACK_ORDER_DEFAULT` (imported from
`@onecx/integration-interface`). No new configuration surface.

## Existing Shell monitors (reference)

For context on what the new monitor coexists with. Only the scope polyfill
rewrites stylesheet content; the `--p-` interceptor does not touch
`--onecx-theme-*`; neither modifies the gap-fill sheet.

| # | Location | Target | Options | Fires on | Effect |
|---|----------|--------|---------|----------|--------|
| 1 | `style-changes-listener.utils.ts` (`styleChangesListenerInitializer`, bootstrapped at `app.module.ts`) | `document.head` | `{childList}` | new/removed child `<style>`/`<link>` | → `updateAngularComponentsStyles` (`--p-` content rewrite) + `updateRequiredWrappingStyles` |
| 2 | `style-data.utils.ts` (`observeStyleDataWrapper`) | per-wrapper `div` | `{childList}` | wrapper empties | removes wrapper + disconnects |
| 3 | `scope-polyfill/polyfill.ts` — precision mode | `document.body` | `{subtree, childList, attributes}` | any style change | → `updateStyleSheets` (full deconstruct). Guarded on `typeof CSSScopeRule === 'undefined'` |
| 4 | `scope-polyfill/polyfill.ts` — performance mode (default) | `document.head` | `{subtree, childList, attributes}` | any style change | → `updateStyleSheetsForPerformanceMode` → `deconstructScopeRule`, only for `@supports`-containing sheets |
| 5 | `scope-polyfill/polyfill.ts` (`setupStyleNodeObserver`) | each scoped sheet node | `{characterData, childList, subtree}` | inline edits to a scoped sheet | → `existingScopedSheetCallback` |

## Library usage

The Shell and the angular-21 preloader pin `@onecx/*@^8.2.1` (published), which
does not carry the required symbols. They consume the local `9.0.0-rc.4` dist
via the libs repo's `copy-build-to` mechanism:

- `dist/libs/integration-interface` — `fallbackOrder`, `resolveLeafFallback`,
  `deriveLeafAxisMetadata`, `FALLBACK_ORDER_DEFAULT` (main entry exports).
- `dist/libs/angular-utils` — `findOnexThemeVariables`, `hasValueInDom`
  (`@onecx/angular-utils/theme` subpackage).

`npm run build-copy` in the libs repo rebuilds all `@onecx/*` code libs to
`9.0.0-rc.4` and copies them into the destination `node_modules/@onecx`
directories listed in `.copy-build-to` (shell and preloader). `node_modules`
writes; local-only, never committed.

## New shell files

- `src/app/shell/utils/styles/theme-fallback-gap-fill.utils.ts` — pure helpers:
  `isGapFillSheet(node)`, `ensureGapFillSheet()`,
  `scanNodeForGaps(node, { fallbackOrder })`,
  `expandName(name, { fallbackOrder })`.
- `src/app/shell/utils/styles/theme-fallback-gap-fill.utils.spec.ts` — jsdom
  unit tests. The pure helpers accept a `filter` oracle (matching the
  `findOnexThemeVariables` signature), so tests inject a fake oracle and do not
  depend on jsdom's `getComputedStyle`.
- One-line observer registration in `app.module.ts`, next to
  `styleChangesListenerInitializer`.

No libs changes required.

## Testing plan

- Pure util tests (jsdom): extraction keeps only absent names; `expand` writes
  the full chain and stops at a present var or the terminal base; the
  gap-fill sheet is created lazily and marked; a second scan of the same name
  does not re-append; the `isConnected` guard skips removed nodes; the
  `data-theme-gap-fill` marker is skipped.
- Observer wiring: registration in `app.module.ts` and the initial sweep —
  covered by the existing `app.module` tests or a small integration test if
  warranted.

## Confirmed decisions

1. **Registration spot:** `app.module.ts`, co-located with
   `styleChangesListenerInitializer`.
2. **Gap-fill sheet selector:** `:root` (applied to `<html>`; global).
