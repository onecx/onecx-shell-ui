import * as path from 'node:path'
import * as sass from 'sass'

describe('focus-ring baseline', () => {
  const css = sass.compile(path.join(__dirname, '..', 'focus-ring.scss')).css

  it('uses zero-specificity :where() selector on :focus-visible', () => {
    expect(css).toMatch(/:where\([^{]*\):focus-visible/)
  })

  it('defines a 2px outline with token and fallbacks', () => {
    expect(css).toContain('var(--onecx-focus-ring-width, 2px) solid var(--onecx-focus-ring-color, #0b57d0)')
    expect(css).toContain('outline-offset: var(--onecx-focus-ring-offset, 2px)')
    expect(css).toContain('var(--onecx-focus-ring-contrast-color, #ffffff)')
  })

  it('keeps a visible Highlight outline in forced-colors mode', () => {
    expect(css).toMatch(/@media \(forced-colors: active\)[\s\S]*outline-color: Highlight/)
  })
})
