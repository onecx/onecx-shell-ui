import { join } from 'node:path'
import { compile } from 'sass'

/**
 * WCAG 2.3.3 / 2.2.2: checks that the compiled shell styles contain the prefers-reduced-motion reset.
 * The styles are compiled with sass (as in the build) and parsed by the CSSOM of jsdom.
 * Note: jsdom does not evaluate media queries, so the behaviour in a real browser with reduced motion
 * emulation has to be checked manually (see PR description).
 */
const rootDir = join(__dirname, '..', '..')

function compileStyles(file: string): CSSStyleSheet {
  const { css } = compile(join(rootDir, file), { loadPaths: [rootDir], silenceDeprecations: ['import'] })
  const style = document.createElement('style')
  style.textContent = css
  document.head.appendChild(style)
  const sheet = style.sheet as CSSStyleSheet
  style.remove()
  return sheet
}

function styleRules(rules: CSSRuleList): CSSStyleRule[] {
  return Array.from(rules).filter((rule): rule is CSSStyleRule => rule instanceof CSSStyleRule)
}

function reducedMotionRules(sheet: CSSStyleSheet): CSSStyleRule[] {
  return Array.from(sheet.cssRules)
    .filter((rule): rule is CSSMediaRule => rule instanceof CSSMediaRule)
    .filter((rule) => rule.media.mediaText.includes('prefers-reduced-motion: reduce'))
    .flatMap((rule) => styleRules(rule.cssRules))
}

describe('prefers-reduced-motion styles', () => {
  it('global styles override animations and transitions with !important under the reduced motion media rule', () => {
    const rules = reducedMotionRules(compileStyles('src/global-styles.scss'))
    const important = (property: string) =>
      rules.some((rule) => rule.style.getPropertyPriority(property) === 'important')

    expect(rules.length).toBeGreaterThan(0)
    expect(important('animation-duration')).toBe(true)
    expect(important('animation-iteration-count')).toBe(true)
    expect(important('transition-duration')).toBe(true)
  })

  it('loading spinner text uses theme variables instead of fixed colours', () => {
    const sheet = compileStyles('src/app/shell/components/app-loading-spinner/app-loading-spinner.component.scss')
    const text = styleRules(sheet.cssRules).find((rule) => rule.selectorText === '.loader-text')

    for (const property of ['color', 'background-color']) {
      const value = text?.style.getPropertyValue(property) ?? ''
      expect(value).toMatch(/^var\(--/)
      expect(value).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i)
    }
  })
})
