import * as path from 'node:path'
import * as sass from 'sass'

describe('focus-ring baseline', () => {
  const css = sass.compile(path.join(__dirname, '..', 'focus-ring.scss')).css

  it('uses zero-specificity :where() selector on :focus-visible', () => {
    expect(css).toMatch(/:where\([^{]*\):focus-visible/)
  })

  it('defines a 2px outline from theme tokens without hardcoded colours', () => {
    expect(css.replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(css).toContain('var(--p-focus-ring-width, 2px) solid var(--p-onecx-focus-ring-color, var(--primary-color))')
    expect(css).toContain('outline-offset: var(--p-focus-ring-offset, 2px)')
    expect(css).toContain('var(--p-onecx-focus-ring-inverse-color, var(--content-bg-color))')
  })

  it('keeps a visible Highlight outline in forced-colors mode', () => {
    expect(css).toMatch(/@media \(forced-colors: active\)[\s\S]*outline-color: Highlight/)
  })
})
