import * as axe from 'axe-core'

/**
 * Runs axe-core on the given element and fails with a readable list of violations.
 *
 * jsdom does not compute layout or styles, so the rules that depend on them (color-contrast) are disabled.
 * `region` is a page level rule; it is only enabled when `pageLevel` is set,
 * which analyses the whole document and is meant for tests that render a complete shell frame.
 */
export async function expectNoA11yViolations(element: Element, options: { pageLevel?: boolean } = {}): Promise<void> {
  const rules: Record<string, { enabled: boolean }> = {
    'color-contrast': { enabled: false },
    region: { enabled: !!options.pageLevel },
    // title and lang belong to index.html / the router title strategy, not to the rendered views
    'document-title': { enabled: false },
    'html-has-lang': { enabled: false }
  }
  // page level rules only evaluate when the whole document is the context
  const results = await axe.run(options.pageLevel ? document : element, { rules })
  const report = results.violations
    .map((v) => `${v.id} (${v.impact}): ${v.help}\n${v.nodes.map((n) => `  ${n.html}`).join('\n')}`)
    .join('\n')
  expect(report).toBe('')
}
