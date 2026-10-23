import * as axe from 'axe-core'

/**
 * Runs axe-core and fails with a readable list of violations.
 *
 * What is scanned:
 * - default: only `element` and its descendants; the `region` rule is disabled.
 * - `pageLevel: true`: the whole `document` with `region` (all content inside landmarks) enabled, because axe
 *   skips page level rules unless the context is the entire page. `element` is ignored then, so the caller must
 *   make sure `document.body` contains nothing but the fixture under test (remove previous fixture hosts).
 *
 * jsdom does not compute layout or styles, so the rules that depend on them (color-contrast) are disabled.
 */
export async function expectNoA11yViolations(element: Element, options: { pageLevel?: boolean } = {}): Promise<void> {
  const rules: Record<string, { enabled: boolean }> = {
    'color-contrast': { enabled: false },
    region: { enabled: !!options.pageLevel },
    // title and lang belong to index.html / the router title strategy, not to the rendered views
    'document-title': { enabled: false },
    'html-has-lang': { enabled: false }
  }
  const results = await axe.run(options.pageLevel ? document : element, { rules })
  const report = results.violations
    .map((v) => `${v.id} (${v.impact}): ${v.help}\n${v.nodes.map((n) => `  ${n.html}`).join('\n')}`)
    .join('\n')
  expect(report).toBe('')
}
