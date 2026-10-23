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
  it('global styles reset animations and transitions with ID-level specificity instead of !important under the reduced motion media rule', () => {
    const rules = reducedMotionRules(compileStyles('src/global-styles.scss'))
    const reset = rules.find((rule) => rule.style.getPropertyValue('animation-duration') !== '')

    expect(reset).toBeDefined()
    expect(reset?.selectorText).toContain(':not(#\\#)')
    expect(reset?.style.getPropertyValue('animation-duration')).toBe('0s')
    expect(reset?.style.getPropertyValue('animation-delay')).toBe('0s')
    expect(reset?.style.getPropertyValue('animation-iteration-count')).toBe('1')
    expect(reset?.style.getPropertyValue('transition-duration')).toBe('0s')
    expect(reset?.style.getPropertyValue('transition-delay')).toBe('0s')
    for (const rule of rules) {
      expect(rule.cssText).not.toMatch(/!important|#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i)
    }
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
