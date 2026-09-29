# Theme fallback gap-fill — design & plan

**Ticket:** [onecx/internal-tasks#644](https://github.com/onecx/internal-tasks/issues/644)
**Branch:** `feat/theming-fallback` (base `feat/theme-v2`)
**Status:** implemented

## Purpose

On-demand gap-fill for Theme V2 custom properties. A referenced-but-undefined
`--onecx-theme-*` variable is declared as `var(--<less-specific-combo>)` per the
theme's `fallbackOrder`, recursed until a concrete value (or the terminal
fully-relaxed base). The browser resolves the chains lazily, so fallbacks are
created *before* the theme's concrete values are present and resolve automatically
once `ThemeApplyService` applies them to `document.documentElement`.

A variable's fallback is derived with the theme's relaxation order. Until that
order is known, a referenced variable is **held** rather than built against the
default order — this is the correctness gate. `ThemeApplyService` arms the order
once its own values are applied, which builds the held variables against the
order now in force and only for variables still undefined in the DOM.

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

A single head-level `MutationObserver` owned by the
`ThemeFallbackGapFillService`, registered at app bootstrap via a
`provideAppInitializer` in `app.module.ts` (next to the other style
initializers). It shares the same `document.head` target and the same mutation
surface the existing observer consumes.

Registration order relative to the other observers (see "Existing monitors"
below) does not matter: the scan is idempotent and reads only final content.

### What it scans

Only added `<style>` elements that:

1. are still connected at read time (`node.isConnected`) — this drops a node the
   scope polyfill replaced (removed + re-inserted within a batched mutation) in
   favour of its replacement, which arrives as its own `addedNode`,
2. have non-empty text content,
3. are not the gap-fill sheet itself (identified by a `data-onecx-theme-gap-fill`
   attribute on the element).

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
reported as "present" by the DOM thereafter, and a bounded `Set` of emitted
step names guards against duplicate lines (see "Deduplication"), so a step is
never written twice.

### Initial sweep

At the same moment as observer registration, one pass over
`document.head.querySelectorAll('style')` (excluding the gap-fill sheet by its
marker) seeds the scan for any stylesheets present before the observer was
attached. The scan is idempotent, so this is safe to run unconditionally at
bootstrap.

## Scan algorithm

For each qualifying `<style>` node:

```
referenced = findOnexThemeVariables(node.textContent, () => true)
for name of referenced:
    if hasValueInDom(name): continue          // resolves — no fallback needed
    for { stepName, target } of expandName(name, fallbackOrder):
        if emitted.has(stepName): continue    // already linked
        if hasValueInDom(stepName): continue  // this step already resolves
        emitted.add(stepName)
        appendDeclaration(`  ${stepName}: var(${target});`)
```

`findOnexThemeVariables` (from `@onecx/angular-utils/theme`) matches
`var(--onecx-theme-*)` references in the CSS text and returns names **with**
their `--` prefix; `resolveLeafFallback` likewise returns the target with its
prefix. Both names are used verbatim in the declaration — the emitted property
is named exactly the referenced name, so a `var(--onecx-theme-…)` reference
resolves to the declared link. We pass `() => true` to collect **every**
referenced name and apply the presence check ourselves — the library's default
filter keeps only *present* variables, the opposite of what a gap scan needs.

`expandName(name, order)` is a pure structural walk: it returns the full
single-step fallback chain most-specific first, down to the terminal base (or a
repeated name), using `resolveLeafFallback`. It knows nothing about the DOM.
The presence check is an **emission** condition only: a step is declared only
when it is itself undefined, so a variable that already resolves emits nothing,
and a leaf whose value was applied mid-scan stops the chain naturally.

Full-chain expansion is deliberate and required: a single link written without
its continuation would leave the intermediate `var(…)` unresolvable, which the
browser reports as *invalid at computed value time* and the whole chain comes
out unset. Walking to the base and emitting every still-undefined step is what
makes the top variable actually resolve.

## Deduplication

Two mechanisms, each doing a different job:

- **The DOM is the primary presence gate.** A variable that resolves to a
  value is never scanned as a gap, and a leaf that has been given a concrete
  value by the theme is skipped entirely. This is what keeps the work
  self-limiting and theme-independent, and it is the only thing that decides
  *what* is a gap.
- **A bounded `Set` of already-emitted step names prevents duplicate lines.**
  The DOM oracle alone does not dedup: a step that was only *scaffolded* (given
  a `var(…)` link, no concrete value) is still "absent" to `hasValueInDom`, so
  a second sheet referencing the same leaf would re-emit the identical chain.
  The `emitted` set is the redundant-line guard.

The `emitted` set is bounded by the number of distinct fallback links, i.e. the
number of lines in the gap-fill sheet itself — it holds at most one short
string per emitted line, so its footprint is O(the artifact) and clears with
`resetGapFillState()`. It is not keyed by every referenced variable, only by
the names that actually produced a declaration.

## Gap-fill sheet

- Created lazily on the first gap found, by `ensureGapFillSheet()`.
- Appended to `document.head` **at the end** (not at registration time), so any
  MFE/remote-component `<style>` injected afterwards still overrides it.
- `:root` selector, applied to `<html>`; global by definition.
- Tagged with a `data-onecx-theme-gap-fill` attribute so the monitor skips it
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

## `fallbackOrder` source and readiness

The Shell already parses `ThemePropertiesV2` in `ThemeApplyService`. `applyTheme`
arms the service with the order in force — the theme's `fallbackOrder` when a v2
theme carries one, otherwise `FALLBACK_ORDER_DEFAULT` (imported from
`@onecx/integration-interface`) — **after** it has applied the theme's inline
values. No new configuration surface.

Readiness is the correctness gate:

- **Order not yet set** — a referenced, undefined variable is *held* (added to
  the service's buffer) and no fallback line is emitted. Building one against the
  default order here would point at bases the real order may not define, a
  persistent, unfixable invalid-at-computed-value bug; so nothing is written
  until the order is known.
- **Order set** — `setFallbackOrder` builds every held variable against the order
  now in force, then builds any later variable on the fly. `applyTheme` applies
  the theme's values inline *before* it arms the order, so a variable the theme
  defines is re-checked at build time and skipped — only true gaps are built.

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

- `src/app/shell/services/theme-fallback-gap-fill.service.ts` — the
  `ThemeFallbackGapFillService` (provided `root`). It owns the relaxation order,
  the held-variable buffer, the emitted-step set, the gap-fill sheet, and the
  head `MutationObserver`. Public surface:
  - `startObserver()` — register the head observer and sweep existing styles
    (idempotent).
  - `setFallbackOrder(order)` — set the order and build any held variable against
    it (the readiness gate; see "fallbackOrder source and readiness").
  - `expandName(name, order)` — the pure single-step chain walk.
  - `reset()` — disconnect the observer, remove the sheet, clear emitted/held
    state and the order (test hook).
- `src/app/shell/services/theme-fallback-gap-fill.service.spec.ts` — jsdom unit
  tests against a single shared instance (the app uses one singleton). Coverage
  includes: full-chain build, skip of a present variable, custom vs default order,
  holding the sheet until the order is set, building held variables on
  `setFallbackOrder`, skipping a variable the theme defines before arming the
  order, no duplicate lines across scans, and the deferred final-content read
  (scope polyfill replacement). jsdom reflects inline custom properties via
  `getComputedStyle`, so the real `hasValueInDom` oracle is used directly (the
  same mechanism `ThemeApplyService` applies values through).
- A `provideAppInitializer` in `app.module.ts` that calls
  `inject(ThemeFallbackGapFillService).startObserver()`, next to the other
  style initializers.
- A `gapFillService.setFallbackOrder(libThemeV2?.fallbackOrder ??
  FALLBACK_ORDER_DEFAULT)` call in `ThemeApplyService.applyTheme`, after the
  theme's inline values are applied.

No libs changes required.

## Testing plan

- Service tests (jsdom, one shared instance): full-chain build for an undefined
  variable; a variable already defined on the root is left untouched; a custom
  `fallbackOrder` drives the chain vs `FALLBACK_ORDER_DEFAULT`; a variable seen
  before the order is set is held and the sheet is not created; setting the
  order builds the held variables; a variable the theme defines before the order
  is set is skipped; re-scanning the same variable emits each gap once; the
  deferred read reads the node after the scope polyfill replaces it; the
  gap-fill sheet is created lazily at the end of the head, marked with
  `data-onecx-theme-gap-fill`, and skipped by the monitor and the initial sweep.
- `expandName` is exercised through the emitted chains (a custom-order test
  asserts the exact chain it yields).
- Observer wiring: `startObserver()` is registered in `app.module.ts`; the
  initial sweep and readiness flow are covered by the service tests.

## Confirmed decisions

1. **Ownership:** a `ThemeFallbackGapFillService` (provided `root`) owns the
   order, the held-variable buffer, the emitted set, the sheet, and the
   observer; `app.module.ts` only starts the observer and `ThemeApplyService`
   arms the order.
2. **Registration spot:** `app.module.ts`, co-located with the other style
   initializers.
3. **Gap-fill sheet selector:** `:root` (applied to `<html>`; global).
4. **Dedup:** the DOM presence oracle decides *what* is a gap; a bounded `Set`
   of emitted step names only guards against duplicate lines (see
   "Deduplication").
5. **Order readiness:** a variable is held until `setFallbackOrder` runs (armed
   by `ThemeApplyService` after applying the theme); a no-order theme arms the
   default. This is what guarantees every emitted line is built with the order in
   force.
